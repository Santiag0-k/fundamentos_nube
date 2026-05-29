"""Puebla DynamoDB de produccion con datos de prueba."""
import uuid, boto3, json
from datetime import datetime, timedelta

TABLE_RECORDS = "cea-records"
TABLE_USERS   = "cea-users"
REGION        = "us-east-1"
ENDPOINT      = None  # None = AWS real

dynamo = boto3.resource("dynamodb", region_name=REGION,
                        **({"endpoint_url": ENDPOINT} if ENDPOINT else {}))
records = dynamo.Table(TABLE_RECORDS)
users   = dynamo.Table(TABLE_USERS)

def uid(): return str(uuid.uuid4())
def now(): return datetime.utcnow().isoformat() + "Z"

def put(resource, payload):
    item_id = uid()
    item = {"resource": resource, "id": item_id,
            "created_at": now(), "updated_at": now(), **payload}
    records.put_item(Item=item)
    return item_id

def scan_resource(resource):
    resp = records.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("resource").eq(resource))
    return resp.get("Items", [])

# ──────────────────────────────────────────
print("Verificando usuario admin...")
if not users.get_item(Key={"username": "admin"}).get("Item"):
    users.put_item(Item={"username": "admin", "password": "admin", "role": "admin"})
    print("  admin creado")
else:
    print("  admin ya existe")

# ──────────────────────────────────────────
print("Categorias...")
if not scan_resource("categoria"):
    cats_raw = [
        {"nombre_categoria": "A2", "precio": 980000,  "horas_teoricas": 28, "horas_practicas": 18},
        {"nombre_categoria": "B1", "precio": 1480000, "horas_teoricas": 36, "horas_practicas": 24},
        {"nombre_categoria": "C1", "precio": 1680000, "horas_teoricas": 40, "horas_practicas": 26},
        {"nombre_categoria": "A1", "precio": 850000,  "horas_teoricas": 20, "horas_practicas": 14},
        {"nombre_categoria": "B2", "precio": 1200000, "horas_teoricas": 30, "horas_practicas": 20},
        {"nombre_categoria": "C2", "precio": 1800000, "horas_teoricas": 44, "horas_practicas": 28},
    ]
    cat_ids = [put("categoria", c) for c in cats_raw]
    print(f"  {len(cat_ids)} categorias creadas")
else:
    cat_ids = [c["id"] for c in scan_resource("categoria")]
    print(f"  {len(cat_ids)} categorias existentes")

# ──────────────────────────────────────────
print("Clientes...")
if len(scan_resource("cliente")) < 10:
    first = ["Laura","Juan","Andrea","Diego","Camila","Sofia","Mateo","Valentina","Nicolas","Daniela",
             "Carlos","Maria","Andres","Paola","Felipe","Ana","Miguel","Tatiana","Sebastian","Carolina"]
    last  = ["Rojas","Pineda","Castro","Gomez","Lopez","Garcia","Rodriguez","Moreno","Vargas","Restrepo",
             "Mendez","Uribe","Naranjo","Quintero","Sanchez","Duque","Herrera","Muñoz","Suarez","Barrera"]
    cli_ids = []
    for i in range(40):
        n = first[i % len(first)]; a = last[(i*3) % len(last)]
        cli_ids.append(put("cliente", {
            "nombre": n, "apellido": a,
            "telefono": f"3{100000000+i:09d}",
            "correo": f"{n.lower()}.{a.lower()}.{i}@demo.com",
            "cedula": f"10{i:08d}"
        }))
    print(f"  {len(cli_ids)} clientes creados")
else:
    cli_ids = [c["id"] for c in scan_resource("cliente")]
    print(f"  {len(cli_ids)} clientes existentes")

