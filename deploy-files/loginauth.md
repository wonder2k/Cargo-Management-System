##生产环境 OAuth (Google Login) 配置指南

在 VPS 环境下配置 Google OAuth 需要以下步骤：
###第一步：在 Google Cloud Console 配置
访问 Google Cloud Console。
创建项目或选择现有项目。
点击 API & Services > OAuth consent screen，配置应用信息（外部用户，填写应用名称、邮箱等）。
点击 Credentials > Create Credentials > OAuth client ID。
应用类型选择 Web application。
关键设置 (Authorized redirect URIs):
填写你的 VPS 域名回调地址。例如：https://your-domain.com/api/auth/google/callback。
如果是测试环境也可填写：http://your-vps-ip:5000/api/auth/google/callback。
保存后获取 Client ID 和 Client Secret。
###第二步：环境变量配置
在 VPS 的 .env 文件中添加以下变量：
code
Env
GOOGLE_CLIENT_ID=你的_CLIENT_ID
GOOGLE_CLIENT_SECRET=你的_CLIENT_SECRET
AUTH_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
FRONTEND_URL=https://your-domain.com
###第三步：后端生产环境代码逻辑
生产环境通常建议使用 passport-google-oauth20 库。以下是核心代码逻辑（已整理到你的后端架构中）：
Auth Route:
GET /api/auth/google: 重定向用户到 Google 登录页面。
GET /api/auth/google/callback: 接收 Google 返回的 code，换取用户信息，在数据库中查找/创建用户，并生成 JWT Token 写入 Cookie 或返回给前端。
第四步：Nginx 反向代理配置 (关键)
确保 Nginx 头部信息传递正确，否则 OAuth 的重定向可能会因为协议不匹配（HTTP/HTTPS）而失败：
code
Nginx
location /api/ {
    proxy_pass http://localhost:5000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

##如何使用之前的 Email 登录？
在 VPS 版的登录页面，除了 Demo 登录按钮，你可以直接使用原本设计的账号进行登录：
管理员账号: wonder2k@gmail.com
密码: admin123 (代码中已硬编码此测试特权，建议部署后通过 db:push 后的数据库工具修改为加密 hash)