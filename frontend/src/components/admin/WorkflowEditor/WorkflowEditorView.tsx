'use client';

/**
 * WorkflowEditor 界面显示组件
 * 只负责 UI 渲染，所有数据处理逻辑在 useWorkflowEditor hook 中
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Play, Save, X } from 'lucide-react';
import { WorkflowStep, AIDomain } from './useWorkflowEditor';
import { WorkflowEditorStyles } from './WorkflowEditorStyles';

interface WorkflowTestResult {
  success: boolean;
  output?: string;
  error?: string;
  steps?: Array<{ step: number; type: string; output: unknown }>;
}

interface WorkflowEditorViewProps {
  domains: AIDomain[];
  selectedDomain: AIDomain | null;
  loading: boolean;
  testing: boolean;
  testResult: WorkflowTestResult | null;
  availableModels: string[];
  activeRelayName: string;
  onSelectDomain: (domainId: string) => void;
  onCreateDomain: () => void;
  onDeleteDomain: (domainId: string) => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onStepChange: (index: number, field: string, value: string | WorkflowStep['type']) => void;
  onConfigChange: (index: number, configKey: string, value: string | boolean) => void;
  onUpdateDomainInfo: (field: 'title' | 'description' | 'icon' | 'targetModel' | 'isVisible' | 'isMaintenance' | 'greetingMessage', value: string | boolean) => void;
  onSave: () => void;
  onTest: (userInput: string) => void;
}

export function WorkflowEditorView({
  domains,
  selectedDomain,
  loading,
  testing,
  testResult,
  availableModels,
  activeRelayName,
  onSelectDomain,
  onCreateDomain,
  onDeleteDomain,
  onAddStep,
  onRemoveStep,
  onStepChange,
  onConfigChange,
  onUpdateDomainInfo,
  onSave,
  onTest,
}: WorkflowEditorViewProps) {
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testInput, setTestInput] = useState('');

  const handleTestClick = () => {
    setTestInput('');
    setShowTestDialog(true);
  };

  const handleTestConfirm = () => {
    if (!testInput.trim()) {
      return;
    }
    onTest(testInput);
    setShowTestDialog(false);
  };
  // Loading State
  if (loading) {
    return (
      <div className={WorkflowEditorStyles.loadingContainer}>
        <Loader2 className={WorkflowEditorStyles.loadingIcon} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className={WorkflowEditorStyles.header}>
        <h1 className={WorkflowEditorStyles.title}>工作流编辑器</h1>
        <div className={WorkflowEditorStyles.headerActions}>
          <Button
            onClick={handleTestClick}
            disabled={!selectedDomain || testing}
            variant="outline"
            className={WorkflowEditorStyles.buttonRounded}
          >
            {testing ? (
              <>
                <Loader2 className={WorkflowEditorStyles.buttonIcon} />
                测试中...
              </>
            ) : (
              <>
                <Play className={WorkflowEditorStyles.buttonIcon} />
                测试工作流
              </>
            )}
          </Button>
          <Button onClick={onSave} disabled={!selectedDomain} className={WorkflowEditorStyles.buttonRounded}>
            <Save className={WorkflowEditorStyles.buttonIcon} />
            保存
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={WorkflowEditorStyles.mainGrid}>
        {/* Domain List Sidebar */}
        <Card className={WorkflowEditorStyles.card}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>AI 域列表</CardTitle>
            <Button onClick={onCreateDomain} size="sm" className={WorkflowEditorStyles.buttonRounded}>
              <Plus className={WorkflowEditorStyles.buttonIcon} />
              新增
            </Button>
          </CardHeader>
          <CardContent>
            <div className={WorkflowEditorStyles.domainList}>
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center gap-2 group"
                >
                  <button
                    onClick={() => onSelectDomain(domain.id)}
                    className={`flex-1 ${WorkflowEditorStyles.getDomainButtonClass(selectedDomain?.id === domain.id)}`}
                  >
                    <div className={WorkflowEditorStyles.domainTitle}>{domain.title}</div>
                    <div className={WorkflowEditorStyles.domainId}>{domain.id}</div>
                  </button>
                  {selectedDomain?.id === domain.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteDomain(domain.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor Area */}
        <div className={WorkflowEditorStyles.editorArea}>
          {selectedDomain ? (
            <>
              {/* Domain Info Card */}
              <Card className={WorkflowEditorStyles.card}>
                <CardHeader>
                  <CardTitle>基本信息</CardTitle>
                </CardHeader>
                <CardContent className={WorkflowEditorStyles.cardContent}>
                  <div>
                    <Label>标题</Label>
                    <Input
                      value={selectedDomain.title}
                      onChange={(e) => onUpdateDomainInfo('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>描述</Label>
                    <Textarea
                      value={selectedDomain.description || ''}
                      onChange={(e) => onUpdateDomainInfo('description', e.target.value)}
                      placeholder="AI 工具描述..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>图标（Emoji 或图标名称）</Label>
                    <Input
                      value={selectedDomain.icon || ''}
                      onChange={(e) => onUpdateDomainInfo('icon', e.target.value)}
                      placeholder="例如: 🤖 或 robot"
                    />
                  </div>
                  <div>
                    <Label>问候语</Label>
                    <Textarea
                      value={selectedDomain.greetingMessage || ''}
                      onChange={(e) => onUpdateDomainInfo('greetingMessage', e.target.value)}
                      placeholder="用户打开此功能时显示的问候语..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      用户打开此功能时，对话窗口会自动显示此问候语
                    </p>
                  </div>
                  <div>
                    <Label>当前中转站</Label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm font-medium text-gray-700">
                        {activeRelayName || '未配置中转站'}
                      </p>
                      {availableModels.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          支持 {availableModels.length} 个模型
                        </p>
                      )}
                      {!activeRelayName && (
                        <p className="text-xs text-yellow-600 mt-1">
                          ⚠️ 请先前往中转站配置页面激活中转站
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isVisible"
                        checked={selectedDomain.isVisible}
                        onChange={(e) => onUpdateDomainInfo('isVisible', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="isVisible">可见</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isMaintenance"
                        checked={selectedDomain.isMaintenance}
                        onChange={(e) => onUpdateDomainInfo('isMaintenance', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="isMaintenance">维护中</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Steps Card */}
              <Card className={WorkflowEditorStyles.card}>
                <CardHeader className={WorkflowEditorStyles.stepsHeader}>
                  <div>
                    <CardTitle>工作流步骤</CardTitle>
                    <CardDescription>添加和配置工作流步骤</CardDescription>
                  </div>
                  <Button onClick={onAddStep} size="sm" className={WorkflowEditorStyles.buttonRounded}>
                    <Plus className={WorkflowEditorStyles.buttonIcon} />
                    添加步骤
                  </Button>
                </CardHeader>
                <CardContent className={WorkflowEditorStyles.cardContent}>
                  {selectedDomain.workflowConfig?.steps.map((step: WorkflowStep, index: number) => (
                    <Card key={index} className={WorkflowEditorStyles.stepCard}>
                      <CardHeader className={WorkflowEditorStyles.stepCardHeader}>
                        <div className={WorkflowEditorStyles.stepCardHeaderContent}>
                          <CardTitle className={WorkflowEditorStyles.stepTitle}>步骤 {index + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveStep(index)}
                            className={WorkflowEditorStyles.deleteButton}
                          >
                            <Trash2 className={WorkflowEditorStyles.buttonIcon} />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className={WorkflowEditorStyles.cardContent}>
                        {/* 绑定模型 */}
                        <div>
                          <Label>
                            绑定模型
                            {activeRelayName && (
                              <span className="text-xs text-gray-500 ml-2">
                                (当前中转站: {activeRelayName})
                              </span>
                            )}
                          </Label>
                          {availableModels.length > 0 ? (
                            <Select
                              value={step.model || ''}
                              onValueChange={(value) => onStepChange(index, 'model', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择此步骤使用的AI模型" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableModels.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={step.model || ''}
                              onChange={(e) => onStepChange(index, 'model', e.target.value)}
                              placeholder="例如: gpt-4"
                            />
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            不同的模型效果不同，可根据需要为每个步骤选择最合适的模型。
                            {!step.model && (
                              <span className="text-orange-500">
                                {' '}⚠️ 请选择模型
                              </span>
                            )}
                          </p>
                        </div>

                        {/* 提示词模板 */}
                        <div>
                          <Label>提示词模板</Label>
                          <Textarea
                            value={step.config.template || ''}
                            onChange={(e) => onConfigChange(index, 'template', e.target.value)}
                            placeholder="请输入提示词，使用 {{user_input}} 表示用户输入，{{input}} 表示上一步的输出结果"
                            rows={6}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            💡 变量说明：
                            <br />
                            • <code className="px-1 py-0.5 bg-gray-100 rounded">{'{{user_input}}'}</code> - 用户的原始输入
                            <br />
                            • <code className="px-1 py-0.5 bg-gray-100 rounded">{'{{input}}'}</code> - 上一个步骤的输出结果
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Empty State */}
                  {(!selectedDomain.workflowConfig?.steps ||
                    selectedDomain.workflowConfig.steps.length === 0) && (
                    <div className={WorkflowEditorStyles.emptyState}>
                      <p>暂无步骤，点击"添加步骤"开始构建工作流</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Result Card */}
              {testResult && (
                <Card className={WorkflowEditorStyles.card}>
                  <CardHeader>
                    <CardTitle>测试结果</CardTitle>
                    <CardDescription>工作流执行输出（调试用）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className={WorkflowEditorStyles.testResult}>
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className={WorkflowEditorStyles.card}>
              <CardContent className={WorkflowEditorStyles.emptyEditorState}>
                <p>请从左侧选择一个 AI 域开始编辑</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Test Input Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>测试工作流</DialogTitle>
            <DialogDescription>
              输入测试内容以测试工作流配置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="test-input">测试输入</Label>
              <Textarea
                id="test-input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="请输入测试内容..."
                rows={4}
                className="rounded-xl mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTestDialog(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleTestConfirm}
              disabled={!testInput.trim() || testing}
              className="rounded-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  开始测试
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
