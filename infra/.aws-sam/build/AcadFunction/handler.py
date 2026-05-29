"""CEA — Acad Lambda: matriculados, clases, exámenes y progreso."""
import re

import db
from utils import parse_body, resp_cors, resp_json

RESOURCES = {
    "matriculados", "clase-practica", "claseteorica",
    "examen-practico", "examen-teorico",
}

LEGACY_ROUTES = {
    "/clase-practica/agregar": "clase-practica",
    "/claseteorica/Agregar":   "claseteorica",
    "/examen-practico/agregar":"examen-practico",
    "/examen-teorico/agregar": "examen-teorico",
}


def _aprob(rows: list[dict]) -> bool:
    return any(
        "aprob" in str(r.get("resultado", "")).lower()
        and "no" not in str(r.get("resultado", "")).lower()
        for r in rows
    )


def lambda_handler(event, context):
    method = (event.get("httpMethod") or "GET").upper()
    path   = (event.get("path") or "/").rstrip("/") or "/"

    if method == "OPTIONS":
        return resp_cors()

    # GET /matriculados/{id}/progreso
    m = re.match(r"^/matriculados/([^/]+)/progreso$", path)
    if m and method == "GET":
        mat_id     = m.group(1)
        matriculado = db.get_one("matriculados", mat_id)
        if not matriculado:
            return resp_json(404, {"detail": "Matriculado no encontrado"})

        cliente  = db.get_one("cliente",   matriculado.get("id_cliente",   "")) or {}
        categoria = db.get_one("categoria", matriculado.get("id_categoria", "")) or {}

        def _filter(resource):
            return [
                r for r in db.list_by_resource(resource)
                if str(r.get("ID_matriculado") or r.get("id_matriculado") or "") == mat_id
            ]

        clases_t = _filter("claseteorica")
        clases_p = _filter("clase-practica")
        exams_t  = _filter("examen-teorico")
        exams_p  = _filter("examen-practico")

        horas_t = int(categoria.get("horas_teoricas")  or 0)
        horas_p = int(categoria.get("horas_practicas") or 0)
        ct, cp  = len(clases_t), len(clases_p)
        et_ok   = _aprob(exams_t)
        ep_ok   = _aprob(exams_p)

        total      = max(horas_t + horas_p + 2, 1)
        completado = min(ct, horas_t) + min(cp, horas_p) + (1 if et_ok else 0) + (1 if ep_ok else 0)

        def _fmt(rows):
            return [{"resultado": r.get("resultado"), "fecha": r.get("fecha_clase")} for r in rows]

        return resp_json(200, {
            "matriculado_id":              mat_id,
            "fecha_inicio":                matriculado.get("fecha_inicio"),
            "fecha_fin":                   matriculado.get("fecha_fin"),
            "cliente":  {"nombre": cliente.get("nombre",""), "apellido": cliente.get("apellido",""), "cedula": cliente.get("cedula","")},
            "categoria":{"nombre": categoria.get("nombre_categoria","-"), "horas_teoricas": horas_t, "horas_practicas": horas_p, "precio": categoria.get("precio",0)},
            "clases_teoricas_completadas":  ct,
            "clases_practicas_completadas": cp,
            "clases_teoricas_faltantes":    max(0, horas_t - ct),
            "clases_practicas_faltantes":   max(0, horas_p - cp),
            "examen_teorico_aprobado":      et_ok,
            "examen_practico_aprobado":     ep_ok,
            "historial_examenes_teoricos":  _fmt(exams_t),
            "historial_examenes_practicos": _fmt(exams_p),
            "porcentaje_completado":        round((completado / total) * 100),
            "listo_para_licencia":          et_ok and ep_ok and ct >= horas_t and cp >= horas_p,
        })

    # Rutas legacy (POST directo con ruta específica)
    if path in LEGACY_ROUTES and method == "POST":
        item = db.create(LEGACY_ROUTES[path], parse_body(event))
        return resp_json(200, item)

    # CRUD genérico
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
