# 认证、支付和法律流程文档

## 1. 预购买拦截器 (The Death Warrant)

### StrictAgreementModal

在用户点击"购买"按钮时，会显示严格协议确认模态框。

**功能：**
- 显示红色警告样式
- 内容包含"一人一账户政策"和"版权责任"
- 5秒倒计时，倒计时结束后才能点击"我承诺"
- 点击确认后在新窗口打开外部购买链接

**使用示例：**
```tsx
import { StrictAgreementModal } from '@/components/modals/StrictAgreementModal';

<StrictAgreementModal
  open={showAgreement}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  externalLink="https://example.com/buy"
/>
```

### PricingModal

定价模态框，集成预购买拦截器。

**使用示例：**
```tsx
import { PricingModal } from '@/components/modals/PricingModal';

<PricingModal
  open={showPricing}
  onOpenChange={setShowPricing}
  packages={packages}
  buyLink="https://example.com/buy"
/>
```

## 2. 激活和法律门禁流程

### 激活码输入 (ActivationInput)

**Step 1: 激活码激活**
- 用户输入激活码
- 调用 API `/api/activation/use`
- 成功后显示 Toast "激活成功！"

**使用示例：**
```tsx
import { ActivationInput } from '@/components/ActivationInput';

<ActivationInput onSuccess={() => {
  // Refresh user data
  refetchUser();
}} />
```

### 法律门禁 (Legal Gatekeeper)

**Step 2: 法律声明确认**

在 `RootLayoutClient` 中自动检查：
- 如果 `user.is_member && !user.is_legal_signed`
- 显示 `LegalAffidavitModal`（全屏、背景模糊、无关闭按钮）

**LegalAffidavitModal 特性：**
- 全屏模态框，背景模糊
- 无关闭按钮（必须完成）
- 用户必须手动输入 "我承诺合法使用"
- 实时验证输入是否正确
- 提交后调用 `/api/legal/sign` 保存 `LegalLog` 并更新 `is_legal_signed = true`

**API 端点：**
```
POST /api/legal/sign
Body: {
  signatureText: string,
  ip: string,
  userAgent: string
}
```

## 3. 登录/注册增强

### 单账户政策确认

在登录和注册页面添加复选框：
- 位置：按钮上方
- 文本："我已阅读并同意一人一账户政策..."
- 必须勾选才能提交

### Cloudflare Turnstile 集成

**环境变量：**
```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
```

**Turnstile 组件：**
- 自动加载 Cloudflare Turnstile 脚本
- 支持主题切换（light/dark/auto）
- 验证成功后返回 token
- 错误时重置状态

**使用示例：**
```tsx
import { Turnstile } from '@/components/Turnstile';

<Turnstile
  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  onVerify={(token) => setTurnstileToken(token)}
  onError={() => setTurnstileToken(null)}
/>
```

**API 集成：**
登录和注册请求需要包含 `turnstileToken`：
```typescript
await api.post('/api/auth/login', {
  email,
  password,
  turnstileToken,
});
```

## 4. 状态管理更新

### AuthStore

更新了 `User` 接口，包含：
- `isLegalSigned?: boolean` - 是否已签署法律声明
- `membershipExpireAt?: string | null` - 会员到期时间

## 5. 完整流程示例

### 用户注册流程
1. 用户访问 `/register`
2. 填写邮箱、密码
3. 勾选"一人一账户政策"复选框
4. 完成 Cloudflare Turnstile 验证
5. 提交注册

### 用户激活流程
1. 用户输入激活码
2. 调用激活 API
3. 激活成功后，如果用户是会员但未签署法律声明：
   - 自动显示 `LegalAffidavitModal`
   - 用户必须手动输入 "我承诺合法使用"
   - 提交后更新 `is_legal_signed = true`

### 购买流程
1. 用户点击"购买"按钮
2. 显示 `StrictAgreementModal`（5秒倒计时）
3. 用户点击"我承诺"
4. 在新窗口打开外部购买链接

## 6. 后端 API 要求

### 激活码 API
```
POST /api/activation/use
Body: { code: string }
Response: { success: boolean, message: string }
```

### 法律声明 API
```
POST /api/legal/sign
Body: {
  signatureText: string,
  ip: string,
  userAgent: string
}
Response: { success: boolean }
```

### 登录/注册 API
```
POST /api/auth/login
POST /api/auth/register
Body: {
  email: string,
  password: string,
  turnstileToken: string
}
Response: {
  accessToken: string,
  user: User
}
```

## 7. 注意事项

1. **法律门禁检查**：在 `RootLayoutClient` 中全局检查，确保会员用户必须签署法律声明
2. **Turnstile Token**：每次请求失败后需要重置 token，让用户重新验证
3. **IP 获取**：在生产环境中，应该从请求头中获取真实 IP，而不是使用第三方 API
4. **环境变量**：确保在 `.env` 中配置 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
