import { useState, useEffect, useRef, memo } from "react";
import { cn } from "../../lib/utils";

// 懒加载 Mermaid
let mermaidInstance: typeof import("mermaid").default | null = null;

async function getMermaid() {
  if (!mermaidInstance) {
    const mermaid = await import("mermaid");
    mermaidInstance = mermaid.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }
  return mermaidInstance;
}

interface MermaidDiagramProps {
  code: string;
  isDark: boolean;
}

export const MermaidDiagram = memo(function MermaidDiagram({ code, isDark }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      setIsLoading(true);
      try {
        const mermaid = await getMermaid();
        let cleanCode = code.trim().replace(/\r\n/g, '\n');

        const diagramType = cleanCode.split('\n')[0].trim().toLowerCase();
        const supportedTypes = ['graph', 'flowchart', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'journey', 'gantt', 'pie', 'quadrantchart', 'requirementdiagram', 'gitgraph', 'mindmap', 'timeline', 'zenuml', 'sankey', 'xychart', 'block'];

        const isSupported = supportedTypes.some(type =>
          diagramType.startsWith(type.toLowerCase()) ||
          diagramType.startsWith(type.toLowerCase().replace('diagram', ''))
        );

        if (!isSupported && !diagramType.includes('graph') && !diagramType.includes('flowchart')) {
          throw new Error(`不支持的图表类型: ${diagramType}`);
        }

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
          gantt: {
            titleTopMargin: 25,
            barHeight: 20,
            barGap: 4,
            topPadding: 50,
            leftPadding: 75,
            gridLineStartPadding: 35,
            fontSize: 11,
            sectionFontSize: 11,
            numberSectionStyles: 4,
          },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, cleanCode);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        let errorMsg = '图表渲染失败';
        if (err instanceof Error && err.message) {
          if (err.message.includes('type')) {
            errorMsg = '图表语法错误：请检查图表定义格式';
          } else if (err.message.includes('Parse error')) {
            errorMsg = '图表解析错误：语法不正确';
          } else if (err.message.includes('不支持')) {
            errorMsg = err.message;
          } else {
            errorMsg = `渲染错误: ${err.message.slice(0, 100)}`;
          }
        }
        setError(errorMsg);
        setSvg('');
      } finally {
        setIsLoading(false);
      }
    };

    if (code && code.trim()) {
      renderDiagram();
    }
  }, [code, isDark]);

  if (isLoading) {
    return (
      <div className={cn(
        "my-4 p-5 rounded-xl flex items-center gap-3",
        isDark ? "bg-slate-800/50" : "bg-slate-50"
      )}>
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500">正在渲染图表...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "my-4 rounded-xl overflow-hidden border transition-all",
        isDark ? "border-amber-700/50 bg-amber-900/10" : "border-amber-200 bg-amber-50"
      )}>
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          isDark ? "border-amber-700/50 bg-amber-900/20" : "border-amber-200 bg-amber-100/50"
        )}>
          <span className={cn(
            "text-xs font-medium",
            isDark ? "text-amber-400" : "text-amber-700"
          )}>Mermaid 图表 (渲染失败)</span>
          <button
            onClick={() => setShowCode(!showCode)}
            className={cn(
              "text-xs font-medium transition-colors",
              isDark ? "text-amber-400 hover:text-amber-200" : "text-amber-600 hover:text-amber-800"
            )}
          >
            {showCode ? '隐藏代码' : '查看代码'}
          </button>
        </div>
        {showCode && (
          <pre className={cn(
            "p-4 text-sm font-mono overflow-x-auto",
            isDark ? "text-amber-300/80" : "text-amber-800"
          )}>
            {code}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "my-4 p-6 rounded-xl overflow-x-auto transition-all text-center",
        isDark ? "bg-slate-800/50" : "bg-gradient-to-br from-slate-50 to-slate-100/50",
        "[&>svg]:inline-block [&>svg]:max-w-full"
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.code === nextProps.code && prevProps.isDark === nextProps.isDark;
});
