from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.packages import router as packages_router
from app.api.routes.admin_packages import router as admin_packages_router
from app.api.routes.enquiries import router as enquiries_router
from app.api.routes.activity import router as activity_router
from app.api.routes.blog import router as blog_router
from app.api.routes.quotes import router as quotes_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Tour CMF API",
    version="0.1.0",
    description="Backend API for the Tour CMF public site and admin workspace.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(packages_router, prefix="/api/v1")
app.include_router(admin_packages_router, prefix="/api/v1")
app.include_router(enquiries_router, prefix="/api/v1")
app.include_router(activity_router, prefix="/api/v1")
app.include_router(blog_router, prefix="/api/v1")
app.include_router(quotes_router, prefix="/api/v1")
