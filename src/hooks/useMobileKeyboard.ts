import { useState, useEffect } from 'react';

export interface MobileKeyboardState {
  isKeyboardOpen: boolean;
  visualViewportHeight: number | null;
  visualViewportOffsetTop: number;
  keyboardOffsetBottom: number;
}

function isEditableTextElement(el: Element | null): boolean {
  if (!el) return false;
  const tagName = el.tagName;
  if (tagName === 'TEXTAREA') return true;
  if (tagName === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    const nonTextTypes = [
      'button',
      'checkbox',
      'color',
      'file',
      'hidden',
      'image',
      'radio',
      'range',
      'reset',
      'submit',
    ];
    return !nonTextTypes.includes(type);
  }
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useMobileKeyboard(): MobileKeyboardState {
  const [state, setState] = useState<MobileKeyboardState>(() => ({
    isKeyboardOpen: false,
    visualViewportHeight:
      typeof window !== 'undefined'
        ? Math.round(window.visualViewport?.height || window.innerHeight)
        : null,
    visualViewportOffsetTop:
      typeof window !== 'undefined'
        ? Math.round(window.visualViewport?.offsetTop || 0)
        : 0,
    keyboardOffsetBottom: 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    let baselineHeight = window.innerHeight;

    const updateViewportMetrics = () => {
      const vv = window.visualViewport;
      const currentInnerHeight = window.innerHeight;
      if (currentInnerHeight > baselineHeight) {
        baselineHeight = currentInnerHeight;
      }

      const vvHeight = vv ? vv.height : currentInnerHeight;
      const vvOffsetTop = vv ? vv.offsetTop : 0;

      const activeEl = document.activeElement;
      const inputFocused = isEditableTextElement(activeEl);
      const isMobileViewport = window.innerWidth < 1024;

      const heightDiff = Math.max(baselineHeight, currentInnerHeight) - vvHeight;
      const keyboardDetectedByHeight = isMobileViewport && heightDiff > 110;
      const isKeyboardOpen = isMobileViewport && (inputFocused || keyboardDetectedByHeight);

      const rawBottomOffset = vv
        ? currentInnerHeight - (vv.height + vv.offsetTop)
        : 0;
      const keyboardOffsetBottom = isKeyboardOpen
        ? Math.max(0, Math.round(rawBottomOffset))
        : 0;

      setState((prev) => {
        const nextHeight = Math.round(vvHeight);
        const nextOffsetTop = Math.round(vvOffsetTop);
        if (
          prev.isKeyboardOpen === isKeyboardOpen &&
          prev.visualViewportHeight === nextHeight &&
          prev.visualViewportOffsetTop === nextOffsetTop &&
          prev.keyboardOffsetBottom === keyboardOffsetBottom
        ) {
          return prev;
        }
        return {
          isKeyboardOpen,
          visualViewportHeight: nextHeight,
          visualViewportOffsetTop: nextOffsetTop,
          keyboardOffsetBottom,
        };
      });
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (focusTimeout) {
        clearTimeout(focusTimeout);
        focusTimeout = null;
      }
      if (isEditableTextElement(e.target as Element)) {
        updateViewportMetrics();
        setTimeout(updateViewportMetrics, 60);
        setTimeout(updateViewportMetrics, 200);
      }
    };

    const handleFocusOut = () => {
      if (focusTimeout) clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        updateViewportMetrics();
      }, 60);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewportMetrics);
      vv.addEventListener('scroll', updateViewportMetrics);
    }
    window.addEventListener('resize', updateViewportMetrics);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    updateViewportMetrics();

    return () => {
      if (focusTimeout) clearTimeout(focusTimeout);
      if (vv) {
        vv.removeEventListener('resize', updateViewportMetrics);
        vv.removeEventListener('scroll', updateViewportMetrics);
      }
      window.removeEventListener('resize', updateViewportMetrics);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
    };
  }, []);

  return state;
}
