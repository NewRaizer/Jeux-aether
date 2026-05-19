from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.ratelimit import limiter
from app.routers import auth, modules, public, questionnaires, results, tenants

app = FastAPI(title="Immersyte Quiz API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(modules.router)
app.include_router(questionnaires.router)
app.include_router(public.router)
app.include_router(results.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
