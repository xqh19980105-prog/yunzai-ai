'use client';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

// 默认推荐提示词（如果domain没有配置）
const DEFAULT_PROMPTS = [
  '哪些习惯能提升睡眠质量？',
  '生成独一无二的新年贺图',
  '帮我写一份工作总结',
  '解释一下量子计算的基本原理',
  '推荐几本值得读的书',
  '如何提高工作效率？',
  '写一首关于春天的诗',
  '制定一个健身计划',
];

export function SuggestedPrompts({ prompts, onSelectPrompt }: SuggestedPromptsProps) {
  const displayPrompts = prompts.length > 0 ? prompts : DEFAULT_PROMPTS;

  return (
    <div className="max-w-4xl mx-auto w-full px-4">
      {/* 推荐提示词网格 - 豆包风格：3列布局，精确间距 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {displayPrompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left px-4 py-3 rounded-[12px] bg-[#F5F5F5] hover:bg-[#E5E5E5] active:bg-[#D9D9D9] transition-all duration-200 text-sm text-[#212121] leading-[20px] border border-transparent hover:border-[#E5E5E5] font-normal"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
