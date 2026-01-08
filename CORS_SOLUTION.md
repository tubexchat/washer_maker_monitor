# CORS 问题解决方案

## 问题描述
当从浏览器直接调用 `https://api.renance.xyz` 时，会遇到 CORS（跨域资源共享）错误：
```
Access to fetch has been blocked by CORS policy: Request header field x-api-key is not allowed by Access-Control-Allow-Headers in preflight response.
```

## 解决方案
使用 Next.js API Route 作为代理服务器：

### 架构流程
```
浏览器 → Next.js API Route (/api/volume) → Renance API
                ↓
        (无CORS限制，服务器到服务器通信)
```

### 实现细节

1. **API 代理路由** (`/app/api/volume/route.ts`):
   - 接收前端请求
   - 在服务器端添加 API Key
   - 转发请求到 Renance API
   - 返回结果给前端

2. **前端调用** (`/app/page.tsx`):
   - 调用本地 API 路由: `/api/volume`
   - 无需处理 CORS
   - 无需暴露 API Key 到浏览器

### 优势
✅ **绕过 CORS 限制**: 服务器到服务器的请求没有 CORS 限制  
✅ **API Key 安全**: API Key 保存在服务器端，不会暴露到浏览器  
✅ **统一错误处理**: 在代理层统一处理错误  
✅ **缓存控制**: 可以在代理层添加缓存策略  

## 注意事项
- API Key 存储在服务器端代码中，部署到生产环境时应使用环境变量
- 建议在生产环境中添加请求限流和认证机制
