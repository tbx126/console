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
          <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-800/20 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Sparkles className="w-10 h-10 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            AI 助手
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8">
            您的个人数据助手。使用自然语言记录支出、航班、投资等信息。
          </p>

          {/* Quick suggestions */}
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span>记录支出</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer">
              <MessageSquare className="w-4 h-4 text-violet-500" />
              <span>记录航班</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span>跟踪投资</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer">
              <Image className="w-4 h-4 text-violet-500" />
              <span>分析收据</span>
            </div>
          </div>
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
