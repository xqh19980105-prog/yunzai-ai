import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserId } from '../common/decorators/user-id.decorator';
import { z } from 'zod';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalGateGuard } from '../auth/guards/legal-gate.guard';
import { WorkflowService } from '../workflow/workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../common/services/chat.service';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

// Zod schemas for validation
const fileDataSchema = z.object({
  data: z.string().min(1, '文件数据不能为空'), // base64 encoded file
  mimeType: z.string().min(1, 'MIME类型不能为空'), // e.g., "image/jpeg", "image/png", "application/pdf", "text/plain"
  filename: z.string().optional(), // Original filename
});

const chatRequestSchema = z.object({
  domainId: z.string().uuid('域ID必须是有效的UUID格式'),
  message: z.string(), // Can be empty if images/files are provided
  images: z.array(fileDataSchema).optional(), // Keep name as 'images' for backward compatibility, but now supports all file types
}).refine(
  (data: { message: string; images?: FileDataDto[] }) => {
    // At least one of message or images must be provided
    const hasMessage = data.message && data.message.trim().length > 0;
    const hasImages = data.images && data.images.length > 0;
    return hasMessage || hasImages;
  },
  {
    message: '消息内容或文件至少需要提供一个',
    path: ['message'], // Attach error to message field
  }
);

type FileDataDto = z.infer<typeof fileDataSchema>;
type ChatRequestDto = z.infer<typeof chatRequestSchema>;

