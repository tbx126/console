import { useEffect, useRef, useMemo, memo } from 'react';
import { MessageBubble, Message } from './MessageBubble';
import { Sparkles, MessageSquare, Image } from 'lucide-react';

// 格式化日期分组标签
function formatDateGroup(date: string): string {
  const now = new Date();
  const messageDate = new Date(date);
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const diffDays = Math.floor((nowDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

  const timeStr = messageDate.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (diffDays === 0) {
    return `今天 ${timeStr}`;
  } else if (diffDays === 1) {
    return `昨天 ${timeStr}`;
  } else if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${weekdays[messageDate.getDay()]} ${timeStr}`;
  } else {
    return messageDate.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// 日期分隔符组件
function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-6">
      <div className="flex items-center gap-3">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600" />
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
          {formatDateGroup(date)}
        </span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600" />
      </div>
    </div>
  );
}

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (content: string) => void;
}

type GroupedItem =
  | { type: 'time'; date: string; key: string }
  | { type: 'message'; message: Message; index: number; key: string };

export const ChatInterface = memo(function ChatInterface({
  messages,
  isLoading,
  onRegenerate,
  onEditMessage
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 按时间间隔分组消息（间隔超过5分钟显示时间）
  const groupedMessages = useMemo<GroupedItem[]>(() => {
    if (messages.length === 0) return [];

    const groups: GroupedItem[] = [];
    let lastTimestamp: number | null = null;
    const TIME_GAP = 5 * 60 * 1000; // 5分钟

    messages.forEach((msg, index) => {
      const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : null;

      if (msgTime && (!lastTimestamp || msgTime - lastTimestamp > TIME_GAP)) {
        groups.push({ type: 'time', date: msg.timestamp!, key: `time-${index}` });
      }

      groups.push({ type: 'message', message: msg, index, key: `msg-${index}` });

      if (msgTime) {
        lastTimestamp = msgTime;
      }
    });

    return groups;
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-accent">
            <Sparkles className="size-8 text-accent-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            AI 助手
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            你的个人数据助手：自然语言提问、分析图片，或直接说出航班信息来记录。
          </p>

          {/* 示例（纯文本提示，不是按钮） */}
          <ul className="flex max-w-md flex-col gap-2 text-left text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MessageSquare className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
              “昨天坐 SQ802 从新加坡飞北京，经济舱”
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
              “帮我总结今年的飞行情况”
            </li>
            <li className="flex items-center gap-2">
              <Image className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
              “上传一张登机牌，提取航班信息”
            </li>
          </ul>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {groupedMessages.map((item) => {
            if (item.type === 'time') {
              return <DateDivider key={item.key} date={item.date} />;
            }

            const { message, index } = item;
            const isLastAssistant = index === messages.length - 1 && message.role === 'assistant';

            return (
              <MessageBubble
                key={item.key}
                message={message}
                isUser={message.role === 'user'}
                isStreaming={isLoading && isLastAssistant}
                onRegenerate={isLastAssistant && !isLoading ? onRegenerate : undefined}
                onEdit={message.role === 'user' ? onEditMessage : undefined}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
});
