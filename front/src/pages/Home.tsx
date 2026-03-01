import { Link } from "react-router"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Logo from "@/components/ui/logo"
import {
  Trophy,
  Users,
  Calendar,
  BarChart3,
  ArrowRight,
  Zap,
  Shield,
  Shuffle,
} from "lucide-react"

/* ────────────────────────────────────────────
   Decorative SVG — abstract court net pattern
   ──────────────────────────────────────────── */
function CourtPattern({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
    >
      {/* horizontal lines */}
      {[80, 160, 240, 320].map((y) => (
        <line
          key={`h-${y}`}
          x1="0"
          y1={y}
          x2="400"
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
      ))}
      {/* vertical lines */}
      {[80, 160, 240, 320].map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1="0"
          x2={x}
          y2="400"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
      ))}
      {/* center circle */}
      <circle
        cx="200"
        cy="200"
        r="80"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
        fill="none"
      />
      {/* corner accents */}
      <rect
        x="40"
        y="40"
        width="120"
        height="120"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.08"
        fill="none"
      />
      <rect
        x="240"
        y="240"
        width="120"
        height="120"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.08"
        fill="none"
      />
    </svg>
  )
}

/* ────────────────
   Animation helpers
   ──────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.12, duration: 0.45, ease: "easeOut" as const },
  }),
}

/* ────────────────
   Data
   ──────────────── */
const features = [
  {
    icon: Users,
    title: "Gestion des groupes",
    description:
      "Créez des poules équilibrées et gérez vos joueurs par niveau, club ou statut.",
  },
  {
    icon: Shuffle,
    title: "Tirage automatique",
    description:
      "Algorithme de distribution intelligent pour des groupes équitables en un clic.",
  },
  {
    icon: Calendar,
    title: "Planning des matchs",
    description:
      "Génération automatique du calendrier round-robin avec créneaux horaires.",
  },
  {
    icon: BarChart3,
    title: "Classement en direct",
    description:
      "Suivez les scores, les statistiques et le classement en temps réel.",
  },
]

const steps = [
  {
    number: "01",
    title: "Créez votre événement",
    description:
      "Définissez le nom, le sport, les dates et le nombre de groupes en quelques secondes.",
  },
  {
    number: "02",
    title: "Inscrivez les joueurs",
    description:
      "Ajoutez manuellement ou importez votre liste. Gérez membres et visiteurs.",
  },
  {
    number: "03",
    title: "Lancez vos boxes",
    description:
      "Le tirage, les matchs et le classement sont générés automatiquement.",
  },
]

const stats = [
  { value: "1 200+", label: "Joueurs inscrits" },
  { value: "85", label: "Boxes organisés" },
  { value: "6 400+", label: "Matchs joués" },
  { value: "98%", label: "Satisfaction" },
]

/* ────────────────
   Page Component
   ──────────────── */
