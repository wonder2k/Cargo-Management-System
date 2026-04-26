# 使用轻量级 Node.js Alpine 镜像作为基础镜像
# 针对 ARM 架构，Alpine 是非常理想的选择 (占用资源极低)
FROM node:22-alpine AS base

# --- 第一阶段: 安装依赖 ---
FROM base AS deps
# 增加 libc6-compat 以解决部分 C++ 插件在 Alpine 上的兼容性问题
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 优先读取 package.json 以利用 Docker 缓存
COPY package.json package-lock.json* ./
RUN npm ci

# --- 第二阶段: 构建阶段 ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置生产环境变量
ENV NODE_ENV=production

# 运行 Vite 构建 (生成静态文件到 dist/)
RUN npm run build

# --- 第三阶段: 运行阶段 ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# 禁用一些不必要的 telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户以增强安全
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# 从构建阶段复制必要文件
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

# 安装执行服务器所需的编译工具 (tsx)
# 注意：在生产环境建议将 server.ts 编译为 JS 运行，
# 但为了保持简单和兼容 tsx，此处确保依赖完整。
RUN npm install tsx -g

# 权限设置
RUN chown -R nodejs:nodejs /app

USER nodejs

# 暴露端口 (容器内部端口 3000)
EXPOSE 3000

# 启动命令
CMD ["tsx", "server.ts"]
