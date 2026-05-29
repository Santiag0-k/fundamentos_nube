# CEA Instituto de Movilidad

Sistema de gestión académica para escuela de conducción. Arquitectura serverless en AWS con frontend estático en S3/CloudFront, API en Lambda + API Gateway y base de datos en DynamoDB.

---

## URLs de producción

| Recurso | URL |
|---------|-----|
| Frontend (CloudFront) | https://d22bmgt5msul47.cloudfront.net |
| Frontend (S3 directo) | http://cea-frontend-638515252962.s3-website-us-east-1.amazonaws.com |
| API Gateway | https://5lsnngszz1.execute-api.us-east-1.amazonaws.com/Prod/ |
| API health check | https://5lsnngszz1.execute-api.us-east-1.amazonaws.com/Prod/health |

**Credenciales de acceso al panel:** usuario `admin` / contraseña `admin`

---

## Estructura del proyecto

```
CEA/
├── backend/
│   ├── handler.py          Enrutador HTTP — todas las rutas de la API
│   ├── db.py               Cliente DynamoDB (CRUD genérico)
│   ├── report_service.py   Generación de PDFs con ReportLab
│   └── requirements.txt    boto3, reportlab
│
├── frontend/
│   ├── index.html          Landing page pública (Material Design 3)
│   ├── login.html          Acceso al panel administrativo
│   ├── admin.html          Panel CRUD completo
│   ├── css/
│   │   ├── style.css           Tokens y componentes MD3
│   │   ├── login.css           Estilos de la pantalla de login
│   │   └── admin-dashboard.css Layout del panel admin
│   ├── js/
│   │   ├── config.js       URL base de la API (cambiar según entorno)
│   │   ├── api.js          Cliente HTTP centralizado (fetch + PDF download)
│   │   ├── admin.js        Lógica CRUD del panel
│   │   ├── api-base.js     Interceptor de URLs legacy
│   │   ├── login.js        Autenticación (referencia, no usado en nuevo login)
│   │   └── notify.js       Sistema de notificaciones toast
│   └── img/
│       ├── carousel-bg-1.jpg / carousel-bg-2.jpg
│       ├── carousel-1.png  / carousel-2.png
│       ├── about.jpg
│       └── logo.png
│
├── infra/
│   ├── template.yaml       SAM template (Lambda + API Gateway + DynamoDB)
│   └── samconfig.toml      Configuración de deploy (stack, región, flags)
│
├── scripts/
│   ├── start-local.ps1     Levanta DynamoDB local en Docker + crea tablas
│   ├── seed.py             Script para poblar datos de prueba
│   └── env-local.json      Variables de entorno para SAM local
│
├── events/                 Eventos JSON para `sam local invoke`
└── INFRA.md                Diagrama ASCII de infraestructura completo
```

---

## Infraestructura AWS

| Recurso | Nombre | Detalles |
|---------|--------|----------|
| Lambda | `cea-serverless-ApiFunction` | Python 3.12, 256 MB, timeout 30s |
| API Gateway | `cea-serverless` | REST API, stage Prod |
| DynamoDB | `cea-records` | PK: resource (HASH), SK: id (RANGE) |
| DynamoDB | `cea-users` | PK: username (HASH) |
| S3 | `cea-frontend-638515252962` | Sitio web estático |
| CloudFront | `E2SREAR6IFYOLZ` | CDN global, HTTPS |
| SAM Source | `aws-sam-cli-managed-default-samclisourcebucket-kedwa9b5ym99` | Artefactos de deploy |

---

## Requisitos previos

Instalar una sola vez antes de empezar.

### 1. Docker Desktop
Necesario para DynamoDB local y SAM local.
- Descargar: https://www.docker.com/products/docker-desktop/
- Verificar: `docker --version`

### 2. Python 3.12
- Instalar con winget (si no está):
  ```powershell
  winget install --id Python.Python.3.12
  ```
- Verificar: `python --version`

### 3. AWS SAM CLI
```powershell
pip install aws-sam-cli
```
- Verificar: `sam --version`

### 4. AWS CLI v2
- Descargar: https://aws.amazon.com/cli/
- Verificar: `aws --version`

### 5. Credenciales AWS
```powershell
aws configure
# AWS Access Key ID: <tu-access-key>
# AWS Secret Access Key: <tu-secret-key>
# Default region name: us-east-1
# Default output format: json
```
- Verificar: `aws sts get-caller-identity`

### 6. Política de ejecución PowerShell (solo la primera vez)
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Entorno local de desarrollo

Abre **tres terminales** de PowerShell en la carpeta del proyecto.

### Terminal 1 — DynamoDB local
```powershell
.\scripts\start-local.ps1
```
Esto:
- Crea la red Docker `cea-local`
- Levanta `amazon/dynamodb-local` en el puerto `8000`
- Crea las tablas `cea-records` y `cea-users`
- Crea el usuario `admin` / `admin`

### Terminal 2 — API Lambda local
```powershell
cd infra
sam build
sam local start-api --port 3001 --env-vars ..\scripts\env-local.json --docker-network cea-local
```
> La primera vez descarga la imagen Docker de Python 3.12 (~500 MB). Tarda 1-2 minutos.

### Terminal 3 — Frontend local
```powershell
python -m http.server 3000 --directory frontend
```

### Abrir en el navegador
```
http://localhost:3000/login.html
```
Usuario: `admin` | Contraseña: `admin`

> Si necesitas apuntar el frontend a un API diferente, pasa el parámetro en la URL:
> `http://localhost:3000/login.html?api=http://localhost:3001`

---

## Deploy a AWS (producción)

### Deploy completo (backend + frontend)

