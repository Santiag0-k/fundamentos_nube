"""CEA — Core Lambda: CRUD instructor, cliente, vehiculo, categoria."""
import re

import db
from utils import parse_body, resp_cors, resp_json, resp_text

RESOURCES = {"instructor", "cliente", "vehiculo", "categoria"}


def lambda_handler(event, context):
    method = (event.get("httpMethod") or "GET").upper()
    path   = (event.get("path") or "/").rstrip("/") or "/"

    if method == "OPTIONS":
        return resp_cors()

    # GET /cliente/{id}/nombre  (ruta específica antes del CRUD genérico)
    m = re.match(r"^/cliente/([^/]+)/nombre$", path)
    if m and method == "GET":
        item = db.get_one("cliente", m.group(1))
        if not item:
            return resp_text("")
        return resp_text(
            f"{item.get('nombre', '')} {item.get('apellido', '')}".strip()
        )

    # CRUD genérico  /{resource}  y  /{resource}/{id}
    parts = [p for p in path.split("/") if p]

    if len(parts) == 1:
        resource = parts[0]
        if resource not in RESOURCES:
            return resp_json(404, {"detail": "Recurso no soportado"})
        if method == "GET":
            return resp_json(200, db.list_by_resource(resource))
        if method == "POST":
            return resp_json(200, db.create(resource, parse_body(event)))

    elif len(parts) == 2:
        resource, item_id = parts
        if resource not in RESOURCES:
            return resp_json(404, {"detail": "Recurso no soportado"})
        if method == "GET":
            item = db.get_one(resource, item_id)
            return resp_json(200, item) if item else resp_json(404, {"detail": "Registro no encontrado"})
        if method == "PUT":
            item = db.update(resource, item_id, parse_body(event))
            return resp_json(200, item) if item else resp_json(404, {"detail": "Registro no encontrado"})
        if method == "DELETE":
            ok = db.delete(resource, item_id)
            return resp_json(200, {"message": "Eliminado"}) if ok else resp_json(404, {"detail": "Registro no encontrado"})

    return resp_json(404, {"detail": "Not found"})
