import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * 自定义验证器：验证至少有一个字段不为空
 * 用于替代手动验证逻辑
 * 
 * 使用示例：
 * ```typescript
 * export class ChatRequestDto {
 *   @IsString()
 *   @IsAtLeastOne(['images'], { message: '消息内容或文件至少需要提供一个' })
 *   message!: string;
 * 
 *   @IsOptional()
 *   @IsArray()
 *   images?: FileDataDto[];
 * }
 * ```
 */
@ValidatorConstraint({ name: 'isAtLeastOne', async: false })
export class IsAtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [properties] = args.constraints;
    const obj = args.object as any;

    // 检查当前字段是否有值
    const hasCurrentValue =
      value !== undefined && value !== null && value !== '' && 
      (typeof value !== 'string' || value.trim().length > 0);
    if (hasCurrentValue) return true;

    // 检查其他指定字段是否有值
    if (properties && Array.isArray(properties)) {
      return properties.some((prop: string) => {
        const propValue = obj[prop];
        if (Array.isArray(propValue)) {
          return propValue.length > 0;
        }
        return (
          propValue !== undefined &&
          propValue !== null &&
          propValue !== '' &&
          (typeof propValue !== 'string' || propValue.trim().length > 0)
        );
      });
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const [properties] = args.constraints;
    if (properties && Array.isArray(properties)) {
      return `至少需要提供以下字段之一: ${args.property}, ${properties.join(', ')}`;
    }
    return `${args.property}或相关字段至少需要提供一个`;
  }
}

export function IsAtLeastOne(
  properties: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [properties],
      validator: IsAtLeastOneConstraint,
    });
  };
}
