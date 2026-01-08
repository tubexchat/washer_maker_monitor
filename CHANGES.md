# CORS 问题修复总结

## 🎯 问题描述

在浏览器中直接调用 `https://api.renance.xyz` 时遇到 CORS 错误：

```
Access to fetch at 'https://api.renance.xyz/api/v1/admin/stats/trade-volume' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Request header field x-api-key is not allowed by Access-Control-Allow-Headers 
in preflight response.
```

## ✅ 解决方案

创建 Next.js API Route 作为代理服务器，实现浏览器与外部 API 之间的中转。

### 架构变更

**之前（有 CORS 问题）:**
```
浏览器 → Renance API
   ❌ CORS 阻止
```

**现在（无 CORS 问题）:**
```
浏览器 → Next.js API Route → Renance API
           (/api/volume)
        ✅ 同域请求      ✅ 服务器到服务器
```

## 📝 具体修改

### 1. 创建 API 代理路由

**文件**: `app/api/volume/route.ts` (新建)

- 接收前端请求
- 在服务器端添加 `X-API-Key` header
- 转发请求到 Renance API
- 返回结果给前端

### 2. 更新前端代码

**文件**: `app/page.tsx`

**修改前:**
```typescript
const url = `https://api.renance.xyz/api/v1/admin/stats/trade-volume?${queryParams}`;
const response = await fetch(url, {
  headers: {
    'X-API-Key': 'api-key-here'
  }
});
```

**修改后:**
```typescript
const url = `/api/volume?${queryParams}`;
const response = await fetch(url);
```

### 3. 移除静态导出配置

**文件**: `next.config.ts`

**修改前:**
```typescript
const nextConfig: NextConfig = {
  output: 'export',  // ❌ 静态导出不支持 API Routes
  // ...
};
```

**修改后:**
```typescript
const nextConfig: NextConfig = {
  // ✅ 移除 output: 'export'，启用完整 Next.js 功能
  // ...
};
```

### 4. 修复 CSS 导入顺序

**文件**: `app/globals.css`

**问题**: `@import "tailwindcss"` 会展开成大量 CSS 规则，导致后面的 `@import url(...)` 违反 CSS 规范。

**修改前:**
```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter...');
```

**修改后:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter...');
@import "tailwindcss";
```

### 5. 更新文档

更新了以下文档文件：
- `README.md` - 更新了 API 配置、构建和部署说明
- `CLOUDFLARE.md` - 完全重写，说明如何使用 `@cloudflare/next-on-pages`
- `CORS_SOLUTION.md` (新建) - 详细说明 CORS 解决方案

## 🚀 部署变更

### 之前的部署方式（不再适用）

```bash
npm run build  # 生成静态文件到 out/
wrangler pages deploy out/
```

### 现在的部署方式

```bash
# 安装 Cloudflare 适配器
yarn add -D @cloudflare/next-on-pages

# 构建 Cloudflare 兼容版本
npx @cloudflare/next-on-pages

# 部署
wrangler pages deploy .vercel/output/static --project-name=trade-volume-monitor
```

## 🎁 额外优势

1. **更好的安全性**: API Key 不会暴露到浏览器端
2. **统一错误处理**: 在代理层可以统一处理和格式化错误
3. **缓存控制**: 可以在代理层添加缓存策略
4. **请求转换**: 可以在代理层进行请求/响应的转换和验证
5. **速率限制**: 可以在代理层添加请求限流逻辑

## ⚠️ 注意事项

1. **不再是纯静态网站**: 需要 Cloudflare Pages 的 Next.js 运行时支持
2. **API Key 安全**: 生产环境建议使用环境变量而不是硬编码
3. **冷启动**: 首次请求可能会稍慢（serverless 冷启动）

## ✅ 测试确认

所有 API 调用现在都成功返回 200 状态码：

```
GET /api/volume?start_date=2026-01-08&end_date=2026-01-08 200 in 1377ms
GET /api/volume?start_date=2026-01-07&end_date=2026-01-07 200 in 2.5s
GET /api/volume?start_date=2026-01-02&end_date=2026-01-08&group_by=day 200 in 226ms
```

## 📚 相关文档

- [CORS_SOLUTION.md](./CORS_SOLUTION.md) - CORS 问题详细说明
- [CLOUDFLARE.md](./CLOUDFLARE.md) - Cloudflare Pages 部署指南
- [README.md](./README.md) - 项目完整文档
