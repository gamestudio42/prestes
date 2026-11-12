import type { ReactNode } from 'react';
import { Minimize, Restore } from './icons';
import { DOCK_ANCHOR, type DockId } from './dockLayout';

export interface DockedPanelProps {
  id: DockId;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  collapseLabel: string;
  expandLabel: string;
  /** The panel's frame: wood (Troops, Orders) or the parchment card (Troop summary). */
  variant?: 'wood' | 'parchment';
  className?: string;
  children: ReactNode;
}

/**
 * redo-battle-hud D3: a panel docked at an edge of the battle view. It does
 * not move or resize; it collapses to its title tab toward its edge (the
 * Troops panel up under the top bar, the others down to the bottom).
 */
export function DockedPanel({
  id,
  title,
  collapsed,
  onToggle,
  collapseLabel,
  expandLabel,
  variant = 'wood',
  className,
  children,
}: DockedPanelProps) {
  const anchor = DOCK_ANCHOR[id];
  return (
    <section
      className={`docked-panel dock-${anchor} panel-${variant} ${collapsed ? 'collapsed' : ''} ${className ?? ''}`}
      data-testid={`window-${id}`}
      data-window={id}
      data-anchor={anchor}
      data-minimized={collapsed}
      aria-label={title}
    >
      <header className="docked-panel-title" data-testid={`window-${id}-title`}>
        <span className="docked-panel-name">{title}</span>
        <button
          type="button"
          className="docked-panel-toggle"
          data-testid={`window-${id}-toggle`}
          aria-label={collapsed ? expandLabel : collapseLabel}
          title={collapsed ? expandLabel : collapseLabel}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <Restore size={16} /> : <Minimize size={16} />}
        </button>
      </header>
      {collapsed ? null : <div className="docked-panel-body">{children}</div>}
    </section>
  );
}
