"""
Seeds PMS staffs with explainable fixed ObjectIds.

IDs used (easy to explain to manager):
- Dhaval  -> 000...001
- Santosh -> 000...002
"""

import argparse
from datetime import datetime, timezone

from pymongo import MongoClient
from bson import ObjectId


def _utcnow():
    return datetime.now(timezone.utc)


def _lower_email(s: str) -> str:
    return s.strip().lower()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--uri", required=True)
    parser.add_argument("--db", default="pms")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--pm_email", default="dhaval@healtharkinsights.com")
    parser.add_argument("--staff_email", default="santosh.k@healtharkinsights.com")
    args = parser.parse_args()

    cl = MongoClient(args.uri)
    db = cl[args.db]
    staffs_col = db["staffs"]

    if args.reset:
        staffs_col.delete_many({})

    now = _utcnow()

    # Simple, deterministic ObjectIds
    DHAVAL_ID  = ObjectId("000000000000000000000001")
    SANTOSH_ID = ObjectId("000000000000000000000002")

    dhaval_doc = {
        "_id": DHAVAL_ID,
        "__v": 0,
        "createdAt": now,
        "updatedAt": now,
        "deleted": False,
        "designation": "Project Manager / Mentor",
        "email": _lower_email(args.pm_email),
        "employee_code": "PM001",
        "employee_name": "Dhaval Vasavada",
        "password": "x",
        "phone": "9999999999",
        "role": "projectManager",

        # Optional demo-friendly field (doesn't break schema)
        "slug": "dhaval-pm-mentor",
    }

    santosh_doc = {
        "_id": SANTOSH_ID,
        "__v": 0,
        "createdAt": now,
        "updatedAt": now,
        "deleted": False,
        "designation": "Staff / Mentee",
        "email": _lower_email(args.staff_email),
        "employee_code": "ST001",
        "employee_name": "Santosh K",
        "password": "x",
        "phone": "8888888888",
        "role": "staff",
        "mentor": DHAVAL_ID,  # mentee -> mentor

        # Optional demo-friendly field
        "slug": "santosh-mentee",
    }

    staffs_col.replace_one({"email": dhaval_doc["email"]}, dhaval_doc, upsert=True)
    staffs_col.replace_one({"email": santosh_doc["email"]}, santosh_doc, upsert=True)

    print("Seeded staffs:")
    print(f"  Dhaval  _id={DHAVAL_ID} email={dhaval_doc['email']}")
    print(f"  Santosh _id={SANTOSH_ID} email={santosh_doc['email']} mentor={DHAVAL_ID}")


if __name__ == "__main__":
    main()
