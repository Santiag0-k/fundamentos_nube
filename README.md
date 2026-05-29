# CEA Instituto de Movilidad

Sistema de gestión académica para escuela de conducción. Arquitectura serverless en AWS: frontend estático en S3, cuatro funciones Lambda detrás de API Gateway y base de datos en DynamoDB.

---

## Acceso al sistema

| | URL |
|---|---|
| **Panel administrativo** | http://cea-frontend-638515252962.s3-website-us-east-1.amazonaws.com/login.html |
| **API (health check)** | https://h0x7ze5vzb.execute-api.us-east-1.amazonaws.com/Prod/health |

**Credenciales:** `admin` / `admin`

---

## Arquitectura en AWS

```
Usuario
  │
  ├─► S3 (frontend estático)
  │     frontend/ → s3://cea-frontend-638515252962
  │
  └─► API Gateway → https://h0x7ze5vzb.execute-api.us-east-1.amazonaws.com/Prod/
        │
        ├─► Lambda  cea-auth     → /health, /auth/login
        ├─► Lambda  cea-core     → /instructor, /cliente, /vehiculo, /categoria
        ├─► Lambda  cea-acad     → /matriculados, /clase-practica, /claseteorica,
        │                          /examen-practico, /examen-teorico, /progreso
        └─► Lambda  cea-reports  → /reportes/gerencia, /reportes/*/pdf,
                                   /examen-practico-aprobado, /examen-practico-reprobado
              │
              └─► (todas las Lambdas usan)
                    Layer cea-shared  → db.py + utils.py (código compartido)
                    DynamoDB cea-records  → PK: resource, SK: id
                    DynamoDB cea-users    → PK: username
```

### Recursos en producción

| Recurso | Nombre / ID |
|---|---|
| CloudFormation Stack | `cea-serverless` |
| S3 Frontend | `cea-frontend-638515252962` |
| API Gateway | `https://h0x7ze5vzb.execute-api.us-east-1.amazonaws.com/Prod/` |
| Lambda | `cea-auth`, `cea-core`, `cea-acad`, `cea-reports` |
| Lambda Layer | `cea-shared` |
| DynamoDB | `cea-records`, `cea-users` |
| Región | `us-east-1` |
| Cuenta AWS | `638515252962` |

---

## Estructura del proyecto

```
fundamentos_nube/
│
├── backend/
│   ├── auth/
│   │   └── handler.py          Lambda de autenticación (/health, /auth/login)
│   ├── core/
│   │   └── handler.py          Lambda CRUD base (instructor, cliente, vehiculo, categoria)
│   ├── acad/
│   │   └── handler.py          Lambda académica (matriculados, clases, exámenes, progreso)
│   ├── reports/
│   │   ├── handler.py          Lambda de reportes (PDF gerencia, PDF agenda, consultas)
│   │   ├── report_service.py   Generación de PDFs con ReportLab
│   │   └── requirements.txt    reportlab (dependencias extras de esta Lambda)
│   └── shared/
│       └── python/
│           ├── db.py           Cliente DynamoDB compartido (CRUD genérico)
│           └── utils.py        Helpers HTTP (parse_body, resp_json, resp_cors)
│
├── frontend/
│   ├── index.html              Landing page pública
│   ├── login.html              Pantalla de acceso al panel
│   ├── admin.html              Panel administrativo (CRUD completo)
│   ├── css/
│   │   ├── style.css           Estilos globales (Material Design 3)
│   │   ├── login.css           Estilos de login
│   │   └── admin-dashboard.css Layout del panel admin
│   └── js/
│       ├── config.js           URL base de la API (cambiar según entorno)
│       ├── api-base.js         Lee config.js y establece window.CEA_API_BASE
│       ├── api.js              Cliente HTTP (GET, POST, PUT, DELETE, PDF)
│       ├── admin.js            Toda la lógica CRUD del panel
│       ├── login.js            Lógica de autenticación
│       └── notify.js           Notificaciones toast
│
├── infra/
│   ├── template.yaml           SAM template: define las 4 Lambdas, API Gateway, DynamoDB
│   └── samconfig.toml          Configuración de deploy (stack, región)
│
├── scripts/
│   ├── start-local.ps1         Levanta DynamoDB local en Docker y crea tablas + usuario admin
│   ├── seed.py                 Puebla DynamoDB con datos de prueba (40 clientes, 8 instructores, etc.)
│   └── env-local.json          Variables de entorno para SAM local
│
└── events/                     Eventos JSON de ejemplo para probar Lambdas localmente
```

---

## Rutas de la API

| Método | Ruta | Lambda | Descripción |
|---|---|---|---|
| GET | `/health` | cea-auth | Health check |
| POST | `/auth/login` | cea-auth | Autenticación |
| GET/POST | `/{recurso}` | cea-core / cea-acad | Listar o crear registros |
| GET/PUT/DELETE | `/{recurso}/{id}` | cea-core / cea-acad | Obtener, actualizar o eliminar |
| GET | `/matriculados/{id}/progreso` | cea-acad | Progreso académico del estudiante |
| POST | `/clase-practica/agregar` | cea-acad | Agregar clase práctica |
| POST | `/claseteorica/Agregar` | cea-acad | Agregar clase teórica |
| POST | `/examen-practico/agregar` | cea-acad | Registrar examen práctico |
| POST | `/examen-teorico/agregar` | cea-acad | Registrar examen teórico |
| GET | `/reportes/gerencia` | cea-reports | KPIs y finanzas en JSON |
| GET | `/reportes/gerencia/pdf` | cea-reports | PDF del informe gerencial |
| GET | `/reportes/calendario/matriculado/{id}/pdf` | cea-reports | PDF de agenda del estudiante |
| GET | `/examen-practico-aprobado` | cea-reports | Lista de aprobados en examen práctico |
| GET | `/examen-practico-reprobado` | cea-reports | Lista de reprobados en examen práctico |

