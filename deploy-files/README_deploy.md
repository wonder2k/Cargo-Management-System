# JCargo CMS - PostgreSQL/Docker 部署指南

此项目为 **JCargo CMS**（空运货物管理系统）的生产就绪版本，采用 **PostgreSQL + Express (Node.js) + React + Nginx** 架构，全容器化部署。

> 基于原始 Firebase 版本重构，迁移至传统 VPS 架构。

---

## 1. 系统架构

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Nginx      │ ───> │   Express    │ ───> │  PostgreSQL  │
│  (Frontend)  │      │  (Backend)   │      │  (Database)  │
│   :80        │      │   :5000      │      │   :5432      │
└──────────────┘      └──────────────┘      └──────────────┘
                            │
                     ┌──────┴──────┐
                     │   uploads/  │
                     │  (卷挂载)    │
                     └─────────────┘
```

- **Frontend**: React 19 + Vite, 由 Nginx 提供静态文件服务
- **Backend**: Node.js + Express + Drizzle ORM
- **Database**: PostgreSQL 15 (Alpine)
- **存储**: Docker volume（数据库持久化）+ 本地挂载（上传文件）

---

## 2. 前提条件

- 一台 VPS（推荐 2C4G 以上），已安装 **Docker** 和 **Docker Compose**
- 域名（可选，用于 HTTPS）
- 开放端口：**80**（HTTP），**443**（HTTPS，如需 SSL）

---

## 3. 快速部署

### 3.1 上传文件

```bash
# 将 deploy-files 目录上传到 VPS
scp -r ./deploy-files user@your-vps-ip:/home/user/jcargo-cms

# SSH 到服务器
ssh user@your-vps-ip
cd /home/user/jcargo-cms
```

### 3.2 配置环境变量

```bash
cp .env.example .env
nano .env  # 修改以下关键变量
```

必须修改的变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `POSTGRES_PASSWORD` | 数据库密码 | 建议修改为强密码 |
| `JWT_SECRET` | JWT 签名密钥 | 自动生成（建议保持） |
| `REFRESH_TOKEN_SECRET` | 刷新令牌密钥 | 自动生成（建议保持） |
| `DOMAIN` | 域名 | `localhost`（生产环境改为实际域名） |
| `VITE_API_URL` | 前端 API 地址 | `http://localhost:5000/api`（Docker 内无需修改） |

### 3.3 启动服务

```bash
docker-compose up -d --build
```

首次启动会自动：
1. 创建 PostgreSQL 数据库
2. 运行 Drizzle schema push（自动建表）
3. 启动后端 API 服务
4. 构建前端并启动 Nginx

### 3.4 初始化管理员

首次注册的用户会自动成为 **管理员**。访问 `http://your-vps-ip`，点击 "Register here" 创建第一个账号。

或者使用引导账号登录后自动创建：
- 邮箱: `wonder2k@gmail.com`
- 密码: `admin123`

> ⚠️ 此引导账号仅在**数据库为空**时可用，创建完毕后请通过用户管理页面修改密码。

---

## 4. 系统功能模块

| 模块 | 路由 | 角色 | 功能 |
|------|------|------|------|
| **Dashboard** | `/` | 所有 | 业务概览、统计数据、最近活动 |
| **商务中心** | `/business` | business, admin | 运价管理、客户CRM、报价、订舱 |
| **操作中心** | `/operation` | operation, admin | MAWB 管理、状态跟踪 |
| **财务结算** | `/finance` | finance, admin | 应收/应付、开票、利润分析 |
| **用户管理** | `/users` | admin | 审批注册、分配角色、权限管理 |

### 角色说明

| 角色 | 权限 |
|------|------|
| `admin` | 全部权限，包括用户管理和系统设置 |
| `business` | 运价管理、客户管理、报价、订舱 |
| `operation` | MAWB 操作、状态更新、轨迹追踪 |
| `finance` | 收款/付款管理、开票、账务分析 |
| `viewer` | 新注册默认角色，只读权限（需 admin 审核通过） |

---

## 5. 常用命令

```bash
# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# 重启后端
docker-compose restart backend

# 重新构建并启动
docker-compose up -d --build

# 停止服务
docker-compose down

# 停止并删除数据卷（⚠️ 会丢失所有数据！）
docker-compose down -v

# 进入后端容器
docker-compose exec backend sh

# 手动运行数据库迁移
docker-compose exec backend npm run db:push
```

---

## 6. 数据库管理

Drizzle ORM 使用 schema-driven 方式，修改 `backend/src/db/schema.ts` 后运行：

```bash
# 容器内执行
docker-compose exec backend npm run db:push

# 或者生成迁移文件
docker-compose exec backend npm run db:generate
```

### 数据备份

```bash
# 备份数据库
docker-compose exec db pg_dump -U jcargo_user jcargo_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup.sql | docker-compose exec -T db psql -U jcargo_user jcargo_db
```

---

## 7. HTTPS / SSL 配置（推荐）

### 使用 Nginx + Let's Encrypt（推荐在宿主机上配置）

```bash
# 安装 certbot
apt install certbot nginx

# 获取证书
certbot certonly --nginx -d your-domain.com

# 在宿主机配置反向代理
```

参考 `frontend/nginx.conf`，在宿主机 Nginx 中添加 SSL 配置：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. 目录结构

```
deploy-files/
├── .env.example          # 环境变量模板
├── docker-compose.yml    # Docker Compose 配置
├── README_deploy.md      # 本文件
├── loginauth.md          # OAuth 配置参考
├── uploads/              # 上传文件挂载目录
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   └── src/
│       ├── server.ts           # Express 入口
│       ├── db/
│       │   ├── index.ts        # Drizzle 连接
│       │   └── schema.ts       # 数据库 Schema
│       ├── middleware/
│       │   └── auth.ts         # JWT 认证中间件
│       └── routes/
│           ├── auth.ts         # 注册/登录/用户管理
│           ├── business.ts     # 商务相关(客户/运价/报价/订舱)
│           ├── operation.ts    # 操作相关(MAWB/跟踪)
│           └── finance.ts      # 财务相关(AR/AP/发票)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── vite.config.ts
    └── src/
        ├── App.tsx              # 路由和布局
        ├── context/AuthContext.tsx
        ├── services/api.ts      # API 客户端
        └── modules/             # 功能模块
            ├── Dashboard/
            ├── Business/
            ├── Operation/
            └── Finance/
```

---

## 9. 升级与维护

### 更新代码

```bash
# 拉取最新代码 → 重新构建
git pull
docker-compose up -d --build
```

### 性能优化

- Nginx 开启了浏览器缓存（静态资源）
- 数据库连接池由 `pg` 库自动管理
- 前端构建产物经过 esbuild 压缩

---

## 10. 故障排除

**问题**: 容器启动后前端无法访问
**解决**: `docker-compose logs frontend` 检查 Nginx 是否正常

**问题**: 后端报数据库连接错误
**解决**: 确保 `DATABASE_URL` 中的主机名为 `db`（Docker 网络内部）

**问题**: 注册后无法登录
**解决**: 新用户注册后状态为 `pending`，需要 admin 在用户管理中审核通过

**问题**: CORS 错误
**解决**: 后端 CORS 默认允许所有来源，生产环境建议在 `server.ts` 中设置 `origin` 为具体域名
