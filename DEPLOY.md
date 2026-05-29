# Guía de Despliegue — CEA Instituto de Movilidad

Este documento explica paso a paso cómo desplegar el proyecto completo en una cuenta de AWS nueva.

---

## Requisitos previos

Instalar estas herramientas antes de empezar:

| Herramienta | Versión mínima | Cómo instalar |
|-------------|----------------|---------------|
| Python | 3.12 | https://www.python.org/downloads/ |
| AWS CLI v2 | 2.x | https://aws.amazon.com/cli/ |
| AWS SAM CLI | 1.100+ | `pip install aws-sam-cli` |
| Docker Desktop | 24+ | https://www.docker.com/products/docker-desktop/ |

### Verificar que todo está instalado
```bash
python --version      # Python 3.12.x
aws --version         # aws-cli/2.x
sam --version         # SAM CLI, version 1.x
docker --version      # Docker version 24.x
```

---

## Paso 1 — Configurar credenciales AWS

En la consola de AWS, crea un usuario IAM con permisos de administrador (o los siguientes servicios: Lambda, API Gateway, DynamoDB, S3, CloudFront, CloudFormation, IAM).

```bash
aws configure
```
Ingresa:
- **AWS Access Key ID**: tu access key
- **AWS Secret Access Key**: tu secret key
- **Default region name**: `us-east-1`
- **Default output format**: `json`

Verifica:
```bash
aws sts get-caller-identity
```
Debe retornar tu `Account`, `UserId` y `Arn`.

---

## Paso 2 — Clonar / descomprimir el proyecto

```
CEA/
├── backend/
│   ├── shared/python/   ← db.py y utils.py (Lambda Layer)
│   ├── auth/            ← Lambda autenticación
│   ├── core/            ← Lambda CRUD recursos base
│   ├── acad/            ← Lambda gestión académica
│   └── reports/         ← Lambda reportes PDF
├── frontend/            ← Sitio web estático
├── infra/
│   ├── template.yaml    ← Infraestructura AWS (SAM)
│   └── samconfig.toml   ← Configuración de deploy
└── scripts/
    ├── start-local.ps1  ← DynamoDB local (PowerShell)
    └── env-local.json   ← Variables entorno local
```

---

## Paso 3 — Desplegar el backend (Lambda + API Gateway + DynamoDB)

```bash
cd infra

# Compilar las 4 Lambdas y el Layer compartido
sam build

# Desplegar en AWS (primera vez: usa --guided para configurar)
sam deploy --guided
```

En el asistente `--guided`, ingresa:
- **Stack Name**: `cea-serverless` (o el nombre que prefieras)
- **AWS Region**: `us-east-1`
- **Confirm changes before deploy**: `N`
- **Allow SAM CLI IAM role creation**: `Y`
- **Save arguments to samconfig.toml**: `Y`

Al finalizar verás la URL de la API en los Outputs:
```
Key   ApiUrl
Value https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/Prod/
```

**Guarda esa URL — la necesitarás en el Paso 5.**

Deploys siguientes (sin asistente):
```bash
sam build
sam deploy
```

---

## Paso 4 — Crear el usuario administrador en DynamoDB

El sistema necesita un usuario `admin` en la tabla `cea-users`. Ejecuta:

```bash
aws dynamodb put-item \
  --table-name cea-users \
  --item '{"username":{"S":"admin"},"password":{"S":"admin"},"role":{"S":"admin"}}'
```

> **Nota:** Para producción real, cambia la contraseña por algo seguro.

Verifica que se creó:
```bash
aws dynamodb get-item \
  --table-name cea-users \
  --key '{"username":{"S":"admin"}}'
```

---

## Paso 5 — Configurar la URL de la API en el frontend

Edita el archivo `frontend/js/config.js`:

```js
// Cambia esta URL por la que obtuviste en el Paso 3
window.__API_BASE__ = "https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/Prod";
```

---

## Paso 6 — Crear el bucket S3 y subir el frontend

### 6a. Crear el bucket
```bash
# Reemplaza CEA-BUCKET-NOMBRE con un nombre único (e.g., cea-frontend-123456789)
aws s3 mb s3://CEA-BUCKET-NOMBRE --region us-east-1
```

