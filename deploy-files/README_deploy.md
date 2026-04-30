# JCargo CMS - PostgreSQL/Docker 部署指南

此项目为 JCargo CMS 的独立版本，采用 PostgreSQL + Express + React 架构，支持 Docker 部署。

## 1. 环境准备
- 已安装 Docker 和 Docker Compose 的 VPS。
- 域名（可选，用于配置 Nginx SSL）。

## 2. 部署步骤
1. 将 `deploy-files` 文件夹上传到服务器：
   `scp -r ./deploy-files user@your-vps-ip:/home/user/jcargo-cms`
2. 进入目录：
   `cd /home/user/jcargo-cms`
3. 创建并配置环境变量：
   `cp .env.example .env`
   编辑 `.env` 文件，修改 `JWT_SECRET` 和数据库密码。
4. 启动服务：
   `docker-compose up -d --build`

## 3. 数据库迁移
容器启动后自动运行 Drizzle 迁移。如果需要手动操作：
`docker-compose exec backend npm run db:push`

## 4. 目录说明
- `backend/`: Node.js Express 后端，使用 Drizzle ORM。
- `frontend/`: React 前端，由 Nginx 提供服务。
- `uploads/`: 自动挂载的本地目录，用于存储文档附件。
