param(
  [switch]$SkipFrontendBuild = $false,
  [switch]$SkipBackendSmokeTest = $false
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Step($message) {
  Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

function Resolve-PythonCommand {
  $candidates = @(
    @('py', '-3.11'),
    @('py', '-3.10'),
    @('py')
  )

  foreach ($candidate in $candidates) {
    try {
      if ($candidate.Length -eq 2) {
        & $candidate[0] $candidate[1] --version *> $null
      } else {
        & $candidate[0] --version *> $null
      }
      return ,$candidate
    } catch {
      continue
    }
  }

  throw 'Không tìm thấy Python launcher phù hợp. Hãy cài Python 3.10 hoặc 3.11 trước.'
}

$pythonCommand = Resolve-PythonCommand
$venvPath = Join-Path $root '.venv_build'
$venvPython = Join-Path $venvPath 'Scripts\python.exe'

Step 'Tạo virtual environment'
if (-not (Test-Path $venvPython)) {
  if ($pythonCommand.Length -eq 2) {
    & $pythonCommand[0] $pythonCommand[1] -m venv $venvPath
  } else {
    & $pythonCommand[0] -m venv $venvPath
  }
} else {
  Write-Host 'Đã có sẵn .venv_build, dùng lại môi trường hiện có.' -ForegroundColor Yellow
}

Step 'Nâng cấp pip, setuptools, wheel'
& $venvPython -m pip install --upgrade pip setuptools wheel

Step 'Cài thư viện backend'
& $venvPython -m pip install -r (Join-Path $root 'backend\requirements.txt')

Step 'Khởi tạo database'
& $venvPython (Join-Path $root 'backend\app\db_init.py')

if (-not $SkipBackendSmokeTest) {
  Step 'Kiểm tra backend import'
  & $venvPython -c "import backend.app.main; print('Backend import OK')"
}

Step 'Cài thư viện frontend'
Push-Location (Join-Path $root 'frontend')
try {
  npm install

  if (-not $SkipFrontendBuild) {
    Step 'Build frontend'
    npm run build
  }
} finally {
  Pop-Location
}

Step 'Hoàn tất'
Write-Host 'Đã cài thư viện và build xong project.' -ForegroundColor Green
Write-Host 'Lệnh chạy backend:' -ForegroundColor Yellow
Write-Host '  .\.venv_build\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000'
Write-Host 'Lệnh chạy frontend:' -ForegroundColor Yellow
Write-Host '  cd frontend; npm run dev -- --host 0.0.0.0 --port 5173'
