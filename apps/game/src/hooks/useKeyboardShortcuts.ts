import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { TacticalOrder } from '@prestes/shared';
import type { OrderMode } from '../ui/Hud';

interface KeyboardShortcutOptions {
  controlBothSides: boolean;
  selectedSquadId: number;
  setHudHidden: Dispatch<SetStateAction<boolean>>;
  setPendingOrder: Dispatch<SetStateAction<OrderMode | null>>;
  setPendingTactical: Dispatch<SetStateAction<TacticalOrder | null>>;
  setAimPending: Dispatch<SetStateAction<boolean>>;
  /** G closes the selected section on its centre (the old Regroup order). */
  onRegroup: () => void;
  /** add-run-toggle: R switches the selected sections between Walk and Run. */
  onToggleHurry: () => void;
}

/** H hides the HUD, G regroups, R toggles the run, Escape cancels pending orders. */
export function useKeyboardShortcuts({
  controlBothSides,
  selectedSquadId,
  setHudHidden,
  setPendingOrder,
  setPendingTactical,
  setAimPending,
  onRegroup,
  onToggleHurry,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setHudHidden((hidden) => !hidden);
      }
      const typing = event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
      if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        onRegroup();
      }
      if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        onToggleHurry();
      }
      if (event.key === 'Escape') {
        setPendingOrder(null);
        setPendingTactical(null);
        setAimPending(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controlBothSides, selectedSquadId, onRegroup, onToggleHurry]);
}
