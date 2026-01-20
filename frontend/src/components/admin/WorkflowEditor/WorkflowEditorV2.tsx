'use client';

/**
 * WorkflowEditor V2 - 可视化工作流编辑器
 * 支持多步骤串联、条件分支、每步骤独立模型选择
 */

import { useState } from 'react';
import { 
  Loader2, 
  Save, 
  Play, 
  Plus, 
  Settings,
  Eye,
  EyeOff,
  Wrench,
  AlertCircle,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowEditorV2 } from './useWorkflowEditorV2';
import { StepNode } from './StepNode';
import { StepPalette } from './StepPalette';
import { WorkflowStep, STEP_TEMPLATES } from './types';

export function WorkflowEditorV2() {
  const {
    domains,
    selectedDomain,
    loading,
    saving,
    testing,
    testResult,
    availableModels,
    activeRelayName,
    selectedStepId,
    hasUnsavedChanges,
    handleSelectDomain,
    handleCreateDomain,
    handleDeleteDomain,
    updateDomainInfo,
    handleAddStep,
    handleUpdateStep,
    handleDeleteStep,
    handleMoveStep,
    handleSave,
    handleTest,
    setSelectedStepId,
  } = useWorkflowEditorV2();

  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [showPalette, setShowPalette] = useState(true);

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = selectedDomain?.workflowConfig?.steps || [];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-white">
        <div>
          <h1 className="text-xl font-semibold text-foreground">工作流编辑器</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            创建和管理 AI 工作流
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-warning flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              有未保存的更改
            </span>
          )}
          <button
            onClick={() => setShowTestDialog(true)}
            disabled={!selectedDomain || testing || steps.length === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl',
              'border border-border text-foreground',
              'transition-all duration-200',
              'hover:bg-background-secondary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                测试
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedDomain || saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl',
              'bg-primary text-white',
              'transition-all duration-200',
              'hover:bg-primary-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧域列表 */}
        <div className="w-64 border-r border-border-light bg-white flex flex-col">
          <div className="p-4 border-b border-border-light flex items-center justify-between">
            <h2 className="font-medium text-foreground">AI 工具列表</h2>
            <button
              onClick={handleCreateDomain}
              className="p-2 rounded-lg text-primary hover:bg-primary-50 transition-colors"
              title="新建工具"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {domains.map((domain) => (
              <button
                key={domain.id}
                onClick={() => handleSelectDomain(domain.id)}
                className={cn(
                  'w-full text-left px-3 py-3 rounded-xl',
                  'transition-all duration-200 group',
                  selectedDomain?.id === domain.id
                    ? 'bg-primary-50 border border-primary-100'
                    : 'hover:bg-background-secondary border border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{domain.icon || '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium truncate',
                      selectedDomain?.id === domain.id ? 'text-primary' : 'text-foreground'
                    )}>
                      {domain.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {domain.isVisible ? (
                        <span className="text-xs text-success flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> 可见
                        </span>
                      ) : (
                        <span className="text-xs text-foreground-tertiary flex items-center gap-0.5">
                          <EyeOff className="w-3 h-3" /> 隐藏
                        </span>
                      )}
                      {domain.isMaintenance && (
                        <span className="text-xs text-warning flex items-center gap-0.5">
                          <Wrench className="w-3 h-3" /> 维护中
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    'w-4 h-4 text-foreground-tertiary',
                    'opacity-0 group-hover:opacity-100 transition-opacity'
                  )} />
                </div>
              </button>
            ))}
            {domains.length === 0 && (
              <div className="text-center py-8 text-foreground-tertiary">
                <p>暂无 AI 工具</p>
                <button
                  onClick={handleCreateDomain}
                  className="mt-2 text-primary hover:underline"
                >
                  创建第一个
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col bg-background-secondary overflow-hidden">
          {selectedDomain ? (
            <>
              {/* 域基本信息 */}
              <div className="p-6 bg-white border-b border-border-light">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      工具名称
                    </label>
                    <input
                      type="text"
                      value={selectedDomain.title}
                      onChange={(e) => updateDomainInfo('title', e.target.value)}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl border border-border',
                        'bg-background text-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                        'transition-all duration-200'
                      )}
                      placeholder="输入工具名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      图标
                    </label>
                    <input
                      type="text"
                      value={selectedDomain.icon || ''}
                      onChange={(e) => updateDomainInfo('icon', e.target.value)}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl border border-border',
                        'bg-background text-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                        'transition-all duration-200'
                      )}
                      placeholder="输入 Emoji 图标，如 🤖"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      描述
                    </label>
                    <textarea
                      value={selectedDomain.description || ''}
                      onChange={(e) => updateDomainInfo('description', e.target.value)}
                      rows={2}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl border border-border',
                        'bg-background text-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                        'resize-none transition-all duration-200'
                      )}
                      placeholder="简要描述这个 AI 工具的功能"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      欢迎语
                    </label>
                    <textarea
                      value={selectedDomain.greetingMessage || ''}
                      onChange={(e) => updateDomainInfo('greetingMessage', e.target.value)}
                      rows={2}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl border border-border',
                        'bg-background text-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                        'resize-none transition-all duration-200'
                      )}
                      placeholder="用户打开工具时显示的欢迎语"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDomain.isVisible}
                        onChange={(e) => updateDomainInfo('isVisible', e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">对用户可见</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDomain.isMaintenance}
                        onChange={(e) => updateDomainInfo('isMaintenance', e.target.checked)}
                        className="w-4 h-4 rounded border-border text-warning focus:ring-warning"
                      />
                      <span className="text-sm text-foreground">维护模式</span>
                    </label>
                    {activeRelayName && (
                      <span className="text-sm text-foreground-secondary">
                        当前中转站：<span className="font-medium">{activeRelayName}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 工作流步骤区 */}
              <div className="flex-1 flex overflow-hidden">
                {/* 步骤列表 */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        工作流步骤
                      </h3>
                      <span className="text-sm text-foreground-secondary">
                        {steps.length} 个步骤
                      </span>
                    </div>

                    {steps.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-border">
                        <div className="w-16 h-16 bg-background-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Plus className="w-8 h-8 text-foreground-tertiary" />
                        </div>
                        <p className="text-foreground-secondary mb-2">暂无步骤</p>
                        <p className="text-sm text-foreground-tertiary mb-4">
                          从右侧面板添加步骤开始构建工作流
                        </p>
                        <button
                          onClick={() => handleAddStep(STEP_TEMPLATES[0])}
                          className={cn(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                            'bg-primary text-white',
                            'hover:bg-primary-600 transition-colors'
                          )}
                        >
                          <Plus className="w-4 h-4" />
                          添加第一个步骤
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {steps.map((step, index) => (
                          <StepNode
                            key={step.id}
                            step={step}
                            isSelected={selectedStepId === step.id}
                            isFirst={index === 0}
                            isLast={index === steps.length - 1}
                            availableModels={availableModels}
                            onSelect={() => setSelectedStepId(step.id)}
                            onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                            onDelete={() => handleDeleteStep(step.id)}
                            onMoveUp={() => handleMoveStep(step.id, 'up')}
                            onMoveDown={() => handleMoveStep(step.id, 'down')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧步骤面板 */}
                {showPalette && (
                  <div className="w-80 border-l border-border-light bg-white p-4 overflow-y-auto">
                    <StepPalette onAddStep={handleAddStep} />
                  </div>
                )}
              </div>

              {/* 测试结果 */}
              {testResult && (
                <div className="border-t border-border-light bg-white p-6">
                  <div className="max-w-2xl mx-auto">
                    <h3 className="font-semibold text-foreground mb-4">测试结果</h3>
                    <div className={cn(
                      'p-4 rounded-xl',
                      testResult.success ? 'bg-success-light' : 'bg-error-light'
                    )}>
                      <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-background-tertiary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-10 h-10 text-foreground-tertiary" />
                </div>
                <p className="text-foreground-secondary mb-2">请从左侧选择一个 AI 工具</p>
                <p className="text-sm text-foreground-tertiary">
                  或创建一个新的工具开始编辑
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 测试对话框 */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg mx-4 animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="font-semibold text-foreground">测试工作流</h3>
              <button
                onClick={() => setShowTestDialog(false)}
                className="p-2 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                测试输入
              </label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="输入测试内容..."
                rows={4}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border border-border',
                  'bg-background text-foreground',
                  'placeholder:text-foreground-placeholder',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                  'resize-none transition-all duration-200'
                )}
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button
                onClick={() => setShowTestDialog(false)}
                className={cn(
                  'px-4 py-2 rounded-xl',
                  'border border-border text-foreground',
                  'hover:bg-background-secondary transition-colors'
                )}
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleTest(testInput);
                  setShowTestDialog(false);
                }}
                disabled={!testInput.trim() || testing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl',
                  'bg-primary text-white',
                  'hover:bg-primary-600 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    开始测试
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
