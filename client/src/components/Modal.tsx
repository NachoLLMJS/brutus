import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Modal({ open, onClose, children, title, className }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    // foco to abrir
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Dialog'}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onClose?.()}
        aria-hidden
      />
      <div
        ref={ref}
        tabIndex={-1}
        className={clsx(
          'relative panel max-w-lg w-full p-6 animate-rise-in focus:outline-none',
          className,
        )}
      >
        {title && (
          <h2 className="font-serif text-2xl text-gold mb-4 tracking-wider">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
