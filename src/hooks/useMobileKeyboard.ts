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
    let lastInnerWidth = window.innerWidth;

    const updateViewportMetrics = () => {
      const vv = window.visualViewport;
      const currentInnerHeight = window.innerHeight;
      const currentInnerWidth = window.innerWidth;

      const activeEl = document.activeElement;
      const inputFocused = isEditableTextElement(activeEl);
      const isMobileViewport = currentInnerWidth < 1024;

      // Reset baseline on orientation / window width changes or whenever no input is focused
      // and visualViewport matches layout height (prevents portrait->landscape or desktop resize
      // from permanently trapping the app in "keyboard open" mode).
      const widthChanged = Math.abs(currentInnerWidth - lastInnerWidth) > 20;
      if (widthChanged) {
        lastInnerWidth = currentInnerWidth;
        baselineHeight = currentInnerHeight;
      } else if (currentInnerHeight > baselineHeight) {
        baselineHeight = currentInnerHeight;
      }

      const vvHeight = vv ? vv.height : currentInnerHeight;
      const vvOffsetTop = vv ? vv.offsetTop : 0;

      if (!inputFocused && Math.abs(currentInnerHeight - vvHeight) < 40) {
        baselineHeight = currentInnerHeight;
      }

      // iOS shrinks visualViewport.height relative to innerHeight;
      // Android Chrome often shrinks innerHeight as well while an editable element is focused.
      const visualInset = currentInnerHeight - vvHeight;
      const focusedBaselineDiff = inputFocused ? baselineHeight - vvHeight : 0;
      const keyboardDetectedByHeight =
        isMobileViewport && (visualInset > 120 || focusedBaselineDiff > 130);
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

    const handleOrientationChange = () => {
      setTimeout(() => {
        baselineHeight = window.innerHeight;
        lastInnerWidth = window.innerWidth;
        updateViewportMetrics();
      }, 120);
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
      }, 80);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewportMetrics);
      vv.addEventListener('scroll', updateViewportMetrics);
    }
    window.addEventListener('resize', updateViewportMetrics);
    window.addEventListener('orientationchange', handleOrientationChange);
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
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
    };
  }, []);

  return state;
}
