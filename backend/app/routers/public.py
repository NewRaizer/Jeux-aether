from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Answer, Choice, Module, Question, Questionnaire, QuizSession, Tenant
from app.ratelimit import limiter
from app.schemas import (
    PublicQuizOut,
    QuestionPublic,
    QuizResultChoice,
    QuizResultOut,
    QuizResultQuestion,
    QuizStartRequest,
    QuizSubmitRequest,
)

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/quiz/{tenant_slug}/{module_slug}", response_model=PublicQuizOut)
@limiter.limit("30/minute")
def get_public_quiz(
    request: Request, tenant_slug: str, module_slug: str, db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz not found")

    module = (
        db.query(Module)
        .filter(
            Module.tenant_id == tenant.id,
            Module.slug == module_slug,
            Module.is_active.is_(True),
        )
        .first()
    )
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz not found")

    questionnaire = (
        db.query(Questionnaire)
        .filter(
            Questionnaire.module_id == module.id,
            Questionnaire.is_active.is_(True),
        )
        .first()
    )
    if not questionnaire:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active questionnaire")

    return PublicQuizOut(
        tenant_name=tenant.name,
        tenant_logo_url=tenant.logo_url,
        tenant_primary_color=tenant.primary_color,
        module_title=module.title,
        module_description=module.description,
        questionnaire_id=questionnaire.id,
        questionnaire_title=questionnaire.title,
        questions=[QuestionPublic.model_validate(q) for q in questionnaire.questions],
    )


@router.post("/quiz/start")
@limiter.limit("30/minute")
def start_quiz(request: Request, payload: QuizStartRequest, db: Session = Depends(get_db)):
    questionnaire = db.get(Questionnaire, payload.questionnaire_id)
    if not questionnaire or not questionnaire.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not available")

    session = QuizSession(
        questionnaire_id=questionnaire.id,
        learner_firstname=payload.learner_firstname.strip(),
        learner_lastname=payload.learner_lastname.strip(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id}


@router.post("/quiz/submit", response_model=QuizResultOut)
@limiter.limit("30/minute")
def submit_quiz(
    request: Request, payload: QuizSubmitRequest, db: Session = Depends(get_db)
):
    session = db.get(QuizSession, payload.session_id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    if session.completed_at:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quiz already submitted")

    questions = {
        q.id: q
        for q in db.query(Question)
        .filter(Question.questionnaire_id == session.questionnaire_id)
        .all()
    }

    total_mcq = sum(1 for q in questions.values() if q.question_type == "mcq")
    correct_mcq = 0

    for ans in payload.answers:
        question = questions.get(ans.question_id)
        if not question:
            continue
        answer = Answer(
            session_id=session.id,
            question_id=question.id,
            selected_choice_id=ans.selected_choice_id,
            open_text=ans.open_text,
        )
        db.add(answer)
        if question.question_type == "mcq" and ans.selected_choice_id is not None:
            choice = db.get(Choice, ans.selected_choice_id)
            if choice and choice.question_id == question.id and choice.is_correct:
                correct_mcq += 1

    score = round((correct_mcq / total_mcq) * 100, 1) if total_mcq else 0.0
    session.score_percent = score
    session.completed_at = datetime.utcnow()
    db.commit()

    result_questions: list[QuizResultQuestion] = []
    submitted = {a.question_id: a for a in payload.answers}
    for q in sorted(questions.values(), key=lambda x: x.order):
        given = submitted.get(q.id)
        if q.question_type == "mcq":
            choices = [
                QuizResultChoice(
                    id=c.id,
                    text=c.text,
                    is_correct=c.is_correct,
                    selected=bool(given and given.selected_choice_id == c.id),
                )
                for c in q.choices
            ]
            result_questions.append(
                QuizResultQuestion(
                    question_id=q.id,
                    text=q.text,
                    question_type=q.question_type,
                    choices=choices,
                )
            )
        else:
            result_questions.append(
                QuizResultQuestion(
                    question_id=q.id,
                    text=q.text,
                    question_type=q.question_type,
                    open_text=given.open_text if given else None,
                )
            )

    return QuizResultOut(
        session_id=session.id,
        score_percent=score,
        total_mcq=total_mcq,
        correct_mcq=correct_mcq,
        questions=result_questions,
    )
