# Yunzai AI Frontend (Next.js 14)

Next.js 14 前端应用，使用 App Router、TypeScript、Tailwind CSS 和 Shadcn/UI。

## 🚀 快速开始

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

配置 `NEXT_PUBLIC_API_URL` 指向后端 API 地址。

### 运行开发服务器

```bash
npm run dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   └── root-layout-client.tsx  # 客户端布局（配置注入）
│   ├── components/
│   │   ├── modals/            # 错误处理模态框
│   │   │   ├── KickOutModal.tsx
│   │   │   ├── KeyBalanceModal.tsx
│   │   │   └── AccountLockedModal.tsx
│   │   ├── pages/             # 页面组件
│   │   │   └── HomePage.tsx
│   │   ├── ui/                # UI 组件（Shadcn/UI）
│   │   └── Watermark.tsx      # 水印组件
│   ├── lib/
│   │   ├── api/
│   │   │   ├── axios.ts       # Axios 全局拦截器
│   │   │   └── system-config.ts
│   │   └── utils.ts
│   └── stores/                # Zustand 状态管理
│       ├── auth-store.ts
│       └── error-modal-store.ts
├── package.json
└── tsconfig.json
```

## ✨ 核心功能

### 1. 全局布局和配置注入

- **RootLayout**: 从 API 获取 `SystemConfig`
- **SEO 注入**: 动态注入 title、description、keywords
- **Analytics 脚本**: 支持 Head 和 Body 脚本注入
- **水印组件**: 固定覆盖层，显示 "芸仔AI - UID:xxx"

### 2. 全局错误拦截器 (Axios)

- **401**: 触发 `KickOutModal`（"已在其他地方登录"），重定向到登录页
- **402/429**: 触发 `KeyBalanceModal`（"余额不足"）
- **403**: 检查是否为 `ASSET_PROTECTION`，显示红色"账户已锁定"模态框
- **500**: 显示 Toast "服务维护中"

### 3. 响应式网格布局

- **桌面端** (`md+`): `grid-cols-10`（10 列密集网格）
- **移动端**: `grid-cols-2`（2 列网格）
- **卡片样式**: 矩形、简约（Doubao 风格）
  - 圆角：`rounded-xl`
  - 柔和阴影：`shadow-soft`
  - 胶囊按钮：`rounded-full`

## 🎨 设计规范

### Doubao 风格

- **UI**: 简约、圆角（rounded-xl/2xl）、柔和阴影、胶囊按钮
- **布局**: 
  - 桌面：10 列密集网格
  - 移动：2 列网格
- **配色**: 柔和蓝色主色，干净的白/灰背景

## 🔧 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: Shadcn/UI + Radix UI
- **图标**: Lucide React
- **HTTP 客户端**: Axios
- **状态管理**: Zustand
- **表单验证**: Zod
- **Toast 通知**: Sonner

## 📝 开发说明

### 添加新页面

在 `src/app/` 目录下创建新的路由目录和 `page.tsx` 文件。

### 添加新组件

在 `src/components/` 目录下创建组件文件。

### 使用 API

```typescript
import api from '@/lib/api/axios';

// GET 请求
const response = await api.get('/api/endpoint');

// POST 请求
const response = await api.post('/api/endpoint', data);
```

### 使用状态管理

```typescript
import { useAuthStore } from '@/stores/auth-store';

function MyComponent() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  // ...
}
```

## 🚢 构建和部署

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

## 📚 相关文档

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Shadcn/UI 文档](https://ui.shadcn.com/)
