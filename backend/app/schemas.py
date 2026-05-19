from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------- Tenant ----------
class TenantBase(BaseModel):
    name: str
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    logo_url: str | None = None
    primary_color: str = "#4f46e5"


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None


class TenantOut(TenantBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ---------- Tenant Admin ----------
class TenantAdminCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: str = "admin"


class TenantAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
    email: EmailStr
    full_name: str
    role: str


# ---------- Module ----------
class ModuleBase(BaseModel):
    title: str
    description: str | None = None
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    is_active: bool = True


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None


class ModuleOut(ModuleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
    created_at: datetime


# ---------- Choice ----------
class ChoiceIn(BaseModel):
    id: int | None = None
    text: str
    is_correct: bool = False


class ChoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    is_correct: bool


class ChoicePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str


# ---------- Question ----------
class QuestionIn(BaseModel):
    id: int | None = None
    text: str
    question_type: str = "mcq"
    order: int = 0
    choices: list[ChoiceIn] = []


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    question_type: str
    order: int
    choices: list[ChoiceOut] = []


class QuestionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    question_type: str
    order: int
    choices: list[ChoicePublic] = []


# ---------- Questionnaire ----------
class QuestionnaireCreate(BaseModel):
    title: str
    is_active: bool = False


class QuestionnaireUpdate(BaseModel):
    title: str | None = None
    is_active: bool | None = None
    questions: list[QuestionIn] | None = None


class QuestionnaireOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    module_id: int
    title: str
    is_active: bool
    questions: list[QuestionOut] = []


# ---------- Public quiz ----------
class PublicQuizOut(BaseModel):
    tenant_name: str
    tenant_logo_url: str | None
    tenant_primary_color: str
    module_title: str
    module_description: str | None
    questionnaire_id: int
    questionnaire_title: str
    questions: list[QuestionPublic]


class QuizStartRequest(BaseModel):
    questionnaire_id: int
    learner_firstname: str = Field(min_length=1)
    learner_lastname: str = Field(min_length=1)


class AnswerSubmit(BaseModel):
    question_id: int
    selected_choice_id: int | None = None
    open_text: str | None = None


class QuizSubmitRequest(BaseModel):
    session_id: int
    answers: list[AnswerSubmit]


class QuizResultChoice(BaseModel):
    id: int
    text: str
    is_correct: bool
    selected: bool


class QuizResultQuestion(BaseModel):
    question_id: int
    text: str
    question_type: str
    choices: list[QuizResultChoice] = []
    open_text: str | None = None


class QuizResultOut(BaseModel):
    session_id: int
    score_percent: float
    total_mcq: int
    correct_mcq: int
    questions: list[QuizResultQuestion]


# ---------- Results ----------
class AnswerDetail(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    selected_choice_text: str | None = None
    selected_is_correct: bool | None = None
    open_text: str | None = None


class SessionResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    learner_firstname: str
    learner_lastname: str
    started_at: datetime
    completed_at: datetime | None
    score_percent: float | None
    module_id: int
    module_title: str
    questionnaire_title: str


class SessionDetailOut(SessionResultOut):
    answers: list[AnswerDetail] = []
