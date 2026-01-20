import { formatDistanceToNow, format, isToday, isYesterday, isThisYear } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';

/**
 * 格式化对话时间显示（类似豆包）
 * - 今天：显示相对时间（如"5分钟前"）
 * - 昨天：显示"昨天"
 * - 今年：显示月日（如"1月20日"）
 * - 更早：显示年月日（如"2025年1月20日"）
 */
export function formatConversationTime(date: Date): string {
  if (isToday(date)) {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: zhCN,
    });
  }
  
  if (isYesterday(date)) {
    return '昨天';
  }
  
  if (isThisYear(date)) {
    return format(date, 'M月d日', { locale: zhCN });
  }
  
  return format(date, 'yyyy年M月d日', { locale: zhCN });
}
