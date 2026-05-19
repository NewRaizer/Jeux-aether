import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Modal from "./Modal.jsx";

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function scoreTone(score) {
  if (score == null) return "bg-paper text-muted";
  if (score >= 70) return "bg-success text-paper";
  if (score >= 50) return "bg-warning text-paper";
  return "bg-danger text-paper";
}

export default function ResultsView({ tenants }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({
    tenant_id: "",
    module_id: "",
    learner: "",
    date_from: "",
    date_to: "",
  });

  function buildQuery() {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set("tenant_id", filters.tenant_id);
    if (filters.module_id) params.set("module_id", filters.module_id);
    if (filters.learner) params.set("learner", filters.learner);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", `${filters.date_to}T23:59:59`);
    return params.toString();
  }

  async function load() {
    setLoading(true);
    try {
      const qs = buildQuery();
      setRows(await api.get(`/results${qs ? `?${qs}` : ""}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moduleOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => map.set(r.module_id, r.module_title));
    return [...map.entries()];
  }, [rows]);

  const stats = useMemo(() => {
    const scored = rows.filter((r) => r.score_percent != null);
    const avg = scored.length
      ? Math.round(
          scored.reduce((s, r) => s + r.score_percent, 0) / scored.length
        )
      : null;
    return { total: rows.length, completed: scored.length, avg };
  }, [rows]);

  async function exportCsv() {
    const qs = buildQuery();
    const res = await api.raw(`/results/export.csv${qs ? `?${qs}` : ""}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultats.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openDetail(id) {
    setDetail(await api.get(`/results/${id}`));
  }

  return (
    <div>
      {/* Stat strip */}
      <div className="mb-5 grid grid-cols-3 border-2 border-ink bg-ink">
        {[
          ["Sessions", stats.total],
          ["Terminées", stats.completed],
          ["Score moyen", stats.avg != null ? `${stats.avg}%` : "—"],
        ].map(([k, v], i) => (
          <div
            key={k}
            className={`bg-surface p-4 ${i > 0 ? "border-l-2 border-ink" : ""}`}
          >
            <p className="eyebrow">{k}</p>
            <p className="display mt-1 text-3xl">{v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-pad mb-4">
        <p className="eyebrow mb-3">Filtres</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tenants && (
            <div>
              <label className="label">Client</label>
              <select
                className="input"
                value={filters.tenant_id}
                onChange={(e) =>
                  setFilters({ ...filters, tenant_id: e.target.value })
                }
              >
                <option value="">Tous</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Module</label>
            <select
              className="input"
              value={filters.module_id}
              onChange={(e) =>
                setFilters({ ...filters, module_id: e.target.value })
              }
            >
              <option value="">Tous</option>
              {moduleOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Apprenant</label>
            <input
              className="input"
              placeholder="Nom ou prénom"
              value={filters.learner}
              onChange={(e) =>
                setFilters({ ...filters, learner: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Du</label>
            <input
              type="date"
              className="input"
              value={filters.date_from}
              onChange={(e) =>
                setFilters({ ...filters, date_from: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Au</label>
            <input
              type="date"
              className="input"
              value={filters.date_to}
              onChange={(e) =>
                setFilters({ ...filters, date_to: e.target.value })
              }
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={load}>
            Appliquer les filtres
          </button>
          <button className="btn-secondary" onClick={exportCsv}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ink text-left font-mono text-[11px] uppercase tracking-[0.08em] text-paper">
              <th className="px-4 py-2.5 font-medium">Apprenant</th>
              <th className="px-4 py-2.5 font-medium">Module</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Score</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wide text-muted"
                >
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wide text-muted"
                >
                  Aucun résultat
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-hairline transition hover:bg-paper/70"
                >
                  <td className="px-4 py-2.5 font-semibold">
                    {r.learner_firstname} {r.learner_lastname}
                  </td>
                  <td className="px-4 py-2.5 text-ink/75">{r.module_title}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-muted">
                    {fmtDate(r.started_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`tag ${scoreTone(r.score_percent)}`}>
                      {r.score_percent != null
                        ? `${r.score_percent}%`
                        : "Incomplet"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="btn-ghost"
                      onClick={() => openDetail(r.id)}
                    >
                      Détail →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal
          title={`${detail.learner_firstname} ${detail.learner_lastname}`}
          onClose={() => setDetail(null)}
        >
          <div className="space-y-4">
            <div className="border-2 border-ink bg-paper/60 p-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                {detail.module_title} · {detail.questionnaire_title}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                {fmtDate(detail.started_at)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="eyebrow">Score</span>
                <span className={`tag ${scoreTone(detail.score_percent)}`}>
                  {detail.score_percent != null
                    ? `${detail.score_percent}%`
                    : "—"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {detail.answers.map((a, i) => (
                <div key={i} className="border-2 border-ink p-3 text-sm">
                  <p className="font-semibold">
                    <span className="mr-1.5 font-mono text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {a.question_text}
                  </p>
                  {a.question_type === "mcq" ? (
                    <p
                      className={`mt-1 font-mono text-[12px] uppercase tracking-wide ${
                        a.selected_is_correct ? "text-success" : "text-danger"
                      }`}
                    >
                      {a.selected_is_correct ? "✓ " : "✗ "}
                      {a.selected_choice_text || "(pas de réponse)"}
                    </p>
                  ) : (
                    <p className="mt-1 border-l-2 border-hairline bg-paper/60 px-2 py-1.5 text-ink/75">
                      {a.open_text || "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
