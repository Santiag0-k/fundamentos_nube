import base64
import json
import re
from io import BytesIO

import db
from report_service import ReportService

RESOURCES = {
    "instructor", "cliente", "vehiculo", "categoria", "matriculados",
    "clase-practica", "claseteorica", "examen-practico", "examen-teorico",
}

LEGACY_ROUTES = {
    "/clase-practica/agregar": "clase-practica",
    "/claseteorica/Agregar": "claseteorica",
    "/examen-practico/agregar": "examen-practico",
    "/examen-teorico/agregar": "examen-teorico",
}

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def _json(status: int, body) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", **_CORS},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }


def _text(body: str) -> dict:
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "text/plain", **_CORS},
        "body": body,
    }


def _pdf(data: bytes, filename: str) -> dict:
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


def _body(event: dict) -> dict:
    raw = event.get("body") or ""
    if event.get("isBase64Encoded") and raw:
        raw = base64.b64decode(raw).decode("utf-8", errors="replace")
    if not raw:
        return {}
    # JSON
    try:
        return json.loads(raw)
    except Exception:
        pass
    # application/x-www-form-urlencoded
    try:
        from urllib.parse import parse_qs
        parsed = parse_qs(raw, keep_blank_values=True)
        return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
    except Exception:
        pass
    return {}


