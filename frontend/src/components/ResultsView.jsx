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
    if (filters.date_to)
      params.set("date_to", `${filters.date_to}T23:59:59`);
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

  // Distinct modules present in the loaded rows, for the module filter.
  const moduleOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => map.set(r.module_id, r.module_title));
    return [...map.entries()];
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
      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
        <div className="flex items-end gap-2">
          <button className="btn-primary flex-1" onClick={load}>
            Filtrer
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{rows.length} résultat(s)</p>
        <button className="btn-secondary" onClick={exportCsv}>
          Exporter CSV
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Apprenant</th>
              <th className="px-4 py-2">Module</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Aucun résultat.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">
                    {r.learner_firstname} {r.learner_lastname}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.module_title}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {fmtDate(r.started_at)}
                  </td>
                  <td className="px-4 py-2">
                    {r.score_percent != null ? (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          r.score_percent >= 70
                            ? "bg-green-100 text-green-700"
                            : r.score_percent >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.score_percent}%
                      </span>
                    ) : (
                      <span className="text-slate-400">incomplet</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="text-indigo-600 hover:underline"
                      onClick={() => openDetail(r.id)}
                    >
                      Détail
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
          <div className="space-y-3">
            <div className="text-sm text-slate-500">
              {detail.module_title} · {detail.questionnaire_title}
              <br />
              {fmtDate(detail.started_at)} · Score :{" "}
              <span className="font-semibold text-slate-700">
                {detail.score_percent != null
                  ? `${detail.score_percent}%`
                  : "—"}
              </span>
            </div>
            <div className="space-y-2">
              {detail.answers.map((a, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <p className="font-medium text-slate-800">
                    {i + 1}. {a.question_text}
                  </p>
                  {a.question_type === "mcq" ? (
                    <p
                      className={
                        a.selected_is_correct
                          ? "text-green-700"
                          : "text-red-600"
                      }
                    >
                      {a.selected_is_correct ? "✓" : "✗"}{" "}
                      {a.selected_choice_text || "(pas de réponse)"}
                    </p>
                  ) : (
                    <p className="rounded bg-slate-50 p-2 text-slate-600">
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
