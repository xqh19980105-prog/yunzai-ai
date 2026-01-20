/**
 * WorkflowEditor 样式定义
 * 集中管理所有 className 样式字符串
 */

export const WorkflowEditorStyles = {
  // Loading
  loadingContainer: 'flex items-center justify-center h-64',
  loadingIcon: 'w-8 h-8 animate-spin text-primary',

  // Header
  header: 'flex items-center justify-between mb-6',
  title: 'text-3xl font-bold',
  headerActions: 'flex gap-2',

  // Buttons
  buttonRounded: 'rounded-full',
  buttonIcon: 'w-4 h-4 mr-2',

  // Main Layout
  mainGrid: 'grid grid-cols-1 lg:grid-cols-3 gap-6',

  // Cards
  card: 'rounded-xl shadow-soft',
  cardContent: 'space-y-4',

  // Domain List
  domainList: 'space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2',
  getDomainButtonClass: (isSelected: boolean) =>
    `w-full text-left p-3 rounded-xl transition-colors ${
      isSelected ? 'bg-primary text-white' : 'bg-gray-50 hover:bg-gray-100'
    }`,
  domainTitle: 'font-medium',
  domainId: 'text-sm opacity-75',

  // Editor Area
  editorArea: 'lg:col-span-2 space-y-6',

  // Steps
  stepsHeader: 'flex flex-row items-center justify-between',
  stepCard: 'border-2',
  stepCardHeader: 'pb-3',
  stepCardHeaderContent: 'flex items-center justify-between',
  stepTitle: 'text-lg',
  deleteButton: 'text-red-500',

  // Empty States
  emptyState: 'text-center py-8 text-gray-500',
  emptyEditorState: 'py-12 text-center text-gray-500',

  // Test Result
  testResult: 'bg-gray-50 p-4 rounded-xl overflow-auto text-sm',
};
