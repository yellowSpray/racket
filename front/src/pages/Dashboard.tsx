// import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  // const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <h1>dashboard</h1>
      {/* <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">
          Bienvenue, {user ? user.name : "invité"}!
        </h2>
        <p className="text-gray-600">
          Vous êtes connecté en tant que {user ? user.role : "invité"}.
        </p>
      </main> */}
    </div>
  );
}