# ──────────────────────────────────────────
print("Instructores...")
if len(scan_resource("instructor")) < 5:
    ins_data = [
        {"nombre":"Carlos","apellido":"Mendez","correo":"carlos@cea.com","telefono":"3150001111","cedula":"900100200","tipo_instructor":"carro","disponibilidad":"disponible"},
        {"nombre":"Paola","apellido":"Uribe","correo":"paola@cea.com","telefono":"3150002222","cedula":"900100201","tipo_instructor":"moto","disponibilidad":"disponible"},
        {"nombre":"Felipe","apellido":"Naranjo","correo":"felipe@cea.com","telefono":"3150003333","cedula":"900100202","tipo_instructor":"carro","disponibilidad":"disponible"},
        {"nombre":"Julian","apellido":"Quintero","correo":"julian@cea.com","telefono":"3150004444","cedula":"900100203","tipo_instructor":"moto","disponibilidad":"disponible"},
        {"nombre":"Ana","apellido":"Sanchez","correo":"ana@cea.com","telefono":"3150005555","cedula":"900100204","tipo_instructor":"carro","disponibilidad":"disponible"},
        {"nombre":"Miguel","apellido":"Duque","correo":"miguel@cea.com","telefono":"3150006666","cedula":"900100205","tipo_instructor":"carro","disponibilidad":"noDisponible"},
        {"nombre":"Tatiana","apellido":"Herrera","correo":"tatiana@cea.com","telefono":"3150007777","cedula":"900100206","tipo_instructor":"moto","disponibilidad":"disponible"},
        {"nombre":"David","apellido":"Barrera","correo":"david@cea.com","telefono":"3150008888","cedula":"900100207","tipo_instructor":"carro","disponibilidad":"disponible"},
    ]
    ins_ids = [put("instructor", d) for d in ins_data]
    print(f"  {len(ins_ids)} instructores creados")
else:
    ins_ids = [i["id"] for i in scan_resource("instructor")]
    print(f"  {len(ins_ids)} instructores existentes")

# ──────────────────────────────────────────
print("Vehiculos...")
if len(scan_resource("vehiculo")) < 5:
    veh_data = [
        {"placa":"ABC123","modelo":"2022","tipoVehiculo":"carro","marca":"Kia","nivelVehiculo":"B1","disponibilidad":"disponible"},
        {"placa":"MTR456","modelo":"2023","tipoVehiculo":"moto","marca":"Yamaha","nivelVehiculo":"A2","disponibilidad":"disponible"},
        {"placa":"TRK889","modelo":"2021","tipoVehiculo":"carro","marca":"Chevrolet","nivelVehiculo":"C1","disponibilidad":"disponible"},
        {"placa":"CEA001","modelo":"2024","tipoVehiculo":"carro","marca":"Renault","nivelVehiculo":"B2","disponibilidad":"disponible"},
        {"placa":"CEA002","modelo":"2023","tipoVehiculo":"moto","marca":"Honda","nivelVehiculo":"A1","disponibilidad":"disponible"},
        {"placa":"CEA003","modelo":"2022","tipoVehiculo":"carro","marca":"Mazda","nivelVehiculo":"C2","disponibilidad":"disponible"},
        {"placa":"CEA004","modelo":"2024","tipoVehiculo":"carro","marca":"Kia","nivelVehiculo":"B1","disponibilidad":"noDisponible"},
        {"placa":"CEA005","modelo":"2021","tipoVehiculo":"moto","marca":"Suzuki","nivelVehiculo":"A2","disponibilidad":"disponible"},
    ]
    veh_ids = [put("vehiculo", d) for d in veh_data]
    print(f"  {len(veh_ids)} vehiculos creados")
else:
    veh_ids = [v["id"] for v in scan_resource("vehiculo")]
    print(f"  {len(veh_ids)} vehiculos existentes")

