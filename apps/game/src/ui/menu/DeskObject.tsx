import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Close } from '../icons';
import {
  clampDesk,
  type DeskObjectId,
  type DeskPosition,
  type DeskSize,
} from './deskLayout';

export interface DeskObjectProps {
  id: DeskObjectId;
  name: string;
  open: boolean;
  /** False for objects that do not open (the map fan). */
  toggleable?: boolean;
  position?: DeskPosition;
  zIndex: number;
  onMove: (id: DeskObjectId, position: DeskPosition) => void;
  onToggle: (id: DeskObjectId) => void;
  onFront: (id: DeskObjectId) => void;
  onMeasure: (id: DeskObjectId, size: DeskSize) => void;
  openLabel: string;
  closeLabel: string;
  moveLabel: string;
  testId?: string;
  className?: string;
  children: ReactNode;
}

const view = (): DeskSize => ({ w: window.innerWidth, h: window.innerHeight });

/**
 * One desk object: the art itself is the control and the drag surface. There is
 * no title bar; a visually hidden handle keeps keyboard movement and open/close
 * available, and a small brass clasp closes an open object. Text selection is
 * off while an object is being dragged.
 */
export function DeskObject({
  id,
  name,
  open,
  toggleable = true,
  position,
  zIndex,
  onMove,
  onToggle,
  onFront,
  onMeasure,
  openLabel,
  closeLabel,
  moveLabel,
  testId,
  className,
  children,
}: DeskObjectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    captured: boolean;
  } | null>(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const latest = useRef(position);
  latest.current = position;
  // An open book, compass, pile or gramophone is a centred overlay: it is not
  // dragged, and its open size never feeds the desk layout, so closing it puts
  // the object back exactly where the player left it.
  const overlay = open && toggleable;
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const report = () => {
      if (overlayRef.current) return;
      onMeasure(id, { w: root.offsetWidth, h: root.offsetHeight });
    };
    report();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(report);
    observer?.observe(root);
    window.addEventListener('resize', report);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [id, onMeasure, overlay]);

  const size = (): DeskSize => ({
    w: rootRef.current?.offsetWidth ?? 0,
    h: rootRef.current?.offsetHeight ?? 0,
  });

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = latest.current;
    if (event.button !== 0 || !current || overlayRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-drag]')) return;
    if (target.closest('button, a, select, input, textarea')) return;
    // No title bar: the object is dragged from its art or from its open frame.
    // The page text is not selectable, so a drag never turns into a selection.
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: current.x,
      y: current.y,
      captured: false,
    };
    moved.current = false;
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    const current = latest.current;
    if (!active || active.pointerId !== event.pointerId || !current) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.captured && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      active.captured = true;
      moved.current = true;
      setDragging(true);
      window.getSelection()?.removeAllRanges();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!active.captured) return;
    const next = clampDesk({ x: active.x + dx, y: active.y + dy }, size(), view());
    if (next.x !== current.x || next.y !== current.y) onMove(id, next);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    if (active.captured) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    setDragging(false);
    // Keep the moved flag through the click that follows the pointerup.
    window.setTimeout(() => {
      moved.current = false;
    }, 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (toggleable) onToggle(id);
      return;
    }
    if (event.key === 'Escape' && open && toggleable) {
      event.preventDefault();
      onToggle(id);
      return;
    }
    if (overlay) return;
    // Three and twelve art pixels on the 2 px grid.
    const step = event.shiftKey ? 24 : 6;
    const delta =
      event.key === 'ArrowLeft'
        ? [-step, 0]
        : event.key === 'ArrowRight'
          ? [step, 0]
          : event.key === 'ArrowUp'
            ? [0, -step]
            : event.key === 'ArrowDown'
              ? [0, step]
              : null;
    const current = latest.current;
    if (!delta || !current) return;
    event.preventDefault();
    onMove(
      id,
      clampDesk({ x: current.x + delta[0]!, y: current.y + delta[1]! }, size(), view()),
    );
  };

  const toggle = () => {
    if (moved.current) return;
    if (toggleable) onToggle(id);
  };

  const actionLabel = toggleable ? (open ? closeLabel : openLabel) : moveLabel;

  return (
    <div
      ref={rootRef}
      className={`desk-object ${open ? 'is-open' : 'is-closed'}${overlay ? ' is-overlay' : ''} ${className ?? ''}`.trim()}
      style={
        overlay
          ? { zIndex }
          : {
              left: position?.x ?? 0,
              top: position?.y ?? 0,
              zIndex,
              visibility: position ? 'visible' : 'hidden',
            }
      }
      data-desk-object={id}
      data-open={open}
      data-dragging={dragging}
      data-testid={testId}
      onClickCapture={(event) => {
        if (!moved.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onFocusCapture={() => onFront(id)}
      onPointerDownCapture={() => onFront(id)}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="visually-hidden desk-object-handle"
        role="button"
        tabIndex={0}
        aria-label={`${name} — ${actionLabel}`}
        aria-expanded={toggleable ? open : undefined}
        title={`${name} · ${moveLabel}`}
        onKeyDown={onKeyDown}
        onClick={() => {
          if (toggleable) onToggle(id);
        }}
      />
      {toggleable && open ? (
        <button
          type="button"
          className="desk-object-close"
          onClick={() => onToggle(id)}
          aria-label={`${name}: ${closeLabel}`}
          title={closeLabel}
        >
          <Close size={16} aria-hidden="true" />
        </button>
      ) : null}
      <div
        className="desk-object-content"
        onKeyDown={(event) => {
          // Escape closes an open object from anywhere inside it, such as an
          // open book that holds the focus, and gives the focus back.
          if (event.key !== 'Escape' || !open || !toggleable) return;
          event.preventDefault();
          onToggle(id);
          rootRef.current?.querySelector<HTMLElement>('.desk-object-handle')?.focus();
        }}
      >
        {children}
        {toggleable && !open ? (
          <div className="desk-object-cover-hit" aria-hidden="true" onClick={toggle} />
        ) : null}
      </div>
    </div>
  );
}
