from fastapi import APIRouter, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from fastapi import Depends

router = APIRouter(tags=["system"])


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    """Confirm that the API and its database connection are available."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