**Recursos CRUD disponibles:** `instructor`, `cliente`, `vehiculo`, `categoria`, `matriculados`, `clase-practica`, `claseteorica`, `examen-practico`, `examen-teorico`

---

## Cómo funciona el deploy

El proyecto usa **AWS SAM** para gestionar toda la infraestructura backend como código. Al hacer `sam deploy`, SAM:
1. Empaqueta cada Lambda con su código.
2. Sube los artefactos a un bucket S3 temporal.
3. Ejecuta un `aws cloudformation deploy` con el `template.yaml`.
4. API Gateway y DynamoDB quedan actualizados automáticamente.

El frontend es HTML/CSS/JS puro — se sube directamente a S3 con `aws s3 sync`.

---

## Requisitos previos

Instalar una sola vez antes de empezar a desarrollar localmente.

### 1. Docker Desktop
Necesario para correr DynamoDB local.
```powershell
# Descargar desde https://www.docker.com/products/docker-desktop/
docker --version  # verificar
```

### 2. Python 3.12
```powershell
winget install --id Python.Python.3.12
python --version  # verificar
```

### 3. AWS SAM CLI
```powershell
pip install aws-sam-cli
sam --version  # verificar
```

### 4. AWS CLI v2
```powershell
# Descargar desde https://aws.amazon.com/cli/
aws --version  # verificar
```

### 5. Credenciales AWS
```powershell
aws configure
# Access Key ID:     <tu-access-key>
# Secret Access Key: <tu-secret-key>
# Default region:    us-east-1
# Output format:     json

aws sts get-caller-identity  # verificar
```

### 6. Política de ejecución PowerShell (solo la primera vez)
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Desarrollo local

Abre **tres terminales** de PowerShell en la carpeta raíz del proyecto.

### Terminal 1 — DynamoDB local
```powershell
.\scripts\start-local.ps1
```
Esto levanta DynamoDB en Docker (puerto 8000), crea las tablas y el usuario `admin`.

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

> Para apuntar el frontend a una API diferente, pasa el parámetro en la URL:
> `http://localhost:3000/login.html?api=http://localhost:3001`

---

## Deploy a producción

### Backend (cuando cambias código Python o el template.yaml)

```powershell
cd infra
sam build --parallel
sam deploy --stack-name cea-serverless --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset
```

### Frontend (cuando cambias HTML, CSS o JS)

```powershell
aws s3 sync frontend/ s3://cea-frontend-638515252962 --delete
```

### Deploy completo (backend + frontend)

```powershell
cd infra
sam build --parallel
sam deploy --stack-name cea-serverless --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset
cd ..
aws s3 sync frontend/ s3://cea-frontend-638515252962 --delete
```

### Verificar que el deploy quedó bien

```powershell
# La API debe responder con {"status": "ok"}
Invoke-RestMethod "https://h0x7ze5vzb.execute-api.us-east-1.amazonaws.com/Prod/health"

# El frontend debe cargar en el navegador
Start-Process "http://cea-frontend-638515252962.s3-website-us-east-1.amazonaws.com/login.html"
```

### Poblar datos de prueba (solo la primera vez o para resetear)

```powershell
python scripts/seed.py
```
Crea: 1 admin, 6 categorías, 40 clientes, 8 instructores, 8 vehículos, 20 matriculados, 25 clases prácticas, 20 clases teóricas, 18 exámenes prácticos, 18 exámenes teóricos.

---

## Cambiar la URL de la API

Si necesitas apuntar el frontend a otro entorno, edita [frontend/js/config.js](frontend/js/config.js):

```js
// Producción (valor actual)
window.__API_BASE__ = "https://h0x7ze5vzb.execute-api.us-east-1.amazonaws.com/Prod";

// Local
window.__API_BASE__ = "http://localhost:3001";
```

Después de cambiar, volver a poner la URL de producción antes de hacer `aws s3 sync`.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS (Material Design 3) + JavaScript Vanilla |
| Backend | Python 3.12 (AWS Lambda) |
| Infraestructura como código | AWS SAM / CloudFormation |
| API | AWS API Gateway REST |
| Base de datos | AWS DynamoDB (PAY_PER_REQUEST) |
| Storage frontend | AWS S3 (sitio web estático) |
| PDF | ReportLab 4.x |
| AWS SDK Python | boto3 |

---

## Solución de problemas

### "La ejecución de scripts está deshabilitada"
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
# Abrir nueva terminal después
```

### `sam` no reconocido como comando
```powershell
pip install aws-sam-cli
# Abrir nueva terminal después de instalar
```

### La API local no responde en el primer request
Normal — SAM local descarga la imagen Docker de Python 3.12 la primera vez (~500 MB). Esperar 2-3 minutos y reintentar.

### DynamoDB local no arranca
```powershell
docker ps                   # verificar que Docker esté corriendo
docker rm -f dynamo-local   # eliminar contenedor anterior si existe
.\scripts\start-local.ps1   # relanzar
```

### Los cambios del frontend no se ven en producción
S3 puede tener caché. Forzar recarga con Ctrl+Shift+R en el navegador, o esperar unos segundos.