### 6b. Habilitar el sitio web estático en S3
```bash
aws s3 website s3://CEA-BUCKET-NOMBRE \
  --index-document index.html \
  --error-document index.html
```

### 6c. Configurar la política de bucket (acceso público)
Crea el archivo `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::CEA-BUCKET-NOMBRE/*"
    }
  ]
}
```

Aplica la política:
```bash
# Primero deshabilitar Block Public Access
aws s3api put-public-access-block \
  --bucket CEA-BUCKET-NOMBRE \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Luego aplicar la política
aws s3api put-bucket-policy \
  --bucket CEA-BUCKET-NOMBRE \
  --policy file://bucket-policy.json
```

### 6d. Subir el frontend
```bash
aws s3 sync frontend s3://CEA-BUCKET-NOMBRE \
  --delete \
  --exclude "*.md" \
  --cache-control "max-age=300"
```

La URL del sitio será:
```
http://CEA-BUCKET-NOMBRE.s3-website-us-east-1.amazonaws.com
```

---

## Paso 7 — (Opcional) Configurar CloudFront para HTTPS

```bash
# Crear distribución CloudFront apuntando al bucket S3
aws cloudfront create-distribution \
  --origin-domain-name CEA-BUCKET-NOMBRE.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html \
  --query "Distribution.{Id:Id,Domain:DomainName}" \
  --output table
```

Anota el **Domain** de CloudFront (e.g., `dXXXXXXXX.cloudfront.net`).

Para actualizar el frontend después de cambios:
```bash
# Subir archivos
aws s3 sync frontend s3://CEA-BUCKET-NOMBRE --delete --exclude "*.md" --cache-control "max-age=300"

# Invalidar caché (reemplaza DIST-ID con el Id de tu distribución)
aws cloudfront create-invalidation --distribution-id DIST-ID --paths "/*"
```

---

## Paso 8 — Verificar que todo funciona

```bash
API="https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/Prod"

# Health check
curl "$API/health"
# Esperado: {"status": "ok"}

# Login
curl -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
# Esperado: {"ok": true, "username": "admin", "role": "admin"}

# Listar instructores (vacío al inicio)
curl "$API/instructor"
# Esperado: []
```

Abrir en el navegador:
- S3 directo: `http://CEA-BUCKET-NOMBRE.s3-website-us-east-1.amazonaws.com/login.html`
- CloudFront (HTTPS): `https://dXXXXXXXX.cloudfront.net/login.html`

Credenciales: `admin` / `admin`

---

## Resumen de recursos que se crean

| Recurso | Nombre | Descripción |
|---------|--------|-------------|
| Lambda | `cea-auth` | Autenticación |
| Lambda | `cea-core` | CRUD básico |
| Lambda | `cea-acad` | Gestión académica |
| Lambda | `cea-reports` | Reportes PDF (512 MB) |
| Lambda Layer | `cea-shared` | db.py + utils.py compartidos |
| API Gateway | `cea-serverless` | REST API |
| DynamoDB | `cea-records` | Todos los registros |
| DynamoDB | `cea-users` | Usuarios del sistema |
| S3 | nombre-elegido | Frontend estático |
| CloudFront | (opcional) | CDN con HTTPS |

---

## Solución de problemas frecuentes

### "No credentials" o "Unable to locate credentials"
```bash
aws configure
# Verifica con: aws sts get-caller-identity
```

### "sam: command not found"
```bash
pip install aws-sam-cli
# Abre una terminal nueva después de instalar
```

### El frontend muestra error de API / pantalla en blanco
1. Abre `frontend/js/config.js`
2. Verifica que `window.__API_BASE__` tenga la URL correcta de tu API Gateway
3. Vuelve a subir: `aws s3 sync frontend s3://CEA-BUCKET-NOMBRE --delete`

### "AccessDenied" al crear tablas DynamoDB
El usuario IAM necesita permisos de `dynamodb:*`. Verifica los permisos en la consola de IAM.

### El PDF descarga pero no abre
Asegúrate de usar el header `Accept: application/pdf` en la petición. El frontend ya lo hace automáticamente.