@ApiTags('聊天 (Chat)')
@ApiBearerAuth('JWT-auth')
@Controller('api/chat')
@UseGuards(JwtAuthGuard) // Only JWT auth required at controller level
export class ChatController {
  constructor(
    private workflowService: WorkflowService,
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  @Post()
  @UseGuards(LegalGateGuard) // Legal Gate: Block access if not member or not signed (only for sending messages)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送聊天消息', description: '执行工作流并返回AI回复，需要JWT认证、会员权限和法律声明确认。支持多对话窗口并发执行。' })
  @ApiResponse({ status: 200, description: '消息发送成功，返回AI回复' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '非会员用户，需要购买会员或使用激活码' })
  @ApiResponse({ status: 403, description: '未完成法律声明确认' })
  @ApiResponse({ status: 403, description: '请求包含敏感内容' })
  /**
   * ⚡ CONCURRENCY: This endpoint supports concurrent execution.
   * Multiple chat requests from different conversation windows can be processed simultaneously.
   * Each request is independent and uses its own workflow execution context.
   */
  async chat(@UserId() userId: string, @Body(createZodPipe(chatRequestSchema)) dto: ChatRequestDto) {
    // ✅ 验证已由ValidationPipe自动完成，无需手动验证

    // Execute workflow
    const result = await this.workflowService.executeWorkflow(
      userId,
      dto.domainId,
      dto.message || '',
      dto.images,
    );

    // ✅ 【P0-1修复】使用事务保存聊天历史，确保数据一致性
    // 如果AI回复保存失败，用户消息也会回滚，避免"有问无答"的数据异常
    await this.chatService.saveChatMessages(
      userId,
      dto.domainId,
      dto.message || '',
      result, // executeWorkflow返回的是string，不是对象
    );

    return {
      success: true,
      data: {
        message: result,
      },
    };
  }

  /**
   * DELETE /api/chat/history/:historyId
   * Delete a conversation (all messages in the conversation)
   * historyId is the first user message ID of the conversation
   * IMPORTANT: This route must be defined BEFORE @Get('history') to avoid route conflicts
   */
  @Delete('history/:historyId')
  @ApiOperation({ summary: '删除对话', description: '删除指定会话的所有消息' })
  @ApiParam({ name: 'historyId', description: '会话ID（第一条用户消息的ID）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '会话不存在或无权限' })
  async deleteConversation(@UserId() userId: string, @Param('historyId') historyId: string) {
    // ✅ 使用ChatService统一处理删除逻辑
    const result = await this.chatService.deleteConversation(userId, historyId);

    return {
      success: true,
      message: '对话已删除',
      deletedCount: result.deletedCount,
    };
  }

  /**
   * GET /api/chat/history
   * Get chat history list for a domain
   * Returns unique conversations: each conversation is identified by the first user message
   * Only returns conversations that have at least one message (user requirement: no message = no conversation)
   */
  @Get('history')
  @ApiOperation({ summary: '获取聊天历史列表', description: '获取用户的对话历史列表，只有发送了消息的会话才会显示' })
  @ApiQuery({ name: 'domainId', required: false, description: 'AI域ID，可选' })
  @ApiResponse({ status: 200, description: '返回对话历史列表' })
  async getChatHistory(@UserId() userId: string, @Query('domainId') domainId?: string) {

    const where: { userId: string; role: string; domainId?: string } = { userId, role: 'user' }; // Only get user messages to identify conversations
    if (domainId) {
      where.domainId = domainId;
    }

    // Get all user messages (first message of each conversation)
    const userMessages = await this.prisma.chatHistory.findMany({
      where,
      select: {
        id: true,
        domainId: true,
        content: true,
        createdAt: true,
        domain: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group messages by domainId and find conversation boundaries (30 min gap = new conversation)
    const conversations: Array<{
      id: string;
      domainId: string | null;
      title: string;
      updatedAt: Date;
      firstMessageId: string;
    }> = [];

    // Group by domainId
    const domainGroups = new Map<string, typeof userMessages>();
    for (const msg of userMessages) {
      const key = msg.domainId || 'default';
      if (!domainGroups.has(key)) {
        domainGroups.set(key, []);
      }
      domainGroups.get(key)!.push(msg);
    }

    // For each domain, find conversation boundaries (30 min gap between messages = new conversation)
    const CONVERSATION_GAP_MS = 30 * 60 * 1000; // 30 minutes
    
    for (const [domainKey, messages] of domainGroups.entries()) {
      // Sort by time descending (most recent first)
      messages.sort((a: { createdAt: Date }, b: { createdAt: Date }) => b.createdAt.getTime() - a.createdAt.getTime());
      
      let lastMessageTime: Date | null = null;
      
      for (const msg of messages) {
        const msgTime = msg.createdAt.getTime();
        
        // If this is the first message, or gap from last message is > 30 min, it's a new conversation
        if (!lastMessageTime || (lastMessageTime.getTime() - msgTime) > CONVERSATION_GAP_MS) {
          conversations.push({
            id: msg.id, // Use first user message ID as conversation ID
            domainId: msg.domainId,
            title: msg.domain?.title || '未命名对话',
            updatedAt: msg.createdAt,
            firstMessageId: msg.id,
          });
        }
        
        lastMessageTime = msg.createdAt;
      }
    }

    // Sort by updatedAt descending and limit to 50
    return (conversations || [])
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 50)
      .map((conv) => ({
        id: conv.firstMessageId, // Return first message ID as conversation identifier
        title: conv.title || '未命名对话',
        updatedAt: conv.updatedAt,
      }));
  }

  /**
   * GET /api/chat/messages
   * Get messages for a specific conversation (by history id or domainId)
   * If historyId is provided, it's the first user message ID of the conversation
   */
  @Get('messages')
  async getChatMessages(
    @UserId() userId: string,
    @Query('domainId') domainId?: string,
    @Query('historyId') historyId?: string,
  ) {

    const where: { userId: string; domainId?: string } = { userId };
    
    if (historyId) {
      // historyId is the first user message ID of the conversation
      const firstMessage = await this.prisma.chatHistory.findUnique({
        where: { id: historyId },
      });

      if (!firstMessage || firstMessage.userId !== userId) {
        throw new NotFoundException('历史记录不存在或无权限');
      }

      // Get all messages in the same conversation (same domainId, within 30 min window)
      where.domainId = firstMessage.domainId || undefined;
      const firstMessageTime = firstMessage.createdAt.getTime();
      const CONVERSATION_GAP_MS = 30 * 60 * 1000; // 30 minutes
      const conversationEndTime = new Date(firstMessageTime + CONVERSATION_GAP_MS * 2); // 最多查找60分钟内的消息
      
      // 优化：只查询可能属于这个会话的消息（从第一条消息时间开始，最多60分钟）
      const allDomainMessages = await this.prisma.chatHistory.findMany({
        where: {
          userId,
          domainId: firstMessage.domainId,
          createdAt: {
            gte: new Date(firstMessageTime), // 从第一条消息时间开始
            lte: conversationEndTime, // 最多到60分钟后
          },
        },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        // 移除 take 限制，因为我们已经通过时间范围限制了查询
      });

      // Filter messages that belong to this conversation (within 30 min window from first message)
      const conversationMessages = [];
      let lastMessageTime = firstMessageTime;
      
      for (const msg of (allDomainMessages || [])) {
        const msgTime = msg.createdAt.getTime();
        
        // If message is before first message, skip (虽然查询已经过滤，但保留检查以确保安全)
        if (msgTime < firstMessageTime) continue;
        
        // If gap from last message is > 30 min, stop (new conversation started)
        if (msgTime - lastMessageTime > CONVERSATION_GAP_MS) break;
        
        conversationMessages.push(msg);
        lastMessageTime = msgTime;
      }

      return conversationMessages || [];
    } else if (domainId) {
      // If only domainId provided, get all messages for this domain (latest conversation)
      where.domainId = domainId;

      const messages = await this.prisma.chatHistory.findMany({
        where,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 500, // Limit to prevent loading too many messages
      });

      // If there are messages, return only the latest conversation (last 30 min window)
      if (messages && messages.length > 0) {
        const CONVERSATION_GAP_MS = 30 * 60 * 1000;
        const latestMessage = messages[messages.length - 1];
        const latestTime = latestMessage.createdAt.getTime();
        
        // Get messages from the latest conversation (within 30 min window)
        const latestConversation = [];
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          const msgTime = msg.createdAt.getTime();
          
          if (latestTime - msgTime > CONVERSATION_GAP_MS) break;
          latestConversation.unshift(msg);
        }
        
        return latestConversation || [];
      }
      
      return messages || [];
    } else {
      throw new BadRequestException('必须提供 domainId 或 historyId');
    }
  }
}
