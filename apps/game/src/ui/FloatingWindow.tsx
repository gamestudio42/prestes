import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Grip, Minimize, pixelIcon, Restore } from './icons';
import {
  clampSize,
  clampWindow,
  isVertical,
  toggleVertical,
  type ColumnEdge,
  type Size,
  type WindowState,
} from './windowLayout';

const ColumnIcon = pixelIcon('formation-column');
const RowIcon = pixelIcon('formation-line');

/** Labels for a window the player may resize and turn into a column. */
export interface ResizableLabels {
  resize: string;
  vertical: string;
  horizontal: string;
  /** Where the column goes; by default it keeps the window's left edge. */
  columnEdge?: ColumnEdge;
}

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
  /** Given, the window gets a resize grip and a column/row toggle; its size is kept in its state. */
  resizable?: ResizableLabels;
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
  resizable,
  children,
}: FloatingWindowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const resize = useRef<{ pointerId: number; startX: number; startY: number; w: number; h: number } | null>(null);
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

  const resizeTo = (next: Size) => {
    if (!state) return;
    const sized = clampSize(next, state, viewSize());
    if (sized.w !== state.w || sized.h !== state.h) onChange({ ...state, ...sized });
  };
  const onResizeDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!state || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = size();
    resize.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      w: state.w ?? current.w,
      h: state.h ?? current.h,
    };
  };
  const onResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = resize.current;
    if (!active || active.pointerId !== event.pointerId) return;
    resizeTo({ w: active.w + event.clientX - active.startX, h: active.h + event.clientY - active.startY });
  };
  const endResize = (event: PointerEvent<HTMLDivElement>) => {
    if (resize.current?.pointerId === event.pointerId) {
      resize.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };
  const onResizeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!state) return;
    const step = event.shiftKey ? 32 : 8;
    const delta =
      event.key === 'ArrowLeft' ? [-step, 0] :
      event.key === 'ArrowRight' ? [step, 0] :
      event.key === 'ArrowUp' ? [0, -step] :
      event.key === 'ArrowDown' ? [0, step] : null;
    if (!delta) return;
    event.preventDefault();
    const current = size();
    resizeTo({ w: (state.w ?? current.w) + delta[0]!, h: (state.h ?? current.h) + delta[1]! });
  };

  const minimized = state?.minimized ?? false;
  const sized = resizable !== undefined && state?.w !== undefined && state.h !== undefined;
  const vertical = resizable !== undefined && isVertical(state);
  return (
    <div
      ref={rootRef}
      className={`floating-window ${minimized ? 'minimized' : ''} ${sized ? 'sized' : ''} ${vertical ? 'vertical' : ''} ${className ?? ''}`}
      data-testid={testId ?? `window-${id}`}
      data-window={id}
      data-minimized={minimized}
      data-orientation={resizable ? (vertical ? 'vertical' : 'horizontal') : undefined}
      role="region"
      aria-label={title}
      style={{
        left: state?.x ?? 0,
        top: state?.y ?? 0,
        width: sized ? state?.w : undefined,
        height: sized && !minimized ? state?.h : undefined,
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
        {resizable ? (
          <button
            type="button"
            className="floating-window-toggle"
            data-testid={`window-${id}-orientation`}
            aria-label={vertical ? resizable.horizontal : resizable.vertical}
            title={vertical ? resizable.horizontal : resizable.vertical}
            aria-pressed={vertical}
            onClick={() => state && onChange(toggleVertical(state, viewSize(), resizable.columnEdge))}
          >
            {vertical ? <RowIcon size={16} /> : <ColumnIcon size={16} />}
          </button>
        ) : null}
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
      {resizable && !minimized ? (
        <div
          className="floating-window-resize"
          data-testid={`window-${id}-resize`}
          role="separator"
          tabIndex={0}
          aria-label={resizable.resize}
          title={resizable.resize}
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onKeyDown={onResizeKey}
        />
      ) : null}
    </div>
  );
}
