import { useState, memo, lazy, Suspense } from "react";
import { cn } from "../../lib/utils";
import { Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// 懒加载 Mermaid 组件
const MermaidDiagram = lazy(() => import("./MermaidDiagram").then(m => ({ default: m.MermaidDiagram })));

interface CodeBlockProps {
  language: string;
  children: React.ReactNode;
  isDark: boolean;
  isStreaming?: boolean;
}

// 提取纯文本内容
function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node && (node as any).props?.children) {
    return extractText((node as any).props.children);
  }
  return '';
}

export const CodeBlock = memo(function CodeBlock({ language, children, isDark, isStreaming }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const code = extractText(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mermaid 图表特殊处理
  if (language === 'mermaid') {
    if (isStreaming) {
      return (
        <div className={cn(
          "my-4 p-5 rounded-xl",
          isDark ? "bg-slate-800/50" : "bg-slate-50"
        )}>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">正在生成图表...</span>
          </div>
          <pre className="mt-3 text-xs text-slate-400 font-mono overflow-hidden opacity-60">{code.slice(0, 80)}...</pre>
        </div>
      );
    }
    return (
      <Suspense fallback={
        <div className={cn("my-4 p-5 rounded-xl", isDark ? "bg-slate-800/50" : "bg-slate-50")}>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span>加载图表组件...</span>
          </div>
        </div>
      }>
        <MermaidDiagram code={code} isDark={isDark} />
      </Suspense>
    );
  }

  return (
    <div className={cn(
      "relative group my-4 rounded-xl overflow-hidden border transition-all hover:shadow-lg",
      isDark
        ? "bg-slate-900 border-slate-700/50 hover:border-slate-600"
        : "bg-white border-slate-200 hover:border-slate-300"
    )}>
      {/* 语言标签和复制按钮 */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 border-b",
        isDark
          ? "bg-slate-800/80 border-slate-700/50"
          : "bg-slate-50 border-slate-200"
      )}>
        <span className={cn(
          "text-xs font-medium uppercase tracking-wider",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
            copied
              ? "bg-green-500/20 text-green-500"
              : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language}
        PreTag="div"
        className="!rounded-t-none !rounded-b-xl text-sm !my-0 !bg-transparent"
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: '1.25rem'
        }}
        codeTagProps={{
          style: { background: 'transparent' }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});
