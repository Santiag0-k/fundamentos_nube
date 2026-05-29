from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

import db

MONTH_ES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]


def _index(rows: list[dict], key: str = "id") -> dict[str, dict]:
    return {str(r.get(key, "")): r for r in rows}


def _parse_dt(value: Any) -> datetime | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%d/%m/%Y %H:%M"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _fmt_dt(value: Any) -> str:
    dt = _parse_dt(value)
    if not dt:
        return str(value or "-")
    return f"{dt.day:02d} {MONTH_ES[dt.month]} {dt.year} {dt.strftime('%H:%M')}"


class ReportService:

    def build_management_report(self) -> dict[str, Any]:
        categorias = db.list_by_resource("categoria")
        clientes = db.list_by_resource("cliente")
        instructores = db.list_by_resource("instructor")
        vehiculos = db.list_by_resource("vehiculo")
        matriculados = db.list_by_resource("matriculados")
        clase_practica = db.list_by_resource("clase-practica")
        clase_teorica = db.list_by_resource("claseteorica")
        examen_practico = db.list_by_resource("examen-practico")
        examen_teorico = db.list_by_resource("examen-teorico")

        def _aprob(rows: list[dict]) -> int:
            return sum(1 for r in rows
                       if "aprob" in str(r.get("resultado", "")).lower()
                       and "no" not in str(r.get("resultado", "")).lower())

        practico_aprob = _aprob(examen_practico)
        teorico_aprob = _aprob(examen_teorico)
        practico_total = len(examen_practico) or 1
        teorico_total = len(examen_teorico) or 1

        cat_by_id = _index(categorias)
        ingresos = sum(float(cat_by_id.get(str(m.get("id_categoria", "")), {}).get("precio", 0) or 0)
                       for m in matriculados)

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "kpis": {
                "categorias": len(categorias),
                "clientes": len(clientes),
                "instructores": len(instructores),
                "vehiculos": len(vehiculos),
                "matriculados": len(matriculados),
                "clases_practicas": len(clase_practica),
                "clases_teoricas": len(clase_teorica),
                "examenes_practicos": len(examen_practico),
                "examenes_teoricos": len(examen_teorico),
            },
            "calidad_academica": {
                "aprobacion_examen_practico_pct": round((practico_aprob / practico_total) * 100, 2),
                "aprobacion_examen_teorico_pct": round((teorico_aprob / teorico_total) * 100, 2),
                "reprobacion_examen_practico_pct": round(100 - (practico_aprob / practico_total) * 100, 2),
                "reprobacion_examen_teorico_pct": round(100 - (teorico_aprob / teorico_total) * 100, 2),
            },
            "finanzas": {
                "ingresos_estimados_matriculas": round(ingresos, 2),
            },
        }

    def build_management_report_pdf(self) -> bytes:
        report = self.build_management_report()
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                leftMargin=12*mm, rightMargin=12*mm,
                                topMargin=12*mm, bottomMargin=12*mm)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle("title_style", parent=styles["Heading1"],
                                     fontName="Helvetica-Bold", fontSize=18, leading=22,
                                     textColor=colors.white, alignment=1)
        h2_style = ParagraphStyle("h2_style", parent=styles["Heading2"],
                                  fontName="Helvetica-Bold", fontSize=12, leading=14,
                                  textColor=colors.HexColor("#C0002E"), spaceAfter=6)
        body_style = ParagraphStyle("body_style", parent=styles["BodyText"],
                                    fontName="Helvetica", fontSize=9.5, leading=12,
                                    textColor=colors.HexColor("#2D0006"))
        kpi_val_style = ParagraphStyle("kpi_val_style", parent=styles["BodyText"],
                                       fontName="Helvetica-Bold", fontSize=16, leading=18,
                                       alignment=1, textColor=colors.HexColor("#C0002E"))

        story: list[Any] = []
        story.append(Table(
            [[Paragraph("Informe Gerencial · CEA Instituto de Movilidad", title_style)]],
            colWidths=[doc.width],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#C0002E")),
                ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]),
        ))
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"Generado: {_fmt_dt(report['generated_at'])}", body_style))
        story.append(Spacer(1, 8))

        kpi_labels = {
            "categorias": "Categorías", "clientes": "Clientes", "instructores": "Instructores",
            "vehiculos": "Vehículos", "matriculados": "Matriculados",
            "clases_practicas": "Clases prácticas", "clases_teoricas": "Clases teóricas",
            "examenes_practicos": "Exámenes prácticos", "examenes_teoricos": "Exámenes teóricos",
        }
        story.append(Paragraph("KPIs Operativos", h2_style))
        kpi_cells = [
            Paragraph(f"{v}<br/><font size='8' color='#5F7396'>{kpi_labels.get(k, k)}</font>", kpi_val_style)
            for k, v in report["kpis"].items()
        ]
        while len(kpi_cells) % 3:
            kpi_cells.append(Paragraph("", body_style))
        kpi_rows = [kpi_cells[i:i+3] for i in range(0, len(kpi_cells), 3)]
        kpi_table = Table(kpi_rows, colWidths=[doc.width / 3] * 3)
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF5F5")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FFDAD6")),
            ("INNERGRID", (0, 0), (-1, -1), 1, colors.HexColor("#FFE4E1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 10))

        q = report["calidad_academica"]
        story.append(Paragraph("Calidad Académica", h2_style))
        q_table = Table([
            ["Indicador", "Valor"],
            ["Aprobación examen práctico", f"{q['aprobacion_examen_practico_pct']}%"],
            ["Aprobación examen teórico", f"{q['aprobacion_examen_teorico_pct']}%"],
            ["Reprobación examen práctico", f"{q['reprobacion_examen_practico_pct']}%"],
            ["Reprobación examen teórico", f"{q['reprobacion_examen_teorico_pct']}%"],
        ], colWidths=[doc.width * 0.68, doc.width * 0.32])
        q_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8B0018")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BACKGROUND", (0, 1), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FFDAD6")),
            ("INNERGRID", (0, 0), (-1, -1), 1, colors.HexColor("#FFE4E1")),
            ("FONTSIZE", (0, 1), (-1, -1), 9), ("ALIGN", (1, 1), (1, -1), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(q_table)
        story.append(Spacer(1, 10))

        ingresos = report["finanzas"]["ingresos_estimados_matriculas"]
        ingresos_text = f"${ingresos:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
        story.append(Paragraph("Finanzas", h2_style))
        story.append(Table(
            [[Paragraph(f"<b>Ingresos estimados por matrículas:</b> {ingresos_text}", body_style)]],
            colWidths=[doc.width],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF5F5")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FFDAD6")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]),
        ))
        doc.build(story)
        return buffer.getvalue()

    def build_student_calendar_pdf(self, matriculado_id: str) -> bytes:
        matriculados = db.list_by_resource("matriculados")
        matriculado = next((m for m in matriculados if str(m.get("id")) == str(matriculado_id)), None)
        if not matriculado:
            raise LookupError("Matriculado no encontrado")

        clientes = db.list_by_resource("cliente")
        categorias = db.list_by_resource("categoria")
        instructores = db.list_by_resource("instructor")
        vehiculos = db.list_by_resource("vehiculo")

        cli_by_id = _index(clientes)
        cat_by_id = _index(categorias)
        ins_by_id = _index(instructores)
        veh_by_id = _index(vehiculos)

        cliente = cli_by_id.get(str(matriculado.get("id_cliente", "")), {})
        categoria = cat_by_id.get(str(matriculado.get("id_categoria", "")), {})
        estudiante = (f"{cliente.get('nombre', '')} {cliente.get('apellido', '')}".strip()
                      or f"Matriculado {matriculado_id}")

        events: list[dict] = []

        def push(tipo: str, row: dict) -> None:
            dt_raw = row.get("fecha_clase") or row.get("fecha_hora") or ""
            ins = ins_by_id.get(str(row.get("ID_instructor") or row.get("id_instructor") or ""), {})
            veh = veh_by_id.get(str(row.get("ID_vehiculo") or row.get("id_vehiculo") or ""), {})
            ins_name = f"{ins.get('nombre', '')} {ins.get('apellido', '')}".strip() or "-"
            veh_name = " - ".join(str(x) for x in [veh.get("placa"), veh.get("marca")] if x) or "-"
            detalle = str(row.get("Descripcion") or row.get("descripcion") or row.get("resultado") or "-")
            events.append({
                "fecha_hora": dt_raw,
                "fecha_obj": _parse_dt(dt_raw),
                "tipo": tipo,
                "instructor": ins_name,
                "vehiculo": veh_name,
                "detalle": detalle,
            })

        for resource, tipo in [
            ("clase-practica", "Clase Practica"), ("claseteorica", "Clase Teorica"),
            ("examen-practico", "Examen Practico"), ("examen-teorico", "Examen Teorico"),
        ]:
            for r in db.list_by_resource(resource):
                if str(r.get("ID_matriculado") or r.get("id_matriculado") or "") == str(matriculado_id):
                    push(tipo, r)

        events.sort(key=lambda e: e.get("fecha_obj") or datetime.max)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                leftMargin=10*mm, rightMargin=10*mm,
                                topMargin=10*mm, bottomMargin=10*mm)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle("cal_title", parent=styles["Heading1"],
                                     fontName="Helvetica-Bold", fontSize=16, leading=20,
                                     textColor=colors.white, alignment=1)
        meta_style = ParagraphStyle("cal_meta", parent=styles["BodyText"],
                                    fontName="Helvetica", fontSize=9, leading=11,
                                    textColor=colors.HexColor("#2D0006"))
        month_style = ParagraphStyle("cal_month", parent=styles["Heading2"],
                                     fontName="Helvetica-Bold", fontSize=12, leading=14,
                                     textColor=colors.HexColor("#C0002E"), spaceBefore=2, spaceAfter=6)
        cell_style = ParagraphStyle("cal_cell", parent=styles["BodyText"],
                                    fontName="Helvetica", fontSize=7.4, leading=9,
                                    textColor=colors.HexColor("#2D0006"))
        detail_style = ParagraphStyle("cal_detail", parent=styles["BodyText"],
                                      fontName="Helvetica", fontSize=8.5, leading=10,
                                      textColor=colors.HexColor("#2D0006"))

        story: list[Any] = []
        story.append(Table(
            [[Paragraph("Agenda del Estudiante · CEA Instituto de Movilidad", title_style)]],
            colWidths=[doc.width],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#C0002E")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]),
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            f"<b>Estudiante:</b> {estudiante} &nbsp;&nbsp; <b>Categoría:</b> {categoria.get('nombre_categoria', '-')}",
            meta_style))
        story.append(Paragraph(f"<b>Generado:</b> {_fmt_dt(datetime.now(timezone.utc).isoformat())}", meta_style))
        story.append(Spacer(1, 8))

        if not events:
            story.append(Table(
                [[Paragraph("No hay eventos programados para este estudiante.", meta_style)]],
                colWidths=[doc.width],
                style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF5F5")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FFDAD6")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 10),
                ]),
            ))
            doc.build(story)
            return buffer.getvalue()

        color_map = {
            "Clase Practica":  "#C0002E",  # rojo primario CEA
            "Clase Teorica":   "#00695C",  # verde teal
            "Examen Practico": "#B54800",  # naranja oscuro
            "Examen Teorico":  "#6A1B9A",  # morado
        }

        events_by_day: dict[tuple, list] = defaultdict(list)
        for ev in events:
            dt = ev.get("fecha_obj")
            if isinstance(dt, datetime):
                events_by_day[(dt.year, dt.month, dt.day)].append(ev)

        months = sorted({
            (ev["fecha_obj"].year, ev["fecha_obj"].month)
            for ev in events if isinstance(ev.get("fecha_obj"), datetime)
        })

        for year, month in months:
            story.append(Paragraph(f"{MONTH_ES[month]} {year}", month_style))
            cal_rows: list[list] = [["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]]
            for week in calendar.monthcalendar(year, month):
                row: list = []
                for day in week:
                    if day == 0:
                        row.append("")
                        continue
                    day_evs = events_by_day.get((year, month, day), [])
                    parts = [f"<b>{day}</b>"]
                    for ev in day_evs[:3]:
                        dt = ev.get("fecha_obj")
                        hour = dt.strftime("%H:%M") if isinstance(dt, datetime) else "--:--"
                        color = color_map.get(str(ev.get("tipo", "")), "#C0002E")
                        parts.append(f"<font color='{color}'>●</font> {hour} {ev.get('tipo', '-')}")
                    if len(day_evs) > 3:
                        parts.append(f"<font color='#7A5656'>+{len(day_evs) - 3} más</font>")
                    row.append(Paragraph("<br/>".join(parts), cell_style))
                cal_rows.append(row)

            cal_table = Table(cal_rows, colWidths=[doc.width / 7.0] * 7)
            cal_style = TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FFF5F5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#C0002E")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FFDAD6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#FFE4E1")),
                ("LEFTPADDING", (0, 1), (-1, -1), 3), ("RIGHTPADDING", (0, 1), (-1, -1), 3),
                ("TOPPADDING", (0, 1), (-1, -1), 4), ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
            ])
            for ri in range(1, len(cal_rows)):
                for ci in range(7):
                    if cal_rows[ri][ci] == "":
                        cal_style.add("BACKGROUND", (ci, ri), (ci, ri), colors.HexColor("#FFFAFA"))
            cal_table.setStyle(cal_style)
            story.append(cal_table)
            story.append(Spacer(1, 8))

        story.append(Paragraph("Detalle de agenda", month_style))
        detail_rows: list[list] = [["Fecha", "Hora", "Tipo", "Instructor", "Vehículo", "Detalle"]]
        for ev in events:
            dt = ev.get("fecha_obj")
            detail_rows.append([
                Paragraph(dt.strftime("%d/%m/%Y") if isinstance(dt, datetime) else "-", detail_style),
                Paragraph(dt.strftime("%H:%M") if isinstance(dt, datetime) else "-", detail_style),
                Paragraph(str(ev.get("tipo", "-")), detail_style),
                Paragraph(str(ev.get("instructor", "-")), detail_style),
                Paragraph(str(ev.get("vehiculo", "-")), detail_style),
                Paragraph(str(ev.get("detalle", "-")), detail_style),
            ])

        detail_table = Table(detail_rows, colWidths=[
            doc.width * 0.12, doc.width * 0.09, doc.width * 0.16,
            doc.width * 0.18, doc.width * 0.18, doc.width * 0.27,
        ], repeatRows=1)
        detail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8B0018")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FFDAD6")),
            ("INNERGRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#FFE4E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(detail_table)
        doc.build(story)
        return buffer.getvalue()
