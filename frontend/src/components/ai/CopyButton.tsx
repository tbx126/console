import { useState, memo } from "react";
import { cn } from "../../lib/utils";
import { Copy, Check } from "lucide-react";

interface CopyMessageButtonProps {
  content: string;
  isUser: boolean;
}

export const CopyMessageButton = memo(function CopyMessageButton({ content, isUser }: CopyMessageButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        isUser
          ? "text-white/60 hover:text-white hover:bg-white/10"
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
      )}
      title="复制消息"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
});
