from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.audit_log import ActivityLog
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin/activity", tags=["activity"])
Staff = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.CONSULTANT))]
Db = Annotated[Session, Depends(get_db)]


@router.get("")
def list_activity(_: Staff, db: Db, limit: int = 100) -> list[dict]:
    entries = db.scalars(
        select(ActivityLog).options(selectinload(ActivityLog.actor)).order_by(ActivityLog.created_at.desc()).limit(min(limit, 200))
    ).all()
    return [{"id": row.id, "action": row.action, "entity_type": row.entity_type, "entity_id": row.entity_id,
             "details": row.details, "created_at": row.created_at, "actor": row.actor.name if row.actor else "System"}
            for row in entries]
