# CEA Instituto de Movilidad — Diagrama de Infraestructura

## Arquitectura general (AWS Serverless · Multi-Lambda)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               NAVEGADOR DEL USUARIO                              │
│   index.html (Landing)   login.html (Acceso)   admin.html (Panel CRUD)           │
└────────────┬─────────────────────┬──────────────────────┬───────────────────────┘
             │ HTTPS               │ HTTPS                │ HTTPS + fetch()
             ▼                     ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                              Amazon CloudFront                                  │
│                        d22bmgt5msul47.cloudfront.net                           │
│                    CDN global · HTTPS · Cache de archivos estáticos             │
└────────────┬───────────────────────────────────────┬───────────────────────────┘
             │ Archivos estáticos                     │ Peticiones API
             ▼                                        ▼
┌──────────────────────────┐       ┌──────────────────────────────────────────────┐
│       Amazon S3           │       │             Amazon API Gateway                │
│  cea-frontend-638515252962│       │  https://5lsnngszz1.execute-api.              │
│  (sitio web estático)     │       │  us-east-1.amazonaws.com/Prod/               │
│                           │       │                                              │
│  index.html               │       │  Rutas → Lambda destino                     │
│  login.html               │       │  ─────────────────────────────────────────  │
│  admin.html               │       │  GET  /health              → AuthFunction    │
│  css/ · js/ · img/        │       │  POST /auth/login          → AuthFunction    │
└──────────────────────────┘       │                                              │
                                    │  ANY  /instructor/**       → CoreFunction    │
                                    │  ANY  /cliente/**          → CoreFunction    │
                                    │  ANY  /vehiculo/**         → CoreFunction    │
                                    │  ANY  /categoria/**        → CoreFunction    │
                                    │                                              │
                                    │  ANY  /matriculados/**     → AcadFunction    │
                                    │  ANY  /clase-practica/**   → AcadFunction    │
                                    │  ANY  /claseteorica/**     → AcadFunction    │
                                    │  ANY  /examen-practico/**  → AcadFunction    │
                                    │  ANY  /examen-teorico/**   → AcadFunction    │
                                    │  GET  /matriculados/{id}/progreso            │
                                    │                            → AcadFunction    │
                                    │                                              │
                                    │  GET  /reportes/**         → ReportFunction  │
                                    │  GET  /examen-practico-aprobado              │
                                    │                            → ReportFunction  │
                                    │  GET  /examen-practico-reprobado             │
                                    │                            → ReportFunction  │
                                    └────────────┬─────────────────────────────────┘
                                                 │ Invoke (sync)
              ┌──────────────────────────────────┼──────────────────────────────────┐
              ▼                                  ▼                                  ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────┐
│    cea-auth (Lambda)     │  │    cea-core (Lambda)     │  │   cea-acad (Lambda)       │
│                         │  │                         │  │                          │
│  Python 3.12 · 128 MB   │  │  Python 3.12 · 128 MB   │  │  Python 3.12 · 128 MB    │
│  Timeout: 10s           │  │  Timeout: 30s           │  │  Timeout: 30s            │
│                         │  │                         │  │                          │
│  auth/handler.py        │  │  core/handler.py        │  │  acad/handler.py         │
│  ├── /health            │  │  ├── CRUD instructor     │  │  ├── CRUD matriculados   │
│  └── /auth/login        │  │  ├── CRUD cliente        │  │  ├── CRUD clases         │
│                         │  │  ├── CRUD vehiculo       │  │  ├── CRUD examenes       │
│  IAM: ReadOnly Users    │  │  └── CRUD categoria      │  │  └── /progreso           │
└────────────┬────────────┘  │                         │  │                          │
             │               │  IAM: CRUD Records      │  │  IAM: CRUD Records       │
             │ Read          └────────────┬────────────┘  └────────────┬─────────────┘
             │               │            │ Read/Write                 │ Read/Write
             │               │            └──────────────────────────┐ │
             │               │                                        │ │
             ▼               ▼                                        ▼ ▼
┌─────────────────────┐  ┌────────────────────────────────────────────────────────────┐
│  DynamoDB           │  │              DynamoDB: cea-records                          │
│  cea-users          │  │                                                            │
│                     │  │  PK: resource (HASH)  ·  SK: id (RANGE)                   │
│  PK: username       │  │  Billing: PAY_PER_REQUEST                                  │
│  Atributos:         │  │                                                            │
│  • username         │  │  Particiones:                                              │
│  • password         │  │  instructor · cliente · vehiculo · categoria               │
│  • role             │  │  matriculados · clase-practica · claseteorica              │
└─────────────────────┘  │  examen-practico · examen-teorico                         │
                          └────────────────────────────────────────────────────────────┘
                                                    ▲
                                                    │ Read-only
                          ┌─────────────────────────┘
                          │
              ┌──────────────────────────┐
              │   cea-reports (Lambda)    │
              │                          │
              │  Python 3.12 · 512 MB    │  ← Más RAM para PDF
              │  Timeout: 60s            │
              │                          │
              │  reports/handler.py      │
              │  reports/report_service.py│
              │                          │
              │  ├── /reportes/gerencia  │
              │  ├── /reportes/**/pdf    │
              │  ├── /examen-*-aprobado  │
              │  └── /examen-*-reprobado │
              │                          │
              │  IAM: ReadOnly Records   │
              └──────────────────────────┘

                          ┌──────────────────────────┐
                          │  Lambda Layer: cea-shared  │
                          │  ARN: ...layer:cea-shared:1│
                          │                           │
                          │  shared/python/db.py      │ ← Cliente DynamoDB reutilizable
                          │  shared/python/utils.py   │ ← Helpers HTTP / CORS / JSON
                          │                           │
                          │  Montado en /opt/python/  │
                          │  en las 4 Lambdas          │
                          └──────────────────────────┘
