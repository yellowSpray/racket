import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface InvitePayload {
  email: string
  first_name?: string
  last_name?: string
  profile_id?: string  // UUID du profil existant (joueur importé sans compte auth)
}

Deno.serve(async (req: Request) => {
  // Gérer les requêtes CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Vérifier la méthode HTTP
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Méthode non autorisée" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Récupérer le JWT de l'appelant
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Créer un client Supabase avec le contexte auth de l'appelant (pour vérifier son rôle)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    // Vérifier que l'appelant est admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Utilisateur non trouvé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Récupérer le profil de l'appelant pour vérifier son rôle et club_id
    const { data: callerProfile, error: profileError } = await supabaseUser
      .from("profiles")
      .select("role, club_id")
      .eq("id", user.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "Profil non trouvé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!["admin", "superadmin"].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Seuls les admins peuvent inviter des membres" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!callerProfile.club_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Vous n'êtes associé à aucun club" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Parser le body de la requête
    const { email, first_name, last_name, profile_id }: InvitePayload = await req.json()

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Créer un client admin avec le service role key pour inviter
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Chercher un profil existant pour cet email dans ce club
    // (joueur importé Excel ou créé manuellement, sans compte auth)
    const profileQuery = profile_id
      ? supabaseAdmin.from("profiles").select("id, first_name, last_name").eq("id", profile_id).eq("club_id", callerProfile.club_id).maybeSingle()
      : supabaseAdmin.from("profiles").select("id, first_name, last_name").eq("email", email).eq("club_id", callerProfile.club_id).maybeSingle()

    const { data: existingProfile } = await profileQuery

    if (existingProfile) {
      // Vérifier si ce profil a déjà un compte auth actif
      const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id)
      if (existingAuth?.user?.email_confirmed_at) {
        return new Response(
          JSON.stringify({ success: false, error: "Ce membre a déjà un compte actif dans votre club" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Profil existant SANS compte auth confirmé :
      // Créer l'auth user avec l'UUID du profil existant pour éviter le doublon.
      // Le trigger handle_new_user fera ON CONFLICT DO NOTHING (profil déjà là).
      if (!existingAuth?.user) {
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: existingProfile.id,
          email: email,
          email_confirm: false,
          user_metadata: {
            club_id: callerProfile.club_id,
            first_name: existingProfile.first_name || first_name || "",
            last_name: existingProfile.last_name || last_name || "",
          },
        })
        if (createError) {
          return new Response(
            JSON.stringify({ success: false, error: createError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }

      // L'auth user existe maintenant (créé ci-dessus ou déjà là non confirmé).
      // inviteUserByEmail sur un user existant renvoie juste l'email d'invitation, sans créer de doublon.
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          club_id: callerProfile.club_id,
          first_name: existingProfile.first_name || first_name || "",
          last_name: existingProfile.last_name || last_name || "",
        },
      })
      if (inviteError) {
        return new Response(
          JSON.stringify({ success: false, error: inviteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Invitation envoyée avec succès",
          user_id: existingProfile.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Aucun profil existant : flux standard — inviteUserByEmail crée l'auth user + le profil via trigger
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          club_id: callerProfile.club_id,
          first_name: first_name || "",
          last_name: last_name || "",
        },
      }
    )

    if (inviteError) {
      return new Response(
        JSON.stringify({ success: false, error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation envoyée avec succès",
        user_id: inviteData.user?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
