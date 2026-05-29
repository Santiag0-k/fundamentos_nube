"""CEA — Auth Lambda: /health  y  /auth/login"""
import db
from utils import parse_body, resp_cors, resp_json


def lambda_handler(event, context):
    method = (event.get("httpMethod") or "GET").upper()
    path   = (event.get("path") or "/").rstrip("/") or "/"

    if method == "OPTIONS":
        return resp_cors()

    if path == "/health":
        return resp_json(200, {"status": "ok"})

    if path == "/auth/login" and method == "POST":
        body     = parse_body(event)
        username = str(body.get("username", "")).strip()
        password = str(body.get("password", "")).strip()
        user     = db.get_user(username)
        if not user or user.get("password") != password:
            return resp_json(401, {"detail": "Credenciales inválidas"})
        return resp_json(200, {
            "ok": True,
            "username": user["username"],
            "role":     user["role"],
        })

    return resp_json(404, {"detail": "Not found"})
