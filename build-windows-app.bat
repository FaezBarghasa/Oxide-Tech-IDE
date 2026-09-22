@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo        Oxide-Tech-IDE Windows Native Build Script
echo ======================================================

set "PROJECT_ROOT=%~dp0"
set "OXIDE_EMBED_DIR=%PROJECT_ROOT%..\Oxide-embed"
set "DIST_DIR=%PROJECT_ROOT%dist-windows"

echo [1/4] Checking Rust and Node tooling...
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: cargo is not installed or not in PATH.
    exit /b 1
)

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: pnpm is not installed. Please run: npm install -g pnpm
    exit /b 1
)

echo [2/4] Building Oxide-Embed Core Engine (x86_64-pc-windows-msvc)...
if exist "%OXIDE_EMBED_DIR%" (
    pushd "%OXIDE_EMBED_DIR%"
    cargo build --release -p oxide-cli
    popd
) else (
    echo Notice: Oxide-embed directory not found, skipping embed engine build.
)

echo [3/4] Building Frontend UI Assets...
pushd "%PROJECT_ROOT%"
call pnpm install
call pnpm build

echo [4/4] Building Tauri v2 Windows Executable ^(.exe / .msi / NSIS installer^)...
call pnpm tauri build

echo Creating distribution folder...
if not exist "%DIST_DIR%\bin" mkdir "%DIST_DIR%\bin"
if not exist "%DIST_DIR%\installer" mkdir "%DIST_DIR%\installer"

if exist "%PROJECT_ROOT%src-tauri\target\release\oxide-tech-ide.exe" (
    copy /y "%PROJECT_ROOT%src-tauri\target\release\oxide-tech-ide.exe" "%DIST_DIR%\bin\"
)
if exist "%OXIDE_EMBED_DIR%\target\release\oxide-embed.exe" (
    copy /y "%OXIDE_EMBED_DIR%\target\release\oxide-embed.exe" "%DIST_DIR%\bin\"
)
if exist "%PROJECT_ROOT%src-tauri\target\release\bundle\nsis\*.exe" (
    copy /y "%PROJECT_ROOT%src-tauri\target\release\bundle\nsis\*.exe" "%DIST_DIR%\installer\"
)
if exist "%PROJECT_ROOT%src-tauri\target\release\bundle\msi\*.msi" (
    copy /y "%PROJECT_ROOT%src-tauri\target\release\bundle\msi\*.msi" "%DIST_DIR%\installer\"
)
popd

echo ======================================================
echo Windows Build Completed Successfully!
echo   - Binaries:   %DIST_DIR%\bin\
echo   - Installers: %DIST_DIR%\installer\
echo ======================================================
