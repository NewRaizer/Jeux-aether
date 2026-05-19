from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.database import get_db
from app.deps import require_super_admin
from app.models import Tenant, TenantAdmin
from app.schemas import (
    TenantAdminCreate,
    TenantAdminOut,
    TenantCreate,
    TenantOut,
    TenantUpdate,
)

router = APIRouter(prefix="/tenants", tags=["tenants"], dependencies=[Depends(require_super_admin)])


def _get_tenant(db: Session, tenant_id: int) -> Tenant:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return tenant


@router.get("", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db)):
    return db.query(Tenant).order_by(Tenant.created_at.desc()).all()


@router.post("", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db)):
    if db.query(Tenant).filter(Tenant.slug == payload.slug).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already in use")
    tenant = Tenant(**payload.model_dump())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(tenant_id: int, db: Session = Depends(get_db)):
    return _get_tenant(db, tenant_id)


@router.patch("/{tenant_id}", response_model=TenantOut)
def update_tenant(tenant_id: int, payload: TenantUpdate, db: Session = Depends(get_db)):
    tenant = _get_tenant(db, tenant_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(tenant, key, value)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(tenant_id: int, db: Session = Depends(get_db)):
    tenant = _get_tenant(db, tenant_id)
    db.delete(tenant)
    db.commit()


# ---------- Tenant admins ----------
@router.get("/{tenant_id}/admins", response_model=list[TenantAdminOut])
def list_admins(tenant_id: int, db: Session = Depends(get_db)):
    _get_tenant(db, tenant_id)
    return db.query(TenantAdmin).filter(TenantAdmin.tenant_id == tenant_id).all()


@router.post(
    "/{tenant_id}/admins",
    response_model=TenantAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_admin(tenant_id: int, payload: TenantAdminCreate, db: Session = Depends(get_db)):
    _get_tenant(db, tenant_id)
    if db.query(TenantAdmin).filter(TenantAdmin.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
    admin = TenantAdmin(
        tenant_id=tenant_id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.delete(
    "/{tenant_id}/admins/{admin_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_admin(tenant_id: int, admin_id: int, db: Session = Depends(get_db)):
    admin = db.get(TenantAdmin, admin_id)
    if not admin or admin.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin not found")
    db.delete(admin)
    db.commit()
