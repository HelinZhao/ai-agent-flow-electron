#!/bin/bash
# 在 Docker 容器中构建 Linux 包，确保与旧版 Ubuntu 兼容
set -e

WORK_DIR="/project"

docker build \
  -f - \
  -t ai-agent-flow-builder \
  - <<'DOCKERFILE'
FROM electronuserland/builder:20-wine

# 安装 Rust（lancedb 需要从源码编译）
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
DOCKERFILE

docker run --rm -ti \
  -v "$(pwd):$WORK_DIR" \
  -w "$WORK_DIR" \
  -e npm_config_registry="https://registry.npmmirror.com" \
  ai-agent-flow-builder \
  bash -c '
    set -e
    npm install --build-from-source
    node scripts/download-model.mjs
    npm run build
    npx electron-builder --linux
    ls -lh dist/*.AppImage dist/*.deb 2>/dev/null
  '
