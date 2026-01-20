# 常见AI中转站API地址参考

## 📋 什么是基础URL？

基础URL是AI中转站提供的API服务地址，用于实际调用AI服务。

- **格式**：通常是 `https://api.域名.com` 或 `https://域名.com`
- **使用方式**：系统会自动拼接为 `基础URL + /v1/chat/completions`
- **示例**：如果基础URL是 `https://api.yunwuai.com`，实际调用地址是 `https://api.yunwuai.com/v1/chat/completions`

---

## 🔍 如何获取基础URL？

### 方法1：查看中转站官网的API文档
- 大多数中转站会在API文档中明确说明API地址
- 通常在"快速开始"、"API接入"、"开发者文档"等页面

### 方法2：联系中转站客服
- 直接询问："API调用地址是什么？" 或 "Base URL是什么？"

### 方法3：查看中转站控制台
- 登录中转站的管理后台
- 在"API配置"、"接入设置"等页面查看

### 方法4：测试常见的地址格式
- 大多数中转站使用：`https://api.域名.com`
- 也有一些使用：`https://域名.com/v1`

---

## 📚 常见中转站API地址列表

### 国内常见中转站

#### 1. 云雾AI (YunwuAI)
- **基础URL**：`https://yunwu.ai` ⚠️ **注意：不是 api.yunwuai.com**
- **获取密钥**：`https://yunwu.ai/console/playground`
- **常见模型**：`gpt-4, gpt-4-turbo, gpt-3.5-turbo, claude-3-opus, claude-3-sonnet`
- **文档地址**：查看云雾AI官网API文档
- **API端点**：`https://yunwu.ai/v1/chat/completions`（聊天接口）

#### 2. 智谱AI (ZhipuAI)
- **基础URL**：`https://open.bigmodel.cn/api/paas/v4`
- **常见模型**：`glm-4, glm-4-plus, glm-3-turbo`
- **文档地址**：https://open.bigmodel.cn/dev/api

#### 3. 阿里云通义千问
- **基础URL**：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- **常见模型**：`qwen-turbo, qwen-plus, qwen-max`
- **文档地址**：https://help.aliyun.com/zh/dashscope/

#### 4. 百度文心一言
- **基础URL**：`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat`
- **常见模型**：`ernie-bot, ernie-bot-turbo, ernie-bot-4`
- **文档地址**：https://cloud.baidu.com/product/wenxinworkshop

#### 5. 腾讯混元
- **基础URL**：`https://hunyuan.tencentcloudapi.com`
- **常见模型**：`hunyuan-lite, hunyuan-standard, hunyuan-pro`
- **文档地址**：https://cloud.tencent.com/document/product/1729

### 国外常见中转站

#### 6. OpenAI官方
- **基础URL**：`https://api.openai.com`
- **常见模型**：`gpt-4, gpt-4-turbo, gpt-3.5-turbo, gpt-4o`
- **文档地址**：https://platform.openai.com/docs

#### 7. Anthropic Claude (官方)
- **基础URL**：`https://api.anthropic.com`
- **常见模型**：`claude-3-opus, claude-3-sonnet, claude-3-haiku`
- **文档地址**：https://docs.anthropic.com/claude/reference/getting-started-with-the-api

#### 8. DeepSeek
- **基础URL**：`https://api.deepseek.com`
- **常见模型**：`deepseek-chat, deepseek-coder`
- **文档地址**：https://platform.deepseek.com/api-docs

### 其他常见中转站格式

#### 通用格式示例：
- `https://api.中转站域名.com`
- `https://中转站域名.com/v1`
- `https://中转站域名.com/api/v1`

---

## ⚠️ 重要提示

1. **不同中转站地址不同**
   - 每个中转站都有自己的API地址
   - 不能混用，必须使用对应中转站提供的地址

2. **地址可能会变更**
   - 中转站可能会更新API地址
   - 建议定期查看中转站官方文档

3. **需要验证地址**
   - 配置后建议先测试连接
   - 确认地址格式正确，能正常调用API

4. **获取方式优先级**
   1. 首选：查看中转站官方API文档（最准确）
   2. 其次：联系客服或技术支持
   3. 最后：测试常见格式（可能不准确）

---

## 🔧 如何验证基础URL是否正确？

### 测试方法：
1. 在系统中配置基础URL
2. 使用"测试连接"功能
3. 如果返回成功，说明地址正确
4. 如果失败，检查：
   - 地址格式是否正确（是否包含 `https://`）
   - 是否有多余的斜杠（如 `https://api.example.com/`）
   - 中转站服务是否正常

---

## 📝 配置示例

### 示例1：配置云雾AI
```
名称：云雾AI
基础URL：https://yunwu.ai  ⚠️ 注意：是 yunwu.ai，不是 api.yunwuai.com
密钥获取地址：https://yunwu.ai/console/playground
支持的模型：gpt-4, gpt-4-turbo, gpt-3.5-turbo, claude-3-opus
```

### 示例2：配置OpenAI官方
```
名称：OpenAI官方
基础URL：https://api.openai.com
密钥获取地址：https://platform.openai.com/api-keys
支持的模型：gpt-4, gpt-4-turbo, gpt-3.5-turbo, gpt-4o
```

---

## 🆘 找不到基础URL怎么办？

如果找不到特定中转站的基础URL：

1. **搜索"中转站名称 + API文档"**
   - 例如："云雾AI API文档"
   - 例如："智谱AI API接入"

2. **查看中转站官网的"开发者"或"API"栏目**
   - 通常会在网站导航中

3. **联系中转站客服**
   - 直接询问API调用地址
   - 说明需要配置API Base URL

4. **参考同类型中转站**
   - 查看类似服务的文档格式
   - 测试常见的地址格式

---

**最后更新**：2026-01-20
**维护者**：系统管理员
**提示**：本文档仅供参考，具体地址以中转站官方文档为准
