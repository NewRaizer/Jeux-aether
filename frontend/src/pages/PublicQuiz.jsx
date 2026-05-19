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

  const color = quiz?.tenant_primary_color || "#4f46e5";

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
    } catch (e) {
      setError(e.message || "Erreur à l'envoi");
    } finally {
      setBusy(false);
    }
  }

  if (error && !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: `${color}10` }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
        <header className="mb-6 text-center">
          {quiz.tenant_logo_url && (
            <img
              src={quiz.tenant_logo_url}
              alt={quiz.tenant_name}
              className="mx-auto mb-3 h-16 object-contain"
            />
          )}
          <h1 className="text-lg font-semibold" style={{ color }}>
            {quiz.tenant_name}
          </h1>
          <p className="text-sm text-slate-500">{quiz.module_title}</p>
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
      </div>
    </div>
  );
}

function Intro({ quiz, color, firstname, lastname, setFirstname, setLastname, onStart, busy, error }) {
  return (
    <form onSubmit={onStart} className="card flex-1 space-y-4">
      {quiz.module_description && (
        <p className="text-sm text-slate-600">{quiz.module_description}</p>
      )}
      <p className="text-sm font-medium text-slate-700">
        Entrez votre nom pour commencer le quiz.
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        className="btn w-full text-white"
        style={{ backgroundColor: color }}
        disabled={busy}
      >
        {busy ? "…" : "Commencer le quiz"}
      </button>
    </form>
  );
}

function Questions({ quiz, color, current, setCurrent, answers, setAnswer, onSubmit, busy, error }) {
  const q = quiz.questions[current];
  const isLast = current === quiz.questions.length - 1;
  const answered =
    q.question_type === "mcq"
      ? answers[q.id] != null
      : (answers[q.id] || "").trim().length > 0;

  return (
    <div className="card flex-1 space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Question {current + 1} / {quiz.questions.length}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${((current + 1) / quiz.questions.length) * 100}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      <h2 className="text-base font-semibold text-slate-800">{q.text}</h2>

      {q.question_type === "mcq" ? (
        <div className="space-y-2">
          {q.choices.map((c) => {
            const selected = answers[q.id] === c.id;
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                  selected
                    ? "border-current font-medium"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                style={selected ? { color, backgroundColor: `${color}10` } : {}}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={selected}
                  onChange={() => setAnswer(q.id, c.id)}
                />
                <span className="text-slate-700">{c.text}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          className="input min-h-[120px]"
          placeholder="Votre réponse…"
          value={answers[q.id] || ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        {current > 0 && (
          <button
            className="btn-secondary flex-1"
            onClick={() => setCurrent(current - 1)}
          >
            Précédent
          </button>
        )}
        {isLast ? (
          <button
            className="btn flex-1 text-white"
            style={{ backgroundColor: color }}
            disabled={busy || !answered}
            onClick={onSubmit}
          >
            {busy ? "Envoi…" : "Terminer"}
          </button>
        ) : (
          <button
            className="btn flex-1 text-white"
            style={{ backgroundColor: color }}
            disabled={!answered}
            onClick={() => setCurrent(current + 1)}
          >
            Suivant
          </button>
        )}
      </div>
    </div>
  );
}

function Result({ result, color }) {
  return (
    <div className="space-y-4">
      <div className="card text-center">
        <p className="text-sm text-slate-500">Votre score</p>
        <p className="my-2 text-5xl font-bold" style={{ color }}>
          {result.score_percent}%
        </p>
        <p className="text-sm text-slate-500">
          {result.correct_mcq} / {result.total_mcq} bonnes réponses
        </p>
      </div>

      {result.questions.map((q, i) => (
        <div key={q.question_id} className="card space-y-2">
          <p className="text-sm font-semibold text-slate-800">
            {i + 1}. {q.text}
          </p>
          {q.question_type === "mcq" ? (
            <div className="space-y-1">
              {q.choices.map((c) => {
                let cls = "text-slate-600";
                if (c.is_correct) cls = "text-green-700 font-medium";
                else if (c.selected) cls = "text-red-600 line-through";
                return (
                  <div key={c.id} className={`text-sm ${cls}`}>
                    {c.is_correct ? "✓ " : c.selected ? "✗ " : "• "}
                    {c.text}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded bg-slate-50 p-2 text-sm text-slate-600">
              {q.open_text || "—"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
