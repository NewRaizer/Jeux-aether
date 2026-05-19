"""Seed the database with the Super Admin account and a demo tenant.

Usage: python seed.py
"""
from datetime import datetime

from app.auth import hash_password
from app.config import settings
from app.database import SessionLocal
from app.models import (
    Choice,
    Module,
    Question,
    Questionnaire,
    SuperAdmin,
    Tenant,
    TenantAdmin,
)


def seed() -> None:
    db = SessionLocal()
    try:
        # Super Admin
        if not db.query(SuperAdmin).filter(SuperAdmin.email == settings.super_admin_email).first():
            db.add(
                SuperAdmin(
                    email=settings.super_admin_email,
                    hashed_password=hash_password(settings.super_admin_password),
                    full_name=settings.super_admin_name,
                )
            )
            print(f"Created super admin: {settings.super_admin_email}")
        else:
            print("Super admin already exists, skipping.")

        # Demo tenant
        tenant = db.query(Tenant).filter(Tenant.slug == "logistique-dupont").first()
        if not tenant:
            tenant = Tenant(
                name="Logistique Dupont",
                slug="logistique-dupont",
                logo_url=None,
                primary_color="#0ea5e9",
                created_at=datetime.utcnow(),
            )
            db.add(tenant)
            db.flush()

            db.add(
                TenantAdmin(
                    tenant_id=tenant.id,
                    email="formateur@logistique-dupont.fr",
                    hashed_password=hash_password("Formateur123!"),
                    full_name="Formateur Dupont",
                    role="admin",
                )
            )

            module = Module(
                tenant_id=tenant.id,
                title="Sécurité chariot élévateur",
                description="Évaluation après la session VR de conduite de chariot.",
                slug="securite-chariot",
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(module)
            db.flush()

            questionnaire = Questionnaire(
                module_id=module.id,
                title="Quiz sécurité chariot élévateur",
                is_active=True,
            )
            db.add(questionnaire)
            db.flush()

            q1 = Question(
                questionnaire_id=questionnaire.id,
                text="Avant de démarrer le chariot, que devez-vous vérifier en priorité ?",
                question_type="mcq",
                order=0,
            )
            db.add(q1)
            db.flush()
            db.add_all(
                [
                    Choice(question_id=q1.id, text="La couleur du chariot", is_correct=False),
                    Choice(question_id=q1.id, text="Les freins et l'avertisseur sonore", is_correct=True),
                    Choice(question_id=q1.id, text="La météo", is_correct=False),
                ]
            )

            q2 = Question(
                questionnaire_id=questionnaire.id,
                text="Quelle est la vitesse maximale en entrepôt ?",
                question_type="mcq",
                order=1,
            )
            db.add(q2)
            db.flush()
            db.add_all(
                [
                    Choice(question_id=q2.id, text="6 km/h", is_correct=True),
                    Choice(question_id=q2.id, text="25 km/h", is_correct=False),
                    Choice(question_id=q2.id, text="Aucune limite", is_correct=False),
                ]
            )

            q3 = Question(
                questionnaire_id=questionnaire.id,
                text="Décrivez une situation à risque rencontrée pendant la session VR.",
                question_type="open",
                order=2,
            )
            db.add(q3)

            print("Created demo tenant 'logistique-dupont' with module + questionnaire.")
        else:
            print("Demo tenant already exists, skipping.")

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
