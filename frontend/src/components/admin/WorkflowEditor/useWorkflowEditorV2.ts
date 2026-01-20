'use client';

/**
 * WorkflowEditor V2 数据处理逻辑
 * 支持多步骤串联、条件分支、每步骤独立模型选择
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api/axios';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { 
  AIDomain, 
  WorkflowStep, 
  WorkflowConfig,
  StepTemplate,
  PromptStep,
  ConditionStep,
  TransformStep,
  OutputStep,
  WorkflowTestResult
} from './types';

// 生成唯一ID
const generateId = () => `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 创建默认工作流配置
const createDefaultWorkflowConfig = (): WorkflowConfig => ({
  version: '2.0',
  startStepId: null,
  steps: [],
  connections: [],
  variables: [],
});

// 从模板创建步骤
const createStepFromTemplate = (template: StepTemplate): WorkflowStep => {
  const baseStep = {
    id: generateId(),
    name: template.name,
    description: template.description,
    position: { x: 0, y: 0 },
  };

  switch (template.type) {
    case 'prompt':
      return {
        ...baseStep,
        type: 'prompt',
        config: {
          model: '',
          template: (template.defaultConfig as Partial<PromptStep['config']>).template || '{{user_input}}',
          systemPrompt: (template.defaultConfig as Partial<PromptStep['config']>).systemPrompt || '',
          temperature: 0.7,
          maxTokens: 2048,
          inputTypes: (template.defaultConfig as Partial<PromptStep['config']>).inputTypes || ['text'],
        },
        nextStepId: null,
      } as PromptStep;

    case 'condition':
      return {
        ...baseStep,
        type: 'condition',
        config: {
          variable: '{{input}}',
          branches: [],
          defaultNextStepId: null,
        },
      } as ConditionStep;

    case 'transform':
      return {
        ...baseStep,
        type: 'transform',
        config: {
          transformType: (template.defaultConfig as Partial<TransformStep['config']>).transformType || 'format',
          template: (template.defaultConfig as Partial<TransformStep['config']>).template || '{{input}}',
        },
        nextStepId: null,
      } as TransformStep;

    case 'output':
      return {
        ...baseStep,
        type: 'output',
        config: {
          template: (template.defaultConfig as Partial<OutputStep['config']>).template || '{{input}}',
          format: (template.defaultConfig as Partial<OutputStep['config']>).format || 'text',
        },
      } as OutputStep;

    default:
      throw new Error(`Unknown step type: ${template.type}`);
  }
};

// 兼容旧版工作流配置
const migrateOldWorkflowConfig = (oldConfig: { steps?: Array<{ type: string; model?: string; config: Record<string, unknown> }> }): WorkflowConfig => {
  if (!oldConfig || !oldConfig.steps) {
    return createDefaultWorkflowConfig();
  }

  const newSteps: WorkflowStep[] = oldConfig.steps.map((oldStep, index) => {
    const id = generateId();
    return {
      id,
      type: 'prompt' as const,
      name: `步骤 ${index + 1}`,
      position: { x: 0, y: index * 200 },
      config: {
        model: oldStep.model || '',
        template: (oldStep.config?.template as string) || '{{user_input}}',
        systemPrompt: '',
        temperature: 0.7,
        maxTokens: 2048,
        inputTypes: ['text'] as const,
      },
      nextStepId: null,
    } as PromptStep;
  });

  // 设置步骤连接
  for (let i = 0; i < newSteps.length - 1; i++) {
    (newSteps[i] as PromptStep).nextStepId = newSteps[i + 1].id;
  }

  return {
    version: '2.0',
    startStepId: newSteps[0]?.id || null,
    steps: newSteps,
    connections: [],
    variables: [],
  };
};

export function useWorkflowEditorV2() {
  const [domains, setDomains] = useState<AIDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<AIDomain | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<WorkflowTestResult | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeRelayName, setActiveRelayName] = useState<string>('');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 加载域列表
  const loadDomains = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/ai-domains');
      // Ensure domains is always an array
      const data = response.data;
      setDomains(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load domains:', error);
      toast.error('加载工作流失败');
      setDomains([]); // Ensure domains is empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载可用模型
  const loadAvailableModels = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/relay-configs/active/models');
      setAvailableModels(response.data.models || []);
      setActiveRelayName(response.data.relayName || '');
    } catch (error) {
      console.error('Failed to load available models:', error);
      setAvailableModels([]);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadDomains();
    loadAvailableModels();
  }, [loadDomains, loadAvailableModels]);

  // 选择域
  const handleSelectDomain = useCallback((domainId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('有未保存的更改，确定要切换吗？')) {
        return;
      }
    }

    const domain = domains.find((d) => d.id === domainId);
    if (domain) {
      // 迁移旧版配置
      let workflowConfig = domain.workflowConfig;
      if (workflowConfig && !('version' in workflowConfig)) {
        workflowConfig = migrateOldWorkflowConfig(workflowConfig as unknown as { steps?: Array<{ type: string; model?: string; config: Record<string, unknown> }> });
      } else if (!workflowConfig) {
        workflowConfig = createDefaultWorkflowConfig();
      }

      setSelectedDomain({
        ...domain,
        workflowConfig: workflowConfig as WorkflowConfig,
      });
      setSelectedStepId(null);
      setTestResult(null);
      setHasUnsavedChanges(false);
    }
  }, [domains, hasUnsavedChanges]);

  // 创建新域
  const handleCreateDomain = useCallback(async () => {
    try {
      const response = await api.post('/api/admin/ai-domains', {
        title: '新 AI 工具',
        description: '',
        icon: null,
        isVisible: false,
        isMaintenance: false,
        sortOrder: domains.length,
        workflowConfig: createDefaultWorkflowConfig(),
      });
      const newDomain = response.data;
      setDomains([...domains, newDomain]);
      setSelectedDomain(newDomain);
      setHasUnsavedChanges(false);
      toast.success('已创建新的 AI 工具');
    } catch (error) {
      toast.error(getErrorMessage(error) || '创建失败');
    }
  }, [domains]);

  // 删除域
  const handleDeleteDomain = useCallback(async (domainId: string) => {
    if (!confirm('确定要删除这个 AI 工具吗？删除后无法恢复。')) return;

    try {
      await api.delete(`/api/admin/ai-domains/${domainId}`);
      setDomains(domains.filter((d) => d.id !== domainId));
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(null);
      }
      toast.success('已删除 AI 工具');
    } catch (error) {
      toast.error(getErrorMessage(error) || '删除失败');
    }
  }, [domains, selectedDomain]);

  // 更新域基本信息
  const updateDomainInfo = useCallback((field: keyof AIDomain, value: unknown) => {
    if (!selectedDomain) return;
    
    const updatedDomain = { ...selectedDomain, [field]: value };
    setSelectedDomain(updatedDomain);
    setDomains(domains.map((d) => (d.id === updatedDomain.id ? updatedDomain : d)));
    setHasUnsavedChanges(true);
  }, [selectedDomain, domains]);

  // 添加步骤
  const handleAddStep = useCallback((template: StepTemplate) => {
    if (!selectedDomain) return;

    const newStep = createStepFromTemplate(template);
    const config = selectedDomain.workflowConfig || createDefaultWorkflowConfig();
    const steps = [...config.steps, newStep];

    // 更新前一个步骤的 nextStepId
    if (steps.length > 1) {
      const prevStep = steps[steps.length - 2];
      if (prevStep.type !== 'condition') {
        (prevStep as PromptStep | TransformStep).nextStepId = newStep.id;
      }
    }

    const updatedConfig: WorkflowConfig = {
      ...config,
      steps,
      startStepId: config.startStepId || newStep.id,
    };

    updateDomainInfo('workflowConfig', updatedConfig);
    setSelectedStepId(newStep.id);
  }, [selectedDomain, updateDomainInfo]);

  // 更新步骤
  const handleUpdateStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    if (!selectedDomain?.workflowConfig) return;

    const config = selectedDomain.workflowConfig;
    const steps = config.steps.map((step) =>
      step.id === stepId ? { ...step, ...updates } as WorkflowStep : step
    );

    updateDomainInfo('workflowConfig', { ...config, steps });
  }, [selectedDomain, updateDomainInfo]);

  // 删除步骤
  const handleDeleteStep = useCallback((stepId: string) => {
    if (!selectedDomain?.workflowConfig) return;

    const config = selectedDomain.workflowConfig;
    const stepIndex = config.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const steps = config.steps.filter((s) => s.id !== stepId);

    // 更新前一个步骤的 nextStepId
    if (stepIndex > 0 && steps.length > 0) {
      const prevStep = steps[stepIndex - 1];
      const nextStep = steps[stepIndex] || null;
      if (prevStep.type !== 'condition') {
        (prevStep as PromptStep | TransformStep).nextStepId = nextStep?.id || null;
      }
    }

    // 更新 startStepId
    let startStepId = config.startStepId;
    if (startStepId === stepId) {
      startStepId = steps[0]?.id || null;
    }

    updateDomainInfo('workflowConfig', { ...config, steps, startStepId });
    setSelectedStepId(null);
  }, [selectedDomain, updateDomainInfo]);

  // 移动步骤
  const handleMoveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    if (!selectedDomain?.workflowConfig) return;

    const config = selectedDomain.workflowConfig;
    const steps = [...config.steps];
    const index = steps.findIndex((s) => s.id === stepId);

    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];

    // 重新建立连接
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type !== 'condition') {
        (step as PromptStep | TransformStep).nextStepId = steps[i + 1]?.id || null;
      }
    }

    updateDomainInfo('workflowConfig', {
      ...config,
      steps,
      startStepId: steps[0]?.id || null,
    });
  }, [selectedDomain, updateDomainInfo]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!selectedDomain) return;

    setSaving(true);
    try {
      // 转换为后端兼容格式
      const workflowConfig = selectedDomain.workflowConfig;
      const backendConfig = {
        steps: workflowConfig?.steps.map((step) => {
          // 类型保护：只有 prompt, transform, output 类型有 template
          const hasTemplate = step.type === 'prompt' || step.type === 'transform' || step.type === 'output';
          const template = hasTemplate ? (step.config as { template?: string }).template : undefined;
          
          return {
            type: step.type === 'prompt' ? 'api_call' : step.type,
            model: step.type === 'prompt' ? (step.config as { model: string }).model : undefined,
            config: {
              template: template,
              systemPrompt: step.type === 'prompt' ? (step.config as { systemPrompt?: string }).systemPrompt : undefined,
              temperature: step.type === 'prompt' ? (step.config as { temperature?: number }).temperature : undefined,
              maxTokens: step.type === 'prompt' ? (step.config as { maxTokens?: number }).maxTokens : undefined,
              endpoint: '/v1/chat/completions',
            },
          };
        }) || [],
      };

      await api.put(`/api/admin/ai-domains/${selectedDomain.id}`, {
        title: selectedDomain.title,
        description: selectedDomain.description,
        icon: selectedDomain.icon,
        greetingMessage: selectedDomain.greetingMessage,
        workflowConfig: backendConfig,
        targetModel: selectedDomain.targetModel,
        isVisible: selectedDomain.isVisible,
        isMaintenance: selectedDomain.isMaintenance,
        suggestedPrompts: selectedDomain.suggestedPrompts,
      });

      toast.success('工作流已保存');
      setHasUnsavedChanges(false);
      loadDomains();
    } catch (error) {
      toast.error(getErrorMessage(error) || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [selectedDomain, loadDomains]);

  // 测试
  const handleTest = useCallback(async (userInput: string) => {
    if (!selectedDomain) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await api.post('/api/admin/workflow/test', {
        domainId: selectedDomain.id,
        userInput,
      });
      setTestResult(response.data);
      toast.success('测试完成');
    } catch (error) {
      toast.error(getErrorMessage(error) || '测试失败');
    } finally {
      setTesting(false);
    }
  }, [selectedDomain]);

  return {
    // 状态
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
    // 操作
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
    loadAvailableModels,
  };
}
