import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth.jsx";

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login");
  }

  const linkClass = ({ isActive }) =>
    `relative px-3 py-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.08em] transition ${
      isActive
        ? "bg-accent text-paper"
        : "text-paper/65 hover:text-paper"
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-7">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 bg-accent" />
              <span className="font-display text-lg font-extrabold tracking-tight text-paper">
                Immersyte
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-eyebrow text-paper/40 sm:inline">
                / Console
              </span>
            </div>
            <nav className="flex gap-1">
              <NavLink to="/admin" end className={linkClass}>
                Clients
              </NavLink>
              <NavLink to="/admin/results" className={linkClass}>
                Résultats
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[11px] uppercase tracking-wide text-paper">
                {user?.full_name}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                Super Admin
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
        <Outlet />
      </main>
    </div>
  );
}
