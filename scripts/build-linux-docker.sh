#!/bin/bash
# 在 Docker 容器中构建 Linux 包，确保与旧版 Ubuntu 兼容
# 使用 electronuserland/builder 镜像（基于 Ubuntu 20.04，glibc 兼容性好）

set -e

IMAGE="electronuserland/builder:20-wine"
WORK_DIR="/project"

# 构建 docker build 镜像缓存
TMP_DOCKERFILE=$(mktemp /tmp/dockerfile-XXXXXX)
cat > "$TMP_DOCKERFILE" <<'DOCKERFILE'
FROM electronuserland/builder:20-wine
RUN apt-get update && apt-get install -y --no-install-recommends \
  libarchive-tools \
  && rm -rf /var/lib/apt/lists/*
DOCKERFILE
docker build \
  -f "$TMP_DOCKERFILE" \
  -t ai-agent-flow-builder \
  .
rm -f "$TMP_DOCKERFILE"

# 在容器中执行构建
docker run --rm -ti \
  -v "$(pwd):$WORK_DIR" \
  -w "$WORK_DIR" \
  -e npm_config_registry="https://registry.npmmirror.com" \
  ai-agent-flow-builder \
  bash -c "
    npm install && \
    node scripts/download-model.mjs && \
    npm run build && \
    npx electron-builder --linux
  "
