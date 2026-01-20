'use client';

import { 
  Bot, 
  GitBranch, 
  Wand2, 
  Send,
  Languages,
  FileText,
  Search,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepType, STEP_TEMPLATES, StepTemplate } from './types';

interface StepPaletteProps {
  onAddStep: (template: StepTemplate) => void;
}

// 图标映射
const TemplateIcons: Record<string, React.ElementType> = {
  'prompt-basic': Bot,
  'prompt-translate': Languages,
  'prompt-summarize': FileText,
  'prompt-analyze': Search,
  'condition-basic': GitBranch,
  'transform-format': Wand2,
  'output-basic': Send,
};

export function StepPalette({ onAddStep }: StepPaletteProps) {
  // 按类型分组
  const promptTemplates = STEP_TEMPLATES.filter(t => t.type === 'prompt');
  const otherTemplates = STEP_TEMPLATES.filter(t => t.type !== 'prompt');

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" />
        添加步骤
      </h3>

      {/* AI 调用步骤 */}
      <div className="mb-4">
        <p className="text-xs text-foreground-tertiary mb-2 uppercase tracking-wider">
          AI 调用
        </p>
        <div className="grid grid-cols-2 gap-2">
          {promptTemplates.map((template) => {
            const Icon = TemplateIcons[template.id] || Bot;
            return (
              <button
                key={template.id}
                onClick={() => onAddStep(template)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl',
                  'bg-background-secondary border border-transparent',
                  'text-left transition-all duration-200',
                  'hover:bg-primary-50 hover:border-primary-100',
                  'active:scale-[0.98]'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {template.name}
                  </p>
                  <p className="text-xs text-foreground-tertiary truncate">
                    {template.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 其他步骤 */}
      <div>
        <p className="text-xs text-foreground-tertiary mb-2 uppercase tracking-wider">
          流程控制
        </p>
        <div className="grid grid-cols-2 gap-2">
          {otherTemplates.map((template) => {
            const Icon = TemplateIcons[template.id] || Wand2;
            const colorMap: Record<StepType, { bg: string; icon: string }> = {
              prompt: { bg: 'bg-blue-100', icon: 'text-blue-600' },
              condition: { bg: 'bg-amber-100', icon: 'text-amber-600' },
              transform: { bg: 'bg-purple-100', icon: 'text-purple-600' },
              output: { bg: 'bg-green-100', icon: 'text-green-600' },
            };
            const colors = colorMap[template.type];

            return (
              <button
                key={template.id}
                onClick={() => onAddStep(template)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl',
                  'bg-background-secondary border border-transparent',
                  'text-left transition-all duration-200',
                  'hover:bg-primary-50 hover:border-primary-100',
                  'active:scale-[0.98]'
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
                  <Icon className={cn('w-4 h-4', colors.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {template.name}
                  </p>
                  <p className="text-xs text-foreground-tertiary truncate">
                    {template.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 提示 */}
      <div className="mt-4 p-3 bg-background-secondary rounded-xl">
        <p className="text-xs text-foreground-tertiary">
          💡 提示：拖拽步骤可调整顺序，点击步骤可编辑配置
        </p>
      </div>
    </div>
  );
}
