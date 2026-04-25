import clsx from 'clsx';
import { useToastStore } from '@/store/useToastStore';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={clsx(
            'pointer-events-auto panel px-4 py-2 text-sm animate-rise-in text-left max-w-xs',
            t.kind === 'error' && 'border-blood shadow-blood',
            t.kind === 'success' && 'border-hp-full',
            t.kind === 'info' && 'border-rune',
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