```powershell
# 1. Compilar y subir Lambda
cd infra
sam build
sam deploy

# 2. Subir frontend a S3
cd ..
aws s3 sync frontend s3://cea-frontend-638515252962 --delete --exclude "*.md" --cache-control "max-age=300"

# 3. Invalidar caché de CloudFront (cambios inmediatos)
aws cloudfront create-invalidation --distribution-id E2SREAR6IFYOLZ --paths "/*"
```

### Solo backend (sin cambios en frontend)
```powershell
cd infra
sam build
sam deploy
```

### Solo frontend (sin cambios en Lambda)
```powershell
aws s3 sync frontend s3://cea-frontend-638515252962 --delete --exclude "*.md" --cache-control "max-age=300"
aws cloudfront create-invalidation --distribution-id E2SREAR6IFYOLZ --paths "/*"
```

### Verificar que el deploy quedó bien
```powershell
# API respondiendo
Invoke-WebRequest "https://5lsnngszz1.execute-api.us-east-1.amazonaws.com/Prod/health" -UseBasicParsing

# Ver estado de la invalidación CloudFront
aws cloudfront list-invalidations --distribution-id E2SREAR6IFYOLZ --query "InvalidationList.Items[0]" --output table
```

---

## Cambiar la URL de la API

Editar `frontend/js/config.js`:

```js
// Producción (por defecto)
window.__API_BASE__ = "https://5lsnngszz1.execute-api.us-east-1.amazonaws.com/Prod";

// Local
window.__API_BASE__ = "http://localhost:3001";
```

Después de cambiar a local, volver a poner la URL de producción antes de hacer deploy.

---

## Rutas de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/login` | Autenticación |
| GET | `/{resource}` | Listar registros |
| POST | `/{resource}` | Crear registro |
| GET | `/{resource}/{id}` | Obtener uno |
| PUT | `/{resource}/{id}` | Actualizar |
| DELETE | `/{resource}/{id}` | Eliminar |
| GET | `/reportes/gerencia` | Datos JSON del informe |
| GET | `/reportes/gerencia/pdf` | PDF informe gerencial |
| GET | `/reportes/calendario/matriculado/{id}/pdf` | PDF agenda del estudiante |
| GET | `/examen-practico-aprobado` | Consulta exámenes aprobados |
| GET | `/examen-practico-reprobado` | Consulta exámenes reprobados |

**Recursos disponibles:** `instructor`, `cliente`, `vehiculo`, `categoria`, `matriculados`, `clase-practica`, `claseteorica`, `examen-practico`, `examen-teorico`

### Rutas legacy (POST directo con ruta específica)
| Ruta | Recurso destino |
|------|----------------|
| `/clase-practica/agregar` | `clase-practica` |
| `/claseteorica/Agregar` | `claseteorica` |
| `/examen-practico/agregar` | `examen-practico` |
| `/examen-teorico/agregar` | `examen-teorico` |

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | HTML + CSS (Material Design 3) + JavaScript Vanilla | — |
| Backend | Python | 3.12 |
| IaC | AWS SAM / CloudFormation | 2.x |
| Compute | AWS Lambda | — |
| API | AWS API Gateway REST | — |
| Base de datos | AWS DynamoDB | PAY_PER_REQUEST |
| CDN | AWS CloudFront | — |
| Storage | AWS S3 | — |
| PDF | ReportLab | 4.2.2 |
| Íconos | Material Symbols Rounded (Google Fonts) | — |
| AWS SDK | boto3 | ≥1.34 |

---

## Módulos del panel administrativo

| Sección | Descripción |
|---------|-------------|
| Dashboard | KPIs operativos, porcentajes de aprobación e ingresos estimados |
| Instructores | CRUD de instructores (tipo, disponibilidad) |
| Clientes | CRUD de estudiantes/clientes |
| Vehículos | CRUD de la flota (placa, marca, tipo, nivel) |
| Categorías | CRUD de categorías de licencia con precio y horas |
| Matriculados | Inscripción de clientes a categorías con fechas |
| Clases Prácticas | Programación de clases en ruta con instructor y vehículo |
| Clases Teóricas | Programación de clases teóricas con instructor |
| Exámenes Prácticos | Registro de exámenes con resultado Aprobado/No Aprobado |
| Exámenes Teóricos | Registro de exámenes teóricos |
| Reportes PDF | Informe gerencial y agenda individual del estudiante |
| Consultas | Listado de aprobados y reprobados en examen práctico |

---

## Solución de problemas frecuentes

### "La ejecución de scripts está deshabilitada"
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Luego abrir una nueva terminal.

### `sam` no reconocido como comando
```powershell
pip install aws-sam-cli
# Abrir nueva terminal después de instalar
```

### `python` no reconocido como comando
Verificar que Python esté en el PATH:
```powershell
# Agregar al PATH del usuario (ajustar versión si es diferente)
$pyPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python312"
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$pyPath;$pyPath\Scripts", "User")
# Abrir nueva terminal
```

### La API local no responde (timeout en el primer request)
Normal — SAM local descarga la imagen Docker de Python 3.12 la primera vez (~500 MB). Esperar 2-3 minutos y reintentar.

### PDF dice "No podemos abrir este archivo" en Edge
Actualización ya aplicada en `api.js`: el PDF ahora se descarga directamente en vez de abrir un blob URL en nueva pestaña.

### DynamoDB local no arranca
```powershell
# Verificar que Docker esté corriendo
docker ps

# Eliminar contenedor anterior y relanzar
docker rm -f dynamo-local
.\scripts\start-local.ps1
```

### Los cambios del frontend no se ven en producción
CloudFront tiene caché. Invalidar manualmente:
```powershell
aws cloudfront create-invalidation --distribution-id E2SREAR6IFYOLZ --paths "/*"
```
