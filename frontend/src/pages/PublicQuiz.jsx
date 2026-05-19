import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";

export default function PublicQuiz() {
  const { tenantSlug, moduleSlug } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("intro"); // intro | questions | result
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const color = quiz?.tenant_primary_color || "#3A33FF";

  useEffect(() => {
    api
      .get(`/public/quiz/${tenantSlug}/${moduleSlug}`, false)
      .then(setQuiz)
      .catch((e) => setError(e.message || "Quiz introuvable"));
  }, [tenantSlug, moduleSlug]);

  async function startQuiz(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { session_id } = await api.post(
        "/public/quiz/start",
        {
          questionnaire_id: quiz.questionnaire_id,
          learner_firstname: firstname,
          learner_lastname: lastname,
        },
        false
      );
      setSessionId(session_id);
      setStep("questions");
    } catch (e) {
      setError(e.message || "Erreur au démarrage");
    } finally {
      setBusy(false);
    }
  }

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submitQuiz() {
    setBusy(true);
    setError("");
    try {
      const payload = quiz.questions.map((q) => {
        const a = answers[q.id];
        return q.question_type === "mcq"
          ? { question_id: q.id, selected_choice_id: a ?? null }
          : { question_id: q.id, open_text: a ?? "" };
      });
      const res = await api.post(
        "/public/quiz/submit",
        { session_id: sessionId, answers: payload },
        false
      );
      setResult(res);
      setStep("result");
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e.message || "Erreur à l'envoi");
    } finally {
      setBusy(false);
    }
  }

  if (error && !quiz) {
    return (
      <div className="grid-bg flex min-h-screen items-center justify-center p-6">
        <div className="border-2 border-ink bg-surface p-8 text-center shadow-hard">
          <p className="display text-3xl">404</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="grid-bg flex min-h-screen items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-eyebrow text-muted">
          Chargement…
        </p>
      </div>
    );
  }

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        {/* Header */}
        <header className="mb-5 flex items-center gap-3 border-2 border-ink bg-surface p-3">
          {quiz.tenant_logo_url ? (
            <img
              src={quiz.tenant_logo_url}
              alt=""
              className="h-11 w-11 flex-shrink-0 border-2 border-ink object-contain"
            />
          ) : (
            <span
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center border-2 border-ink font-display text-lg font-extrabold text-paper"
              style={{ backgroundColor: color }}
            >
              {quiz.tenant_name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold leading-tight">
              {quiz.tenant_name}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted">
              {quiz.module_title}
            </p>
          </div>
        </header>

        {step === "intro" && (
          <Intro
            quiz={quiz}
            color={color}
            firstname={firstname}
            lastname={lastname}
            setFirstname={setFirstname}
            setLastname={setLastname}
            onStart={startQuiz}
            busy={busy}
            error={error}
          />
        )}

        {step === "questions" && (
          <Questions
            quiz={quiz}
            color={color}
            current={current}
            setCurrent={setCurrent}
            answers={answers}
            setAnswer={setAnswer}
            onSubmit={submitQuiz}
            busy={busy}
            error={error}
          />
        )}

        {step === "result" && <Result result={result} color={color} />}

        <footer className="mt-auto pt-6 text-center font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          Propulsé par Immersyte Quiz
        </footer>
      </div>
    </div>
  );
}

function Intro({
  quiz,
  color,
  firstname,
  lastname,
  setFirstname,
  setLastname,
  onStart,
  busy,
  error,
}) {
  return (
    <form
      onSubmit={onStart}
      className="rise border-2 border-ink bg-surface shadow-hard"
    >
      <div
        className="border-b-2 border-ink p-5"
        style={{ backgroundColor: `${color}14` }}
      >
        <p
          className="font-mono text-[11px] font-medium uppercase tracking-eyebrow"
          style={{ color }}
        >
          Évaluation post-formation
        </p>
        <h1 className="display mt-2 text-3xl">{quiz.questionnaire_title}</h1>
        {quiz.module_description && (
          <p className="mt-2 text-sm text-ink/75">{quiz.module_description}</p>
        )}
      </div>
      <div className="space-y-4 p-5">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Identifiez-vous pour commencer
        </p>
        <div>
          <label className="label">Prénom</label>
          <input
            className="input"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Nom</label>
          <input
            className="input"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="border-l-2 border-danger bg-danger/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn w-full border-ink text-paper shadow-hard-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          style={{ backgroundColor: color }}
          disabled={busy}
        >
          {busy ? "…" : "Commencer le quiz →"}
        </button>
      </div>
    </form>
  );
}

function Questions({
  quiz,
  color,
  current,
  setCurrent,
  answers,
  setAnswer,
  onSubmit,
  busy,
  error,
}) {
  const q = quiz.questions[current];
  const total = quiz.questions.length;
  const isLast = current === total - 1;
  const answered =
    q.question_type === "mcq"
      ? answers[q.id] != null
      : (answers[q.id] || "").trim().length > 0;

  return (
    <div className="rise border-2 border-ink bg-surface shadow-hard">
      {/* Segmented progress */}
      <div className="flex gap-1 border-b-2 border-ink p-3">
        {quiz.questions.map((_, i) => (
          <span
            key={i}
            className="h-2 flex-1 border border-ink"
            style={{
              backgroundColor: i <= current ? color : "transparent",
            }}
          />
        ))}
      </div>

      <div className="p-5">
        <p className="font-mono text-[11px] uppercase tracking-eyebrow text-muted">
          Question {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
        <h2 className="mt-2 font-display text-xl font-bold leading-snug">
          {q.text}
        </h2>

        {q.question_type === "mcq" ? (
          <div className="mt-4 space-y-2">
            {q.choices.map((c, idx) => {
              const selected = answers[q.id] === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAnswer(q.id, c.id)}
                  className="flex w-full items-center gap-3 border-2 border-ink p-3 text-left text-sm transition"
                  style={{
                    backgroundColor: selected ? `${color}1f` : "#FBFAF5",
                  }}
                >
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-2 border-ink font-mono text-xs font-medium"
                    style={{
                      backgroundColor: selected ? color : "transparent",
                      color: selected ? "#EFEDE4" : "#15151B",
                    }}
                  >
                    {selected ? "✓" : String.fromCharCode(65 + idx)}
                  </span>
                  <span className="font-medium">{c.text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="input mt-4 min-h-[120px]"
            placeholder="Votre réponse…"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        )}

        {error && (
          <p className="mt-4 border-l-2 border-danger bg-danger/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          {current > 0 && (
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setCurrent(current - 1)}
            >
              ← Précédent
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              className="btn flex-1 border-ink text-paper shadow-hard-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:shadow-none"
              style={{ backgroundColor: color }}
              disabled={busy || !answered}
              onClick={onSubmit}
            >
              {busy ? "Envoi…" : "Terminer ✓"}
            </button>
          ) : (
            <button
              type="button"
              className="btn flex-1 border-ink text-paper shadow-hard-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:shadow-none"
              style={{ backgroundColor: color }}
              disabled={!answered}
              onClick={() => setCurrent(current + 1)}
            >
              Suivant →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Result({ result, color }) {
  return (
    <div className="space-y-4">
      <div className="rise border-2 border-ink bg-surface shadow-hard">
        <div
          className="border-b-2 border-ink p-6 text-center"
          style={{ backgroundColor: `${color}14` }}
        >
          <p className="font-mono text-[11px] uppercase tracking-eyebrow text-muted">
            Votre score
          </p>
          <p
            className="display mt-1 text-7xl"
            style={{ color }}
          >
            {result.score_percent}%
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
            {result.correct_mcq} / {result.total_mcq} bonnes réponses
          </p>
        </div>
      </div>

      {result.questions.map((q, i) => (
        <div
          key={q.question_id}
          className="rise border-2 border-ink bg-surface p-4"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <p className="text-sm font-semibold">
            <span className="mr-1.5 font-mono" style={{ color }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            {q.text}
          </p>
          {q.question_type === "mcq" ? (
            <div className="mt-2 space-y-1.5">
              {q.choices.map((c) => {
                let cls =
                  "flex items-center gap-2 border-2 px-3 py-2 text-sm";
                if (c.is_correct)
                  cls += " border-success bg-success/10 text-success font-medium";
                else if (c.selected)
                  cls += " border-danger bg-danger/10 text-danger";
                else cls += " border-hairline text-muted";
                return (
                  <div key={c.id} className={cls}>
                    <span className="font-mono text-[11px]">
                      {c.is_correct ? "✓" : c.selected ? "✗" : "·"}
                    </span>
                    <span>{c.text}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 border-l-2 border-hairline bg-paper/60 px-3 py-2 text-sm text-ink/75">
              {q.open_text || "—"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
