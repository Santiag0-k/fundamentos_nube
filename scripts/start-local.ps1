# Levanta el entorno local completo para desarrollo
$env:AWS_ACCESS_KEY_ID     = "local"
$env:AWS_SECRET_ACCESS_KEY = "local"
$env:AWS_DEFAULT_REGION    = "us-east-1"
$AWS = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

Write-Host "Preparando red Docker..." -ForegroundColor Cyan
docker network create cea-local 2>$null

Write-Host "Levantando DynamoDB local..." -ForegroundColor Cyan
docker rm -f dynamo-local 2>$null
docker run -d --name dynamo-local --network cea-local -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -inMemory | Out-Null
Start-Sleep -Seconds 3

Write-Host "Creando tablas..." -ForegroundColor Cyan
& $AWS dynamodb create-table --table-name cea-records `
    --attribute-definitions AttributeName=resource,AttributeType=S AttributeName=id,AttributeType=S `
    --key-schema AttributeName=resource,KeyType=HASH AttributeName=id,KeyType=RANGE `
    --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000 2>$null | Out-Null
& $AWS dynamodb create-table --table-name cea-users `
    --attribute-definitions AttributeName=username,AttributeType=S `
    --key-schema AttributeName=username,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000 2>$null | Out-Null

Write-Host "Creando usuario admin..." -ForegroundColor Cyan
[System.IO.File]::WriteAllText("$env:TEMP\admin.json", '{"username":{"S":"admin"},"password":{"S":"admin"},"role":{"S":"admin"}}')
& $AWS dynamodb put-item --table-name cea-users --item "file://$env:TEMP/admin.json" --endpoint-url http://localhost:8000 | Out-Null

Write-Host ""
Write-Host "Entorno local listo." -ForegroundColor Green
Write-Host ""
Write-Host "Para correr la API local:" -ForegroundColor Yellow
Write-Host "  cd infra"
Write-Host "  sam build"
Write-Host "  sam local start-api --port 3001 --env-vars ..\scripts\env-local.json --docker-network cea-local"
Write-Host ""
Write-Host "Para correr el frontend local:" -ForegroundColor Yellow
Write-Host "  python -m http.server 3000 --directory ..\frontend"
Write-Host "  Abrir: http://localhost:3000/login.html?api=http://localhost:3001"
Write-Host ""
Write-Host "DynamoDB local: http://localhost:8000" -ForegroundColor Gray
