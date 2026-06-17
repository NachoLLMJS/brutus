import { type ReactNode } from 'react';
import clsx from 'clsx';

interface PaperPanelProps {
  children: ReactNode;
  title?: ReactNode;
  className?: string;
  variant?: 'paper' | 'cell' | 'titled';
  /** Override del background para variantes especiales (ej: inventory). */
  backgroundImage?: string;
  /** Padding interior. Default 16. */
  padding?: number;
}

/**
 * Panel con borde de pergamino estilo MyBrute. Usar en lugar de los `panel`
 * Tailwind oscuros que el código tenía antes.
 *
 * Variantes:
 *   - 'paper'  → fondo crema (default)
 *   - 'cell'   → fondo más amarillo, borde más marcado (panel principal del Profile)
 *   - 'titled' → con cinta de título arriba
 */
export function PaperPanel({
  children,
  title,
  className,
  variant = 'paper',
  backgroundImage,
  padding = 16,
}: PaperPanelProps) {
  const baseClass =
    variant === 'cell' ? 'cell' : variant === 'titled' ? 'panel-titled' : 'panel';

  return (
    <div
      className={clsx(baseClass, 'relative anim-fade-up', className)}
      style={{
        padding,
        ...(backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundRepeat: 'repeat',
              backgroundSize: 'auto',
            }
          : {}),
      }}
    >
      {title && (
        <div
          className="text-ink-strong text-sm uppercase tracking-wider font-display mb-2 pb-1 border-b"
          style={{ borderColor: 'var(--border-shadow)' }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
