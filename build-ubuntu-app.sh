#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}       Oxide-Tech-IDE Ubuntu Full Build Script        ${NC}"
echo -e "${BLUE}======================================================${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OXIDE_EMBED_DIR="$(cd "${PROJECT_ROOT}/../Oxide-embed" && pwd)"
DIST_DIR="${PROJECT_ROOT}/dist-app"

echo -e "${GREEN}[1/5] Checking required Ubuntu build tools & libraries...${NC}"
MISSING_PKGS=()
for pkg in build-essential libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf curl pkg-config libssl-dev; do
    if ! dpkg -s "$pkg" >/dev/null 2>&1; then
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Notice: Missing system packages: ${MISSING_PKGS[*]}${NC}"
    echo -e "${YELLOW}If bundling fails, please run: sudo apt-get install -y ${MISSING_PKGS[*]}${NC}"
else
    echo -e "✓ All Ubuntu system dependencies present."
fi

echo -e "\n${GREEN}[2/5] Building Oxide-Embed Core Engine (Release)...${NC}"
if [ -d "${OXIDE_EMBED_DIR}" ]; then
    cd "${OXIDE_EMBED_DIR}"
    cargo build --release -p oxide-cli
    echo -e "✓ Built: ${OXIDE_EMBED_DIR}/target/release/oxide-embed"
else
    echo -e "${YELLOW}Warning: Oxide-embed repo not found at ${OXIDE_EMBED_DIR}, skipping standalone embed build.${NC}"
fi

echo -e "\n${GREEN}[3/5] Building Frontend Assets (TypeScript + Vite)...${NC}"
cd "${PROJECT_ROOT}"
pnpm install
pnpm build

echo -e "\n${GREEN}[4/5] Building Tauri v2 Linux Desktop Binary & Bundle (.deb / AppImage)...${NC}"
pnpm tauri build

echo -e "\n${GREEN}[5/5] Packaging Distribution Output into dist-app/...${NC}"
mkdir -p "${DIST_DIR}/bin"
mkdir -p "${DIST_DIR}/packages"

# Copy main binaries
cp "${PROJECT_ROOT}/src-tauri/target/release/oxide-tech-ide" "${DIST_DIR}/bin/oxide-tech-ide"
if [ -f "${OXIDE_EMBED_DIR}/target/release/oxide-embed" ]; then
    cp "${OXIDE_EMBED_DIR}/target/release/oxide-embed" "${DIST_DIR}/bin/oxide-embed"
fi

# Copy bundle packages (.deb / AppImage)
if [ -d "${PROJECT_ROOT}/src-tauri/target/release/bundle" ]; then
    cp -r "${PROJECT_ROOT}/src-tauri/target/release/bundle/"* "${DIST_DIR}/packages/" || true
fi

# Generate desktop launcher entry
cat << 'EOF' > "${DIST_DIR}/oxide-tech-ide.desktop"
[Desktop Entry]
Name=Oxide Tech IDE
Comment=Next-Gen Local-First Embedded & Systems Developer IDE
Exec=oxide-tech-ide
Icon=oxide-tech-ide
Terminal=false
Type=Application
Categories=Development;IDE;
StartupWMClass=oxide-tech-ide
EOF

chmod +x "${DIST_DIR}/bin/oxide-tech-ide"
if [ -f "${DIST_DIR}/bin/oxide-embed" ]; then
    chmod +x "${DIST_DIR}/bin/oxide-embed"
fi

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}✓ Full Application Build Successful!${NC}"
echo -e "  - Binary:   ${DIST_DIR}/bin/oxide-tech-ide"
if [ -f "${DIST_DIR}/bin/oxide-embed" ]; then
    echo -e "  - Engine:   ${DIST_DIR}/bin/oxide-embed"
fi
echo -e "  - Packages: ${DIST_DIR}/packages/"
echo -e "${BLUE}======================================================${NC}"
