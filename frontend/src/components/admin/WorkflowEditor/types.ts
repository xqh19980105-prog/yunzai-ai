/**
 * 工作流编辑器类型定义
 * 支持多步骤串联、条件分支、每步骤独立模型选择
 */

// 步骤类型
export type StepType = 'prompt' | 'condition' | 'transform' | 'output';

// 条件操作符
export type ConditionOperator = 
  | 'contains' 
  | 'not_contains' 
  | 'equals' 
  | 'not_equals' 
  | 'starts_with' 
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than';

// 输入类型
export type InputType = 'text' | 'image' | 'document' | 'any';

// 条件分支
export interface ConditionBranch {
  id: string;
  name: string;
  operator: ConditionOperator;
  value: string;
  nextStepId: string | null;
}

// 工作流步骤基础接口
export interface WorkflowStepBase {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  position: { x: number; y: number };
}

// Prompt 步骤 - AI 调用
export interface PromptStep extends WorkflowStepBase {
  type: 'prompt';
  config: {
    model: string;
    template: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    inputTypes: InputType[];
  };
  nextStepId: string | null;
}

// 条件步骤 - 分支判断
export interface ConditionStep extends WorkflowStepBase {
  type: 'condition';
  config: {
    variable: string; // 要检查的变量，如 {{input}} 或 {{step_1_output}}
    branches: ConditionBranch[];
    defaultNextStepId: string | null;
  };
}

// 转换步骤 - 数据处理
export interface TransformStep extends WorkflowStepBase {
  type: 'transform';
  config: {
    transformType: 'extract' | 'format' | 'combine' | 'split';
    template: string;
    options?: Record<string, unknown>;
  };
  nextStepId: string | null;
}

// 输出步骤 - 最终输出
export interface OutputStep extends WorkflowStepBase {
  type: 'output';
  config: {
    template: string;
    format: 'text' | 'json' | 'markdown';
  };
}

// 工作流步骤联合类型
export type WorkflowStep = PromptStep | ConditionStep | TransformStep | OutputStep;

// 工作流连接线
export interface WorkflowConnection {
  id: string;
  sourceStepId: string;
  sourceHandle?: string; // 用于条件分支
  targetStepId: string;
}

// 工作流配置
export interface WorkflowConfig {
  version: string;
  startStepId: string | null;
  steps: WorkflowStep[];
  connections: WorkflowConnection[];
  variables: WorkflowVariable[];
}

// 工作流变量
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: unknown;
  description?: string;
}

// AI 域（包含工作流配置）
export interface AIDomain {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  greetingMessage: string | null;
  workflowConfig: WorkflowConfig | null;
  targetModel: string | null;
  isVisible: boolean;
  isMaintenance: boolean;
  suggestedPrompts?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// 编辑器状态
export interface EditorState {
  selectedStepId: string | null;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
  isConnecting: boolean;
  connectionSource: string | null;
}

// 测试结果
export interface WorkflowTestResult {
  success: boolean;
  output?: string;
  error?: string;
  executionPath: string[];
  stepResults: Array<{
    stepId: string;
    stepName: string;
    input: unknown;
    output: unknown;
    duration: number;
  }>;
}

// 可用模型
export interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
}

// 步骤模板（预设）
export interface StepTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: StepType;
  defaultConfig: Partial<WorkflowStep['config']>;
}

// 预设步骤模板
export const STEP_TEMPLATES: StepTemplate[] = [
  {
    id: 'prompt-basic',
    name: 'AI 对话',
    description: '调用 AI 模型生成回复',
    icon: '🤖',
    type: 'prompt',
    defaultConfig: {
      template: '{{user_input}}',
      inputTypes: ['text'],
    },
  },
  {
    id: 'prompt-translate',
    name: '翻译',
    description: '将文本翻译成指定语言',
    icon: '🌐',
    type: 'prompt',
    defaultConfig: {
      template: '请将以下内容翻译成英文：\n\n{{input}}',
      systemPrompt: '你是一个专业的翻译助手。',
      inputTypes: ['text'],
    },
  },
  {
    id: 'prompt-summarize',
    name: '摘要',
    description: '生成文本摘要',
    icon: '📝',
    type: 'prompt',
    defaultConfig: {
      template: '请为以下内容生成一个简洁的摘要：\n\n{{input}}',
      systemPrompt: '你是一个专业的文本摘要助手。',
      inputTypes: ['text', 'document'],
    },
  },
  {
    id: 'prompt-analyze',
    name: '分析',
    description: '分析文本或图片内容',
    icon: '🔍',
    type: 'prompt',
    defaultConfig: {
      template: '请分析以下内容：\n\n{{input}}',
      inputTypes: ['text', 'image', 'document'],
    },
  },
  {
    id: 'condition-basic',
    name: '条件判断',
    description: '根据条件分支执行',
    icon: '🔀',
    type: 'condition',
    defaultConfig: {
      variable: '{{input}}',
      branches: [],
    },
  },
  {
    id: 'transform-format',
    name: '格式化',
    description: '格式化输出内容',
    icon: '✨',
    type: 'transform',
    defaultConfig: {
      transformType: 'format',
      template: '{{input}}',
    },
  },
  {
    id: 'output-basic',
    name: '输出',
    description: '工作流最终输出',
    icon: '📤',
    type: 'output',
    defaultConfig: {
      template: '{{input}}',
      format: 'text',
    },
  },
];

// 条件操作符显示名称
export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  contains: '包含',
  not_contains: '不包含',
  equals: '等于',
  not_equals: '不等于',
  starts_with: '开头是',
  ends_with: '结尾是',
  is_empty: '为空',
  is_not_empty: '不为空',
  greater_than: '大于',
  less_than: '小于',
};

// 步骤类型显示名称
export const STEP_TYPE_LABELS: Record<StepType, string> = {
  prompt: 'AI 调用',
  condition: '条件分支',
  transform: '数据转换',
  output: '输出',
};

// 步骤类型颜色
export const STEP_TYPE_COLORS: Record<StepType, { bg: string; border: string; text: string }> = {
  prompt: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  condition: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  transform: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  output: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
};
