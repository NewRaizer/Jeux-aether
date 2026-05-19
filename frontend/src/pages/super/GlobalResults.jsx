import { useEffect, useState } from "react";
import { api } from "../../api";
import ResultsView from "../../components/ResultsView.jsx";

export default function GlobalResults() {
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    api.get("/tenants").then(setTenants);
  }, []);

  return (
    <div>
      <div className="mb-6 border-b-2 border-ink pb-5">
        <p className="eyebrow">Vue consolidée</p>
        <h1 className="display mt-1.5 text-4xl">Résultats</h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          Tous les clients · toutes les sessions
        </p>
      </div>
      <ResultsView tenants={tenants} />
    </div>
  );
}
