[CmdletBinding()]
param(
    [string]$EnvFile,
    [string]$SeedFile
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
    $EnvFile = Join-Path $scriptRoot '..\.env'
}
if ([string]::IsNullOrWhiteSpace($SeedFile)) {
    $SeedFile = Join-Path $scriptRoot '..\db\seed.sql'
}

function Get-EnvValue {
    param(
        [string]$Path,
        [string]$Name
    )

    $line = Get-Content -LiteralPath $Path |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -First 1

    if ($null -eq $line) {
        return $null
    }

    $value = ($line -replace "^\s*$([regex]::Escape($Name))\s*=\s*", '').Trim()
    return $value.Trim('"').Trim("'")
}

if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw "No se encontro el archivo de configuracion: $EnvFile"
}

if (-not (Test-Path -LiteralPath $SeedFile -PathType Leaf)) {
    throw "No se encontro el archivo de seed: $SeedFile"
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($null -eq $psql) {
    throw 'No se encontro psql. Instala PostgreSQL o agrega su carpeta bin al PATH.'
}

$hostName = Get-EnvValue -Path $EnvFile -Name 'DB_HOST'
$port = Get-EnvValue -Path $EnvFile -Name 'POSTGRES_PORT'
$user = Get-EnvValue -Path $EnvFile -Name 'POSTGRES_USER'
$password = Get-EnvValue -Path $EnvFile -Name 'POSTGRES_PASSWORD'
$database = Get-EnvValue -Path $EnvFile -Name 'POSTGRES_DB'

if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = 'localhost' }
if ([string]::IsNullOrWhiteSpace($port)) { $port = '5432' }
if ([string]::IsNullOrWhiteSpace($user)) { $user = 'postgres' }
if ([string]::IsNullOrWhiteSpace($database)) {
    throw "POSTGRES_DB no esta definido en $EnvFile"
}

$previousPassword = $env:PGPASSWORD
$env:PGPASSWORD = $password

try {
    & $psql.Source `
        --host=$hostName `
        --port=$port `
        --username=$user `
        --dbname=$database `
        --file=$SeedFile `
        --set=ON_ERROR_STOP=1

    if ($LASTEXITCODE -ne 0) {
        throw "psql termino con codigo de salida $LASTEXITCODE."
    }

    Write-Host 'Seed insertada correctamente.'
}
finally {
    $env:PGPASSWORD = $previousPassword
}
