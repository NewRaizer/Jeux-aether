from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models import SuperAdmin, TenantAdmin
from app.schemas import LoginRequest, RefreshRequest, TokenPair

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    sa = db.query(SuperAdmin).filter(SuperAdmin.email == payload.email).first()
    if sa and verify_password(payload.password, sa.hashed_password):
        return TokenPair(
            access_token=create_access_token(sa.email, "super_admin"),
            refresh_token=create_refresh_token(sa.email, "super_admin"),
            role="super_admin",
        )

    ta = db.query(TenantAdmin).filter(TenantAdmin.email == payload.email).first()
    if ta and verify_password(payload.password, ta.hashed_password):
        return TokenPair(
            access_token=create_access_token(ta.email, "tenant_admin"),
            refresh_token=create_refresh_token(ta.email, "tenant_admin"),
            role="tenant_admin",
        )

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    sub, role = data["sub"], data["role"]
    return TokenPair(
        access_token=create_access_token(sub, role),
        refresh_token=create_refresh_token(sub, role),
        role=role,
    )


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    if user.role == "super_admin":
        return {
            "role": "super_admin",
            "email": user.super_admin.email,
            "full_name": user.super_admin.full_name,
        }
    return {
        "role": "tenant_admin",
        "email": user.tenant_admin.email,
        "full_name": user.tenant_admin.full_name,
        "tenant_id": user.tenant_admin.tenant_id,
        "tenant_role": user.tenant_admin.role,
    }
