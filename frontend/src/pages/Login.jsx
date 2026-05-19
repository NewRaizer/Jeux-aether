import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const darkGrid = {
  backgroundImage:
    "linear-gradient(rgba(239,237,228,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(239,237,228,0.07) 1px, transparent 1px)",
  backgroundSize: "34px 34px",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const me = await login(email, password);
      navigate(me.role === "super_admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message || "Échec de la connexion");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside
        className="relative flex flex-col justify-between overflow-hidden bg-ink px-8 py-10 text-paper lg:w-[46%] lg:px-12 lg:py-14"
        style={darkGrid}
      >
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 bg-accent" />
          <span className="font-mono text-[12px] uppercase tracking-eyebrow">
            Immersyte
          </span>
        </div>

        <div className="rise">
          <p className="eyebrow !text-accent">Plateforme d'évaluation VR</p>
          <h1 className="display mt-4 text-[15vw] leading-[0.9] lg:text-[5.5rem]">
            Immersyte
            <br />
            <span className="text-accent">Quiz</span>
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper/70">
            Évaluez vos apprenants après chaque session immersive. Un QR code,
            un quiz mobile, un score — sans friction.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.1em] text-paper/45">
          <span>01 — Scan</span>
          <span>02 — Quiz</span>
          <span>03 — Score</span>
        </div>
      </aside>

      {/* Form panel */}
      <main className="grid-bg flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rise">
          <p className="eyebrow">Accès administrateur</p>
          <h2 className="display mt-2 text-3xl">Connexion</h2>

          <form
            onSubmit={onSubmit}
            className="mt-7 border-2 border-ink bg-surface p-6 shadow-hard"
          >
            <div className="space-y-4">
              <div>
                <label className="label">Adresse email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@entreprise.fr"
                  required
                />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 border-l-2 border-danger bg-danger/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary mt-5 w-full"
              disabled={busy}
            >
              {busy ? "Connexion…" : "Se connecter →"}
            </button>
          </form>

          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Super Admin & Tenant Admin · accès unifié
          </p>
        </div>
      </main>
    </div>
  );
}
