import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  title: string;
  description?: string;
  descriptionDelay?: number;
  children: ReactElement<{ 'aria-describedby'?: string }>;
}

interface TooltipPosition {
  left: number;
  top: number;
  above: boolean;
}

export function Tooltip({
  title,
  description,
  descriptionDelay = 5000,
  children,
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const descriptionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    return () => {
      if (descriptionTimer.current !== null) {
        clearTimeout(descriptionTimer.current);
      }
    };
  }, []);

  const show = (target: HTMLElement): void => {
    const rect = target.getBoundingClientRect();
    const width = 240;
    const margin = 10;
    const above = rect.top > 96;
    setPosition({
      left: Math.max(margin, Math.min(window.innerWidth - width - margin, rect.left + rect.width / 2 - width / 2)),
      top: above ? rect.top - 8 : rect.bottom + 8,
      above,
    });
    setShowDescription(false);
    if (descriptionTimer.current !== null) {
      clearTimeout(descriptionTimer.current);
    }
    if (description) {
      descriptionTimer.current = setTimeout(() => {
        setShowDescription(true);
      }, descriptionDelay);
    }
  };

  const hide = (): void => {
    if (descriptionTimer.current !== null) {
      clearTimeout(descriptionTimer.current);
      descriptionTimer.current = null;
    }
    setShowDescription(false);
    setPosition(null);
  };

  const onMouseEnter = (event: MouseEvent<HTMLSpanElement>): void => {
    show((event.target as HTMLElement).closest('button, [role="button"]') ?? event.currentTarget);
  };
  const onFocus = (event: FocusEvent<HTMLSpanElement>): void => {
    show(event.currentTarget);
  };

  return (
    <span
      ref={anchorRef}
      className="tooltip-anchor"
      onMouseEnter={onMouseEnter}
      onMouseLeave={hide}
      onFocus={onFocus}
      onBlur={hide}
    >
      {cloneElement(children, {
        'aria-describedby': position ? id : children.props['aria-describedby'],
      })}
      {position
        ? createPortal(
            <div
              id={id}
              role="tooltip"
              className={`hud-tooltip ${position.above ? 'above' : 'below'}`}
              style={{ left: position.left, top: position.top }}
            >
              <strong>{title}</strong>
              {description && showDescription ? <span>{description}</span> : null}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}


