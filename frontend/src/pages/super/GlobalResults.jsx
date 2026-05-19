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
      <h1 className="mb-5 text-xl font-bold text-slate-800">
        Résultats — tous les clients
      </h1>
      <ResultsView tenants={tenants} />
    </div>
  );
}
