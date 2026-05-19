from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import require_super_admin
from app.models import Module, Tenant
from app.qr import generate_qr_png
from app.schemas import ModuleCreate, ModuleOut, ModuleUpdate

router = APIRouter(tags=["modules"], dependencies=[Depends(require_super_admin)])


def _get_tenant(db: Session, tenant_id: int) -> Tenant:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return tenant


def _get_module(db: Session, module_id: int) -> Module:
    module = db.get(Module, module_id)
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Module not found")
    return module


@router.get("/tenants/{tenant_id}/modules", response_model=list[ModuleOut])
def list_modules(tenant_id: int, db: Session = Depends(get_db)):
    _get_tenant(db, tenant_id)
    return db.query(Module).filter(Module.tenant_id == tenant_id).all()


@router.post(
    "/tenants/{tenant_id}/modules",
    response_model=ModuleOut,
    status_code=status.HTTP_201_CREATED,
)
def create_module(tenant_id: int, payload: ModuleCreate, db: Session = Depends(get_db)):
    _get_tenant(db, tenant_id)
    exists = (
        db.query(Module)
        .filter(Module.tenant_id == tenant_id, Module.slug == payload.slug)
        .first()
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already in use for this tenant")
    module = Module(tenant_id=tenant_id, **payload.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.get("/modules/{module_id}", response_model=ModuleOut)
def get_module(module_id: int, db: Session = Depends(get_db)):
    return _get_module(db, module_id)


@router.patch("/modules/{module_id}", response_model=ModuleOut)
def update_module(module_id: int, payload: ModuleUpdate, db: Session = Depends(get_db)):
    module = _get_module(db, module_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(module, key, value)
    db.commit()
    db.refresh(module)
    return module


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(module_id: int, db: Session = Depends(get_db)):
    module = _get_module(db, module_id)
    db.delete(module)
    db.commit()


@router.get("/modules/{module_id}/qr")
def module_qr(module_id: int, db: Session = Depends(get_db)):
    module = _get_module(db, module_id)
    tenant = db.get(Tenant, module.tenant_id)
    url = f"{settings.public_quiz_base_url}/{tenant.slug}/{module.slug}"
    png = generate_qr_png(url)
    return Response(
        content=png,
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="qr-{tenant.slug}-{module.slug}.png"'
        },
    )
