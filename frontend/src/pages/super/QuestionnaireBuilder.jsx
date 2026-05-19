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
      // Start a brand-new questionnaire with one blank question.
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
    setQuestions((qs) =>
      qs.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
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

  if (loading) return <p className="text-slate-400">Chargement…</p>;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Retour
      </button>

      <h1 className="mt-3 text-xl font-bold text-slate-800">
        {isNew ? "Nouveau questionnaire" : "Éditer le questionnaire"}
      </h1>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <input
          className="input max-w-md text-lg font-semibold"
          placeholder="Titre du questionnaire"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Éditer" : "Aperçu"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => save()}
            disabled={saving}
          >
            {isNew ? "Créer (brouillon)" : "Enregistrer"}
          </button>
          <button
            className="btn-primary"
            onClick={() => save(true)}
            disabled={saving}
          >
            {isNew ? "Créer & activer" : isActive ? "Enregistrer" : "Enregistrer & activer"}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`mt-2 text-sm ${
            message === "Enregistré." ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
      {!isNew && (
        <p className="mt-1 text-sm text-slate-400">
          Statut :{" "}
          {isActive ? (
            <span className="text-green-600">actif</span>
          ) : (
            "inactif"
          )}
        </p>
      )}

      {preview ? (
        <Preview title={title} questions={questions} />
      ) : (
        <div className="mt-5 space-y-4">
          {questions.map((q, qIdx) => (
            <div key={q.id} className="card space-y-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-sm font-bold text-slate-400">
                  {qIdx + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <textarea
                    className="input"
                    placeholder="Texte de la question"
                    value={q.text}
                    onChange={(e) =>
                      updateQuestion(qIdx, { text: e.target.value })
                    }
                  />
                  <select
                    className="input max-w-xs"
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
                    <option value="mcq">QCM</option>
                    <option value="open">Réponse libre</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="btn-secondary px-2 py-1"
                    onClick={() => moveQuestion(qIdx, -1)}
                    title="Monter"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-secondary px-2 py-1"
                    onClick={() => moveQuestion(qIdx, 1)}
                    title="Descendre"
                  >
                    ↓
                  </button>
                  <button
                    className="btn-secondary px-2 py-1"
                    onClick={() => duplicateQuestion(qIdx)}
                    title="Dupliquer"
                  >
                    ⧉
                  </button>
                  <button
                    className="btn-danger px-2 py-1"
                    onClick={() => removeQuestion(qIdx)}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {q.question_type === "mcq" && (
                <div className="space-y-2 pl-6">
                  {q.choices.map((c, cIdx) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={c.is_correct}
                        onChange={() => setCorrect(qIdx, cIdx)}
                        title="Bonne réponse"
                      />
                      <input
                        className="input"
                        placeholder={`Choix ${cIdx + 1}`}
                        value={c.text}
                        onChange={(e) =>
                          updateChoice(qIdx, cIdx, { text: e.target.value })
                        }
                      />
                      <button
                        className="btn-secondary px-2 py-1"
                        onClick={() => removeChoice(qIdx, cIdx)}
                        disabled={q.choices.length <= 2}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {q.choices.length < 5 && (
                    <button
                      className="text-sm text-indigo-600 hover:underline"
                      onClick={() => addChoice(qIdx)}
                    >
                      + Ajouter un choix
                    </button>
                  )}
                  <p className="text-xs text-slate-400">
                    Cochez le bouton radio en face de la bonne réponse.
                  </p>
                </div>
              )}
            </div>
          ))}

          <button className="btn-primary" onClick={addQuestion}>
            + Ajouter une question
          </button>
        </div>
      )}
    </div>
  );
}

function Preview({ title, questions }) {
  return (
    <div className="mt-5 mx-auto max-w-md">
      <div className="card space-y-4">
        <h2 className="text-lg font-bold">{title || "(sans titre)"}</h2>
        {questions.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <p className="font-medium text-slate-800">
              {i + 1}. {q.text || "(sans texte)"}
            </p>
            {q.question_type === "mcq" ? (
              <div className="space-y-1">
                {q.choices.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded border border-slate-200 p-2 text-sm"
                  >
                    <input type="radio" name={`prev-${q.id}`} disabled />
                    <span>
                      {c.text}
                      {c.is_correct && (
                        <span className="ml-1 text-green-600">✓</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="input"
                disabled
                placeholder="Réponse libre"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
