'use client';

/**
 * WorkflowEditor 数据处理逻辑
 * 包含所有状态管理、API 调用和数据处理函数
 */

import { useState, useEffect } from 'react';
import api from '@/lib/api/axios';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/error-handler';

export interface WorkflowStep {
  type: 'prompt' | 'api_call' | 'transform';
  model?: string; // Optional: AI model to use for this specific step (for api_call type)
  config: Record<string, any>;
}

export interface AIDomain {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  greetingMessage: string | null;
  workflowConfig: {
    steps: WorkflowStep[];
  } | null;
  targetModel: string | null;
  isVisible: boolean;
  isMaintenance: boolean;
}

export function useWorkflowEditor() {
  const [domains, setDomains] = useState<AIDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<AIDomain | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeRelayName, setActiveRelayName] = useState<string>('');

  // Load domains and available models on mount
  useEffect(() => {
    loadDomains();
    loadAvailableModels();
  }, []);

  // Data Loading
  const loadDomains = async () => {
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
  };

  // Load available models from active relay
  const loadAvailableModels = async () => {
    try {
      const response = await api.get('/api/admin/relay-configs/active/models');
      setAvailableModels(response.data.models || []);
      setActiveRelayName(response.data.relayName || '');
    } catch (error) {
      console.error('Failed to load available models:', error);
      // Don't show error toast, just use empty array
      setAvailableModels([]);
    }
  };

  // Domain Selection
  const handleSelectDomain = (domainId: string) => {
    const domain = domains.find((d) => d.id === domainId);
    setSelectedDomain(domain || null);
    setTestResult(null);
  };

  // Domain List Update Helper
  const updateDomainInList = (updatedDomain: AIDomain) => {
    setDomains(domains.map((d) => (d.id === updatedDomain.id ? updatedDomain : d)));
  };

  /**
   * Update selected domain with new workflow config steps
   * Helper function to reduce code duplication
   */
  const updateDomainWithSteps = (newSteps: WorkflowStep[]) => {
    if (!selectedDomain) return;

    const updatedDomain: AIDomain = {
      ...selectedDomain,
      workflowConfig: {
        steps: newSteps,
      },
    };

    setSelectedDomain(updatedDomain);
    updateDomainInList(updatedDomain);
  };

  // Step Management
  const handleAddStep = () => {
    if (!selectedDomain) return;

    const newStep: WorkflowStep = {
      type: 'api_call', // 默认类型为 api_call，因为每个步骤都需要调用 AI 模型
      model: '', // 需要管理员选择模型
      config: { 
        template: '',
        endpoint: '/v1/chat/completions' 
      },
    };

    const currentSteps = selectedDomain.workflowConfig?.steps || [];
    updateDomainWithSteps([...currentSteps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    if (!selectedDomain) return;

    const currentSteps = selectedDomain.workflowConfig?.steps || [];
    const updatedSteps = currentSteps.filter((_, i) => i !== index);
    updateDomainWithSteps(updatedSteps);
  };

  const handleStepChange = (index: number, field: string, value: any) => {
    if (!selectedDomain) return;

    const currentSteps = [...(selectedDomain.workflowConfig?.steps || [])];
    const updatedSteps = currentSteps.map((step, i) => {
      if (i !== index) return step;
      return { ...step, [field]: value };
    });

    updateDomainWithSteps(updatedSteps);
  };

  const handleConfigChange = (index: number, configKey: string, value: any) => {
    if (!selectedDomain) return;

    const currentSteps = [...(selectedDomain.workflowConfig?.steps || [])];
    const updatedSteps = currentSteps.map((step, i) => {
      if (i !== index) return step;
      return {
        ...step,
        config: {
          ...step.config,
          [configKey]: value,
        },
      };
    });

    updateDomainWithSteps(updatedSteps);
  };

  // Domain Info Update
  const updateDomainInfo = (field: keyof AIDomain, value: any) => {
    if (!selectedDomain) return;
    setSelectedDomain({ ...selectedDomain, [field]: value });
    updateDomainInList({ ...selectedDomain, [field]: value });
  };

  // Create & Delete Domain
  const handleCreateDomain = async () => {
    try {
      const response = await api.post('/api/admin/ai-domains', {
        title: '新 AI 工具',
        description: '',
        icon: null,
        isVisible: true,
        isMaintenance: false,
        sortOrder: domains.length,
      });
      const newDomain = response.data;
      setDomains([...domains, newDomain]);
      setSelectedDomain(newDomain);
      toast.success('已创建新的 AI 域');
    } catch (error) {
      toast.error(getErrorMessage(error) || '创建失败');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('确定要删除这个 AI 域吗？删除后无法恢复。')) return;

    try {
      await api.delete(`/api/admin/ai-domains/${domainId}`);
      setDomains(domains.filter((d) => d.id !== domainId));
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(null);
      }
      toast.success('已删除 AI 域');
    } catch (error) {
      toast.error(getErrorMessage(error) || '删除失败');
    }
  };

  // Save & Test
  const handleSave = async () => {
    if (!selectedDomain) return;

    try {
      await api.put(`/api/admin/ai-domains/${selectedDomain.id}`, {
        title: selectedDomain.title,
        description: selectedDomain.description,
        icon: selectedDomain.icon,
        greetingMessage: selectedDomain.greetingMessage,
        workflowConfig: selectedDomain.workflowConfig,
        targetModel: selectedDomain.targetModel,
        isVisible: selectedDomain.isVisible,
        isMaintenance: selectedDomain.isMaintenance,
      });
      toast.success('工作流已保存');
      loadDomains(); // Reload to get latest data
    } catch (error) {
      toast.error(getErrorMessage(error) || '保存失败');
    }
  };

  const handleTest = async (userInput: string) => {
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
  };

  return {
    // State
    domains,
    selectedDomain,
    loading,
    testing,
    testResult,
    availableModels,
    activeRelayName,
    // Actions
    handleSelectDomain,
    handleCreateDomain,
    handleDeleteDomain,
    handleAddStep,
    handleRemoveStep,
    handleStepChange,
    handleConfigChange,
    updateDomainInfo,
    handleSave,
    handleTest,
    loadAvailableModels, // Expose for refresh
  };
}
