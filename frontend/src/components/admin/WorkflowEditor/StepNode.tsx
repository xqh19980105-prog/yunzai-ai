'use client';

import { useState } from 'react';
import { 
  Bot, 
  GitBranch, 
  Wand2, 
  Send,
  GripVertical,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  WorkflowStep, 
  StepType, 
  STEP_TYPE_LABELS, 
  STEP_TYPE_COLORS 
} from './types';

interface StepNodeProps {
  step: WorkflowStep;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  availableModels: string[];
  onSelect: () => void;
  onUpdate: (updates: Partial<WorkflowStep>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

// 步骤类型图标映射
const StepTypeIcon: Record<StepType, React.ElementType> = {
  prompt: Bot,
  condition: GitBranch,
  transform: Wand2,
  output: Send,
};

export function StepNode({
  step,
  isSelected,
  isFirst,
  isLast,
  availableModels,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StepNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = StepTypeIcon[step.type];
  const colors = STEP_TYPE_COLORS[step.type];

  const handleConfigChange = (key: string, value: unknown) => {
    onUpdate({
      ...step,
      config: {
        ...step.config,
        [key]: value,
      },
    } as WorkflowStep);
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 transition-all duration-200',
        'bg-white shadow-card',
        isSelected 
          ? 'border-primary ring-2 ring-primary/20' 
          : 'border-border-light hover:border-border',
        colors.bg
      )}
      onClick={onSelect}
    >
      {/* 步骤头部 */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer',
        'border-b border-border-light',
        colors.bg
      )}>
        {/* 拖拽手柄 */}
        <div className="cursor-grab active:cursor-grabbing text-foreground-tertiary hover:text-foreground-secondary">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* 图标 */}
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          colors.bg,
          colors.border,
          'border'
        )}>
          <Icon className={cn('w-4 h-4', colors.text)} />
        </div>

        {/* 标题 */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={step.name}
            onChange={(e) => onUpdate({ ...step, name: e.target.value } as WorkflowStep)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full bg-transparent font-medium text-foreground',
              'focus:outline-none focus:ring-0',
              'placeholder:text-foreground-placeholder'
            )}
            placeholder="步骤名称"
          />
          <p className="text-xs text-foreground-tertiary">
            {STEP_TYPE_LABELS[step.type]}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          {!isFirst && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              className="p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-secondary transition-colors"
              title="上移"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {!isLast && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              className="p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-secondary transition-colors"
              title="下移"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-foreground-tertiary hover:text-error hover:bg-error-light transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-secondary transition-colors"
          >
            <Settings className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        </div>
      </div>

      {/* 步骤配置 - 可折叠 */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Prompt 步骤配置 */}
          {step.type === 'prompt' && (
            <>
              {/* 模型选择 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  AI 模型
                </label>
                <select
                  value={step.config.model || ''}
                  onChange={(e) => handleConfigChange('model', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-border',
                    'bg-background text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'transition-all duration-200'
                  )}
                >
                  <option value="">选择模型...</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                {!step.config.model && (
                  <p className="text-xs text-warning mt-1">⚠️ 请选择模型</p>
                )}
              </div>

              {/* 系统提示词 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  系统提示词 <span className="text-foreground-tertiary font-normal">(可选)</span>
                </label>
                <textarea
                  value={step.config.systemPrompt || ''}
                  onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="设置 AI 的角色和行为..."
                  rows={2}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-border',
                    'bg-background text-foreground',
                    'placeholder:text-foreground-placeholder',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'resize-none transition-all duration-200'
                  )}
                />
              </div>

              {/* 提示词模板 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  提示词模板
                </label>
                <textarea
                  value={step.config.template || ''}
                  onChange={(e) => handleConfigChange('template', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="使用 {{user_input}} 表示用户输入，{{input}} 表示上一步输出"
                  rows={4}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-border',
                    'bg-background text-foreground font-mono text-sm',
                    'placeholder:text-foreground-placeholder',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'resize-none transition-all duration-200'
                  )}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-primary-50 text-primary rounded-full">
                    {'{{user_input}}'} - 用户输入
                  </span>
                  <span className="text-xs px-2 py-1 bg-primary-50 text-primary rounded-full">
                    {'{{input}}'} - 上一步输出
                  </span>
                </div>
              </div>

              {/* 高级设置 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    温度
                  </label>
                  <input
                    type="number"
                    value={step.config.temperature ?? 0.7}
                    onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    min={0}
                    max={2}
                    step={0.1}
                    className={cn(
                      'w-full px-3 py-2 rounded-xl border border-border',
                      'bg-background text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      'transition-all duration-200'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    最大 Token
                  </label>
                  <input
                    type="number"
                    value={step.config.maxTokens ?? 2048}
                    onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    min={1}
                    max={128000}
                    className={cn(
                      'w-full px-3 py-2 rounded-xl border border-border',
                      'bg-background text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      'transition-all duration-200'
                    )}
                  />
                </div>
              </div>
            </>
          )}

          {/* 条件步骤配置 */}
          {step.type === 'condition' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                条件变量
              </label>
              <input
                type="text"
                value={step.config.variable || '{{input}}'}
                onChange={(e) => handleConfigChange('variable', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="例如: {{input}}"
                className={cn(
                  'w-full px-3 py-2 rounded-xl border border-border',
                  'bg-background text-foreground font-mono text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                  'transition-all duration-200'
                )}
              />
              <p className="text-xs text-foreground-tertiary mt-2">
                条件分支功能即将推出，敬请期待
              </p>
            </div>
          )}

          {/* 转换步骤配置 */}
          {step.type === 'transform' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  转换类型
                </label>
                <select
                  value={step.config.transformType || 'format'}
                  onChange={(e) => handleConfigChange('transformType', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-border',
                    'bg-background text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'transition-all duration-200'
                  )}
                >
                  <option value="format">格式化</option>
                  <option value="extract">提取</option>
                  <option value="combine">合并</option>
                  <option value="split">拆分</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  转换模板
                </label>
                <textarea
                  value={step.config.template || ''}
                  onChange={(e) => handleConfigChange('template', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="输入转换模板..."
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-border',
                    'bg-background text-foreground font-mono text-sm',
                    'placeholder:text-foreground-placeholder',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'resize-none transition-all duration-200'
                  )}
                />
              </div>
            </>
          )}

          {/* 输出步骤配置 */}
          {step.type === 'output' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  输出格式
                </label>
                <select
                  value={step.config.format || 'text'}
                  onChange={(e) => handleConfigChange('format', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-border',
                    'bg-background text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'transition-all duration-200'
                  )}
                >
                  <option value="text">纯文本</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  输出模板
                </label>
                <textarea
                  value={step.config.template || '{{input}}'}
                  onChange={(e) => handleConfigChange('template', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="使用 {{input}} 表示最终输出"
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border border-border',
                    'bg-background text-foreground font-mono text-sm',
                    'placeholder:text-foreground-placeholder',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'resize-none transition-all duration-200'
                  )}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* 连接线指示器 */}
      {!isLast && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-0.5 h-6 bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
        </div>
      )}
    </div>
  );
}
