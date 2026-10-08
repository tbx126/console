import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import milestonesApi from '../../services/milestonesApi';

const CHOICES = ['🏆', '🎉', '🚀', '💰', '🌱', '✈️', '🗺️', '🌍', '🛫', '🎮', '⏱️', '💯', '⭐', '🔥', '🎯', '🏅'];

/** 已达成里程碑的 emoji；点击可更换，保存到后端配置。 */
export default function EmojiPicker({ milestone }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const choose = async (emoji) => {
    setSaving(true);
    try {
      await milestonesApi.setEmoji(milestone.id, emoji);
      setOpen(false);
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${milestone.title}，更换图标`}
        aria-expanded={open}
        className="grid size-7 place-items-center rounded-lg bg-accent text-base leading-none transition-transform hover:scale-105"
      >
        <span aria-hidden="true">{milestone.emoji}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="选择图标"
          className="absolute left-0 top-9 z-30 w-[184px] rounded-lg border border-border bg-popover p-1.5 shadow-lg"
        >
          <div className="grid grid-cols-8 gap-0.5">
            {CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={saving}
                onClick={() => choose(emoji)}
                aria-label={`使用 ${emoji}`}
                className="grid size-5.5 place-items-center rounded text-sm hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => choose(null)}
            className="mt-1 w-full rounded px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
          >
            恢复默认
          </button>
        </div>
      )}
    </span>
  );
}
