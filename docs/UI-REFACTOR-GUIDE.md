# 芸仔AI UI 重构指南

## 概述

本次重构将芸仔AI的前端UI升级为豆包（Doubao）风格，同时增强了工作流编辑器的功能。

## 设计系统

### 色彩系统

| 类型 | 颜色 | 用途 |
|------|------|------|
| 主色 | `#0066FF` | 按钮、链接、强调 |
| 主色悬停 | `#0052CC` | 按钮悬停状态 |
| 主色浅 | `#E6F0FF` | 背景高亮、标签 |
| 背景主 | `#FFFFFF` | 卡片、输入框 |
| 背景次 | `#F7F8FA` | 页面背景 |
| 文字主 | `#1A1A1A` | 标题、正文 |
| 文字次 | `#666666` | 描述文字 |
| 文字三级 | `#999999` | 辅助文字 |
| 边框 | `#E5E7EB` | 卡片边框 |
| 成功 | `#10B981` | 成功状态 |
| 警告 | `#F59E0B` | 警告状态 |
| 错误 | `#EF4444` | 错误状态 |

### 圆角系统

- `sm`: 6px - 小按钮、标签
- `md`: 10px - 输入框
- `lg`: 12px - 卡片
- `xl`: 16px - 大卡片、对话框
- `2xl`: 20px - 特大卡片
- `full`: 9999px - 圆形按钮

### 阴影系统

```css
/* 柔和阴影 */
--shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.06);

/* 卡片阴影 */
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);

/* 卡片悬停阴影 */
--shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.08);

/* 下拉菜单阴影 */
--shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.12);

/* 模态框阴影 */
--shadow-modal: 0 16px 48px rgba(0, 0, 0, 0.16);
```

## 新增组件

### 1. MainLayout 主布局

位置：`/src/components/layout/MainLayout.tsx`

用于包裹需要侧边栏的页面。

```tsx
import { MainLayout } from '@/components/layout/MainLayout';

export function MyPage() {
  return (
    <MainLayout>
      {/* 页面内容 */}
    </MainLayout>
  );
}
```

### 2. Sidebar 侧边栏

位置：`/src/components/layout/Sidebar.tsx`

可折叠的侧边栏，包含导航菜单和用户信息。

特性：
- 响应式设计（移动端抽屉式）
- 可折叠/展开
- 当前页面高亮
- 用户信息显示

### 3. 工作流编辑器 V2

位置：`/src/components/admin/WorkflowEditor/`

全新的可视化工作流编辑器。

#### 文件结构

```
WorkflowEditor/
├── types.ts              # 类型定义
├── StepNode.tsx          # 步骤节点组件
├── StepPalette.tsx       # 步骤选择面板
├── useWorkflowEditorV2.ts # 状态管理Hook
└── WorkflowEditorV2.tsx  # 主视图组件
```

#### 功能特性

1. **多步骤串联**：支持多个步骤顺序执行
2. **每步骤独立模型选择**：每个AI调用步骤可选择不同模型
3. **步骤类型**：
   - `prompt`: AI 调用
   - `condition`: 条件分支（即将推出）
   - `transform`: 数据转换
   - `output`: 输出

4. **预设模板**：
   - AI 对话
   - 翻译
   - 摘要
   - 分析
   - 格式化
   - 输出

#### 使用方法

```tsx
import { WorkflowEditorV2 } from '@/components/admin/WorkflowEditor/WorkflowEditorV2';

export default function WorkflowPage() {
  return <WorkflowEditorV2 />;
}
```

## CSS 类名

### 按钮

```html
<!-- 主按钮 -->
<button class="btn-primary">主按钮</button>

<!-- 次按钮 -->
<button class="btn-secondary">次按钮</button>

<!-- 幽灵按钮 -->
<button class="btn-ghost">幽灵按钮</button>
```

### 卡片

```html
<!-- 基础卡片 -->
<div class="card-doubao">卡片内容</div>

<!-- 可交互卡片 -->
<div class="card-doubao-interactive">可点击卡片</div>
```

### 输入框

```html
<!-- 输入框 -->
<input class="input-doubao" placeholder="请输入..." />

<!-- 文本域 -->
<textarea class="textarea-doubao" placeholder="请输入..."></textarea>
```

### 标签

```html
<span class="tag-blue">蓝色标签</span>
<span class="tag-green">绿色标签</span>
<span class="tag-orange">橙色标签</span>
<span class="tag-red">红色标签</span>
```

### 消息气泡

```html
<!-- 用户消息 -->
<div class="message-user">用户消息</div>

<!-- AI消息 -->
<div class="message-assistant">AI消息</div>
```

## 登录状态修复

### 问题描述

登录成功后跳转到 `/admin` 页面时，页面显示"未登录"。

### 解决方案

1. **原子操作**：使用 `setAuth()` 方法同时设置 user 和 token
2. **水合检测**：添加 `isHydrated` 状态跟踪 zustand persist 水合完成
3. **状态同步**：添加 `syncAuthFromStorage()` 函数从 localStorage 恢复状态

### 代码示例

```tsx
// 登录时使用 setAuth
const { setAuth } = useAuthStore();
setAuth(userData, token);

// 检查水合状态
const { isHydrated } = useAuthStore();
if (!isHydrated) {
  return <Loading />;
}

// 同步恢复状态
import { syncAuthFromStorage } from '@/stores/auth-store';
useEffect(() => {
  syncAuthFromStorage();
}, []);
```

## 迁移指南

### 从旧版首页迁移

1. 将 `<UserHeader />` 替换为 `<MainLayout>`
2. 移除外层 `<div className="container">`
3. 使用新的卡片样式

### 从旧版工作流编辑器迁移

1. 导入 `WorkflowEditorV2` 替代 `WorkflowEditor`
2. 旧版配置会自动迁移到新格式
3. 新增的模型选择功能需要配置中转站

## 注意事项

1. **响应式设计**：所有组件都支持移动端
2. **动画**：使用 `transition-all duration-200` 保持一致的动画效果
3. **无障碍**：确保按钮和链接有适当的 `title` 属性
4. **性能**：使用 `React.memo` 优化频繁渲染的组件

## 后续计划

1. 条件分支功能完善
2. 拖拽排序步骤
3. 工作流版本历史
4. 工作流模板市场