# ──────────────────────────────────────────
print("Matriculados...")
if len(scan_resource("matriculados")) < 5:
    mat_ids = []
    base_date = datetime(2026, 1, 15)
    for i in range(20):
        cli = cli_ids[i % len(cli_ids)]
        cat = cat_ids[i % len(cat_ids)]
        start = base_date + timedelta(days=i*7)
        end   = start + timedelta(days=50)
        mat_ids.append(put("matriculados", {
            "id_cliente": cli, "id_categoria": cat,
            "fecha_inicio": start.strftime("%Y-%m-%d"),
            "fecha_fin": end.strftime("%Y-%m-%d")
        }))
    print(f"  {len(mat_ids)} matriculados creados")
else:
    mat_ids = [m["id"] for m in scan_resource("matriculados")]
    print(f"  {len(mat_ids)} matriculados existentes")

# ──────────────────────────────────────────
print("Clases practicas...")
if not scan_resource("clase-practica"):
    base_dt = datetime(2026, 3, 2, 8, 0)
    descrips = ["carretera","ciudad","parqueo","maniobras"]
    count = 0
    for i in range(25):
        m = mat_ids[i % len(mat_ids)]
        ins = ins_ids[i % len(ins_ids)]
        veh = veh_ids[i % len(veh_ids)]
        dt = (base_dt + timedelta(hours=i*6)).replace(minute=0, second=0).isoformat()
        put("clase-practica", {"ID_instructor": ins,"ID_vehiculo": veh,"ID_matriculado": m,
                                "Descripcion": descrips[i%4],"fecha_clase": dt})
        count += 1
    print(f"  {count} clases practicas creadas")
else:
    print(f"  {len(scan_resource('clase-practica'))} clases practicas existentes")

# ──────────────────────────────────────────
print("Clases teoricas...")
if not scan_resource("claseteorica"):
    base_dt = datetime(2026, 3, 1, 16, 0)
    temas = ["normatividad vial","senalizacion","mecanica basica"]
    count = 0
    for i in range(20):
        m = mat_ids[i % len(mat_ids)]
        ins = ins_ids[i % len(ins_ids)]
        dt = (base_dt + timedelta(hours=i*8)).replace(minute=0, second=0).isoformat()
        put("claseteorica", {"ID_instructor": ins,"ID_matriculado": m,
                              "Descripcion": temas[i%3],"fecha_clase": dt})
        count += 1
    print(f"  {count} clases teoricas creadas")
else:
    print(f"  {len(scan_resource('claseteorica'))} clases teoricas existentes")

# ──────────────────────────────────────────
print("Examenes practicos...")
if not scan_resource("examen-practico"):
    base_dt = datetime(2026, 4, 1, 9, 0)
    count = 0
    for i in range(18):
        m = mat_ids[i % len(mat_ids)]
        ins = ins_ids[i % len(ins_ids)]
        veh = veh_ids[i % len(veh_ids)]
        dt = (base_dt + timedelta(days=i)).replace(minute=0, second=0).isoformat()
        resultado = "Aprobado" if i % 3 != 0 else "No Aprobado"
        put("examen-practico", {"ID_matriculado": m,"ID_instructor": ins,"ID_vehiculo": veh,
                                 "resultado": resultado,"fecha_clase": dt})
        count += 1
    print(f"  {count} examenes practicos creados")
else:
    print(f"  {len(scan_resource('examen-practico'))} examenes practicos existentes")

# ──────────────────────────────────────────
print("Examenes teoricos...")
if not scan_resource("examen-teorico"):
    base_dt = datetime(2026, 3, 28, 15, 0)
    count = 0
    for i in range(18):
        m = mat_ids[i % len(mat_ids)]
        dt = (base_dt + timedelta(days=i)).replace(minute=0, second=0).isoformat()
        resultado = "Aprobado" if i % 4 != 0 else "No Aprobado"
        put("examen-teorico", {"ID_matriculado": m,"resultado": resultado,"fecha_clase": dt})
        count += 1
    print(f"  {count} examenes teoricos creados")
else:
    print(f"  {len(scan_resource('examen-teorico'))} examenes teoricos existentes")

print("\nSeed completado.")
