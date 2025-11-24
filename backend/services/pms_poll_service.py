"""
- Polls PMS MongoDB collections for goal updates and writes notifications into Curie Postgres.
- Handles real Mongo types and Extended JSON dumps ({"$oid":...}, {"$date":...}).
- Skips soft-deleted PMS docs (deleted=True).
- Bootstraps a snapshot on start to avoid notifying on old data.
"""

from __future__ import annotations

import threading
import time
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from pymongo import MongoClient
from bson import ObjectId

from core.settings import settings
from core.db import SessionLocal
from crud.notifications import create_notification_if_absent
from models.notification import NotificationGoalType

log = logging.getLogger("uvicorn.error")

_client: Optional[MongoClient] = None
_stop_flag = False
_thread: Optional[threading.Thread] = None

_last_project_ts: datetime | None = None
_last_yearly_ts: datetime | None = None


# single-line comment: Normalize Mongo ObjectId / Extended JSON {"$oid": "..."} into hex string.
def _normalize_oid(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, dict) and "$oid" in v:
        return str(v["$oid"])
    return str(v)


# single-line comment: Normalize Mongo date / Extended JSON {"$date": "..."} into naive UTC datetime.
def _normalize_date(v: Any) -> Optional[datetime]:
    if v is None:
        return None

    # If already a datetime from pymongo, keep it naive UTC.
    if isinstance(v, datetime):
        if v.tzinfo is None:
            return v  # assume UTC, naive
        # convert aware -> UTC naive
        return v.astimezone(timezone.utc).replace(tzinfo=None)

    # Extended JSON {"$date": "..."}
    if isinstance(v, dict) and "$date" in v:
        try:
            s = str(v["$date"])
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is not None:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                # already naive, assume UTC
                dt = dt
            return dt
        except Exception:
            return None

    return None


# single-line comment: Get (and memoize) Mongo client.
def _get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        if not settings.PMS_MONGO_URI:
            raise RuntimeError("PMS_MONGO_URI not configured")
        _client = MongoClient(settings.PMS_MONGO_URI)
    return _client


# single-line comment: Lookup staff email by staff _id (ignores deleted staff).
def _staff_email_by_id(staffs_col, staff_id: Any) -> Optional[str]:
    oid = _normalize_oid(staff_id)
    if not oid:
        return None
    try:
        row = staffs_col.find_one({"_id": ObjectId(oid), "deleted": False})
    except Exception:
        row = staffs_col.find_one({"_id": oid, "deleted": False})
    if not row:
        return None
    return str(row.get("email") or "").strip().lower() or None


# single-line comment: Bootstrap last timestamps so we do not notify on historical data.
def _bootstrap_last_timestamps(db_name: str) -> None:
    global _last_project_ts, _last_yearly_ts

    cl = _get_mongo_client()
    db = cl[db_name]
    pg_col = db["myprojectgoals"]
    yg_col = db["myyearlygoals"]

    latest_pg = pg_col.find({"deleted": False}).sort("updatedAt", -1).limit(1)
    for doc in latest_pg:
        _last_project_ts = _normalize_date(doc.get("updatedAt"))

    latest_yg = yg_col.find({"deleted": False}).sort("updatedAt", -1).limit(1)
    for doc in latest_yg:
        _last_yearly_ts = _normalize_date(doc.get("updatedAt"))

    log.info(
        "PMS poller bootstrapped last project ts=%s yearly ts=%s",
        _last_project_ts,
        _last_yearly_ts,
    )


