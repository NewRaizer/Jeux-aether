import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import PublicQuiz from "./pages/PublicQuiz.jsx";
import SuperAdminLayout from "./pages/super/SuperAdminLayout.jsx";
import TenantList from "./pages/super/TenantList.jsx";
import TenantDetail from "./pages/super/TenantDetail.jsx";
import QuestionnaireBuilder from "./pages/super/QuestionnaireBuilder.jsx";
import GlobalResults from "./pages/super/GlobalResults.jsx";
import TenantResults from "./pages/tenant/TenantResults.jsx";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-mono text-xs uppercase tracking-eyebrow text-muted">
        Chargement…
      </p>
    </div>
  );
}

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.role === "super_admin" ? "/admin" : "/dashboard"}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Public quiz — matches the spec URL pattern /{tenant}/{module} */}
      <Route path="/:tenantSlug/:moduleSlug" element={<PublicQuiz />} />

      {/* Super Admin */}
      <Route
        path="/admin"
        element={
          <RequireRole role="super_admin">
            <SuperAdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<TenantList />} />
        <Route path="tenants/:tenantId" element={<TenantDetail />} />
        <Route
          path="modules/:moduleId/questionnaires/new"
          element={<QuestionnaireBuilder />}
        />
        <Route
          path="questionnaires/:questionnaireId"
          element={<QuestionnaireBuilder />}
        />
        <Route path="results" element={<GlobalResults />} />
      </Route>

      {/* Tenant Admin */}
      <Route
        path="/dashboard"
        element={
          <RequireRole role="tenant_admin">
            <TenantResults />
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
