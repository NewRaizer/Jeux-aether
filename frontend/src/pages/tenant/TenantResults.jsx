import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth.jsx";
import ResultsView from "../../components/ResultsView.jsx";

export default function TenantResults() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-bold text-indigo-600">Immersyte Quiz</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.full_name}</span>
            <button className="btn-secondary" onClick={onLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-5 text-xl font-bold text-slate-800">
          Résultats des apprenants
        </h1>
        <ResultsView />
      </main>
    </div>
  );
}
