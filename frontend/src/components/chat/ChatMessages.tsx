'use client';

import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';
import { SuggestedPrompts } from './SuggestedPrompts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  createdAt: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
  streamingStage: 'thinking' | 'generating';
  isLoading?: boolean;
  suggestedPrompts?: string[];
  onSelectPrompt?: (prompt: string) => void;
  greetingMessage?: string | null;
}

export function ChatMessages({ 
  messages, 
  isStreaming, 
  streamingStage, 
  isLoading,
  suggestedPrompts,
  onSelectPrompt,
  greetingMessage,
}: ChatMessagesProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-[#A6A6A6]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF] mx-auto mb-3"></div>
          <p className="text-sm text-[#737373]">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (messages.length === 0 && !isStreaming) {
    // 显示欢迎消息和推荐提示词（即使没有配置也显示默认的）
    const displayGreeting = greetingMessage || '有什么我能帮你的吗？';
    const displayPrompts = (suggestedPrompts && suggestedPrompts.length > 0) ? suggestedPrompts : undefined;
    
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          {/* 欢迎消息 - 豆包风格：精确间距 */}
          <div className="text-center mb-12 px-4">
            <p className="text-lg text-[#212121] leading-[24px] font-normal">{displayGreeting}</p>
          </div>
          
          {/* 推荐提示词 - 豆包风格：网格布局 */}
          <SuggestedPrompts 
            prompts={displayPrompts || []} 
            onSelectPrompt={onSelectPrompt || (() => {})} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4 space-y-6 animate-in fade-in duration-200">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <MessageBubble message={message} />
        </div>
      ))}

      {isStreaming && <StreamingIndicator stage={streamingStage} />}
    </div>
  );
}
