/**
 * Admin Controllers 索引
 * 将原来的大型 AdminController 拆分为多个专职控制器
 */

export { AdminAIDomainsController } from './ai-domains.controller';
export { AdminActivationCodesController } from './activation-codes.controller';
export { AdminUsersController } from './users.controller';
export { AdminRelayConfigsController } from './relay-configs.controller';
export { AdminSystemConfigController, PublicSystemConfigController } from './system-config.controller';
export { AdminStatsController } from './stats.controller';
