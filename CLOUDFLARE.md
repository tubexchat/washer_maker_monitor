# Cloudflare Pages 部署指南

## 🚀 部署方式

本项目现在使用 **Next.js 完整功能**（包括 API Routes），需要使用 Cloudflare Pages 的 **Next.js 支持**。

### 方法一: 使用 @cloudflare/next-on-pages（推荐）

#### 1. 安装依赖

```bash
npm install --save-dev @cloudflare/next-on-pages
# 或
yarn add -D @cloudflare/next-on-pages
```

#### 2. 构建项目

```bash
npx @cloudflare/next-on-pages
```

构建后的文件将在 `.vercel/output/static` 目录中。

#### 3. 部署到 Cloudflare Pages

使用 Wrangler CLI:

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署
wrangler pages deploy .vercel/output/static --project-name=trade-volume-monitor
```

### 方法二: 通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** 页面
3. 点击 **Create a project**
4. 连接你的 Git 仓库（GitHub/GitLab）
5. 配置构建设置:
   - **Framework preset**: Next.js
   - **构建命令**: `npx @cloudflare/next-on-pages@latest`
   - **构建输出目录**: `.vercel/output/static`
   - **Node.js 版本**: 18 或更高
6. 点击 **Save and Deploy**

## 🔑 环境变量配置

虽然当前 API Key 硬编码在代码中，但在生产环境中建议使用环境变量：

### Cloudflare Pages 设置

1. 进入你的 Pages 项目设置
2. 导航到 **Settings** → **Environment variables**
3. 添加以下变量:
   ```
   RENANCE_API_KEY=jLaOQFpw7GfWSUjccDdeprgPuVz6Cev8SmJu1IDLaek=
   RENANCE_API_BASE_URL=https://api.renance.xyz/api/v1
   ```

### 更新代码使用环境变量

修改 `app/api/volume/route.ts`:

```typescript
const API_KEY = process.env.RENANCE_API_KEY || 'default-key';
const API_BASE_URL = process.env.RENANCE_API_BASE_URL || 'https://api.renance.xyz/api/v1';
```

## 📋 完整部署流程

### 准备工作

```bash
# 克隆或拉取最新代码
git pull

# 安装依赖
yarn install

# 本地测试
yarn dev
```

### 构建和部署

```bash
# 安装 Cloudflare adapter
yarn add -D @cloudflare/next-on-pages

# 构建项目
npx @cloudflare/next-on-pages

# 部署到 Cloudflare Pages
wrangler pages deploy .vercel/output/static --project-name=trade-volume-monitor
```

## ⚙️ 配置说明

### package.json 脚本

建议在 `package.json` 中添加以下脚本:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:cf": "npx @cloudflare/next-on-pages@latest",
    "deploy": "wrangler pages deploy .vercel/output/static",
    "preview": "wrangler pages dev .vercel/output/static"
  }
}
```

然后可以使用:

```bash
yarn build:cf    # 构建 Cloudflare 版本
yarn deploy      # 部署到 Cloudflare Pages
yarn preview     # 本地预览 Cloudflare 版本
```

## 🔧 故障排除

### API Routes 404 错误

如果部署后 API routes 返回 404:

1. 确保使用了 `@cloudflare/next-on-pages` 构建
2. 检查 Cloudflare Pages 的构建日志
3. 验证构建输出目录设置正确

### CORS 错误

如果在 Cloudflare Pages 上仍然遇到 CORS 错误:

1. 检查 API route 是否正确部署
2. 在浏览器控制台查看请求是否发送到正确的路径
3. 确认环境变量已正确配置

### 环境变量不生效

1. 确保在 Cloudflare Pages 设置中添加了环境变量
2. 重新部署项目以应用新的环境变量
3. 使用 `console.log` 验证环境变量是否加载

## 📚 相关资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## ⚠️ 重要提示

1. **不再使用静态导出**: 由于需要 API Routes功能，项目不再使用 `output: 'export'`
2. **需要 Cloudflare 适配器**: 必须使用 `@cloudflare/next-on-pages` 来构建项目
3. **API Key 安全**: 生产环境务必使用环境变量存储 API 密钥

---

如有问题，请查看 [CORS_SOLUTION.md](./CORS_SOLUTION.md) 了解 API 代理架构详情。
