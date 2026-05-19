from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_super_admin
from app.models import Choice, Module, Question, Questionnaire
from app.schemas import (
    QuestionIn,
    QuestionnaireCreate,
    QuestionnaireOut,
    QuestionnaireUpdate,
)

router = APIRouter(tags=["questionnaires"], dependencies=[Depends(require_super_admin)])


def _get_module(db: Session, module_id: int) -> Module:
    module = db.get(Module, module_id)
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Module not found")
    return module


def _get_questionnaire(db: Session, q_id: int) -> Questionnaire:
    q = db.get(Questionnaire, q_id)
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not found")
    return q


def _apply_questions(
    db: Session, questionnaire: Questionnaire, questions: list[QuestionIn]
) -> None:
    """Validate and replace the questionnaire's whole question/choice tree."""
    for index, question in enumerate(questions, start=1):
        if question.question_type == "mcq":
            if not 2 <= len(question.choices) <= 5:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    f"Question {index}: MCQ questions need 2-5 choices",
                )
            if sum(1 for c in question.choices if c.is_correct) != 1:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    f"Question {index}: mark exactly one correct choice",
                )

    for old in list(questionnaire.questions):
        db.delete(old)
    db.flush()

    for order, question in enumerate(questions):
        new_q = Question(
            questionnaire_id=questionnaire.id,
            text=question.text,
            question_type=question.question_type,
            order=order,
        )
        db.add(new_q)
        db.flush()
        if question.question_type == "mcq":
            for choice in question.choices:
                db.add(
                    Choice(
                        question_id=new_q.id,
                        text=choice.text,
                        is_correct=choice.is_correct,
                    )
                )


@router.get("/modules/{module_id}/questionnaires", response_model=list[QuestionnaireOut])
def list_questionnaires(module_id: int, db: Session = Depends(get_db)):
    _get_module(db, module_id)
    return (
        db.query(Questionnaire).filter(Questionnaire.module_id == module_id).all()
    )


@router.post(
    "/modules/{module_id}/questionnaires",
    response_model=QuestionnaireOut,
    status_code=status.HTTP_201_CREATED,
)
def create_questionnaire(
    module_id: int, payload: QuestionnaireCreate, db: Session = Depends(get_db)
):
    """Create a questionnaire, optionally with its full question tree in one call."""
    _get_module(db, module_id)
    q = Questionnaire(
        module_id=module_id, title=payload.title, is_active=payload.is_active
    )
    db.add(q)
    db.flush()
    if payload.questions is not None:
        _apply_questions(db, q, payload.questions)
    db.commit()
    db.refresh(q)
    return q


@router.get("/questionnaires/{q_id}", response_model=QuestionnaireOut)
def get_questionnaire(q_id: int, db: Session = Depends(get_db)):
    return _get_questionnaire(db, q_id)


@router.put("/questionnaires/{q_id}", response_model=QuestionnaireOut)
def update_questionnaire(
    q_id: int, payload: QuestionnaireUpdate, db: Session = Depends(get_db)
):
    """Full save: title, active flag, and the complete question/choice tree."""
    q = _get_questionnaire(db, q_id)

    if payload.title is not None:
        q.title = payload.title
    if payload.is_active is not None:
        q.is_active = payload.is_active
    if payload.questions is not None:
        _apply_questions(db, q, payload.questions)

    db.commit()
    db.refresh(q)
    return q


@router.delete("/questionnaires/{q_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_questionnaire(q_id: int, db: Session = Depends(get_db)):
    q = _get_questionnaire(db, q_id)
    db.delete(q)
    db.commit()
