# BYOK模式和中转站控制逻辑说明

## 📋 核心业务逻辑

### 业务模式概述

这是一个**BYOK（Bring Your Own Key）**模式的AI SaaS平台：

1. **用户提供自己的API密钥** - 用户必须使用自己的AI模型令牌密钥
2. **管理员控制中转站** - 必须由管理员控制使用哪个AI中转站
3. **管理员锁定模型和价格** - 每个领域（Domain）使用的AI模型、分组价格以及模型由管理员后端决定

---

## 🎯 数据流向和权限控制

### 1. **用户API密钥（User.apiKey）** ✅ 用户控制

- **位置**：`User.apiKey` 字段
- **用途**：所有API调用的认证凭据
- **控制者**：**用户自己**
- **说明**：用户必须提供自己的API密钥，存储在数据库中

### 2. **中转站地址（RelayConfig.baseUrl）** ✅ 管理员控制

- **位置**：`RelayConfig.baseUrl` 字段（激活的中转站）
- **用途**：工作流执行时使用的API基础URL
- **控制者**：**管理员**
- **说明**：管理员在后台配置并激活中转站，用户无法更改

### 3. **可用模型列表（RelayConfig.availableModels）** ✅ 管理员控制

- **位置**：`RelayConfig.availableModels` 字段（JSON数组）
- **用途**：限制工作流编辑器中可选择的模型
- **控制者**：**管理员**
- **说明**：管理员配置每个中转站支持的模型列表

### 4. **领域目标模型（AIDomain.targetModel）** ✅ 管理员控制

- **位置**：`AIDomain.targetModel` 字段
- **用途**：每个AI工具/领域强制使用的模型
- **控制者**：**管理员**
- **说明**：管理员在工作流编辑器中为每个领域指定目标模型

### 5. **用户自定义API地址（User.apiBaseUrl）** ⚠️ 仅用于测试

- **位置**：`User.apiBaseUrl` 字段
- **用途**：**仅用于测试API密钥连接**，不影响实际工作流执行
- **控制者**：用户（可选）
- **说明**：用户可以用这个字段测试自己的API密钥是否能连接到特定地址，但工作流执行时**强制使用管理员配置的中转站**

---

## 🔄 工作流执行流程

### 执行流程图

```
用户发送聊天消息
  ↓
1. 加载AI域名的targetModel（管理员配置）
  ↓
2. 加载当前激活的中转站配置（RelayConfig，isActive=true）
  ↓
3. 验证targetModel是否在availableModels中
   - 如果不在 → 抛出错误："模型不在当前中转站支持列表中"
  ↓
4. 加载用户的apiKey（用户自己提供）
  ↓
5. 使用管理员配置的baseUrl（RelayConfig.baseUrl）
   ⚠️ 注意：忽略用户的apiBaseUrl，强制使用管理员配置
  ↓
6. 执行API调用：
   - URL: RelayConfig.baseUrl + /v1/chat/completions
   - Header: Authorization: Bearer {User.apiKey}
   - Body: { model: AIDomain.targetModel, ... }
  ↓
7. 返回AI回复给用户
```

### 关键逻辑说明

1. **中转站地址强制使用管理员配置**
   ```typescript
   // ❌ 错误：使用用户的apiBaseUrl
   const baseUrl = user.apiBaseUrl || relayConfig.baseUrl;
   
   // ✅ 正确：强制使用管理员配置的中转站
   const baseUrl = relayConfig.baseUrl;
   ```

2. **模型验证必须通过**
   ```typescript
   // 验证模型是否在管理员配置的支持列表中
   if (!availableModels.includes(targetModel)) {
     throw new Error('模型不在当前中转站支持列表中');
   }
   ```

3. **API密钥由用户提供**
   ```typescript
   // 使用用户自己的API密钥
   headers: {
     Authorization: `Bearer ${user.apiKey}`
   }
   ```

---

## 🧪 API密钥测试连接

### 测试连接流程

当用户在"API密钥设置"对话框中点击"测试连接"时：

1. **使用用户提供的apiKey**
2. **使用用户提供的apiBaseUrl（如果填写了）**，否则使用默认的`https://api.openai.com`
3. **调用 `/v1/models` 端点测试连接**
4. **返回测试结果**

