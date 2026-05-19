import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";

let tempId = -1;
const nextTempId = () => tempId--;

function emptyChoice() {
  return { id: nextTempId(), text: "", is_correct: false };
}

function emptyQuestion(order) {
  return {
    id: nextTempId(),
    text: "",
    question_type: "mcq",
    order,
    choices: [emptyChoice(), emptyChoice()],
  };
}

export default function QuestionnaireBuilder() {
  const { questionnaireId, moduleId } = useParams();
  const isNew = !questionnaireId;
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isNew) {
      setQuestions([emptyQuestion(0)]);
      return;
    }
    api.get(`/questionnaires/${questionnaireId}`).then((q) => {
      setTitle(q.title);
      setIsActive(q.is_active);
      setQuestions(
        q.questions.map((qu) => ({
          ...qu,
          choices: qu.choices.map((c) => ({ ...c })),
        }))
      );
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaireId]);

  function updateQuestion(idx, patch) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion(qs.length)]);
  }

  function duplicateQuestion(idx) {
    setQuestions((qs) => {
      const src = qs[idx];
      const copy = {
        ...src,
        id: nextTempId(),
        choices: src.choices.map((c) => ({ ...c, id: nextTempId() })),
      };
      const next = [...qs.slice(0, idx + 1), copy, ...qs.slice(idx + 1)];
      return next.map((q, i) => ({ ...q, order: i }));
    });
  }

  function removeQuestion(idx) {
    setQuestions((qs) =>
      qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i }))
    );
  }

  function moveQuestion(idx, dir) {
    setQuestions((qs) => {
      const next = [...qs];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return qs;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((q, i) => ({ ...q, order: i }));
    });
  }

  function updateChoice(qIdx, cIdx, patch) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          choices: q.choices.map((c, j) =>
            j === cIdx ? { ...c, ...patch } : c
          ),
        };
      })
    );
  }

  function setCorrect(qIdx, cIdx) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          choices: q.choices.map((c, j) => ({ ...c, is_correct: j === cIdx })),
        };
      })
    );
  }

  function addChoice(qIdx) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx || q.choices.length >= 5) return q;
        return { ...q, choices: [...q.choices, emptyChoice()] };
      })
    );
  }

  function removeChoice(qIdx, cIdx) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx || q.choices.length <= 2) return q;
        return { ...q, choices: q.choices.filter((_, j) => j !== cIdx) };
      })
    );
  }

  function validate() {
    if (!title.trim()) return "Le titre du questionnaire est vide.";
    if (questions.length === 0) return "Ajoutez au moins une question.";
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) return `Question ${i + 1} : le texte est vide.`;
      if (q.question_type === "mcq") {
        if (q.choices.length < 2 || q.choices.length > 5)
          return `Question ${i + 1} : 2 à 5 choix requis.`;
        if (q.choices.some((c) => !c.text.trim()))
          return `Question ${i + 1} : un choix est vide.`;
        if (q.choices.filter((c) => c.is_correct).length !== 1)
          return `Question ${i + 1} : marquez exactement une bonne réponse.`;
      }
    }
    return null;
  }

  async function save(activate) {
    setMessage("");
    const err = validate();
    if (err) {
      setMessage(err);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        is_active: activate !== undefined ? activate : isActive,
        questions: questions.map((q, i) => ({
          text: q.text,
          question_type: q.question_type,
          order: i,
          choices:
            q.question_type === "mcq"
              ? q.choices.map((c) => ({
                  text: c.text,
                  is_correct: c.is_correct,
                }))
              : [],
        })),
      };

      if (isNew) {
        const created = await api.post(
          `/modules/${moduleId}/questionnaires`,
          payload
        );
        navigate(`/admin/questionnaires/${created.id}`, { replace: true });
        return;
      }

      const updated = await api.put(
        `/questionnaires/${questionnaireId}`,
        payload
      );
      setIsActive(updated.is_active);
      setQuestions(
        updated.questions.map((qu) => ({
          ...qu,
          choices: qu.choices.map((c) => ({ ...c })),
        }))
      );
      setMessage("Enregistré.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <p className="font-mono text-sm uppercase tracking-wide text-muted">
        Chargement…
      </p>
    );

  const mcqCount = questions.filter((q) => q.question_type === "mcq").length;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn-ghost">
        ← Retour
      </button>

      {/* Sticky command bar */}
      <div className="sticky top-[57px] z-30 mt-3 border-2 border-ink bg-surface shadow-hard-sm">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">
              {isNew ? "Nouveau questionnaire" : "Éditer le questionnaire"}
            </p>
            <input
              className="mt-1.5 w-full max-w-lg border-0 border-b-2 border-ink bg-transparent px-0 pb-1 font-display text-2xl font-extrabold focus:border-accent focus:outline-none"
              placeholder="Titre du questionnaire"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "← Éditer" : "Aperçu"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => save()}
              disabled={saving}
            >
              {isNew ? "Brouillon" : "Enregistrer"}
            </button>
            <button
              className="btn-primary"
              onClick={() => save(true)}
              disabled={saving}
            >
              {isNew
                ? "Créer & activer"
                : isActive
                ? "Enregistrer"
                : "Activer →"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t-2 border-ink bg-paper/60 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          <span>
            Statut ·{" "}
            {isNew ? (
              <span className="text-ink">brouillon</span>
            ) : isActive ? (
              <span className="text-success">actif</span>
            ) : (
              <span className="text-ink">inactif</span>
            )}
          </span>
          <span>{questions.length} question(s)</span>
          <span>{mcqCount} QCM notées</span>
        </div>
      </div>

      {message && (
        <p
          className={`mt-4 border-l-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wide ${
            message === "Enregistré."
              ? "border-success bg-success/10 text-success"
              : "border-danger bg-danger/10 text-danger"
          }`}
        >
          {message}
        </p>
      )}

      {preview ? (
        <Preview title={title} questions={questions} />
      ) : (
        <div className="mt-5 space-y-4">
          {questions.map((q, qIdx) => (
            <div key={q.id} className="card flex">
              {/* Number rail */}
              <div className="flex w-14 flex-col items-center gap-2 border-r-2 border-ink bg-ink py-4">
                <span className="font-display text-2xl font-extrabold text-paper">
                  {String(qIdx + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-accent">
                  {q.question_type === "mcq" ? "QCM" : "Libre"}
                </span>
              </div>

              <div className="flex-1 space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <textarea
                    className="input min-h-[52px] flex-1"
                    placeholder="Énoncé de la question…"
                    value={q.text}
                    onChange={(e) =>
                      updateQuestion(qIdx, { text: e.target.value })
                    }
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      className="btn-icon"
                      onClick={() => moveQuestion(qIdx, -1)}
                      disabled={qIdx === 0}
                      title="Monter"
                    >
                      ↑
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => moveQuestion(qIdx, 1)}
                      disabled={qIdx === questions.length - 1}
                      title="Descendre"
                    >
                      ↓
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => duplicateQuestion(qIdx)}
                      title="Dupliquer"
                    >
                      ⧉
                    </button>
                    <button
                      className="btn-icon hover:!bg-danger"
                      onClick={() => removeQuestion(qIdx)}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <select
                  className="input max-w-[200px]"
                  value={q.question_type}
                  onChange={(e) =>
                    updateQuestion(qIdx, {
                      question_type: e.target.value,
                      choices:
                        e.target.value === "mcq"
                          ? q.choices.length
                            ? q.choices
                            : [emptyChoice(), emptyChoice()]
                          : q.choices,
                    })
                  }
                >
                  <option value="mcq">QCM (notée)</option>
                  <option value="open">Réponse libre</option>
                </select>

                {q.question_type === "mcq" && (
                  <div className="space-y-2">
                    <p className="eyebrow">
                      Choix · cochez la bonne réponse
                    </p>
                    {q.choices.map((c, cIdx) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrect(qIdx, cIdx)}
                          title="Marquer comme correcte"
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center border-2 border-ink font-mono text-xs transition ${
                            c.is_correct
                              ? "bg-success text-paper"
                              : "bg-surface text-muted hover:bg-paper"
                          }`}
                        >
                          {c.is_correct ? "✓" : String.fromCharCode(65 + cIdx)}
                        </button>
                        <input
                          className="input"
                          placeholder={`Choix ${cIdx + 1}`}
                          value={c.text}
                          onChange={(e) =>
                            updateChoice(qIdx, cIdx, { text: e.target.value })
                          }
                        />
                        <button
                          className="btn-icon"
                          onClick={() => removeChoice(qIdx, cIdx)}
                          disabled={q.choices.length <= 2}
                          title="Retirer ce choix"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {q.choices.length < 5 && (
                      <button
                        className="btn-ghost"
                        onClick={() => addChoice(qIdx)}
                      >
                        + Ajouter un choix
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-ink bg-surface py-4 font-mono text-[12px] font-medium uppercase tracking-[0.08em] transition hover:bg-ink hover:text-paper"
            onClick={addQuestion}
          >
            + Ajouter une question
          </button>
        </div>
      )}
    </div>
  );
}

function Preview({ title, questions }) {
  return (
    <div className="mt-6">
      <p className="eyebrow mb-3 text-center">Aperçu apprenant — mobile</p>
      <div className="mx-auto max-w-[380px] border-2 border-ink bg-surface p-1 shadow-hard">
        <div className="border-2 border-ink bg-paper p-5">
          <p className="eyebrow">Quiz</p>
          <h2 className="display mt-1 text-xl">{title || "(sans titre)"}</h2>
          <div className="mt-5 space-y-5">
            {questions.map((q, i) => (
              <div key={q.id}>
                <p className="text-sm font-semibold">
                  <span className="mr-1.5 font-mono text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {q.text || "(sans texte)"}
                </p>
                {q.question_type === "mcq" ? (
                  <div className="mt-2 space-y-1.5">
                    {q.choices.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm"
                      >
                        <span className="h-3 w-3 rounded-full border-2 border-ink" />
                        <span>{c.text || "—"}</span>
                        {c.is_correct && (
                          <span className="ml-auto font-mono text-[10px] uppercase text-success">
                            correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 h-16 border-2 border-ink bg-surface" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
