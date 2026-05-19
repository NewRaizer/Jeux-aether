import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo_url: "",
    primary_color: "#4f46e5",
  });
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setTenants(await api.get("/tenants"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/tenants", {
        name: form.name,
        slug: form.slug || slugify(form.name),
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
      });
      setShowForm(false);
      setForm({ name: "", slug: "", logo_url: "", primary_color: "#4f46e5" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!confirm("Supprimer ce client et toutes ses données ?")) return;
    await api.del(`/tenants/${id}`);
    load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Clients</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nouveau client
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Chargement…</p>
      ) : tenants.length === 0 ? (
        <p className="text-slate-400">Aucun client pour le moment.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-center gap-3">
                <span
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: t.primary_color }}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {t.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">/{t.slug}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/admin/tenants/${t.id}`}
                  className="btn-secondary flex-1"
                >
                  Gérer
                </Link>
                <button
                  className="btn-danger"
                  onClick={() => remove(t.id)}
                >
                  Suppr.
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Nouveau client" onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="label">Nom</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
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
              <label className="label">Logo URL (optionnel)</label>
              <input
                className="input"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Couleur principale</label>
              <input
                type="color"
                className="h-10 w-20 rounded border border-slate-300"
                value={form.primary_color}
                onChange={(e) =>
                  setForm({ ...form, primary_color: e.target.value })
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
