from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import decode_token
from app.database import get_db
from app.models import SuperAdmin, TenantAdmin

bearer = HTTPBearer(auto_error=True)


class CurrentUser:
    def __init__(self, role: str, sub: str, super_admin=None, tenant_admin=None):
        self.role = role
        self.sub = sub
        self.super_admin = super_admin
        self.tenant_admin = tenant_admin

    @property
    def tenant_id(self) -> int | None:
        return self.tenant_admin.tenant_id if self.tenant_admin else None


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> CurrentUser:
    payload = decode_token(creds.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    role = payload.get("role")
    sub = payload.get("sub")

    if role == "super_admin":
        sa = db.query(SuperAdmin).filter(SuperAdmin.email == sub).first()
        if not sa:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found")
        return CurrentUser(role="super_admin", sub=sub, super_admin=sa)

    ta = db.query(TenantAdmin).filter(TenantAdmin.email == sub).first()
    if not ta:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found")
    return CurrentUser(role="tenant_admin", sub=sub, tenant_admin=ta)


def require_super_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super admin access required")
    return user
