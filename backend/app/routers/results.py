import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models import (
    Answer,
    Choice,
    Module,
    Question,
    Questionnaire,
    QuizSession,
)
from app.schemas import AnswerDetail, SessionDetailOut, SessionResultOut

router = APIRouter(prefix="/results", tags=["results"])


def _base_query(db: Session, user: CurrentUser):
    """Sessions joined to module/questionnaire, scoped to the caller's tenant."""
    q = (
        db.query(QuizSession, Module, Questionnaire)
        .join(Questionnaire, QuizSession.questionnaire_id == Questionnaire.id)
        .join(Module, Questionnaire.module_id == Module.id)
    )
    if user.role == "tenant_admin":
        q = q.filter(Module.tenant_id == user.tenant_id)
    return q


def _apply_filters(q, module_id, learner, date_from, date_to):
    if module_id is not None:
        q = q.filter(Module.id == module_id)
    if learner:
        like = f"%{learner.lower()}%"
        from sqlalchemy import func, or_

        q = q.filter(
            or_(
                func.lower(QuizSession.learner_firstname).like(like),
                func.lower(QuizSession.learner_lastname).like(like),
            )
        )
    if date_from:
        q = q.filter(QuizSession.started_at >= date_from)
    if date_to:
        q = q.filter(QuizSession.started_at <= date_to)
    return q


def _rows(db, user, module_id, learner, date_from, date_to, tenant_id=None):
    q = _base_query(db, user)
    if tenant_id is not None and user.role == "super_admin":
        q = q.filter(Module.tenant_id == tenant_id)
    q = _apply_filters(q, module_id, learner, date_from, date_to)
    return q.order_by(QuizSession.started_at.desc()).all()


@router.get("", response_model=list[SessionResultOut])
def list_results(
    module_id: int | None = None,
    tenant_id: int | None = None,
    learner: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    rows = _rows(db, user, module_id, learner, date_from, date_to, tenant_id)
    return [
        SessionResultOut(
            id=s.id,
            learner_firstname=s.learner_firstname,
            learner_lastname=s.learner_lastname,
            started_at=s.started_at,
            completed_at=s.completed_at,
            score_percent=s.score_percent,
            module_id=m.id,
            module_title=m.title,
            questionnaire_title=qn.title,
        )
        for s, m, qn in rows
    ]


@router.get("/export.csv")
def export_csv(
    module_id: int | None = None,
    tenant_id: int | None = None,
    learner: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    rows = _rows(db, user, module_id, learner, date_from, date_to, tenant_id)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["First name", "Last name", "Module", "Questionnaire", "Started", "Completed", "Score %"]
    )
    for s, m, qn in rows:
        writer.writerow(
            [
                s.learner_firstname,
                s.learner_lastname,
                m.title,
                qn.title,
                s.started_at.isoformat() if s.started_at else "",
                s.completed_at.isoformat() if s.completed_at else "",
                s.score_percent if s.score_percent is not None else "",
            ]
        )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )


@router.get("/{session_id}", response_model=SessionDetailOut)
def get_result_detail(
    session_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    row = _base_query(db, user).filter(QuizSession.id == session_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Result not found")
    session, module, questionnaire = row

    answers: list[AnswerDetail] = []
    for ans in db.query(Answer).filter(Answer.session_id == session.id).all():
        question = db.get(Question, ans.question_id)
        if not question:
            continue
        choice_text = None
        choice_correct = None
        if ans.selected_choice_id is not None:
            choice = db.get(Choice, ans.selected_choice_id)
            if choice:
                choice_text = choice.text
                choice_correct = choice.is_correct
        answers.append(
            AnswerDetail(
                question_id=question.id,
                question_text=question.text,
                question_type=question.question_type,
                selected_choice_text=choice_text,
                selected_is_correct=choice_correct,
                open_text=ans.open_text,
            )
        )

    return SessionDetailOut(
        id=session.id,
        learner_firstname=session.learner_firstname,
        learner_lastname=session.learner_lastname,
        started_at=session.started_at,
        completed_at=session.completed_at,
        score_percent=session.score_percent,
        module_id=module.id,
        module_title=module.title,
        questionnaire_title=questionnaire.title,
        answers=answers,
    )