# single-line comment: Process new project goal updates and create notifications for PM / second reviewer.
def _process_project_goal_updates(db_name: str) -> None:
    global _last_project_ts

    cl = _get_mongo_client()
    db = cl[db_name]
    goals_col = db["myprojectgoals"]
    staffs_col = db["staffs"]

    last_ts = _last_project_ts or datetime.min  # naive UTC

    cursor = goals_col.find(
        {"deleted": False, "updatedAt": {"$gt": last_ts}}
    ).sort("updatedAt", 1)

    for g in cursor:
        updated_at = _normalize_date(g.get("updatedAt")) or datetime.utcnow()
        goal_id = _normalize_oid(g.get("_id")) or ""
        actor_id = g.get("userId")
        actor_email = _staff_email_by_id(staffs_col, actor_id)

        project_id = _normalize_oid(g.get("projectId"))
        quarter = str(g.get("quarter") or "").strip() or None
        year = str(g.get("year") or "").strip() or None

        pm_id = g.get("PMId")
        pm2_id = g.get("PM2Id")

        pm_email = _staff_email_by_id(staffs_col, pm_id)
        pm2_email = _staff_email_by_id(staffs_col, pm2_id)

        pg_db = SessionLocal()
        try:
            if pm_email:
                create_notification_if_absent(
                    pg_db,
                    recipient_email=pm_email,
                    recipient_role="projectManager",
                    actor_email=actor_email,
                    goal_type=NotificationGoalType.project_goal,
                    goal_id=goal_id,
                    project_id=project_id,
                    quarter=quarter,
                    year=year,
                    message=f"{actor_email or 'A staff member'} updated a quarterly(project) goal.",
                    source_updated_at=updated_at,
                )

            if pm2_email:
                create_notification_if_absent(
                    pg_db,
                    recipient_email=pm2_email,
                    recipient_role="secondReviewer",
                    actor_email=actor_email,
                    goal_type=NotificationGoalType.project_goal,
                    goal_id=goal_id,
                    project_id=project_id,
                    quarter=quarter,
                    year=year,
                    message=f"{actor_email or 'A staff member'} updated a quarterly(project) goal.",
                    source_updated_at=updated_at,
                )
        finally:
            pg_db.close()

        _last_project_ts = max(_last_project_ts or updated_at, updated_at)


# single-line comment: Process new yearly goal updates and create notifications for mentor.
def _process_yearly_goal_updates(db_name: str) -> None:
    global _last_yearly_ts

    cl = _get_mongo_client()
    db = cl[db_name]
    goals_col = db["myyearlygoals"]
    staffs_col = db["staffs"]

    last_ts = _last_yearly_ts or datetime.min  # naive UTC

    cursor = goals_col.find(
        {"deleted": False, "updatedAt": {"$gt": last_ts}}
    ).sort("updatedAt", 1)

    for g in cursor:
        updated_at = _normalize_date(g.get("updatedAt")) or datetime.utcnow()
        goal_id = _normalize_oid(g.get("_id")) or ""
        actor_id = g.get("userId")
        actor_email = _staff_email_by_id(staffs_col, actor_id)

        year = str(g.get("year") or "").strip() or None

        mentor_id = g.get("mentorId")
        mentor_email = _staff_email_by_id(staffs_col, mentor_id)

        pg_db = SessionLocal()
        try:
            if mentor_email:
                create_notification_if_absent(
                    pg_db,
                    recipient_email=mentor_email,
                    recipient_role="mentor",
                    actor_email=actor_email,
                    goal_type=NotificationGoalType.yearly_goal,
                    goal_id=goal_id,
                    project_id=None,
                    quarter=None,
                    year=year,
                    message=f"{actor_email or 'A staff member'} updated a yearly goal.",
                    source_updated_at=updated_at,
                )
        finally:
            pg_db.close()

        _last_yearly_ts = max(_last_yearly_ts or updated_at, updated_at)


# single-line comment: Poll loop running in a daemon thread.
def _poll_loop() -> None:
    db_name = settings.PMS_DB_NAME
    interval = max(10, int(settings.PMS_POLL_INTERVAL_SECONDS or 60))

    _bootstrap_last_timestamps(db_name)

    while not _stop_flag:
        try:
            _process_project_goal_updates(db_name)
            _process_yearly_goal_updates(db_name)
        except Exception as e:
            log.exception("PMS poller error: %s", e)

        time.sleep(interval)


# single-line comment: Public entrypoint to start poller once.
def start_pms_goal_poller() -> None:
    global _thread
    if _thread and _thread.is_alive():
        return
    _thread = threading.Thread(target=_poll_loop, name="pms-goal-poller", daemon=True)
    _thread.start()
    log.info("PMS poller started.")
