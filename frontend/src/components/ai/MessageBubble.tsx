import { useState, useEffect, memo, useMemo } from "react";
import { cn } from "../../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { User, Sparkles, ImageIcon, RotateCcw, Pencil } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { CopyMessageButton } from "./CopyButton";

// 预处理内容：处理数学公式，确保正确渲染
function preprocessMath(content: string): string {
  let result = content;

  // 1. 将反引号包裹的数学表达式转换为 $...$ (行内公式)
  // 匹配包含数学符号的反引号内容
  result = result.replace(/`([^`]+)`/g, (match, inner) => {
    // 检测是否像数学公式（包含常见数学符号或LaTeX命令）
    if (/[=+\-*/^_{}\\]|\\[a-zA-Z]+|\d+[a-zA-Z]|[a-zA-Z]\(/.test(inner)) {
      return `$${inner}$`;
    }
    return match;
  });

  // 2. \(...\) -> $...$  (行内公式)
  result = result.replace(/\\\((.+?)\\\)/gs, (_, inner) => `$${inner}$`);

  // 3. \[...\] -> $$...$$ (块级公式)
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, inner) => `\n$$${inner.trim()}$$\n`);

  return result;
}

export interface Message {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  hasImage?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isUser,
  isStreaming = false,
  onRegenerate,
  onEdit
}: MessageBubbleProps) {
  const [isDark, setIsDark] = useState(false);

  // 预处理内容，支持 LaTeX 风格语法
  const processedContent = useMemo(() => {
    return preprocessMath(message.content);
  }, [message.content]);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "flex w-full gap-3 group",
        "animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center self-start",
        isUser
          ? "bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25"
          : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800"
      )}>
        {isUser ? (
          <User className="w-4.5 h-4.5 text-white" />
        ) : (
          <Sparkles className="w-4.5 h-4.5 text-violet-500 dark:text-violet-400" />
        )}
      </div>

      {/* Message Content + Actions Container */}
      <div className={cn("flex flex-col min-w-0", isUser ? "items-end max-w-[85%]" : "items-start max-w-[75%]")}>
        {/* Message Bubble */}
        <div className={cn(
          "rounded-2xl w-full overflow-hidden",
          isUser
            ? "bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-tr-md px-5 py-3.5 shadow-lg shadow-violet-500/20"
            : cn(
                "relative bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100",
                "border border-slate-200/80 dark:border-slate-700/50",
                "rounded-tl-md px-5 py-4 pb-8",
                "shadow-sm"
              )
        )}>
        {/* Image indicator */}
        {message.hasImage && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs mb-2.5 pb-2.5 border-b",
            isUser ? "border-white/20" : "border-slate-200 dark:border-slate-700"
          )}>
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="font-medium">已附加图片</span>
          </div>
        )}

        {isUser ? (
          <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none
            prose-p:my-2.5 prose-p:leading-relaxed
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h1:text-xl prose-h1:mt-5 prose-h1:mb-3
            prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2.5
            prose-h3:text-base prose-h3:mt-3.5 prose-h3:mb-2
            prose-strong:text-slate-900 dark:prose-strong:text-white
            prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
            [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-2 [&_.katex-display]:text-center
          ">
            {isStreaming && !message.content ? (
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <div>
                <ReactMarkdown
                  remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      if (!inline && match) {
                        return <CodeBlock language={match[1]} isDark={isDark} isStreaming={isStreaming}>{children}</CodeBlock>;
                      }
                      return (
                        <code className={cn(
                          "px-1.5 py-0.5 rounded-md text-sm font-mono",
                          "bg-violet-100 dark:bg-violet-900/30",
                          "text-violet-700 dark:text-violet-300"
                        )} {...props}>
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return <p className="my-2.5 leading-[1.75] text-[15px]">{children}</p>;
                    },
                    h1: ({ children }) => <h1 className="text-xl font-bold mt-5 mb-3 text-slate-900 dark:text-white">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2.5 text-slate-900 dark:text-white">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mt-3.5 mb-2 text-slate-800 dark:text-slate-100">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-1.5 text-slate-800 dark:text-slate-200">{children}</h4>,
                    ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed text-[15px] pl-1">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className={cn(
                        "border-l-4 border-violet-400 dark:border-violet-500",
                        "pl-4 pr-4 py-3 my-4",
                        "bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-900/20 dark:to-transparent",
                        "rounded-r-xl italic",
                        "text-slate-600 dark:text-slate-300"
                      )}>
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 dark:text-violet-400 font-medium hover:underline underline-offset-2"
                      >
                        {children}
                      </a>
                    ),
                    img: ({ src, alt }) => (
                      <img
                        src={src}
                        alt={alt}
                        className="max-w-full h-auto rounded-xl my-4 shadow-md"
                        loading="lazy"
                      />
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <table className="min-w-full text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                        {children}
                      </td>
                    ),
                    hr: () => (
                      <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                    ),
                    input: ({ type, checked }: any) => {
                      if (type === "checkbox") {
                        return (
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="mr-2 w-4 h-4 rounded accent-violet-600 cursor-default"
                          />
                        );
                      }
                      return null;
                    },
                    del: ({ children }) => <del className="text-slate-400 dark:text-slate-500">{children}</del>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    sup: ({ children }) => <sup className="text-xs">{children}</sup>,
                    sub: ({ children }) => <sub className="text-xs">{children}</sub>,
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-0.5 h-5 bg-violet-500 animate-pulse ml-0.5 align-middle rounded-full" />
                )}
              </div>
            )}
          </div>
        )}

        {/* AI 消息：复制按钮在气泡内部右下角 */}
        {!isUser && !isStreaming && (
          <div className="absolute bottom-2 right-3 transition-opacity opacity-0 group-hover:opacity-100">
            <CopyMessageButton content={message.content} isUser={false} />
          </div>
        )}
        </div>

        {/* 用户消息：复制和编辑按钮在气泡下方 */}
        {isUser && !isStreaming && (
          <div className="flex items-center gap-1 mt-1.5 transition-opacity opacity-0 group-hover:opacity-100">
            <CopyMessageButton content={message.content} isUser={false} />
            {onEdit && (
              <button
                onClick={() => onEdit(message.content)}
                className="p-1.5 rounded-md transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                title="编辑消息"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* AI 消息：重新生成按钮在气泡下方 */}
        {!isUser && !isStreaming && onRegenerate && (
          <div className="flex items-center gap-1 mt-1.5 transition-opacity opacity-0 group-hover:opacity-100">
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded-md transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="重新生成"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
