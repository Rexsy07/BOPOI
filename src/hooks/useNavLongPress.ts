import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StartupNavView } from '../types/index.ts';

interface UseNavLongPressOptions {
  delayMs?: number;
  onTrigger: () => void;
}

export function useNavLongPress({
  delayMs = 400,
  onTrigger,
}: UseNavLongPressOptions) {
  const [holdingTarget, setHoldingTarget] = useState<StartupNavView | null>(null);
  const timerRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
    setHoldingTarget(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const getHandlers = useCallback(
    (target: StartupNavView, onNormalTap: () => void) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        clearTimer();
        triggeredRef.current = false;
        startPointRef.current = { x: e.clientX, y: e.clientY };
        setHoldingTarget(target);

        timerRef.current = window.setTimeout(() => {
          triggeredRef.current = true;
          clearTimer();
          try {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              navigator.vibrate(14);
            }
          } catch {
            // ignore
          }
          onTrigger();
        }, delayMs);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!startPointRef.current) return;
        const dx = Math.abs(e.clientX - startPointRef.current.x);
        const dy = Math.abs(e.clientY - startPointRef.current.y);
        if (dx > 10 || dy > 10) {
          clearTimer();
        }
      },
      onPointerUp: () => {
        clearTimer();
      },
      onPointerCancel: () => {
        clearTimer();
      },
      onPointerLeave: () => {
        clearTimer();
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        clearTimer();
        triggeredRef.current = false;
        onTrigger();
      },
      onClick: (e: React.MouseEvent) => {
        if (triggeredRef.current) {
          e.preventDefault();
          e.stopPropagation();
          triggeredRef.current = false;
          return;
        }
        onNormalTap();
      },
    }),
    [clearTimer, delayMs, onTrigger]
  );

  return {
    holdingTarget,
    getHandlers,
  };
}
