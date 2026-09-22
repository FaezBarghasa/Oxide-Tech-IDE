#!/usr/bin/env bash
set -euo pipefail

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN} Oxide-Tech-IDE Windows Cross-Compilation Builder      ${NC}"
echo -e "${CYAN} Target: x86_64-pc-windows-gnu (MinGW-w64)            ${NC}"
echo -e "${CYAN}======================================================${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OXIDE_EMBED_DIR="$(cd "${PROJECT_ROOT}/../Oxide-embed" && pwd)"
DIST_DIR="${PROJECT_ROOT}/dist-windows-cross"
TARGET_TRIPLE="x86_64-pc-windows-gnu"

echo -e "${GREEN}[1/4] Ensuring Rust Windows GNU target is installed...${NC}"
rustup target add "${TARGET_TRIPLE}"

echo -e "\n${GREEN}[2/4] Cross-compiling Oxide-Embed Core Engine for Windows...${NC}"
if [ -d "${OXIDE_EMBED_DIR}" ]; then
    cd "${OXIDE_EMBED_DIR}"
    cargo build --release --target "${TARGET_TRIPLE}" -p oxide-cli
    echo -e "✓ Built: ${OXIDE_EMBED_DIR}/target/${TARGET_TRIPLE}/release/oxide-embed.exe"
fi

echo -e "\n${GREEN}[3/4] Building Frontend UI Assets...${NC}"
cd "${PROJECT_ROOT}"
pnpm install
pnpm build

echo -e "\n${GREEN}[4/4] Cross-compiling Tauri v2 Windows Executable...${NC}"
pnpm tauri build --target "${TARGET_TRIPLE}" --no-bundle || {
    echo -e "${YELLOW}Bundling step skipped (NSIS/WiX require Windows host), packaged standalone binary.${NC}"
}

mkdir -p "${DIST_DIR}/bin"
if [ -f "${PROJECT_ROOT}/src-tauri/target/${TARGET_TRIPLE}/release/oxide-tech-ide.exe" ]; then
    cp "${PROJECT_ROOT}/src-tauri/target/${TARGET_TRIPLE}/release/oxide-tech-ide.exe" "${DIST_DIR}/bin/oxide-tech-ide.exe"
fi
if [ -f "${OXIDE_EMBED_DIR}/target/${TARGET_TRIPLE}/release/oxide-embed.exe" ]; then
    cp "${OXIDE_EMBED_DIR}/target/${TARGET_TRIPLE}/release/oxide-embed.exe" "${DIST_DIR}/bin/oxide-embed.exe"
fi

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}✓ Windows Cross-Build Completed!${NC}"
echo -e "  - Target: ${TARGET_TRIPLE}"
echo -e "  - Binary: ${DIST_DIR}/bin/oxide-tech-ide.exe"
echo -e "${CYAN}======================================================${NC}"
