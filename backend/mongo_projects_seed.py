"""
Seeds:
- projects
- myprojectgoals (quarterly)
- myyearlygoals (yearly)

Explainable fixed ObjectIds:
- Project         -> 000...101
- Assign_to entry -> 000...201
- Quarterly goal  -> 000...301
- Yearly goal     -> 000...401
"""

import argparse
from datetime import datetime, timezone, timedelta

from pymongo import MongoClient
from bson import ObjectId


def _utcnow():
    return datetime.now(timezone.utc)


def _lower_email(s: str) -> str:
    return s.strip().lower()


def _staff_id_by_email(staffs_col, email):
    row = staffs_col.find_one({"email": _lower_email(email), "deleted": False})
    return row["_id"] if row else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--uri", required=True)
    parser.add_argument("--db", default="pms")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--pm_email", default="dhaval@healtharkinsights.com")
    parser.add_argument("--staff_email", default="santosh.k@healtharkinsights.com")
    parser.add_argument("--quarter", default="Q4")
    parser.add_argument("--year", default="2025")
    parser.add_argument("--project_code", default="PRJ001")
    parser.add_argument("--project_name", default="Demo PMS Project")
    args = parser.parse_args()

    cl = MongoClient(args.uri)
    db = cl[args.db]

    staffs_col        = db["staffs"]
    projects_col      = db["projects"]
    project_goals_col = db["myprojectgoals"]
    yearly_goals_col  = db["myyearlygoals"]

    if args.reset:
        projects_col.delete_many({})
        project_goals_col.delete_many({})
        yearly_goals_col.delete_many({})

    # IDs from mongo_user_seed.py
    dhaval_id  = _staff_id_by_email(staffs_col, args.pm_email)
    santosh_id = _staff_id_by_email(staffs_col, args.staff_email)
    if not dhaval_id or not santosh_id:
        raise RuntimeError("Dhaval/Santosh not found in staffs. Run mongo_user_seed.py first.")

    now = _utcnow()
    start_date = now
    end_date = now + timedelta(days=90)

    # Simple deterministic ObjectIds for demo
    PROJECT_ID      = ObjectId("000000000000000000000101")
    ASSIGN_TO_ID    = ObjectId("000000000000000000000201")
    PROJECT_GOAL_ID = ObjectId("000000000000000000000301")
    YEARLY_GOAL_ID  = ObjectId("000000000000000000000401")

    # 1) Project
    project_doc = {
        "_id": PROJECT_ID,
        "__v": 0,
        "assign_to": [
            {
                "_id": ASSIGN_TO_ID,
                "projectManager": dhaval_id,
                "secondReviewer": None,
                "staff": santosh_id,
            }
        ],
        "createdAt": now,
        "updatedAt": now,
        "deleted": False,
        "descryption": "Seed project for notifications testing",
        "project_code": args.project_code,
        "project_name": args.project_name,
        "start_date": start_date,
        "end_date": end_date,
        "hours_assign": "0",

        # Optional demo-friendly field
        "slug": "demo-project-1",
    }

    projects_col.replace_one({"_id": PROJECT_ID}, project_doc, upsert=True)

    # 2) Quarterly goal (Santosh updates, Dhaval is PM)
    project_goal_doc = {
        "_id": PROJECT_GOAL_ID,
        "__v": 0,
        "building_client": "Santosh quarterly goal - building client relations",
        "communication": "Santosh quarterly goal - improve communication",
        "ownership": "Santosh quarterly goal - take ownership",
        "problem_solving": "Santosh quarterly goal - improve problem solving",
        "others": "Santosh quarterly goal - other objectives",
        "createdAt": now,
        "updatedAt": now,
        "deleted": False,
        "PMId": dhaval_id,
        "PM2Id": None,
        "projectId": PROJECT_ID,
        "quarter": args.quarter,
        "year": args.year,
        "status": "active",
        "switch": True,
        "userId": santosh_id,

        "slug": f"santosh-qgoal-{args.quarter}-{args.year}",
    }

    project_goals_col.replace_one(
        {
            "userId": santosh_id,
            "projectId": PROJECT_ID,
            "quarter": args.quarter,
            "year": args.year,
        },
        project_goal_doc,
        upsert=True,
    )

    # 3) Yearly goal (Santosh updates, Dhaval is mentor)
    yearly_goal_doc = {
        "_id": YEARLY_GOAL_ID,
        "__v": 0,
        "ownership": "Santosh yearly goal - ownership",
        "productivity": "Santosh yearly goal - productivity",
        "others": "Santosh yearly goal - other objectives",
        "createdAt": now,
        "updatedAt": now,
        "deleted": False,
        "mentorId": dhaval_id,
        "year": args.year,
        "status": "active",
        "switch": True,
        "FinalRatingswitch": False,
        "userId": santosh_id,

        "slug": f"santosh-ygoal-{args.year}",
    }

    yearly_goals_col.replace_one(
        {"userId": santosh_id, "year": args.year},
        yearly_goal_doc,
        upsert=True,
    )

    print("Seeded:")
    print(f"  projects._id={PROJECT_ID}")
    print(f"  myprojectgoals._id={PROJECT_GOAL_ID} (user=Santosh, PM=Dhaval)")
    print(f"  myyearlygoals._id={YEARLY_GOAL_ID} (user=Santosh, mentor=Dhaval)")


if __name__ == "__main__":
    main()
