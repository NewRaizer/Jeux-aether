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
    primary_color: "#3A33FF",
  });
  const [logoFile, setLogoFile] = useState(null);
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
      const tenant = await api.post("/tenants", {
        name: form.name,
        slug: form.slug || slugify(form.name),
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
      });
      if (logoFile) {
        await api.upload(`/tenants/${tenant.id}/logo`, logoFile);
      }
      setShowForm(false);
      setForm({ name: "", slug: "", logo_url: "", primary_color: "#3A33FF" });
      setLogoFile(null);
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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
        <div>
          <p className="eyebrow">Espace de travail</p>
          <h1 className="display mt-1.5 text-4xl">Clients</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nouveau client
        </button>
      </div>

      {loading ? (
        <p className="mt-8 font-mono text-sm uppercase tracking-wide text-muted">
          Chargement…
        </p>
      ) : tenants.length === 0 ? (
        <div className="mt-8 border-2 border-dashed border-hairline p-12 text-center">
          <p className="font-mono text-sm uppercase tracking-wide text-muted">
            Aucun client pour le moment
          </p>
          <button
            className="btn-secondary mt-4"
            onClick={() => setShowForm(true)}
          >
            Créer le premier client
          </button>
        </div>
      ) : (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t, i) => (
            <article
              key={t.id}
              className="card rise group flex flex-col transition-all duration-100 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div className="h-2 w-full" style={{ backgroundColor: t.primary_color }} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt=""
                      className="h-11 w-11 border-2 border-ink object-contain"
                    />
                  ) : (
                    <span
                      className="flex h-11 w-11 items-center justify-center border-2 border-ink font-display text-lg font-extrabold text-paper"
                      style={{ backgroundColor: t.primary_color }}
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-lg font-bold leading-tight">
                      {t.name}
                    </h2>
                    <p className="truncate font-mono text-[11px] uppercase tracking-wide text-muted">
                      /{t.slug}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex gap-2 border-t border-hairline pt-4">
                  <Link
                    to={`/admin/tenants/${t.id}`}
                    className="btn-secondary flex-1"
                  >
                    Gérer →
                  </Link>
                  <button
                    className="btn-icon"
                    onClick={() => remove(t.id)}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title="Nouveau client"
          onClose={() => {
            setShowForm(false);
            setLogoFile(null);
          }}
        >
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="label">Nom du client</label>
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
                placeholder="Logistique Dupont"
                required
              />
            </div>
            <div>
              <label className="label">Slug (URL publique)</label>
              <input
                className="input"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: slugify(e.target.value) })
                }
                placeholder="logistique-dupont"
                required
              />
            </div>
            <div>
              <label className="label">Logo PNG (optionnel)</label>
              <input
                type="file"
                accept="image/png"
                className="input file:mr-3 file:border-0 file:bg-ink file:px-2 file:py-1 file:font-mono file:text-[10px] file:uppercase file:text-paper"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                PNG · 1 Mo max · prioritaire sur l'URL
              </p>
            </div>
            <div>
              <label className="label">… ou logo via URL</label>
              <input
                className="input"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="label">Couleur de marque</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer border-2 border-ink bg-surface"
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm({ ...form, primary_color: e.target.value })
                  }
                />
                <span className="font-mono text-xs uppercase text-muted">
                  {form.primary_color}
                </span>
              </div>
            </div>
            {error && (
              <p className="border-l-2 border-danger bg-danger/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-danger">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full">
              Créer le client
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
