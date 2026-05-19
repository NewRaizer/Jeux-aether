#!/usr/bin/env sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Seeding database..."
python seed.py || echo "Seed skipped or failed (non-fatal)."

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
