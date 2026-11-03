import type { ReactNode } from 'react';
import { Tooltip } from '../Tooltip';

interface IconButtonProps {
  testId: string;
  label: string;
  description: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  testId,
  label,
  description,
  children,
  onClick,
  active = false,
  disabled = false,
  className = '',
}: IconButtonProps) {
  return (
    <Tooltip title={label} description={description}>
      <button
        type="button"
        className={`icon-button ${active ? 'active' : ''} ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active || undefined}
        data-testid={testId}
      >
        {children}
      </button>
    </Tooltip>
  );
}
