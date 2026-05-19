import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import Modal from "../../components/Modal.jsx";

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function TenantDetail() {
  const { tenantId } = useParams();
  const [tenant, setTenant] = useState(null);
  const [modules, setModules] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [tab, setTab] = useState("modules");
  const [logoMsg, setLogoMsg] = useState("");

  async function load() {
    const [t, m, a] = await Promise.all([
      api.get(`/tenants/${tenantId}`),
      api.get(`/tenants/${tenantId}/modules`),
      api.get(`/tenants/${tenantId}/admins`),
    ]);
    setTenant(t);
    setModules(m);
    setAdmins(a);
  }

  async function uploadLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoMsg("");
    try {
      await api.upload(`/tenants/${tenantId}/logo`, file);
      await load();
      setLogoMsg("Logo mis à jour.");
    } catch (err) {
      setLogoMsg(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [tenantId]);

  if (!tenant)
    return (
      <p className="font-mono text-sm uppercase tracking-wide text-muted">
        Chargement…
      </p>
    );

  return (
    <div>
      <Link to="/admin" className="btn-ghost">
        ← Tous les clients
      </Link>

      {/* Identity header */}
      <div className="mt-4 flex flex-col gap-5 border-2 border-ink bg-surface sm:flex-row sm:items-stretch">
        <div
          className="flex items-center gap-4 p-6 sm:w-1/2"
          style={{ backgroundColor: `${tenant.primary_color}14` }}
        >
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt=""
              className="h-16 w-16 border-2 border-ink object-contain"
            />
          ) : (
            <span
              className="flex h-16 w-16 items-center justify-center border-2 border-ink font-display text-2xl font-extrabold text-paper"
              style={{ backgroundColor: tenant.primary_color }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="eyebrow">Client</p>
            <h1 className="display text-3xl">{tenant.name}</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
              /{tenant.slug}
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-2 border-t-2 border-ink p-6 sm:w-1/2 sm:border-l-2 sm:border-t-0">
          <p className="eyebrow">Identité visuelle</p>
          <div className="flex items-center gap-3">
            <span
              className="h-5 w-5 border-2 border-ink"
              style={{ backgroundColor: tenant.primary_color }}
            />
            <span className="font-mono text-xs uppercase text-muted">
              {tenant.primary_color}
            </span>
          </div>
          <label className="btn-secondary mt-1 w-fit cursor-pointer">
            Téléverser un logo PNG
            <input
              type="file"
              accept="image/png"
              className="hidden"
              onChange={uploadLogo}
            />
          </label>
          {logoMsg && (
            <p className="font-mono text-[10px] uppercase tracking-wide text-success">
              {logoMsg}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-7 flex gap-0 border-b-2 border-ink">
        {[
          ["modules", "Modules", modules.length],
          ["admins", "Administrateurs", admins.length],
        ].map(([key, labelText, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-[2px] flex items-center gap-2 border-2 px-4 py-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.08em] transition ${
              tab === key
                ? "border-ink border-b-paper bg-surface text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {labelText}
            <span
              className={`px-1.5 text-[10px] ${
                tab === key ? "bg-accent text-paper" : "bg-hairline text-ink"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "modules" && (
          <ModulesTab tenant={tenant} modules={modules} reload={load} />
        )}
        {tab === "admins" && (
          <AdminsTab tenantId={tenantId} admins={admins} reload={load} />
        )}
      </div>
    </div>
  );
}

function ModulesTab({ tenant, modules, reload }) {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", slug: "" });
  const [error, setError] = useState("");

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      const module = await api.post(`/tenants/${tenant.id}/modules`, {
        title: form.title,
        description: form.description || null,
        slug: form.slug || slugify(form.title),
        is_active: true,
      });
      setShowForm(false);
      setForm({ title: "", description: "", slug: "" });
      navigate(`/admin/modules/${module.id}/questionnaires/new`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!confirm("Supprimer ce module ?")) return;
    await api.del(`/modules/${id}`);
    reload();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">Modules de formation VR</p>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nouveau module
        </button>
      </div>
      {modules.length === 0 ? (
        <div className="border-2 border-dashed border-hairline p-10 text-center">
          <p className="font-mono text-sm uppercase tracking-wide text-muted">
            Aucun module
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              module={m}
              tenant={tenant}
              onRemove={() => remove(m.id)}
              reload={reload}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Nouveau module" onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="label">Titre du module</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                    slug: form.slug || slugify(e.target.value),
                  })
                }
                placeholder="Sécurité chariot élévateur"
                required
              />
            </div>
            <div>
              <label className="label">Slug (URL)</label>
              <input
                className="input"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: slugify(e.target.value) })
                }
                placeholder="securite-chariot"
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[80px]"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Contexte affiché à l'apprenant…"
              />
            </div>
            {error && (
              <p className="border-l-2 border-danger bg-danger/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-danger">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full">
              Créer & ajouter des questions →
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ModuleCard({ module, tenant, onRemove, reload }) {
  const [questionnaires, setQuestionnaires] = useState(null);
  const [open, setOpen] = useState(false);
  const publicUrl = `${window.location.origin}/${tenant.slug}/${module.slug}`;

  async function loadQ() {
    setQuestionnaires(await api.get(`/modules/${module.id}/questionnaires`));
  }

  function toggle() {
    if (!open && questionnaires === null) loadQ();
    setOpen(!open);
  }

  async function downloadQr() {
    const res = await api.raw(`/modules/${module.id}/qr`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${tenant.slug}-${module.slug}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleActive() {
    await api.patch(`/modules/${module.id}`, { is_active: !module.is_active });
    reload();
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold">{module.title}</h3>
            <span
              className={`tag ${
                module.is_active
                  ? "bg-success text-paper"
                  : "bg-paper text-muted"
              }`}
            >
              {module.is_active ? "Actif" : "Inactif"}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted">
            {publicUrl}
          </p>
          {module.description && (
            <p className="mt-2 max-w-xl text-sm text-ink/75">
              {module.description}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <button className="btn-secondary" onClick={toggle}>
            {open ? "Masquer" : "Questionnaires"}
          </button>
          <button className="btn-secondary" onClick={downloadQr}>
            QR code
          </button>
          <button className="btn-secondary" onClick={toggleActive}>
            {module.is_active ? "Désactiver" : "Activer"}
          </button>
          <button className="btn-icon" onClick={onRemove} title="Supprimer">
            ✕
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t-2 border-ink bg-paper/50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">Questionnaires</p>
            <Link
              to={`/admin/modules/${module.id}/questionnaires/new`}
              className="btn-ghost"
            >
              + Nouveau questionnaire
            </Link>
          </div>
          {questionnaires === null ? (
            <p className="font-mono text-xs uppercase tracking-wide text-muted">
              Chargement…
            </p>
          ) : questionnaires.length === 0 ? (
            <p className="font-mono text-xs uppercase tracking-wide text-muted">
              Aucun questionnaire — créez-en un pour activer ce quiz.
            </p>
          ) : (
            <ul className="divide-y divide-hairline border-2 border-ink bg-surface">
              {questionnaires.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {q.title}
                    {q.is_active && (
                      <span className="tag bg-success text-paper">Actif</span>
                    )}
                  </span>
                  <Link
                    to={`/admin/questionnaires/${q.id}`}
                    className="btn-ghost"
                  >
                    Éditer →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AdminsTab({ tenantId, admins, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "admin",
  });
  const [error, setError] = useState("");

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/tenants/${tenantId}/admins`, form);
      setShowForm(false);
      setForm({ email: "", password: "", full_name: "", role: "admin" });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!confirm("Supprimer cet administrateur ?")) return;
    await api.del(`/tenants/${tenantId}/admins/${id}`);
    reload();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">Accès au tableau de bord client</p>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Administrateur
        </button>
      </div>
      {admins.length === 0 ? (
        <div className="border-2 border-dashed border-hairline p-10 text-center">
          <p className="font-mono text-sm uppercase tracking-wide text-muted">
            Aucun administrateur
          </p>
        </div>
      ) : (
        <ul className="divide-y-2 divide-ink border-2 border-ink bg-surface">
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper font-display text-sm font-extrabold">
                  {a.full_name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{a.full_name}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    {a.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tag bg-paper">{a.role}</span>
                <button
                  className="btn-icon"
                  onClick={() => remove(a.id)}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <Modal title="Nouvel administrateur" onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="label">Nom complet</label>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Mot de passe · 8 caractères min.</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="label">Rôle</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {error && (
              <p className="border-l-2 border-danger bg-danger/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-danger">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full">
              Créer l'administrateur
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