```

---

## Comparativa antes / después del refactor

| Aspecto | Antes (1 Lambda) | Ahora (4 Lambdas) |
|---------|-----------------|-------------------|
| Funciones | 1 (`ApiFunction`) | 4 (`auth`, `core`, `acad`, `reports`) |
| Memoria reportes | 256 MB | 512 MB |
| Timeout reportes | 30s | 60s |
| Timeout auth | 30s | 10s |
| ReportLab | En todas | Solo en `cea-reports` |
| Código compartido | Duplicado | Lambda Layer `cea-shared` |
| Logs CloudWatch | Mezclados | Separados por dominio |
| Deploy parcial | Todo o nada | Solo la función que cambió |
| IAM (principio mínimo privilegio) | CRUD en todo | Auth=Read Users, Reports=Read Records |

---

## Entorno local de desarrollo

```
Terminal 1                 Terminal 2                   Terminal 3
──────────────────         ────────────────────         ─────────────────
.\scripts\start-local.ps1  cd infra                     python -m http.server
(Docker + DynamoDB)        sam build                    3000 --directory frontend
                           sam local start-api
                           --port 3001
                           --env-vars ..\scripts\env-local.json
                           --docker-network cea-local
       │                          │                            │
       ▼                          ▼                            ▼
 DynamoDB Local             SAM Local (4 Lambdas)        Frontend
 localhost:8000             localhost:3001               localhost:3000
```

Abrir: `http://localhost:3000/login.html`

---

## Flujo de una petición (producción)

```
Usuario       CloudFront     API Gateway    Lambda (destino)    DynamoDB
  │               │               │                │                │
  ├─GET /admin ──►│               │                │                │
  │◄─ HTML ───────│               │                │                │
  │               │               │                │                │
  ├─POST /auth ──►│──────────────►│                │                │
  │               │               ├─ cea-auth ────►│                │
  │               │               │                ├─ GetItem ─────►│
  │               │               │                │◄─ user ────────│
  │◄─ {ok:true} ──│◄──────────────│◄───────────────│                │
  │               │               │                │                │
  ├─GET /instructor►│─────────────►│                │                │
  │               │               ├─ cea-core ────►│                │
  │               │               │                ├─ Query ───────►│
  │               │               │                │◄─ Items[] ─────│
  │◄─ [...] ──────│◄──────────────│◄───────────────│                │
  │               │               │                │                │
  ├─GET /reportes/gerencia/pdf     │                │                │
  │              ►│──────────────►│                │                │
  │               │               ├─ cea-reports ─►│                │
  │               │               │                ├─ Scan×8 ──────►│
  │               │               │                │◄─ all data ────│
  │               │               │                │ (ReportLab PDF) │
  │◄─ PDF binary ─│◄──────────────│◄───────────────│                │
```

---

## Recursos en AWS (us-east-1)

| Recurso | Nombre / ARN |
|---------|-------------|
| Lambda Auth | `cea-auth` |
| Lambda Core | `cea-core` |
| Lambda Acad | `cea-acad` |
| Lambda Reports | `cea-reports` |
| Lambda Layer | `cea-shared:1` |
| DynamoDB | `cea-records`, `cea-users` |
| API Gateway | `https://5lsnngszz1.execute-api.us-east-1.amazonaws.com/Prod/` |
| S3 Frontend | `cea-frontend-638515252962` |
| CloudFront | `https://d22bmgt5msul47.cloudfront.net` |
| Stack CF | `cea-serverless` · us-east-1 |

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | HTML + CSS (Material Design 3) + JS Vanilla | — |
| Backend | Python | 3.12 |
| IaC | AWS SAM / CloudFormation | 2.x |
| Compute | AWS Lambda (×4) | — |
| Shared code | Lambda Layer (`cea-shared`) | — |
| API | AWS API Gateway REST | — |
| Base de datos | AWS DynamoDB (PAY_PER_REQUEST) | — |
| CDN | AWS CloudFront | — |
| Storage | AWS S3 | — |
| PDF | ReportLab | 4.2.2 |
