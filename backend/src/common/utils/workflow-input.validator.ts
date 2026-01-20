import { BadRequestException } from '@nestjs/common';

/**
 * 【P1-4修复】工作流输入验证工具类
 * 
 * 职责：
 * 1. 验证用户输入
 * 2. 验证模型名称
 * 3. 验证图片数据
 * 4. 验证配置参数
 * 
 * 使用防御性编程原则，确保所有输入都经过严格验证
 */

// 输入限制常量
const MAX_INPUT_LENGTH = 100000; // 最大输入长度：100KB
const MAX_IMAGE_COUNT = 10; // 最大图片数量
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 最大图片大小：10MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

// 模型名称验证正则
const MODEL_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export class WorkflowInputValidator {
  /**
   * 验证用户输入
   */
  static validateUserInput(input: string, fieldName: string = '用户输入'): void {
    if (!input || typeof input !== 'string') {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    if (trimmedInput.length > MAX_INPUT_LENGTH) {
      throw new BadRequestException(
        `${fieldName}长度不能超过${MAX_INPUT_LENGTH}字符`,
      );
    }

    // 检查是否包含控制字符（除了换行符和制表符）
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(trimmedInput)) {
      throw new BadRequestException(`${fieldName}包含无效字符`);
    }
  }

  /**
   * 验证模型名称
   */
  static validateModelName(model: string, fieldName: string = '模型名称'): void {
    if (!model || typeof model !== 'string') {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    const trimmedModel = model.trim();
    if (trimmedModel.length === 0) {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    if (trimmedModel.length > 100) {
      throw new BadRequestException(`${fieldName}长度不能超过100字符`);
    }

    if (!MODEL_NAME_PATTERN.test(trimmedModel)) {
      throw new BadRequestException(
        `${fieldName}格式无效，只能包含字母、数字、点、下划线和连字符`,
      );
    }
  }

  /**
   * 验证图片数据
   */
  static validateImages(
    images?: Array<{ data: string; mimeType: string; filename?: string }>,
    fieldName: string = '图片',
  ): void {
    if (!images) {
      return; // 图片是可选的
    }

    if (!Array.isArray(images)) {
      throw new BadRequestException(`${fieldName}必须是数组`);
    }

    if (images.length > MAX_IMAGE_COUNT) {
      throw new BadRequestException(
        `${fieldName}数量不能超过${MAX_IMAGE_COUNT}张`,
      );
    }

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      if (!image || typeof image !== 'object') {
        throw new BadRequestException(`${fieldName}[${i}]格式无效`);
      }

      if (!image.data || typeof image.data !== 'string') {
        throw new BadRequestException(`${fieldName}[${i}].data不能为空`);
      }

      // 验证Base64格式
      const base64Pattern = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,([A-Za-z0-9+/=]+)$/;
      if (!base64Pattern.test(image.data)) {
        // 如果不是完整的data URI，检查是否为纯Base64
        const base64OnlyPattern = /^[A-Za-z0-9+/=]+$/;
        if (!base64OnlyPattern.test(image.data)) {
          throw new BadRequestException(`${fieldName}[${i}].data格式无效`);
        }
      }

      // 估算Base64解码后的大小
      const base64Length = image.data.replace(/^data:[^;]+;base64,/, '').length;
      const estimatedSize = (base64Length * 3) / 4; // Base64编码大约是原大小的4/3

      if (estimatedSize > MAX_IMAGE_SIZE) {
        throw new BadRequestException(
          `${fieldName}[${i}]大小超过${MAX_IMAGE_SIZE / 1024 / 1024}MB限制`,
        );
      }

      if (!image.mimeType || typeof image.mimeType !== 'string') {
        throw new BadRequestException(`${fieldName}[${i}].mimeType不能为空`);
      }

      if (!ALLOWED_IMAGE_TYPES.includes(image.mimeType.toLowerCase())) {
        throw new BadRequestException(
          `${fieldName}[${i}]类型不支持，支持的格式：${ALLOWED_IMAGE_TYPES.join(', ')}`,
        );
      }

      // 验证文件名（如果提供）
      if (image.filename !== undefined && image.filename !== null) {
        if (typeof image.filename !== 'string') {
          throw new BadRequestException(`${fieldName}[${i}].filename必须是字符串`);
        }

        if (image.filename.length > 255) {
          throw new BadRequestException(`${fieldName}[${i}].filename长度不能超过255字符`);
        }

        // 检查文件名是否包含危险字符
        if (/[<>:"|?*\\\/]/.test(image.filename)) {
          throw new BadRequestException(
            `${fieldName}[${i}].filename包含无效字符`,
          );
        }
      }
    }
  }

  /**
   * 验证域名ID（UUID格式）
   */
  static validateDomainId(domainId: string, fieldName: string = '域ID'): void {
    if (!domainId || typeof domainId !== 'string') {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    const trimmedDomainId = domainId.trim();
    if (trimmedDomainId.length === 0) {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    // UUID v4格式验证
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(trimmedDomainId)) {
      throw new BadRequestException(`${fieldName}格式无效，必须是有效的UUID格式`);
    }
  }

  /**
   * 验证工作流步骤配置
   */
  static validateStepConfig(step: any, stepIndex: number): void {
    if (!step || typeof step !== 'object') {
      throw new BadRequestException(`步骤 ${stepIndex + 1} 配置无效`);
    }

    if (!step.type || typeof step.type !== 'string') {
      throw new BadRequestException(`步骤 ${stepIndex + 1} 类型不能为空`);
    }

    const validTypes = ['prompt', 'api_call', 'transform'];
    if (!validTypes.includes(step.type)) {
      throw new BadRequestException(
        `步骤 ${stepIndex + 1} 类型无效，支持的类型：${validTypes.join(', ')}`,
      );
    }

    if (step.model && typeof step.model === 'string') {
      this.validateModelName(step.model, `步骤 ${stepIndex + 1} 模型名称`);
    }

    if (!step.config || typeof step.config !== 'object') {
      throw new BadRequestException(`步骤 ${stepIndex + 1} 配置项不能为空`);
    }
  }

  /**
   * 验证工作流配置
   */
  static validateWorkflowConfig(config: any): void {
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('工作流配置无效');
    }

    if (!config.steps || !Array.isArray(config.steps)) {
      throw new BadRequestException('工作流配置必须包含steps数组');
    }

    if (config.steps.length === 0) {
      throw new BadRequestException('工作流配置至少需要包含一个步骤');
    }

    if (config.steps.length > 50) {
      throw new BadRequestException('工作流配置步骤数量不能超过50个');
    }

    // 验证每个步骤
    config.steps.forEach((step: any, index: number) => {
      this.validateStepConfig(step, index);
    });

    // 验证变量（如果提供）
    if (config.variables !== undefined) {
      if (typeof config.variables !== 'object' || Array.isArray(config.variables)) {
        throw new BadRequestException('工作流配置的variables必须是对象');
      }

      // 验证变量值
      for (const [key, value] of Object.entries(config.variables)) {
        if (typeof key !== 'string' || key.length === 0) {
          throw new BadRequestException('工作流配置的变量名不能为空');
        }

        if (typeof value !== 'string') {
          throw new BadRequestException(
            `工作流配置的变量 ${key} 的值必须是字符串`,
          );
        }

        if (value.length > 1000) {
          throw new BadRequestException(
            `工作流配置的变量 ${key} 的值长度不能超过1000字符`,
          );
        }
      }
    }
  }

  /**
   * 验证API端点URL
   */
  static validateEndpoint(endpoint: string, fieldName: string = 'API端点'): void {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    const trimmedEndpoint = endpoint.trim();
    if (trimmedEndpoint.length === 0) {
      throw new BadRequestException(`${fieldName}不能为空`);
    }

    // 端点应该以/开头
    if (!trimmedEndpoint.startsWith('/')) {
      throw new BadRequestException(`${fieldName}必须以/开头`);
    }

    // 端点长度限制
    if (trimmedEndpoint.length > 500) {
      throw new BadRequestException(`${fieldName}长度不能超过500字符`);
    }

    // 检查是否包含危险字符
    if (/[<>\0]/.test(trimmedEndpoint)) {
      throw new BadRequestException(`${fieldName}包含无效字符`);
    }
  }
}