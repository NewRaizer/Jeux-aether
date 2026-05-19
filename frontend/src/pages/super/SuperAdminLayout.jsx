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
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-bold text-indigo-600">Immersyte Quiz</span>
            <nav className="flex gap-1">
              <NavLink to="/admin" end className={linkClass}>
                Clients
              </NavLink>
              <NavLink to="/admin/results" className={linkClass}>
                Résultats
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.full_name}</span>
            <button className="btn-secondary" onClick={onLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
