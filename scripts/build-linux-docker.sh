#!/bin/bash
# 在 Ubuntu 22.04 Docker 容器中构建 Linux 包，确保与目标系统完全兼容
set -e

WORK_DIR="/project"

# 构建构建镜像
docker build \
  -f - \
  -t ai-agent-flow-builder \
  - <<'DOCKERFILE'
FROM ubuntu:22.04

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl ca-certificates gnupg \
  build-essential python3 make g++ pkg-config \
  libsecret-1-dev libarchive-tools cmake \
  xvfb libxss1 libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm1 \
  libasound2 \
  && rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Rust（lancedb 需要）
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
DOCKERFILE

# 在容器中执行构建
docker run --rm -ti \
  -v "$(pwd):$WORK_DIR" \
  -w "$WORK_DIR" \
  -e npm_config_registry="https://registry.npmmirror.com" \
  ai-agent-flow-builder \
  bash -c '
    set -e
    echo "=== 安装依赖 ==="
    npm install --build-from-source 2>&1 | tail -5

    echo "=== 下载模型 ==="
    node scripts/download-model.mjs 2>&1 | tail -5

    echo "=== 编译前端 + 后端 ==="
    npm run build 2>&1 | tail -10

    echo "=== 打包 ==="
    npx electron-builder --linux 2>&1 | tail -10

    echo "=== 完成 ==="
    ls -lh dist/*.AppImage dist/*.deb 2>/dev/null
  '
