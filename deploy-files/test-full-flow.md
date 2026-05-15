VPS 重新部署步骤

cd /opt/jcargo

# 1. 重新构建（包含所有代码修复）
docker compose down
docker compose up --build -d

# 2. 运行数据库迁移（新增可空字段不需要改动表结构，但也建议同步）
docker compose exec backend npx drizzle-kit push

# 3. 种子管理员（如果首次部署未运行）
docker compose exec backend sh -c "npm run db:seed"

# 4. 运行测试
bash deploy-files/test-full-flow.sh http://localhost:8080