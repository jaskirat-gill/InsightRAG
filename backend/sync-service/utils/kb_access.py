from fastapi import HTTPException, status
from typing import Dict, List, Optional

from database import Database


def is_admin_user(current_user: Dict) -> bool:
    return "admin" in current_user.get("roles", [])


async def get_accessible_kb_ids(db: Database, current_user: Dict) -> List[str]:
    if is_admin_user(current_user):
        rows = await db.fetch_all("SELECT kb_id FROM knowledge_bases")
        return [str(row["kb_id"]) for row in rows]

    rows = await db.fetch_all(
        """
        SELECT kb_id
        FROM knowledge_bases
        WHERE owner_id = $1

        UNION

        SELECT uka.kb_id
        FROM user_kb_access uka
        WHERE uka.user_id = $1
        """,
        current_user["user_id"],
    )
    return [str(row["kb_id"]) for row in rows]


async def user_can_read_kb(
    db: Database,
    current_user: Dict,
    kb_id: str,
    kb_record: Optional[Dict] = None,
) -> bool:
    if is_admin_user(current_user):
        return True

    kb = kb_record
    if kb is None:
        kb = await db.fetch_one(
            "SELECT kb_id, owner_id FROM knowledge_bases WHERE kb_id = $1",
            kb_id,
        )

    if not kb:
        return False

    if str(kb["owner_id"]) == current_user["user_id"]:
        return True

    grant = await db.fetch_one(
        "SELECT 1 FROM user_kb_access WHERE user_id = $1 AND kb_id = $2",
        current_user["user_id"],
        kb_id,
    )
    return bool(grant)


async def user_can_manage_kb(
    db: Database,
    current_user: Dict,
    kb_id: str,
    kb_record: Optional[Dict] = None,
) -> bool:
    if is_admin_user(current_user):
        return True

    kb = kb_record
    if kb is None:
        kb = await db.fetch_one(
            "SELECT kb_id, owner_id FROM knowledge_bases WHERE kb_id = $1",
            kb_id,
        )

    if not kb:
        return False

    return str(kb["owner_id"]) == current_user["user_id"]


async def require_kb_read_access(db: Database, current_user: Dict, kb_id: str) -> Dict:
    kb = await db.fetch_one(
        "SELECT * FROM knowledge_bases WHERE kb_id = $1",
        kb_id,
    )
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KB not found")

    if not await user_can_read_kb(db, current_user, kb_id, kb):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return dict(kb)


async def require_kb_manage_access(db: Database, current_user: Dict, kb_id: str) -> Dict:
    kb = await db.fetch_one(
        "SELECT * FROM knowledge_bases WHERE kb_id = $1",
        kb_id,
    )
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KB not found")

    if not await user_can_manage_kb(db, current_user, kb_id, kb):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return dict(kb)


async def list_manageable_kbs(db: Database, current_user: Dict):
    if is_admin_user(current_user):
        return await db.fetch_all(
            "SELECT * FROM knowledge_bases ORDER BY created_at DESC"
        )

    return await db.fetch_all(
        "SELECT * FROM knowledge_bases WHERE owner_id = $1 ORDER BY created_at DESC",
        current_user["user_id"],
    )