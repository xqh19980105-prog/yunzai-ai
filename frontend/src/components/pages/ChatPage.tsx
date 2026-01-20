'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { ModelBadge } from '@/components/chat/ModelBadge';
import { Disclaimer } from '@/components/chat/Disclaimer';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import api from '@/lib/api/axios';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  createdAt: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  updatedAt: Date;
}

interface AIDomain {
  id: string;
  title: string;
  greetingMessage: string | null;
  targetModel: string | null;
  suggestedPrompts?: string[]; // 推荐提示词
}

interface ChatPageProps {
  domainId: string;
}

export function ChatPage({ domainId }: ChatPageProps) {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [domain, setDomain] = useState<AIDomain | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<'thinking' | 'generating'>('thinking');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null); // 当前会话ID
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null); // 正在删除的会话ID（用于动画）
  const [loadingMessages, setLoadingMessages] = useState(false); // 正在加载消息
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentLoadIdRef = useRef<number | null>(null); // 跟踪当前加载请求的ID，用于防止竞态条件

  const isMember = user?.membershipExpireAt && new Date(user.membershipExpireAt) > new Date();

  // Load domain info
  useEffect(() => {
    let cancelled = false;
    
    api
      .get(`/api/ai-domains/${domainId}`)
      .then((response) => {
        if (!cancelled && response && response.data) {
          setDomain(response.data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load domain:', error);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [domainId]);

  // Load chat history
  useEffect(() => {
    let cancelled = false;
    
    api
      .get(`/api/chat/history?domainId=${domainId}`)
      .then((response) => {
        if (!cancelled && response && response.data && Array.isArray(response.data)) {
          setHistory(response.data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load history:', error);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [domainId]);

  // Load messages function
  const loadMessages = async (historyId?: string) => {
    // Prevent concurrent loads
    if (loadingMessages) {
      return;
    }
    
    setLoadingMessages(true);
    const loadId = Date.now(); // Track this specific load
    currentLoadIdRef.current = loadId; // 保存当前加载ID
    
    try {
      // Clear messages immediately for smooth transition
      setMessages([]);
      
      const params = new URLSearchParams({ domainId });
      if (historyId) {
        params.append('historyId', historyId);
      }

      const response = await api.get(`/api/chat/messages?${params}`);
      
      // Check if this load is still current (prevent race condition)
      // 如果 currentLoadIdRef 已经被新的加载请求更新，说明有新的请求，忽略这个结果
      if (currentLoadIdRef.current !== loadId) {
        return;
      }
      
      const loadedMessages: Message[] = (response.data || []).map((msg: {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        createdAt: string | Date;
      }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content || '',
        createdAt: msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt),
      }));
      
      // Small delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // 再次检查是否仍然是最新的加载请求
      if (currentLoadIdRef.current !== loadId) {
        return;
      }
      
      setMessages(loadedMessages);
      setCurrentHistoryId(historyId || null);
      
      // Auto scroll to bottom after loading
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Don't update state on error if another load has started
    } finally {
      // 只有在当前加载ID仍然匹配时才清除加载状态
      if (currentLoadIdRef.current === loadId) {
        setLoadingMessages(false);
      }
    }
  };

  // Load messages on mount or when domainId changes
  useEffect(() => {
    // Load initial messages for current domain (latest conversation if exists)
    let cancelled = false;
    
    const loadInitialMessages = async () => {
      if (!cancelled) {
        await loadMessages();
      }
    };
    
    loadInitialMessages();
    
    return () => {
      cancelled = true;
      // 清理所有消息中的图片 URL，防止内存泄漏
      setMessages((prevMessages) => {
        prevMessages.forEach((msg) => {
          if (msg.images && Array.isArray(msg.images)) {
            msg.images.forEach((url) => {
              if (typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
              }
            });
          }
        });
        return [];
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId]);

  // Handle new chat: clear current session and reset to empty state (like Doubao)
  const handleNewChat = () => {
    // Clear messages with fade-out effect
    setMessages([]);
    setCurrentHistoryId(null);
    setIsStreaming(false);
    
    // Show greeting message after a brief delay for smooth transition
    setTimeout(() => {
      if (domain?.greetingMessage) {
        const greetingMsg: Message = {
          id: 'greeting',
          role: 'assistant',
          content: domain.greetingMessage,
          createdAt: new Date(),
        };
        setMessages([greetingMsg]);
      }
    }, 100);
  };

  // Handle delete conversation
  const handleDeleteHistory = async (historyId: string) => {
    // Set deleting state for animation
    setDeletingHistoryId(historyId);
    
    // 保存删除前的历史记录，用于错误回滚
    const previousHistory = [...history];
    
    // If deleting the current conversation, switch to new chat state immediately
    if (currentHistoryId === historyId) {
      handleNewChat();
    }
    
    try {
      // Immediately remove from local state for instant UI update (optimistic update)
      setHistory((prevHistory) => prevHistory.filter((item) => item.id !== historyId));
      
      // Call delete API
      const response = await api.delete(`/api/chat/history/${historyId}`);
      
      // Show success message (simplified, like Doubao)
      if (response.data?.success) {
        toast.success('对话已删除', {
          duration: 2000,
        });
      }
      
      // Wait for animation to complete, then refresh from server
      setTimeout(async () => {
        try {
          const historyResponse = await api.get(`/api/chat/history?domainId=${domainId}`);
          // 验证响应数据格式
          if (historyResponse && historyResponse.data && Array.isArray(historyResponse.data)) {
            setHistory(historyResponse.data);
          }
          setDeletingHistoryId(null);
        } catch (refreshError) {
          console.error('Failed to refresh history list:', refreshError);
          setDeletingHistoryId(null);
          // If refresh fails, keep the local state update (already removed from UI)
        }
      }, 300); // Wait for fade-out animation (300ms)
    } catch (error: unknown) {
      console.error('Failed to delete conversation:', error);
      
      // Revert the optimistic update on error
      setHistory(previousHistory);
      
      // 尝试从服务器刷新，但不依赖它
      try {
        const historyResponse = await api.get(`/api/chat/history?domainId=${domainId}`);
        if (historyResponse && historyResponse.data && Array.isArray(historyResponse.data)) {
          setHistory(historyResponse.data);
        }
      } catch (refreshError) {
        console.error('Failed to refresh history list after error:', refreshError);
      }
      
      setDeletingHistoryId(null);
      
      // 提取错误消息
      let errorMessage = '删除对话失败，请稍后重试';
      if (error && typeof error === 'object') {
        if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
          const responseData = error.response.data;
          if (responseData && typeof responseData === 'object') {
            if ('message' in responseData && typeof responseData.message === 'string') {
              errorMessage = responseData.message;
            } else if ('error' in responseData && typeof responseData.error === 'string') {
              errorMessage = responseData.error;
            }
          }
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
    }
  };

  // Show greeting message when chat is empty (new conversation or no messages)
  useEffect(() => {
    // 只有在没有消息且没有选中历史会话时才显示欢迎消息
    // 如果选中了历史会话，应该显示历史消息而不是欢迎消息
    if (messages.length === 0 && !currentHistoryId && domain?.greetingMessage) {
      const greetingMsg: Message = {
        id: 'greeting',
        role: 'assistant',
        content: domain.greetingMessage,
        createdAt: new Date(),
      };
      setMessages([greetingMsg]);
    } else if (currentHistoryId && messages.length === 0) {
      // 如果选中了历史会话但没有消息，清空欢迎消息（等待加载历史消息）
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, currentHistoryId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSendMessage = async (content: string, images?: File[]) => {
    if ((!content || !content.trim()) && (!images || images.length === 0)) return;
    if (isStreaming) return; // Prevent multiple simultaneous requests

    // 创建图片预览 URL（临时，用于显示）
    const imageUrls: string[] = [];
    if (images && images.length > 0) {
      images.forEach((img) => {
        imageUrls.push(URL.createObjectURL(img));
      });
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Start streaming
    setIsStreaming(true);
    setStreamingStage('thinking');

    try {
      // Simulate streaming
      await simulateStreaming(content, images);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the user message if sending failed
      setMessages((prev) => {
        const updated = prev.slice(0, -1);
        // 清理失败消息中的图片 URL，防止内存泄漏
        const failedMessage = prev[prev.length - 1];
        if (failedMessage?.images && Array.isArray(failedMessage.images)) {
          failedMessage.images.forEach((url) => {
            if (typeof url === 'string' && url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
        }
        return updated;
      });
      // Error toast is already shown by axios interceptor
    } finally {
      setIsStreaming(false);
      setStreamingStage('thinking');
    }
  };

  // Convert image file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  };

  const simulateStreaming = async (content: string, files?: File[]) => {
    // Stage 1: Thinking (1-2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStreamingStage('generating');

    // Stage 2: Process files
    let imageData: Array<{ data: string; mimeType: string }> | undefined;
    let documentTexts: string[] = [];

    if (files && files.length > 0) {
      const imageFiles: File[] = [];
      const documentFiles: File[] = [];

      // Separate images and documents
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else {
          documentFiles.push(file);
        }
      });

      // Convert images to base64
      if (imageFiles.length > 0) {
        try {
          imageData = await Promise.all(
            imageFiles.map(async (file) => {
              try {
                const base64Data = await fileToBase64(file);
                return {
                  data: base64Data,
                  mimeType: file.type,
                };
              } catch (error) {
                console.error(`Failed to convert image ${file.name} to base64:`, error);
                throw new Error(`无法处理图片 ${file.name}，请检查文件格式`);
              }
            }),
          );
        } catch (error) {
          console.error('Failed to process images:', error);
          throw error; // 重新抛出错误，让上层处理
        }
      }

      // Read text from text-based documents
      for (const docFile of documentFiles) {
        if (
          docFile.type === 'text/plain' ||
          docFile.type === 'text/markdown' ||
          docFile.name.endsWith('.txt') ||
          docFile.name.endsWith('.md')
        ) {
          try {
            const text = await readTextFile(docFile);
            documentTexts.push(`\n【文件：${docFile.name}】\n${text}\n`);
          } catch (error) {
            console.error(`Failed to read file ${docFile.name}:`, error);
            documentTexts.push(`\n【文件：${docFile.name}】（无法读取文件内容）\n`);
          }
        } else {
          // For PDF, Word, etc., we'll send the file info and let backend handle it
          documentTexts.push(`\n【文件：${docFile.name}】（${docFile.type}，${(docFile.size / 1024).toFixed(2)}KB）\n`);
        }
      }
    }

    // Combine user message with document contents
    const documentContent = documentTexts.length > 0 ? documentTexts.join('\n') : '';
    const trimmedContent = content ? content.trim() : '';
    const messageText = trimmedContent || 
      (imageData && imageData.length > 0 ? '请识别并描述这张图片的内容' : '') ||
      (documentTexts.length > 0 ? '请分析这些文档的内容' : '');
    
    if (!messageText && (!imageData || imageData.length === 0)) {
      setIsStreaming(false);
      setStreamingStage('thinking');
      toast.error('消息内容不能为空');
      return;
    }
    
    const finalMessage = messageText + documentContent;
    
    let response;
    try {
      response = await api.post('/api/chat', {
        message: finalMessage,
        domainId: domainId,
        images: imageData,
      });
    } catch (error) {
      setIsStreaming(false);
      setStreamingStage('thinking');
      // Error is already handled by axios interceptor
      throw error;
    }

    if (!response || !response.data) {
      setIsStreaming(false);
      setStreamingStage('thinking');
      toast.error('服务器响应异常');
      return;
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.data?.data?.message || response.data?.message || '无响应内容',
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    
    // Refresh history list after sending message (like Doubao: new conversation appears at top)
    // If this is a new conversation (currentHistoryId is null), the new conversation will appear in history
    try {
      const historyResponse = await api.get(`/api/chat/history?domainId=${domainId}`);
      
      // Validate response before updating state
      if (historyResponse && historyResponse.data && Array.isArray(historyResponse.data)) {
        // Optimistically update: if this was a new conversation, it should be at the top
        setHistory(historyResponse.data);
        
        // If this was a new conversation (no historyId), set the current historyId to the first item
        // (which should be the newly created conversation)
        if (!currentHistoryId && historyResponse.data.length > 0 && historyResponse.data[0]?.id) {
          const newHistoryId = historyResponse.data[0].id;
          setCurrentHistoryId(newHistoryId);
        }
      }
    } catch (error) {
      console.error('Failed to refresh history:', error);
      // Don't show error toast here, as the message was already sent successfully
    }
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      {/* Desktop Sidebar - 精确尺寸：256px宽度，精确边框色 */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 border-r border-[#F5F5F5] bg-white">
        <ChatSidebar
          history={history}
          domainId={domainId}
          domainTitle={domain?.title}
          currentHistoryId={currentHistoryId}
          deletingHistoryId={deletingHistoryId}
          onSelectHistory={(id) => {
            loadMessages(id);
          }}
          onNewChat={handleNewChat}
          onDeleteHistory={handleDeleteHistory}
        />
      </aside>

      {/* Mobile Drawer */}
      <div className="md:hidden">
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-10 rounded-full"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="h-[80vh]">
              <ChatSidebar
                history={history}
                domainId={domainId}
                domainTitle={domain?.title}
                currentHistoryId={currentHistoryId}
                deletingHistoryId={deletingHistoryId}
                onSelectHistory={(id) => {
                  setSidebarOpen(false);
                  loadMessages(id);
                }}
                onNewChat={() => {
                  setSidebarOpen(false);
                  handleNewChat();
                }}
                onDeleteHistory={(id) => {
                  handleDeleteHistory(id);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Main Chat Area - 精确背景色 */}
      <main className="flex-1 flex flex-col md:ml-64 bg-[#FAFAFA]">
        {/* Header - 精确尺寸：16px padding，精确边框色 */}
        <header className="border-b border-[#F5F5F5] bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {domain && <h1 className="text-lg font-semibold text-[#212121] leading-[24px]">{domain.title}</h1>}
            {domain?.targetModel && <ModelBadge modelName={domain.targetModel} />}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <ChatMessages
            messages={messages}
            isStreaming={isStreaming}
            streamingStage={streamingStage}
            isLoading={loadingMessages}
            suggestedPrompts={domain?.suggestedPrompts || []}
            onSelectPrompt={(prompt) => {
              // 选择推荐提示词后，自动填入输入框并发送
              handleSendMessage(prompt);
            }}
            greetingMessage={domain?.greetingMessage || null}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Disclaimer */}
        {isMember && <Disclaimer />}

        {/* Input Area - 精确尺寸：16px padding，精确边框色 */}
        <div className="border-t border-[#F5F5F5] bg-white p-4">
          <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
        </div>
      </main>
    </div>
  );
}
