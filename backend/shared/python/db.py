import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

_TABLE_RECORDS = os.environ.get("TABLE_RECORDS", "cea-records")
_TABLE_USERS   = os.environ.get("TABLE_USERS",   "cea-users")
_ENDPOINT      = os.environ.get("DYNAMODB_ENDPOINT") or None

# Cliente reutilizable entre invocaciones (warm start)
_dynamodb = None


def _ddb():
    global _dynamodb
    if _dynamodb is None:
        kwargs = {"region_name": os.environ.get("AWS_DEFAULT_REGION", "us-east-1")}
        if _ENDPOINT:
            kwargs["endpoint_url"] = _ENDPOINT
        _dynamodb = boto3.resource("dynamodb", **kwargs)
    return _dynamodb


def _records():
    return _ddb().Table(_TABLE_RECORDS)


def _users():
    return _ddb().Table(_TABLE_USERS)


def list_by_resource(resource: str) -> list[dict]:
    resp = _records().query(KeyConditionExpression=Key("resource").eq(resource))
    return resp.get("Items", [])


def get_one(resource: str, item_id: str) -> dict | None:
    resp = _records().get_item(Key={"resource": resource, "id": item_id})
    return resp.get("Item")


def create(resource: str, payload: dict) -> dict:
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "resource": resource,
        "id": item_id,
        "created_at": now,
        "updated_at": now,
        **{k: v for k, v in payload.items() if k not in ("resource", "id")},
    }
    _records().put_item(Item=item)
    return item


def update(resource: str, item_id: str, payload: dict) -> dict | None:
    existing = get_one(resource, item_id)
    if not existing:
        return None
    now = datetime.now(timezone.utc).isoformat()
    updated = {
        **existing,
        **{k: v for k, v in payload.items() if k not in ("resource", "id")},
        "resource": resource,
        "id": item_id,
        "updated_at": now,
    }
    _records().put_item(Item=updated)
    return updated


def delete(resource: str, item_id: str) -> bool:
    if not get_one(resource, item_id):
        return False
    _records().delete_item(Key={"resource": resource, "id": item_id})
    return True


def get_user(username: str) -> dict | None:
    resp = _users().get_item(Key={"username": username})
    return resp.get("Item")


def put_user(username: str, password: str, role: str = "admin") -> None:
    _users().put_item(Item={"username": username, "password": password, "role": role})
