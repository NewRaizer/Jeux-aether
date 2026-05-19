import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

  if (!tenant) return <p className="text-slate-400">Chargement…</p>;

  return (
    <div>
      <Link to="/admin" className="text-sm text-indigo-600 hover:underline">
        ← Tous les clients
      </Link>
      <h1 className="mt-2 text-xl font-bold text-slate-800">{tenant.name}</h1>
      <p className="text-sm text-slate-400">/{tenant.slug}</p>

      <div className="card mt-4 flex items-center gap-4">
        {tenant.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={`Logo ${tenant.name}`}
            className="h-16 w-16 rounded border border-slate-200 object-contain"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 text-center text-xs text-slate-400">
            Aucun logo
          </div>
        )}
        <div>
          <label className="btn-secondary cursor-pointer">
            Téléverser un logo PNG
            <input
              type="file"
              accept="image/png"
              className="hidden"
              onChange={uploadLogo}
            />
          </label>
          <p className="mt-1 text-xs text-slate-400">Format PNG, max 1 Mo.</p>
          {logoMsg && (
            <p className="mt-1 text-xs text-slate-500">{logoMsg}</p>
          )}
        </div>
      </div>

      <div className="my-5 flex gap-1 border-b border-slate-200">
        {[
          ["modules", "Modules"],
          ["admins", "Administrateurs"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === key
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "modules" && (
        <ModulesTab
          tenant={tenant}
          modules={modules}
          reload={load}
        />
      )}
      {tab === "admins" && (
        <AdminsTab tenantId={tenantId} admins={admins} reload={load} />
      )}
    </div>
  );
}

function ModulesTab({ tenant, modules, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", slug: "" });
  const [error, setError] = useState("");

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/tenants/${tenant.id}/modules`, {
        title: form.title,
        description: form.description || null,
        slug: form.slug || slugify(form.title),
        is_active: true,
      });
      setShowForm(false);
      setForm({ title: "", description: "", slug: "" });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!confirm("Supprimer ce module ?")) return;
    await api.del(`/modules/${id}`);
    reload();
  }

  async function downloadQr(module) {
    const res = await api.raw(`/modules/${module.id}/qr`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${tenant.slug}-${module.slug}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nouveau module
        </button>
      </div>
      {modules.length === 0 ? (
        <p className="text-slate-400">Aucun module.</p>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              module={m}
              tenant={tenant}
              onRemove={() => remove(m.id)}
              onQr={() => downloadQr(m)}
              reload={reload}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Nouveau module" onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="label">Titre</label>
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
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              Créer
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ModuleCard({ module, tenant, onRemove, onQr, reload }) {
  const [questionnaires, setQuestionnaires] = useState(null);
  const [open, setOpen] = useState(false);

  async function loadQ() {
    setQuestionnaires(await api.get(`/modules/${module.id}/questionnaires`));
  }

  function toggle() {
    if (!open && questionnaires === null) loadQ();
    setOpen(!open);
  }

  async function toggleActive() {
    await api.patch(`/modules/${module.id}`, { is_active: !module.is_active });
    reload();
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">
            {module.title}{" "}
            <span
              className={`ml-1 rounded px-1.5 py-0.5 text-xs ${
                module.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {module.is_active ? "actif" : "inactif"}
            </span>
          </p>
          <p className="text-xs text-slate-400">/{module.slug}</p>
          {module.description && (
            <p className="mt-1 text-sm text-slate-600">{module.description}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
          <button className="btn-secondary" onClick={toggle}>
            Questionnaires
          </button>
          <button className="btn-secondary" onClick={onQr}>
            QR code
          </button>
          <button className="btn-secondary" onClick={toggleActive}>
            {module.is_active ? "Désactiver" : "Activer"}
          </button>
          <button className="btn-danger" onClick={onRemove}>
            Suppr.
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Questionnaires</p>
            <Link
              to={`/admin/modules/${module.id}/questionnaires/new`}
              className="text-sm text-indigo-600 hover:underline"
            >
              + Nouveau questionnaire
            </Link>
          </div>
          {questionnaires === null ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : questionnaires.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun questionnaire.</p>
          ) : (
            <ul className="space-y-1">
              {questionnaires.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    {q.title}{" "}
                    {q.is_active && (
                      <span className="text-green-600">(actif)</span>
                    )}
                  </span>
                  <Link
                    to={`/admin/questionnaires/${q.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Éditer
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">
            URL publique : {window.location.origin}/{tenant.slug}/
            {module.slug}
          </p>
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
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nouvel administrateur
        </button>
      </div>
      {admins.length === 0 ? (
        <p className="text-slate-400">Aucun administrateur.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div
              key={a.id}
              className="card flex items-center justify-between py-3"
            >
              <div>
                <p className="font-medium text-slate-800">{a.full_name}</p>
                <p className="text-sm text-slate-400">
                  {a.email} · {a.role}
                </p>
              </div>
              <button className="btn-danger" onClick={() => remove(a.id)}>
                Suppr.
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title="Nouvel administrateur"
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={create} className="space-y-3">
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
              <label className="label">Mot de passe (min. 8 caractères)</label>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              Créer
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
