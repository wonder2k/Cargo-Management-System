部署用的是 Docker Compose + PostgreSQL，备份脚本已经有了。以下是完整操作流程：

1. VPS 上备份数据
SSH 到 VPS，在项目根目录执行：


# 进入项目目录
cd /path/to/jcargo-new

# 执行备份（会自动导出 SQL + 打包上传文件）
bash gitndbbackup
备份文件会生成在 backup/ 目录下：

jcargo-db-20260517_120000.sql.gz — 数据库
jcargo-uploads-20260517_120000.tar.gz — 上传文件
2. 下载到本地

# 从 VPS 下载到本地项目目录
scp user@your-vps:/path/to/jcargo-new/backup/jcargo-db-*.sql.gz  "d:/code/jcargo-new/backup/"
scp user@your-vps:/path/to/jcargo-new/backup/jcargo-uploads-*.tar.gz  "d:/code/jcargo-new/backup/"
3. 本地恢复
在本地项目根目录执行：


# 1. 确保 backup 目录存在且有备份文件
ls backup/

# 2. 启动数据库（仅启动 db 服务）
cd deploy-files
docker compose up -d db

# 3. 等数据库就绪后恢复数据
cd ..
bash gitndbrestore backup/jcargo-db-20260517_120000.sql.gz

# 4. 恢复上传文件
tar xzf backup/jcargo-uploads-20260517_120000.tar.gz -C deploy-files/uploads

# 5. 启动完整服务
cd deploy-files
docker compose up -d
注意：docker-compose.yml 里 .env 文件中的 DATABASE_URL、JWT_SECRET 等环境变量需要和 VPS 一致，否则 token 验证会失败。建议从 VPS 把 .env 文件一起下载下来放到本地 deploy-files/ 目录。