**重要**：这个测试**不影响实际工作流执行**，只是帮助用户验证自己的API密钥是否有效。

---

## 📊 数据权限矩阵

| 数据项 | 字段名 | 用户权限 | 管理员权限 | 用途 |
|--------|--------|----------|------------|------|
| API密钥 | `User.apiKey` | ✅ 读写 | ❌ 只读 | 工作流执行认证 |
| 自定义API地址 | `User.apiBaseUrl` | ✅ 读写 | ❌ 只读 | 仅测试连接用 |
| 中转站地址 | `RelayConfig.baseUrl` | ❌ 无权限 | ✅ 完全控制 | 工作流执行地址 |
| 可用模型列表 | `RelayConfig.availableModels` | ❌ 无权限 | ✅ 完全控制 | 限制可选模型 |
| 领域目标模型 | `AIDomain.targetModel` | ❌ 无权限 | ✅ 完全控制 | 强制使用模型 |

---

## ⚠️ 常见问题和解答

### Q1: 用户设置了自定义API地址，为什么工作流还是使用管理员配置的中转站？

**A**: 这是**设计如此**。`User.apiBaseUrl` 仅用于测试连接，工作流执行时**强制使用管理员配置的中转站**（`RelayConfig.baseUrl`），确保管理员有完全控制权。

### Q2: 如果用户想使用自己的中转站怎么办？

**A**: 用户需要联系管理员，管理员可以将用户的中转站添加到`RelayConfig`中并激活。

### Q3: 如何确保用户只能使用管理员允许的模型？

**A**: 通过三层控制：
1. **工作流编辑器**：下拉框只显示`RelayConfig.availableModels`中的模型
2. **保存验证**：保存时检查`targetModel`是否在`availableModels`中
3. **执行验证**：工作流执行时再次验证`targetModel`是否在`availableModels`中

### Q4: 用户的自定义API地址什么时候使用？

**A**: 仅在以下场景使用：
- 用户在"API密钥设置"中点击"测试连接"按钮时
- **不影响**实际工作流执行

---

## ✅ 实现验证清单

### 后端逻辑验证

- [x] 工作流执行时强制使用`RelayConfig.baseUrl`
- [x] 忽略用户的`apiBaseUrl`（工作流执行时）
- [x] 验证`targetModel`是否在`availableModels`中
- [x] 测试连接时可以使用用户的`apiBaseUrl`

### 前端UI验证

- [x] "自定义API地址"字段标注"仅用于测试"
- [x] 说明文字明确告知用户中转站由管理员控制
- [x] 工作流编辑器只显示管理员配置的模型

### 权限控制验证

- [x] 用户无法修改中转站配置
- [x] 用户无法修改可用模型列表
- [x] 用户无法绕过模型限制
- [x] 管理员可以完全控制中转站和模型

---

## 📝 代码位置

### 关键文件

1. **工作流执行逻辑**：`backend/src/workflow/workflow.service.ts`
   - `executeWorkflow()` 方法：强制使用`RelayConfig.baseUrl`

2. **API密钥测试**：`backend/src/auth/api-key.controller.ts`
   - `testApiKey()` 方法：可以使用用户的`apiBaseUrl`进行测试

3. **前端设置界面**：`frontend/src/components/modals/ApiKeyModal.tsx`
   - 显示"自定义API地址（可选，仅用于测试）"

4. **中转站配置**：`backend/src/admin/admin.controller.ts`
   - 管理员可以创建、更新、激活中转站

---

## 🎯 总结

### 核心原则

1. **用户提供密钥，管理员控制路由**
   - 用户：`apiKey` ✅
   - 管理员：`baseUrl`, `availableModels`, `targetModel` ✅

2. **用户自定义API地址仅用于测试**
   - 不影响工作流执行
   - 帮助用户验证密钥有效性

3. **三层模型控制**
   - UI限制（工作流编辑器）
   - 保存验证
   - 执行验证

### 设计优势

- ✅ 符合BYOK模式：用户使用自己的密钥
- ✅ 管理员完全控制：中转站、模型、价格
- ✅ 灵活测试：用户可以用自定义地址测试密钥
- ✅ 安全保障：用户无法绕过管理员配置

---

**最后更新**: 2026-01-19
**版本**: 1.0
