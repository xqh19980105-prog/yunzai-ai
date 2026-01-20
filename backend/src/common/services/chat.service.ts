import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCodes } from '../constants/error-codes';
import { Prisma } from '@prisma/client';

/**
 * ChatService
 * 统一管理聊天历史相关的业务逻辑
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly CONVERSATION_GAP_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户的聊天历史
   */
  async getChatHistory(
    userId: string,
    domainId?: string,
    limit: number = 50,
    cursor?: string,
  ) {
    const where: any = {
      userId,
    };

    if (domainId) {
      where.domainId = domainId;
    }

    if (cursor) {
      where.id = {
        lt: cursor,
      };
    }

    return this.prisma.chatHistory.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 保存用户消息到聊天历史
   */
  async saveUserMessage(
    userId: string,
    domainId: string,
    content: string,
  ) {
    return this.prisma.chatHistory.create({
      data: {
        userId,
        domainId,
        role: 'user',
        content,
      },
    });
  }

  /**
   * 保存AI回复到聊天历史
   */
  async saveAssistantMessage(
    userId: string,
    domainId: string,
    content: string,
  ) {
    return this.prisma.chatHistory.create({
      data: {
        userId,
        domainId,
        role: 'assistant',
        content,
      },
    });
  }

  /**
   * 【P0-1修复】使用事务保存用户消息和AI回复，确保数据一致性
   * 如果任何一步失败，整个事务回滚
   */
  async saveChatMessages(
    userId: string,
    domainId: string,
    userMessage: string,
    assistantMessage: string,
  ): Promise<{ userMessageId: string; assistantMessageId: string }> {
    try {
      const result = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 保存用户消息
          const userMsg = await tx.chatHistory.create({
            data: {
              userId,
              domainId,
              role: 'user',
              content: userMessage,
            },
          });

          // 保存AI回复
          const assistantMsg = await tx.chatHistory.create({
            data: {
              userId,
              domainId,
              role: 'assistant',
              content: assistantMessage,
            },
          });

          return {
            userMessageId: userMsg.id,
            assistantMessageId: assistantMsg.id,
          };
        },
        {
          timeout: 10000, // 10秒超时
          isolationLevel: 'ReadCommitted', // 使用读已提交隔离级别
        },
      );

      this.logger.log(
        `Chat messages saved successfully: userId=${userId}, domainId=${domainId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to save chat messages: userId=${userId}, domainId=${domainId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * 删除指定会话的所有消息
   * @param userId 用户ID
   * @param historyId 会话ID（第一条用户消息的ID）
   */
  async deleteConversation(userId: string, historyId: string) {
    if (!historyId || historyId.trim() === '') {
      throw new BadRequestException({
        code: ErrorCodes.CHAT_MESSAGE_INVALID,
        message: '会话ID不能为空',
      });
    }

    this.logger.log(`User ${userId} attempting to delete conversation ${historyId}`);

    // 查找第一条消息以验证所有权和获取会话信息
    const firstMessage = await this.prisma.chatHistory.findUnique({
      where: { id: historyId },
    });

    if (!firstMessage) {
      this.logger.warn(`Conversation not found: ${historyId}`);
      throw new NotFoundException({
        code: ErrorCodes.CHAT_HISTORY_NOT_FOUND,
        message: '会话不存在',
      });
    }

    if (firstMessage.userId !== userId) {
      this.logger.warn(`Permission denied: User ${userId} trying to delete conversation owned by ${firstMessage.userId}`);
      throw new NotFoundException({
        code: ErrorCodes.CHAT_HISTORY_NOT_FOUND,
        message: '无权限删除此会话',
      });
    }

    // 获取此会话中的所有消息（相同的domainId，30分钟窗口内）
    const domainId = firstMessage.domainId;
    const firstMessageTime = firstMessage.createdAt.getTime();
    const conversationEndTime = new Date(firstMessageTime + this.CONVERSATION_GAP_MS * 2); // 最多查找60分钟内的消息

    // 优化：只查询可能属于这个会话的消息（从第一条消息时间开始，最多60分钟）
    const allMessages = await this.prisma.chatHistory.findMany({
      where: {
        userId,
        domainId,
        createdAt: {
          gte: firstMessage.createdAt,
          lte: conversationEndTime,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 识别属于此会话的消息
    // 会话规则：30分钟内的连续消息属于同一会话
    const conversationMessageIds: string[] = [];
    let currentTime = firstMessageTime;

    for (const message of allMessages) {
      const messageTime = message.createdAt.getTime();
      const timeDiff = messageTime - currentTime;

      // 如果消息在30分钟窗口内，属于当前会话
      if (timeDiff <= this.CONVERSATION_GAP_MS) {
        conversationMessageIds.push(message.id);
        currentTime = messageTime;
      } else {
        // 如果超出30分钟，停止查找（消息按时间排序）
        break;
      }
    }

    if (conversationMessageIds.length === 0) {
      this.logger.warn(`No messages found in conversation: ${historyId}`);
      throw new NotFoundException({
        code: ErrorCodes.CHAT_HISTORY_NOT_FOUND,
        message: '会话不存在',
      });
    }

    // 删除会话中的所有消息
    const deleteResult = await this.prisma.chatHistory.deleteMany({
      where: {
        id: {
          in: conversationMessageIds,
        },
      },
    });

    this.logger.log(`Deleted ${deleteResult.count} messages from conversation ${historyId}`);

    return {
      deletedCount: deleteResult.count,
      messageIds: conversationMessageIds,
    };
  }

  /**
   * 获取用户的对话列表（每个domainId的第一个用户消息）
   */
  async getConversations(userId: string, domainId?: string) {
    const where: any = {
      userId,
      role: 'user',
    };

    if (domainId) {
      where.domainId = domainId;
    }

    // 获取所有用户消息，按domainId和创建时间分组
    const userMessages = await this.prisma.chatHistory.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 按domainId和时间窗口分组，获取每个会话的第一条消息
    const conversations: Map<string, any> = new Map();
    const processedMessages: Set<string> = new Set();

    for (const message of userMessages) {
      // 跳过已处理的消息
      if (processedMessages.has(message.id)) {
        continue;
      }

      const key = `${message.domainId}_${message.id}`;
      
      // 获取此会话的所有消息
      const conversationMessages = await this.getConversationMessages(message.id);
      
      // 标记所有消息为已处理
      conversationMessages.forEach((m: any) => processedMessages.add(m.id));

      // 使用第一条消息作为会话标识
      const firstMessage = conversationMessages[0] || message;
      
      conversations.set(key, {
        id: firstMessage.id,
        domainId: firstMessage.domainId,
        firstMessage: firstMessage.content.substring(0, 100), // 前100个字符作为预览
        messageCount: conversationMessages.length,
        createdAt: firstMessage.createdAt,
        updatedAt: conversationMessages[conversationMessages.length - 1]?.createdAt || firstMessage.createdAt,
      });
    }

    return Array.from(conversations.values());
  }

  /**
   * 获取指定会话的所有消息
   */
  private async getConversationMessages(firstMessageId: string) {
    const firstMessage = await this.prisma.chatHistory.findUnique({
      where: { id: firstMessageId },
    });

    if (!firstMessage) {
      return [];
    }

    const firstMessageTime = firstMessage.createdAt.getTime();
    const conversationEndTime = new Date(firstMessageTime + this.CONVERSATION_GAP_MS * 2);

    const allMessages = await this.prisma.chatHistory.findMany({
      where: {
        userId: firstMessage.userId,
        domainId: firstMessage.domainId,
        createdAt: {
          gte: firstMessage.createdAt,
          lte: conversationEndTime,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 识别属于此会话的消息
    const conversationMessages: any[] = [];
    let currentTime = firstMessageTime;

    for (const message of allMessages) {
      const messageTime = message.createdAt.getTime();
      const timeDiff = messageTime - currentTime;

      if (timeDiff <= this.CONVERSATION_GAP_MS) {
        conversationMessages.push(message);
        currentTime = messageTime;
      } else {
        break;
      }
    }

    return conversationMessages;
  }
}
