// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useRef, useState } from 'react';
import { AppState,Platform } from 'react-native';
import { tv } from '../platform/native/tv';
import { nativeFocus } from '../platform/native/focus';
/** Temporary access expires on inactivity or a main page change, never persisted. */
export function useDeveloperAccess(page: number) {
  const [revealed, setRevealed] = useState(false),
    [enabled, setEnabled] = useState(false);
  const state = useRef({ lastInput: 0, lastTap: 0, taps: 0 });
  const lock = () => {
    setRevealed(false);
    setEnabled(false);
    state.current.taps = 0;
  };
  const interact = () => {
    state.current.lastInput = Date.now();
  };
  useEffect(() => {
    lock();
  }, [page]);
  useEffect(() => {
    const focus = nativeFocus.onFocus(interact),
      events = tv.subscribe((event) => {
        if (event.type === 'key' && event.payload.phase === 'down') interact();
      });
    const application = AppState.addEventListener('change', (value) => {
      if (value !== 'active' && Date.now() - state.current.lastInput >= 30000)
        lock();
    });
    if(Platform.OS==='web'){document.addEventListener('pointerdown',interact);document.addEventListener('keydown',interact);document.addEventListener('input',interact);}
    const timer = setInterval(() => {
      if (Date.now() - state.current.lastInput >= 30000) lock();
    }, 1000);
    return () => {
      if(Platform.OS==='web'){document.removeEventListener('pointerdown',interact);document.removeEventListener('keydown',interact);document.removeEventListener('input',interact);}
      focus();
      events();
      application.remove();
      clearInterval(timer);
    };
  }, []);
  const tap = () => {
    const now = Date.now();
    state.current.taps =
      now - state.current.lastTap < 4000 ? state.current.taps + 1 : 1;
    state.current.lastTap = now;
    interact();
    if (state.current.taps >= 3) {
      setRevealed(true);
      state.current.taps = 0;
    }
  };
  return {
    revealed,
    enabled,
    interact,
    tap,
    toggle: () => {
      interact();
      setEnabled((value) => revealed && !value);
    },
  };
}
