import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StartupNavView } from '../types/index.ts';

interface UseNavLongPressOptions {
  delayMs?: number;
  onTrigger: () => void;
}

export function useNavLongPress({
  delayMs = 350,
  onTrigger,
}: UseNavLongPressOptions) {
  const [holdingTarget, setHoldingTarget] = useState<StartupNavView | null>(null);
  const timerRef = useRef<number | null>(null);
  const resetTriggerGuardRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
    setHoldingTarget(null);
  }, []);

  const scheduleTriggerGuardReset = useCallback(() => {
    if (resetTriggerGuardRef.current !== null) {
      window.clearTimeout(resetTriggerGuardRef.current);
    }
    resetTriggerGuardRef.current = window.setTimeout(() => {
      triggeredRef.current = false;
      resetTriggerGuardRef.current = null;
    }, 500);
  }, []);

  useEffect(() => {
    const handleGlobalPointerEnd = () => {
      clearTimer();
    };
    window.addEventListener('pointerup', handleGlobalPointerEnd, true);
    window.addEventListener('pointercancel', handleGlobalPointerEnd, true);
    window.addEventListener('blur', handleGlobalPointerEnd);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerEnd, true);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd, true);
      window.removeEventListener('blur', handleGlobalPointerEnd);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (resetTriggerGuardRef.current !== null) {
        window.clearTimeout(resetTriggerGuardRef.current);
      }
    };
  }, [clearTimer]);

  const fireLongPress = useCallback(() => {
    triggeredRef.current = true;
    scheduleTriggerGuardReset();
    clearTimer();
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(14);
      }
    } catch {
      // ignore
    }
    onTriggerRef.current();
  }, [clearTimer, scheduleTriggerGuardReset]);

  const getHandlers = useCallback(
    (target: StartupNavView, onNormalTap: () => void) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        clearTimer();
        triggeredRef.current = false;
        if (resetTriggerGuardRef.current !== null) {
          window.clearTimeout(resetTriggerGuardRef.current);
          resetTriggerGuardRef.current = null;
        }
        startPointRef.current = { x: e.clientX, y: e.clientY };
        setHoldingTarget(target);

        timerRef.current = window.setTimeout(() => {
          fireLongPress();
        }, delayMs);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!startPointRef.current) return;
        const dx = Math.abs(e.clientX - startPointRef.current.x);
        const dy = Math.abs(e.clientY - startPointRef.current.y);
        if (dx > 24 || dy > 24) {
          clearTimer();
        }
      },
      onPointerUp: () => {
        clearTimer();
      },
      onPointerCancel: () => {
        clearTimer();
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') {
          clearTimer();
        }
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (triggeredRef.current) {
          clearTimer();
          return;
        }
        fireLongPress();
      },
      onClick: (e: React.MouseEvent) => {
        if (triggeredRef.current) {
          e.preventDefault();
          e.stopPropagation();
          triggeredRef.current = false;
          if (resetTriggerGuardRef.current !== null) {
            window.clearTimeout(resetTriggerGuardRef.current);
            resetTriggerGuardRef.current = null;
          }
          return;
        }
        onNormalTap();
      },
    }),
    [clearTimer, delayMs, fireLongPress]
  );

  return {
    holdingTarget,
    getHandlers,
  };
}
