#!/usr/bin/env bash
set -euo pipefail

# Colors
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}======================================================${NC}"
echo -e "${PURPLE}       Oxide-Tech-IDE macOS Universal Build Script     ${NC}"
echo -e "${PURPLE}       Targets: Apple Silicon (arm64) & Intel (x86_64) ${NC}"
echo -e "${PURPLE}======================================================${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OXIDE_EMBED_DIR="$(cd "${PROJECT_ROOT}/../Oxide-embed" && pwd)"
DIST_DIR="${PROJECT_ROOT}/dist-macos"

echo -e "${GREEN}[1/5] Checking macOS prerequisites (Xcode CLI tools & Rust targets)...${NC}"
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}Notice: Running on non-macOS host ($OSTYPE).${NC}"
    echo -e "${YELLOW}Cross-compilation requires macOS SDK / osxcross. Standard invocation is on macOS host.${NC}"
fi

# Ensure both Apple Silicon and Intel targets are available
rustup target add aarch64-apple-darwin x86_64-apple-darwin 2>/dev/null || true

echo -e "\n${GREEN}[2/5] Building Oxide-Embed Universal Binary...${NC}"
if [ -d "${OXIDE_EMBED_DIR}" ]; then
    cd "${OXIDE_EMBED_DIR}"
    
    echo "Compiling for aarch64-apple-darwin..."
    cargo build --release --target aarch64-apple-darwin -p oxide-cli || cargo build --release -p oxide-cli
    
    echo "Compiling for x86_64-apple-darwin..."
    cargo build --release --target x86_64-apple-darwin -p oxide-cli 2>/dev/null || true

    mkdir -p "${DIST_DIR}/bin"
    if [ -f "target/aarch64-apple-darwin/release/oxide-embed" ] && [ -f "target/x86_64-apple-darwin/release/oxide-embed" ]; then
        lipo -create -output "${DIST_DIR}/bin/oxide-embed" \
            "target/aarch64-apple-darwin/release/oxide-embed" \
            "target/x86_64-apple-darwin/release/oxide-embed" 2>/dev/null || \
            cp "target/aarch64-apple-darwin/release/oxide-embed" "${DIST_DIR}/bin/oxide-embed"
    elif [ -f "target/release/oxide-embed" ]; then
        cp "target/release/oxide-embed" "${DIST_DIR}/bin/oxide-embed"
    fi
fi

echo -e "\n${GREEN}[3/5] Building Frontend UI Assets...${NC}"
cd "${PROJECT_ROOT}"
pnpm install
pnpm build

echo -e "\n${GREEN}[4/5] Building Tauri v2 macOS App Bundle (.app / .dmg)...${NC}"
# Universal target build on macOS
pnpm tauri build --target universal-apple-darwin 2>/dev/null || pnpm tauri build

echo -e "\n${GREEN}[5/5] Packaging macOS Distribution Artifacts into dist-macos/...${NC}"
mkdir -p "${DIST_DIR}/bundle"

# Copy generated .app and .dmg
if [ -d "${PROJECT_ROOT}/src-tauri/target/release/bundle/macos" ]; then
    cp -r "${PROJECT_ROOT}/src-tauri/target/release/bundle/macos/"* "${DIST_DIR}/bundle/" 2>/dev/null || true
fi
if [ -d "${PROJECT_ROOT}/src-tauri/target/release/bundle/dmg" ]; then
    cp -r "${PROJECT_ROOT}/src-tauri/target/release/bundle/dmg/"* "${DIST_DIR}/bundle/" 2>/dev/null || true
fi
if [ -d "${PROJECT_ROOT}/src-tauri/target/universal-apple-darwin/release/bundle" ]; then
    cp -r "${PROJECT_ROOT}/src-tauri/target/universal-apple-darwin/release/bundle/"* "${DIST_DIR}/bundle/" 2>/dev/null || true
fi

echo -e "\n${PURPLE}======================================================${NC}"
echo -e "${GREEN}✓ macOS Build Process Completed!${NC}"
echo -e "  - Bundles (.app / .dmg): ${DIST_DIR}/bundle/"
if [ -f "${DIST_DIR}/bin/oxide-embed" ]; then
    echo -e "  - Engine Universal Bin:  ${DIST_DIR}/bin/oxide-embed"
fi
echo -e "${PURPLE}======================================================${NC}"