export default function Home() {
  return (
    <div className="col-span-12 overflow-hidden">
      {/* ═══════════════════════════════════
          HERO
         ═══════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Row 1 — Title on white background */}
        <div className="relative px-4 md:px-6 pt-16 md:pt-24">
          <CourtPattern className="pointer-events-none absolute -right-32 -top-16 w-[500px] h-[500px] text-foreground/40" />

          <div className="relative mx-auto max-w-6xl">
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
            >
              L'organisation de vos boxes,
              <br />
              <span className="text-primary">en un clic.</span>
            </motion.h1>
          </div>
        </div>

        {/* Row 2 — Full-width muted band with description + dashboard */}
        <div className="mt-12 md:mt-16 bg-muted/40 rounded-3xl mx-4 md:mx-6 px-4 md:px-6 py-10 md:py-14">
          <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
            {/* Left — Description + CTA */}
            <motion.div
              className="flex flex-col justify-between"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              <div>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                  Créez des événements, composez vos poules, planifiez les matchs et
                  suivez le classement — le tout depuis une seule interface pensée
                  pour les organisateurs de boxe pour tout les sports de raquette.
                </p>

                <div className="mt-8">
                  <Button asChild size="lg" className="text-sm font-semibold shadow-none border border-primary/30 px-8">
                    <Link to="/auth">
                      Commencer gratuitement
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-10 flex items-center gap-4">
                <p className="text-sm text-muted-foreground leading-tight">
                  Application mobile
                  <br />
                  disponible prochainement
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background">
                    <img src="/apple.svg" alt="Apple" className="h-5 w-5 opacity-40" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background">
                    <img src="/playstore.svg" alt="Google Play" className="h-5 w-5 opacity-40" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right — Dashboard preview */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
            >

              <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
                {/* Window chrome */}
                <div className="border-b px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    RacketFest — Dashboard
                  </span>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-3 gap-3 md:gap-4">
                  {/* Mini stat cards */}
                  {[
                    { label: "Groupes", val: "4" },
                    { label: "Joueurs", val: "24" },
                    { label: "Matchs", val: "48" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border p-3 md:p-4 text-center"
                    >
                      <p className="text-xl md:text-2xl font-bold">{item.val}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.label}
                      </p>
                    </div>
                  ))}
                  {/* Mini round-robin table */}
                  <div className="col-span-3 rounded-lg border overflow-hidden">
                    <div className="bg-muted/60 px-3 py-2 text-xs font-semibold">
                      Groupe A — Round Robin
                    </div>
                    <div className="grid grid-cols-5 text-xs text-center">
                      {["", "J1", "J2", "J3", "Total"].map((h) => (
                        <div
                          key={h}
                          className="px-2 py-1.5 border-b font-medium bg-muted/40"
                        >
                          {h}
                        </div>
                      ))}
                      {[
                        ["J1", "—", "6-3", "4-6", "1"],
                        ["J2", "3-6", "—", "6-2", "1"],
                        ["J3", "6-4", "2-6", "—", "1"],
                      ].map((row) =>
                        row.map((cell, j) => (
                          <div
                            key={`${row[0]}-${j}`}
                            className={`px-2 py-1.5 border-b ${
                              j === 0
                                ? "font-medium bg-muted/20"
                                : cell === "—"
                                  ? "bg-muted/30"
                                  : j === 4
                                    ? "font-semibold bg-muted/20"
                                    : ""
                            }`}
                          >
                            {cell}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          FEATURES
         ═══════════════════════════════════ */}
      <section
        id="fonctionnalites"
        className="px-4 md:px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <Badge className="mb-4 bg-muted text-muted-foreground border-border px-3 py-1 text-xs font-medium">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Tout ce qu'il faut pour <span className="text-primary">organiser</span>
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Des outils pensés pour les organisateurs de boxes de squash,
              badminton, tennis et padel.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={scaleIn}
                custom={i}
              >
                <Card className="h-full transition-shadow hover:shadow-lg hover:border-primary">
                  <CardContent className="flex items-start gap-4">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <feat.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{feat.title}</h3>
                      <p className="mt-1 text-muted-foreground leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          HOW IT WORKS
         ═══════════════════════════════════ */}
      <section className="px-4 md:px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <Badge className="mb-4 bg-muted text-muted-foreground border-border px-3 py-1 text-xs font-medium">
              Comment ça marche
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Trois étapes, zéro <span className="text-primary">prise de tête</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i + 1}
              >
                {/* Connector line (hidden on last item & mobile) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted border-2 border-border">
                  <span className="text-xl font-bold text-foreground">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 font-semibold text-base">{step.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          STATS / SOCIAL PROOF
         ═══════════════════════════════════ */}
      <section className="mx-4 md:mx-6 py-16 px-4 md:px-6 bg-muted/40 rounded-3xl">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                variants={fadeUp}
                custom={i}
              >
                <p className="text-3xl md:text-4xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          TRUST BADGES
         ═══════════════════════════════════ */}
      <section className="px-4 md:px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              {
                icon: Zap,
                title: "Rapide",
                text: "Créez une boxe complète en moins de 5 minutes.",
              },
              {
                icon: Shield,
                title: "Fiable",
                text: "Données sécurisées, accès par rôle, aucune perte.",
              },
              {
                icon: Trophy,
                title: "Gratuit",
                text: "Toutes les fonctionnalités, sans frais cachés.",
              },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <item.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-muted-foreground">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          FINAL CTA
         ═══════════════════════════════════ */}
      <section className="mx-4 md:mx-6 py-20">
        <motion.div
          className="relative rounded-3xl border bg-card p-10 md:p-14 text-center overflow-hidden"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Background accents */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-muted/60 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-muted/40 blur-2xl" />

          <div className="relative">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Logo />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Prêt à lancer votre prochaine <span className="text-primary">boxe</span> ?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              Rejoignez les organisateurs qui font confiance à RacketFest pour
              gérer leurs événements de raquette.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="text-sm font-semibold shadow-none border border-primary/30 px-8"
              >
                <Link to="/auth">
                  Créer un compte
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-sm">
                <Link to="/auth">Se connecter</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
