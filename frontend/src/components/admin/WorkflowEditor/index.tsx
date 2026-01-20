'use client';

/**
 * WorkflowEditor 主组件
 * 组合数据处理逻辑和界面显示
 */

import { useWorkflowEditor } from './useWorkflowEditor';
import { WorkflowEditorView } from './WorkflowEditorView';

export function WorkflowEditor() {
  const {
    domains,
    selectedDomain,
    loading,
    testing,
    testResult,
    availableModels,
    activeRelayName,
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
  } = useWorkflowEditor();

  return (
    <WorkflowEditorView
      domains={domains}
      selectedDomain={selectedDomain}
      loading={loading}
      testing={testing}
      testResult={testResult}
      availableModels={availableModels}
      activeRelayName={activeRelayName}
      onSelectDomain={handleSelectDomain}
      onCreateDomain={handleCreateDomain}
      onDeleteDomain={handleDeleteDomain}
      onAddStep={handleAddStep}
      onRemoveStep={handleRemoveStep}
      onStepChange={handleStepChange}
      onConfigChange={handleConfigChange}
      onUpdateDomainInfo={updateDomainInfo}
      onSave={handleSave}
      onTest={handleTest}
    />
  );
}
