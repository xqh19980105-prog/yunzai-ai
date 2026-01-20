'use client';

import { MarkdownRenderer } from './MarkdownRenderer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  createdAt: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar - 精确尺寸：32px x 32px */}
      <Avatar className="w-8 h-8 rounded-full shrink-0">
        <AvatarFallback className={isUser ? 'bg-[#0066FF] text-white' : 'bg-[#F5F5F5] text-[#525252]'}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content - 精确圆角：18px，精确间距：12px gap */}
      <div className={`flex-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-3`}>
        <div
          className={`rounded-[18px] px-4 py-2.5 max-w-[85%] shadow-message ${
            isUser
              ? 'bg-[#0066FF] text-white rounded-tr-[4px]'
              : 'bg-white border border-[#F5F5F5] rounded-tl-[4px]'
          }`}
        >
          {/* Images */}
          {message.images && message.images.length > 0 && (
            <div className="mb-2 space-y-2">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Upload ${idx + 1}`}
                  className="max-w-full rounded-xl max-h-64 object-contain"
                />
              ))}
            </div>
          )}

          {/* Text Content */}
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}
