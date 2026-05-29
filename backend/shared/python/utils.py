"""Utilidades compartidas para todas las Lambdas CEA."""
import base64
import json
from urllib.parse import parse_qs

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def resp_json(status: int, body) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", **_CORS},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }


def resp_text(body: str) -> dict:
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "text/plain", **_CORS},
        "body": body,
    }


def resp_pdf(data: bytes, filename: str) -> dict:
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/pdf",
            "Content-Disposition": f'inline; filename="{filename}"',
            **_CORS,
        },
        "body": base64.b64encode(data).decode(),
        "isBase64Encoded": True,
    }


def resp_cors() -> dict:
    return {"statusCode": 204, "headers": _CORS, "body": ""}


def parse_body(event: dict) -> dict:
    raw = event.get("body") or ""
    if event.get("isBase64Encoded") and raw:
        raw = base64.b64decode(raw).decode("utf-8", errors="replace")
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        pass
    try:
        parsed = parse_qs(raw, keep_blank_values=True)
        return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
    except Exception:
        pass
    return {}
