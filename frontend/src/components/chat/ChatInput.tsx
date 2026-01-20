'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X, FileText, File, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (content: string, files?: File[]) => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  preview?: string; // For images only
  type: 'image' | 'document';
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [textareaHeight, setTextareaHeight] = useState(52);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 清理文件预览 URL，防止内存泄漏
  useEffect(() => {
    return () => {
      // 组件卸载时清理所有预览 URL
      files.forEach((filePreview) => {
        if (filePreview.preview) {
          URL.revokeObjectURL(filePreview.preview);
        }
      });
    };
  }, []); // 只在组件卸载时执行

  // 自动调整输入框高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 52), 200);
    textarea.style.height = `${newHeight}px`;
    setTextareaHeight(newHeight);

    if (scrollHeight > 200) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }, [content]);

  const handleSend = () => {
    if ((!content.trim() && files.length === 0) || disabled) return;

    // 清理文件预览 URL 后再发送
    files.forEach((filePreview) => {
      if (filePreview.preview) {
        URL.revokeObjectURL(filePreview.preview);
      }
    });

    onSend(content, files.length > 0 ? files.map(f => f.file) : undefined);
    setContent('');
    setFiles([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = '52px';
      setTextareaHeight(52);
    }

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    } else if (
      file.type.includes('word') ||
      file.type.includes('document') ||
      file.name.endsWith('.doc') ||
      file.name.endsWith('.docx')
    ) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const newFiles: FilePreview[] = selectedFiles.map((file) => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
        type: isImage ? 'image' : 'document',
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const fileToRemove = prev[index];
      if (fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {files.map((filePreview, index) => (
            <div key={index} className="relative group">
              {filePreview.type === 'image' ? (
                <div className="relative">
                  <img
                    src={filePreview.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-[12px] border border-[#E5E5E5] shadow-soft"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-1.5 -right-1.5 bg-[#FF4D4F] text-white rounded-full w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-all shadow-soft flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="relative bg-white border border-[#E5E5E5] rounded-[12px] p-3 shadow-soft min-w-[120px] max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <div className="text-[#737373]">
                      {getFileIcon(filePreview.file)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#212121] font-medium truncate" title={filePreview.file.name}>
                        {filePreview.file.name}
                      </p>
                      <p className="text-xs text-[#737373] mt-0.5">
                        {formatFileSize(filePreview.file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-1.5 -right-1.5 bg-[#FF4D4F] text-white rounded-full w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-all shadow-soft flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="发消息"
              disabled={disabled}
              className="resize-none rounded-[18px] pl-4 pr-12 border-[#E5E5E5] bg-white shadow-soft focus:shadow-soft-md focus:border-[#0066FF] transition-all text-sm leading-[20px] py-3 px-4"
              rows={1}
              style={{
                minHeight: '52px',
                maxHeight: '200px',
                height: '52px',
                overflowY: 'hidden',
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 bottom-2 w-8 h-8 rounded-full hover:bg-[#FAFAFA] z-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Paperclip className="w-4 h-4 text-[#737373]" />
            </Button>
          </div>
          <Button
            onClick={handleSend}
            disabled={disabled || (!content.trim() && files.length === 0)}
            className="rounded-full w-[52px] p-0 shadow-soft hover:shadow-soft-md transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center shrink-0"
            style={{ height: `${textareaHeight}px` }}
          >
            <Send className="w-5 h-5" />
          </Button>
      </div>
    </div>
  );
}
