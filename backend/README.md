# Yunzai AI Backend (NestJS)

NestJS 后端服务，实现核心业务逻辑和安全机制。

## 🏗️ 架构

### 核心服务

1. **Auth & Security Service (The Fortress)**
   - **SSO 会话管理**: 使用 Redis 存储有效会话，登录时使旧会话失效
   - **资产保护中间件**: 追踪设备指纹（24小时滑动窗口），超过5台设备自动锁定账户并清除 API Key
   - **法律门禁守卫**: 阻止未签署法律声明的会员访问聊天接口

2. **Workflow Engine (The Black Box)**
   - 执行工作流配置
   - 支持变量替换（`{{user_input}}`）
   - 顺序执行步骤（prompt, api_call, transform）
   - 仅返回最终结果，不返回提示词
   - 处理上游 API 错误（401/429）

## 📦 安装

```bash
cd backend
npm install
```

## 🔧 配置

1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 配置环境变量：
- `DATABASE_URL`: PostgreSQL 连接字符串
- `REDIS_URL`: Redis 连接字符串
- `JWT_SECRET`: JWT 密钥
- `PORT`: 服务器端口（默认 3000）

3. 生成 Prisma 客户端：
```bash
npm run prisma:generate
```

4. 运行数据库迁移：
```bash
npm run prisma:migrate
```

## 🚀 运行

### 开发模式
```bash
npm run start:dev
```

### 生产模式
```bash
npm run build
npm run start:prod
```

## 📁 项目结构

```
backend/
├── src/
│   ├── auth/              # 认证和安全
│   │   ├── guards/        # 守卫（JWT, Legal Gate）
│   │   ├── middleware/    # 中间件（资产保护）
│   │   ├── strategies/    # Passport 策略
│   │   └── auth.service.ts
│   ├── chat/              # 聊天控制器
│   ├── common/            # 通用代码
│   │   ├── exceptions/    # 自定义异常
│   │   └── filters/       # 全局异常过滤器
│   ├── prisma/            # Prisma 服务
│   ├── redis/             # Redis 服务
│   ├── workflow/          # 工作流引擎
│   ├── app.module.ts      # 根模块
│   └── main.ts            # 入口文件
├── package.json
└── tsconfig.json
```

## 🔐 安全特性

### SSO 踢出机制
- 登录时自动使旧会话失效
- 使用 Redis 存储会话，支持分布式部署

### 资产保护
- 24小时内最多5台设备
- 触发限制后：
  - 账户状态设置为 `LOCKED_ASSET_PROTECTION`
  - API Key 被清除（设为 NULL）
  - 抛出 `ASSET_PROTECTION_TRIGGERED` 错误

### 法律门禁
- 检查用户是否为会员（`membershipExpireAt > now()`）
- 如果是会员但未签署法律声明（`isLegalSigned = false`），阻止访问 `/chat` 接口

## 🔄 工作流引擎

工作流配置示例（存储在 `AIDomain.workflowConfig`）：

```json
{
  "steps": [
    {
      "type": "prompt",
      "config": {
        "template": "请分析以下内容：{{user_input}}"
      }
    },
    {
      "type": "api_call",
      "config": {
        "endpoint": "/v1/chat/completions"
      }
    },
    {
      "type": "transform",
      "config": {
        "type": "extract_json"
      }
    }
  ],
  "variables": {
    "custom_var": "value"
  }
}
```

### 步骤类型

1. **prompt**: 替换变量生成提示词
2. **api_call**: 调用上游 API（使用用户的 API Key）
3. **transform**: 转换结果（uppercase, lowercase, extract_json 等）

## 🛡️ 错误处理

全局异常过滤器确保：
- 不向用户暴露原始 500 错误
- 返回友好的错误消息和错误代码
- 记录详细错误日志供调试

### 自定义异常

- `AssetProtectionTriggeredException`: 资产保护触发
- `LegalGateBlockedException`: 法律门禁阻止
- `UpstreamUnauthorizedException`: 上游 API 401 错误
- `UpstreamRateLimitException`: 上游 API 429 错误
- `WorkflowExecutionException`: 工作流执行错误

## 📝 API 端点

### POST /chat
发送聊天消息并执行工作流。

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "domainId": "domain-uuid",
  "message": "用户输入"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "message": "工作流执行结果"
  }
}
```

## 🔍 调试

查看 Prisma 数据库：
```bash
npm run prisma:studio
```

## 📚 相关文档

- [NestJS 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [Redis 文档](https://redis.io/docs/)
