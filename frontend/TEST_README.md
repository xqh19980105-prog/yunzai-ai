# 测试指南

## 📋 概述

本项目使用 **Vitest** 作为测试框架，配合 **React Testing Library** 进行组件测试。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行测试

```bash
# 交互模式运行测试（推荐开发时使用）
npm test

# 运行一次测试并退出
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage

# 使用 UI 界面运行测试（可视化界面）
npm run test:ui
```

## 📁 测试文件结构

```
frontend/
├── src/
│   ├── lib/
│   │   └── utils/
│   │       ├── error-handler.ts          # 源代码
│   │       └── error-handler.test.ts     # 测试文件
│   └── test/
│       └── setup.ts                      # 测试环境配置
├── vitest.config.ts                      # Vitest 配置
└── TEST_README.md                        # 本文档
```

## ✨ 测试覆盖范围

### error-handler.test.ts 测试套件

当前测试文件 `error-handler.test.ts` 提供了全面的测试覆盖：

#### 1. ✅ 正常功能测试
- ✅ AxiosError 错误消息提取
- ✅ 普通 Error 对象处理
- ✅ 错误代码提取
- ✅ 类型守卫功能

#### 2. ✅ 边界条件测试
- ✅ 空字符串处理
- ✅ 超长错误消息（10000+ 字符）
- ✅ 特殊字符处理（HTML、Unicode、emoji）
- ✅ null/undefined 处理
- ✅ 缺失 response 的 AxiosError

#### 3. ✅ 异常处理测试
- ✅ 各种数据类型转换
- ✅ 非标准错误对象处理
- ✅ 网络错误场景
- ✅ 服务器错误场景

#### 4. ✅ 潜在逻辑漏洞测试
- ✅ 错误消息优先级验证
- ✅ 嵌套错误对象处理
- ✅ 真实 API 错误响应模拟

#### 5. ✅ 性能测试
- ✅ 批量错误处理性能

## 📊 查看测试覆盖率

运行以下命令生成覆盖率报告：

```bash
npm run test:coverage
```

覆盖率报告会生成在 `coverage/` 目录中，打开 `coverage/index.html` 可以在浏览器中查看详细的覆盖率信息。

## 🔧 编写新测试

### 测试文件命名规范

- 单元测试：`*.test.ts` 或 `*.test.tsx`
- 集成测试：`*.integration.test.ts`

### 测试结构示例

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from './your-module';

describe('yourFunction', () => {
  describe('正常功能测试', () => {
    it('应该正确执行基本功能', () => {
      const result = yourFunction('input');
      expect(result).toBe('expected');
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空输入', () => {
      const result = yourFunction('');
      expect(result).toBeDefined();
    });
  });

  describe('异常处理测试', () => {
    it('应该优雅处理错误输入', () => {
      expect(() => yourFunction(null)).not.toThrow();
    });
  });
});
```

## 🎯 测试最佳实践

1. **AAA 模式**：Arrange（准备）→ Act（执行）→ Assert（断言）
2. **测试独立**：每个测试应该独立运行，不依赖其他测试
3. **清晰命名**：测试名称应该清晰描述测试意图
4. **单一职责**：每个测试只验证一个功能点
5. **Mock 外部依赖**：使用 `vi.mock()` 模拟 API 调用、localStorage 等

## 🐛 调试测试

### 使用 console.log

```typescript
it('调试测试', () => {
  console.log('调试信息');
  // ...
});
```

### 使用调试器

在 VS Code 中：
1. 安装 "JavaScript Debugger" 扩展
2. 设置断点
3. 运行 "Debug: JavaScript Debug Terminal"
4. 在终端中运行 `npm test`

## 📚 相关资源

- [Vitest 官方文档](https://vitest.dev/)
- [React Testing Library 文档](https://testing-library.com/react)
- [Jest DOM 匹配器](https://github.com/testing-library/jest-dom)

## ❓ 常见问题

### Q: 测试运行失败，提示找不到模块？

A: 确保 `vitest.config.ts` 中的路径别名配置正确，并且已安装所有依赖。

### Q: 如何测试 React 组件？

A: 使用 `@testing-library/react` 的 `render` 函数：

```typescript
import { render, screen } from '@testing-library/react';
import { YourComponent } from './YourComponent';

it('应该渲染组件', () => {
  render(<YourComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Q: 如何模拟 API 请求？

A: 使用 `vi.mock()` 和 `vi.fn()`：

```typescript
vi.mock('@/lib/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));
```
