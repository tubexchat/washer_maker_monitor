# 交易量查询工具 | Renance Trade Volume Monitor

一个美观、现代化的交易量查询工具，用于可视化 Renance 平台的交易统计数据。

![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8)

## ✨ 功能特性

- 🚀 **快速查询**: 一键查询今天、昨天、最近7天、最近30天的交易数据
- 🎯 **自定义查询**: 支持自定义日期范围、交易对、分组方式
- 📊 **数据可视化**: 直观展示交易量、交易笔数、手续费等关键指标
- 💎 **现代设计**: 采用玻璃态设计、渐变色、微动画等现代设计元素
- 📱 **响应式布局**: 完美适配桌面端和移动端
- ⚡ **实时数据**: 直接从 Renance API 获取最新数据

## 🎨 界面预览

- **深色主题**: 优雅的深色背景配合紫色-蓝色渐变
- **玻璃态卡片**: 半透明背景，毛玻璃效果
- **动态背景**: 流动的渐变背景动画
- **平滑交互**: 悬停效果、点击反馈、加载动画

## 🛠️ 技术栈

- **框架**: Next.js 16.1 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4 + Custom CSS
- **字体**: Inter (Google Fonts)
- **部署**: Cloudflare Pages (静态导出)

## 📦 安装与使用

### 本地开发

```bash
# 安装依赖
npm install
# 或
yarn install

# 启动开发服务器
npm run dev
# 或
yarn dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
# 构建标准 Next.js 版本
npm run build
# 或
yarn build

# 启动生产服务器
npm run start
# 或
yarn start
```

### 构建 Cloudflare Pages 版本

```bash
# 安装 Cloudflare 适配器 (首次需要)
yarn add -D @cloudflare/next-on-pages

# 构建 Cloudflare 兼容版本
npx @cloudflare/next-on-pages

# 本地预览 Cloudflare 版本 (可选)
wrangler pages dev .vercel/output/static
```


## ☁️ 部署到 Cloudflare Pages

**注意**: 本项目使用 Next.js API Routes，需要使用 `@cloudflare/next-on-pages` 适配器。

### 快速部署

```bash
# 安装 Cloudflare 适配器
yarn add -D @cloudflare/next-on-pages

# 构建项目
npx @cloudflare/next-on-pages

# 部署 (需要先安装并登录 wrangler)
wrangler pages deploy .vercel/output/static --project-name=trade-volume-monitor
```

### 通过 Cloudflare Dashboard 部署

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

### 环境变量配置（可选）

在 Cloudflare Pages 设置中添加:
- `RENANCE_API_KEY`: 你的 API 密钥
- `RENANCE_API_BASE_URL`: API 基础 URL

详细配置请查看 [CLOUDFLARE.md](./CLOUDFLARE.md)


## 🔧 配置说明

### API 配置

**⚠️ CORS 解决方案**

本项目使用 Next.js API Route 作为代理，避免浏览器的 CORS 限制：

```
浏览器 → /api/volume → Renance API
        (无CORS限制)
```

API 密钥配置在 `app/api/volume/route.ts` 中：

```typescript
const API_KEY = 'your-api-key-here';
const API_BASE_URL = 'https://api.renance.xyz/api/v1/admin/stats/trade-volume';
```

**生产环境建议**: 使用环境变量存储 API 密钥：

1. 创建 `.env.local` 文件（已在 .gitignore 中）：
   ```env
   RENANCE_API_KEY=your-api-key-here
   RENANCE_API_BASE_URL=https://api.renance.xyz/api/v1
   ```

2. 修改 `app/api/volume/route.ts`:
   ```typescript
   const API_KEY = process.env.RENANCE_API_KEY;
   ```

3. 在 Cloudflare Pages 设置中添加环境变量

详细说明请查看 [CORS_SOLUTION.md](./CORS_SOLUTION.md)


### 样式定制

全局样式定义在 `app/globals.css` 中，包括：

- **颜色变量**: CSS 变量定义的主题色、背景色等
- **动画效果**: 渐变背景、淡入动画、加载动画等
- **组件样式**: 玻璃态卡片、按钮效果等

## 📂 项目结构

```
washer_maker_monitor/
├── app/
│   ├── api/
│   │   └── volume/
│   │       └── route.ts     # API 代理路由（解决 CORS）
│   ├── favicon.ico          # 网站图标
│   ├── globals.css          # 全局样式
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 主页面（查询工具）
├── public/                  # 静态资源
├── .gitignore              # Git 忽略文件
├── CLOUDFLARE.md           # Cloudflare 部署文档
├── CORS_SOLUTION.md        # CORS 问题解决方案文档
├── next.config.ts          # Next.js 配置
├── package.json            # 依赖配置
├── README.md               # 项目文档
├── tailwind.config.ts      # Tailwind 配置
└── tsconfig.json           # TypeScript 配置
```

## 🎯 功能详解

### 快速查询

- **今天**: 查询当天的交易数据
- **昨天**: 查询前一天的交易数据
- **最近7天**: 查询最近7天的数据，按天分组
- **最近30天**: 查询最近30天的数据，按天分组

### 自定义查询

- **开始日期**: 选择查询起始日期
- **结束日期**: 选择查询结束日期
- **交易对**: 筛选特定交易对（如 BTCUSDT）
- **分组方式**: 选择按天或按小时分组

### 数据展示

- **总体统计**: 显示总交易量、总笔数、总手续费、平均交易额
- **按交易对统计**: 列表展示各交易对的详细数据
- **按时间统计**: 时间序列数据，支持按天或按小时分组

## 🚀 性能优化

- ✅ 静态导出，无服务器运行时
- ✅ CSS 和 JavaScript 自动压缩
- ✅ 图片优化（虽然当前项目无图片）
- ✅ 自动代码分割
- ✅ 生产构建优化

## 📝 开发说明

### 添加新功能

1. 在 `app/page.tsx` 中添加新的查询函数
2. 更新 UI 组件和样式
3. 测试功能是否正常

### 修改样式

1. 全局样式: 编辑 `app/globals.css`
2. 组件样式: 在 `app/page.tsx` 中使用 Tailwind 类名
3. 自定义动画: 在 CSS 中定义 `@keyframes`

## 🐛 常见问题

### 1. API 请求失败

- 检查 API 密钥是否正确
- 确认 API 端点是否可访问
- 查看浏览器控制台的错误信息

### 2. 构建失败

- 确保 Node.js 版本 >= 18
- 删除 `node_modules` 和 `yarn.lock`/`package-lock.json`，重新安装
- 检查 TypeScript 类型错误

### 3. 部署到 Cloudflare 后无法访问

- 确认构建输出目录设置为 `out`
- 检查 Cloudflare Pages 的构建日志
- 确保没有使用 Next.js 的服务器端功能

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Renance API 文档](https://api.renance.xyz/docs)

---

Made with ❤️ for Renance Platform
