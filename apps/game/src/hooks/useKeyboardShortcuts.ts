import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { TacticalOrder } from '@prestes/shared';
import type { OrderMode } from '../ui/Hud';
import type { SandboxTool } from '../ui/SandboxPanel';

interface KeyboardShortcutOptions {
  controlBothSides: boolean;
  selectedSquadId: number;
  sandboxTool: SandboxTool | null;
  setHudHidden: Dispatch<SetStateAction<boolean>>;
  setSandboxOpen: Dispatch<SetStateAction<boolean>>;
  setSandboxTool: Dispatch<SetStateAction<SandboxTool | null>>;
  setPendingOrder: Dispatch<SetStateAction<OrderMode | null>>;
  setPendingTactical: Dispatch<SetStateAction<TacticalOrder | null>>;
  setAimPending: Dispatch<SetStateAction<boolean>>;
}

/** H hides the HUD, F1 toggles the sandbox, Escape cancels tools and pending orders. */
export function useKeyboardShortcuts({
  controlBothSides,
  selectedSquadId,
  sandboxTool,
  setHudHidden,
  setSandboxOpen,
  setSandboxTool,
  setPendingOrder,
  setPendingTactical,
  setAimPending,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setHudHidden((hidden) => !hidden);
      }
      if (event.key === 'F1') {
        event.preventDefault();
        setSandboxOpen((open) => {
          if (open) {
            setSandboxTool(null);
          }
          return !open;
        });
      }
      if (event.key === 'Escape') {
        setSandboxTool((tool) => {
          if (tool) {
            return null;
          }
          setSandboxOpen(false);
          return null;
        });
        setPendingOrder(null);
        setPendingTactical(null);
        setAimPending(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controlBothSides, selectedSquadId, sandboxTool]);
}
