import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Command, Frame } from '@prestes/shared';
import type { GameClient } from '../client/GameClient';

type PrestesBridge = {
  command: (command: Command) => void;
  step: (ticks: number) => void;
  frame: () => Frame | null;
  /** remove-sandbox-panel D1: let a test select and order the legalists too (fog view off while on). */
  bothSides: (on: boolean) => void;
};

/** Dev-only `window.__prestes` bridge used by the Playwright suite. */
export function useTestBridge(
  clientRef: MutableRefObject<GameClient | null>,
  setSpeed: Dispatch<SetStateAction<0 | 1 | 2 | 4 | 8>>,
  setControlBothSides: Dispatch<SetStateAction<boolean>>,
): void {
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    const bridge: PrestesBridge = {
      command: (command) => clientRef.current?.sendCommand(command),
      step: (ticks) => {
        setSpeed(0);
        clientRef.current?.setSpeed(0);
        clientRef.current?.step(ticks);
      },
      frame: () => clientRef.current?.currentFrame() ?? null,
      bothSides: (on) => setControlBothSides(on),
    };
    const host = window as unknown as { __prestes?: PrestesBridge };
    host.__prestes = bridge;
    return () => {
      delete host.__prestes;
    };
  }, []);
}
