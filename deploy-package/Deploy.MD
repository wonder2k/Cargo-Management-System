# Cargo Management System (CMS) 部署指南

本指南旨在指导您在 **Ubuntu 22.04 ARM VPS** (如甲骨文云、华为云等 ARM 实例) 上使用 Docker 一键部署 CMS 系统。

## 1. 环境准备 (VPS 端)

### 1.1 安装 Docker & Docker Compose
执行以下官方脚本安装 Docker：

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装常用工具
sudo apt install -y curl git gnupg

# 安装 Docker (ARM 兼容)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动并设置开机自启
sudo systemctl enable docker
sudo systemctl start docker

# 赋予当前用户操作权限
sudo usermod -aG docker $USER
newgrp docker
```

### 1.2 优化系统: 开启 Swap 分区
ARM VPS 往往内存有限，构建镜像时容易溢出。建议开启 2GB-4GB 的虚拟内存。

```bash
# 创建 4G 的 swap 文件
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 设置永久生效
echo '/swapfile lib none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. 代码获取与配置

### 2.1 克隆项目
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd <PROJECT_DIR>
```

### 2.2 配置环境变量
```bash
cp deploy-package/.env.example .env
# 使用 nano 或 vim 修改配置信息 (特别是密码)
nano .env
```

---

## 3. 一键部署

### 3.1 启动服务
使用 Docker Compose 在后台构建并启动容器：

```bash
docker compose -f deploy-package/docker-compose.yml up -d --build
```

### 3.2 验证状态
```bash
# 查看容器是否正常运行
docker compose -f deploy-package/docker-compose.yml ps
```

---

## 4. 数据库初始化 (如果使用 Prisma)

如果您的项目中配置了 Prisma ORM，请在容器内运行迁移脚本：

```bash
docker exec -it cms-app npx prisma db push
```

---

## 5. 访问与维护

- **访问地址**: `http://你的服务器IP:3000`
- **查看日志**: `docker logs -f cms-app`
- **停止服务**: `docker compose -f deploy-package/docker-compose.yml down`
- **更新代码**:
  ```bash
  git pull
  docker compose -f deploy-package/docker-compose.yml up -d --build
  ```

## 6. 安全建议 (防火墙)
Ubuntu 默认防火墙设置：
```bash
sudo ufw allow 22/tcp  # 必须开启 SSH
sudo ufw allow 3000/tcp # CMS 访问端口
sudo ufw enable
```

---

**版本说明**: v1.0.0 | 针对 PostgreSQL + Express + Vite 架构优化。
