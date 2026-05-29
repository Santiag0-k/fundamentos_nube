"""CEA — Reports Lambda: reportes PDF, gerencia y consultas."""
import re

import db
from report_service import ReportService
from utils import resp_cors, resp_json, resp_pdf


def lambda_handler(event, context):
    method = (event.get("httpMethod") or "GET").upper()
    path   = (event.get("path") or "/").rstrip("/") or "/"

    if method == "OPTIONS":
        return resp_cors()

    # Exámenes aprobados / reprobados
    if path == "/examen-practico-aprobado" and method == "GET":
        rows = db.list_by_resource("examen-practico")
        result = [
            r for r in rows
            if "aprob" in str(r.get("resultado", "")).lower()
            and "no" not in str(r.get("resultado", "")).lower()
        ]
        for r in result:
            r["iD_matriculados"] = r.get("ID_matriculado") or r.get("id_matriculado")
        return resp_json(200, result)

    if path == "/examen-practico-reprobado" and method == "GET":
        rows = db.list_by_resource("examen-practico")
        result = [
            r for r in rows
            if "reprob" in str(r.get("resultado", "")).lower()
        ]
        for r in result:
            r["iD_matriculados"] = r.get("ID_matriculado") or r.get("id_matriculado")
        return resp_json(200, result)

    # Informe gerencial JSON
    if path == "/reportes/gerencia" and method == "GET":
        return resp_json(200, ReportService().build_management_report())

    # Informe gerencial PDF
    if path == "/reportes/gerencia/pdf" and method == "GET":
        pdf = ReportService().build_management_report_pdf()
        return resp_pdf(pdf, "informe_gerencial_cea.pdf")

    # Agenda del estudiante PDF
    m = re.match(r"^/reportes/calendario/matriculado/([^/]+)/pdf$", path)
    if m and method == "GET":
        try:
            pdf = ReportService().build_student_calendar_pdf(m.group(1))
        except LookupError as exc:
            return resp_json(404, {"detail": str(exc)})
        return resp_pdf(pdf, f"agenda_estudiante_cea.pdf")

    return resp_json(404, {"detail": "Not found"})
