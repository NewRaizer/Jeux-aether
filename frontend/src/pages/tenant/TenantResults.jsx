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
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-accent" />
            <span className="font-display text-lg font-extrabold tracking-tight text-paper">
              Immersyte
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-eyebrow text-paper/40 sm:inline">
              / Tableau de bord
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[11px] uppercase tracking-wide text-paper">
                {user?.full_name}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                {user?.tenant_role || "Admin"}
              </p>
            </div>
            <button
              className="border-2 border-paper/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-paper transition hover:border-accent hover:bg-accent"
              onClick={onLogout}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 border-b-2 border-ink pb-5">
          <p className="eyebrow">Vos apprenants</p>
          <h1 className="display mt-1.5 text-4xl">Résultats</h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">
            Sessions de quiz · votre organisation
          </p>
        </div>
        <ResultsView />
      </main>
    </div>
  );
}
