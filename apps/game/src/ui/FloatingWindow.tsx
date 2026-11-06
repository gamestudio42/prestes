import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Grip, Minimize, Restore } from './icons';
import { clampWindow, type Size, type WindowState } from './windowLayout';

export interface FloatingWindowProps {
  id: string;
  title: string;
  state: WindowState | undefined;
  /** Where the window goes the first time, from its measured size. */
  place: (size: Size, view: Size) => { x: number; y: number };
  onChange: (next: WindowState) => void;
  minimizeLabel: string;
  restoreLabel: string;
  moveLabel: string;
  testId?: string;
  className?: string;
  children: ReactNode;
}

const viewSize = (): Size => ({ w: window.innerWidth, h: window.innerHeight });

/**
 * A pixel window over the map: drag it by its title bar (or move it with the
 * arrow keys while the title bar has focus) and minimize it to that bar.
 */
export function FloatingWindow({
  id,
  title,
  state,
  place,
  onChange,
  minimizeLabel,
  restoreLabel,
  moveLabel,
  testId,
  className,
  children,
}: FloatingWindowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const latest = useRef(state);
  latest.current = state;

  const size = (): Size => {
    const rect = rootRef.current?.getBoundingClientRect();
    return { w: rect?.width ?? 0, h: rect?.height ?? 0 };
  };

  // First placement on the next frame, once the window has its final size.
  useEffect(() => {
    if (state || !rootRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (!latest.current && rootRef.current) {
        onChange({ ...place(size(), viewSize()), minimized: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  });

  // Keep it in view when the browser window changes size or it is restored.
  useEffect(() => {
    const keepInside = () => {
      const current = latest.current;
      if (!current) return;
      const at = clampWindow(current, size(), viewSize());
      if (at.x !== current.x || at.y !== current.y) {
        onChange({ ...current, ...at });
      }
    };
    keepInside();
    window.addEventListener('resize', keepInside);
    // ...and when its content grows: the 3v3's section cards arrive after the
    // first placement and would push the window past the bottom of the view.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(keepInside);
    if (rootRef.current) observer?.observe(rootRef.current);
    return () => {
      window.removeEventListener('resize', keepInside);
      observer?.disconnect();
    };
  }, [state?.minimized]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!state || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: state.x, y: state.y };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId || !state) return;
    const at = clampWindow(
      { x: active.x + event.clientX - active.startX, y: active.y + event.clientY - active.startY },
      size(),
      viewSize(),
    );
    if (at.x !== state.x || at.y !== state.y) onChange({ ...state, ...at });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!state) return;
    const step = event.shiftKey ? 32 : 8;
    const delta =
      event.key === 'ArrowLeft' ? [-step, 0] :
      event.key === 'ArrowRight' ? [step, 0] :
      event.key === 'ArrowUp' ? [0, -step] :
      event.key === 'ArrowDown' ? [0, step] : null;
    if (!delta) return;
    event.preventDefault();
    onChange({ ...state, ...clampWindow({ x: state.x + delta[0]!, y: state.y + delta[1]! }, size(), viewSize()) });
  };

  const minimized = state?.minimized ?? false;
  return (
    <div
      ref={rootRef}
      className={`floating-window ${minimized ? 'minimized' : ''} ${className ?? ''}`}
      data-testid={testId ?? `window-${id}`}
      data-window={id}
      data-minimized={minimized}
      role="region"
      aria-label={title}
      style={{
        left: state?.x ?? 0,
        top: state?.y ?? 0,
        visibility: state ? 'visible' : 'hidden',
      }}
    >
      <div
        className="floating-window-title"
        data-testid={`window-${id}-title`}
        tabIndex={0}
        aria-label={`${title} · ${moveLabel}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <Grip size={16} />
        <span className="floating-window-name">{title}</span>
        <button
          type="button"
          className="floating-window-toggle"
          data-testid={`window-${id}-toggle`}
          aria-label={minimized ? restoreLabel : minimizeLabel}
          aria-expanded={!minimized}
          onClick={() => state && onChange({ ...state, minimized: !minimized })}
        >
          {minimized ? <Restore size={16} /> : <Minimize size={16} />}
        </button>
      </div>
      {!minimized ? <div className="floating-window-body">{children}</div> : null}
    </div>
  );
}