def lambda_handler(event: dict, context) -> dict:
    method = (event.get("httpMethod") or "GET").upper()
    path = (event.get("path") or "/").rstrip("/") or "/"

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": _CORS, "body": ""}

    # Health
    if path == "/health":
        return _json(200, {"status": "ok"})

    # Auth
    if path == "/auth/login" and method == "POST":
        body = _body(event)
        username = str(body.get("username", "")).strip()
        password = str(body.get("password", "")).strip()
        user = db.get_user(username)
        if not user or user.get("password") != password:
            return _json(401, {"detail": "Credenciales invalidas"})
        return _json(200, {"ok": True, "username": user["username"], "role": user["role"]})

    # Examen practico aprobado/reprobado
    if path == "/examen-practico-aprobado" and method == "GET":
        rows = db.list_by_resource("examen-practico")
        result = [r for r in rows if "aprob" in str(r.get("resultado", "")).lower() and "no" not in str(r.get("resultado", "")).lower()]
        for r in result:
            r["iD_matriculados"] = r.get("ID_matriculado") or r.get("id_matriculado")
        return _json(200, result)

    if path == "/examen-practico-reprobado" and method == "GET":
        rows = db.list_by_resource("examen-practico")
        result = [r for r in rows if "reprob" in str(r.get("resultado", "")).lower()]
        for r in result:
            r["iD_matriculados"] = r.get("ID_matriculado") or r.get("id_matriculado")
        return _json(200, result)

    # /cliente/{id}/nombre
    m = re.match(r"^/cliente/([^/]+)/nombre$", path)
    if m and method == "GET":
        item = db.get_one("cliente", m.group(1))
        if not item:
            return _text("")
        nombre = str(item.get("nombre", "")).strip()
        apellido = str(item.get("apellido", "")).strip()
        return _text(f"{nombre} {apellido}".strip())

    # Progreso del matriculado
    m = re.match(r"^/matriculados/([^/]+)/progreso$", path)
    if m and method == "GET":
        mat_id = m.group(1)
        matriculado = db.get_one("matriculados", mat_id)
        if not matriculado:
            return _json(404, {"detail": "Matriculado no encontrado"})

        cliente  = db.get_one("cliente",   matriculado.get("id_cliente",   "")) or {}
        categoria = db.get_one("categoria", matriculado.get("id_categoria", "")) or {}

        def _filter(resource):
            return [r for r in db.list_by_resource(resource)
                    if str(r.get("ID_matriculado") or r.get("id_matriculado") or "") == mat_id]

        clases_t  = _filter("claseteorica")
        clases_p  = _filter("clase-practica")
        exams_t   = _filter("examen-teorico")
        exams_p   = _filter("examen-practico")

        def _aprob(rows):
            return any(
                "aprob" in str(r.get("resultado", "")).lower()
                and "no" not in str(r.get("resultado", "")).lower()
                for r in rows
            )

        horas_t = int(categoria.get("horas_teoricas")  or 0)
        horas_p = int(categoria.get("horas_practicas") or 0)
        ct, cp  = len(clases_t), len(clases_p)
        et_ok   = _aprob(exams_t)
        ep_ok   = _aprob(exams_p)

        total       = max(horas_t + horas_p + 2, 1)
        completado  = min(ct, horas_t) + min(cp, horas_p) + (1 if et_ok else 0) + (1 if ep_ok else 0)

        def _fmt_exam(rows):
            return [{"resultado": r.get("resultado"), "fecha": r.get("fecha_clase")} for r in rows]

        return _json(200, {
            "matriculado_id": mat_id,
            "fecha_inicio":   matriculado.get("fecha_inicio"),
            "fecha_fin":      matriculado.get("fecha_fin"),
            "cliente": {
                "nombre":   cliente.get("nombre",   ""),
                "apellido": cliente.get("apellido", ""),
                "cedula":   cliente.get("cedula",   ""),
            },
            "categoria": {
                "nombre":          categoria.get("nombre_categoria", "-"),
                "horas_teoricas":  horas_t,
                "horas_practicas": horas_p,
                "precio":          categoria.get("precio", 0),
            },
            "clases_teoricas_completadas":  ct,
            "clases_practicas_completadas": cp,
            "clases_teoricas_faltantes":    max(0, horas_t - ct),
            "clases_practicas_faltantes":   max(0, horas_p - cp),
            "examen_teorico_aprobado":      et_ok,
            "examen_practico_aprobado":     ep_ok,
            "historial_examenes_teoricos":  _fmt_exam(exams_t),
            "historial_examenes_practicos": _fmt_exam(exams_p),
            "porcentaje_completado":        round((completado / total) * 100),
            "listo_para_licencia":          et_ok and ep_ok and ct >= horas_t and cp >= horas_p,
        })

    # Reportes
    if path == "/reportes/gerencia" and method == "GET":
        return _json(200, ReportService().build_management_report())

    if path == "/reportes/gerencia/pdf" and method == "GET":
        pdf = ReportService().build_management_report_pdf()
        return _pdf(pdf, "reporte_gerencia.pdf")

    m = re.match(r"^/reportes/calendario/matriculado/([^/]+)/pdf$", path)
    if m and method == "GET":
        try:
            pdf = ReportService().build_student_calendar_pdf(m.group(1))
        except LookupError as exc:
            return _json(404, {"detail": str(exc)})
        return _pdf(pdf, f"calendario_{m.group(1)}.pdf")

    # Rutas legacy (deben ir antes del CRUD generico)
    if path in LEGACY_ROUTES and method == "POST":
        resource = LEGACY_ROUTES[path]
        item = db.create(resource, _body(event))
        return _json(200, item)

    # CRUD generico /{resource} y /{resource}/{id}
    parts = [p for p in path.split("/") if p]

    if len(parts) == 1:
        resource = parts[0]
        if resource not in RESOURCES:
            return _json(404, {"detail": "Recurso no soportado"})
        if method == "GET":
            return _json(200, db.list_by_resource(resource))
        if method == "POST":
            return _json(200, db.create(resource, _body(event)))

    if len(parts) == 2:
        resource, item_id = parts
        if resource not in RESOURCES:
            return _json(404, {"detail": "Recurso no soportado"})
        if method == "GET":
            item = db.get_one(resource, item_id)
            return _json(200, item) if item else _json(404, {"detail": "Registro no encontrado"})
        if method == "PUT":
            item = db.update(resource, item_id, _body(event))
            return _json(200, item) if item else _json(404, {"detail": "Registro no encontrado"})
        if method == "DELETE":
            return _json(200, {"message": "Eliminado"}) if db.delete(resource, item_id) else _json(404, {"detail": "Registro no encontrado"})

    return _json(404, {"detail": "Not found"})
