// SPDX-License-Identifier: AGPL-3.0-only
import {useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {parsePeerEndpoint} from './config';

const key = 'aurea.peer.presets.v1';

export function usePeerPresets() {
  const [presets, setPresets] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const raw = Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
        if (raw && raw.length > 4096) throw new Error('invalid_presets');
        const data: unknown = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(data) || data.length > 8) throw new Error('invalid_presets');
        const endpoints = data.map(value => {
          if (typeof value !== 'string') throw new Error('invalid_presets');
          return parsePeerEndpoint(value).endpoint;
        });
        if (live) setPresets([...new Set(endpoints)]);
      } catch {
        if (live) setUnavailable(true);
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {live = false;};
  }, []);

  async function update(change: (previous: string[]) => string[]) {
    if (!ready || savingRef.current || unavailable) return false;
    savingRef.current = true;
    setSaving(true);
    try {
      const next = change(presets);
      const stored = JSON.stringify(next);
      if (stored.length > 4096 || next.length > 8) return false;
      if (Platform.OS === 'web') localStorage.setItem(key, stored);
      else await SecureStore.setItemAsync(key, stored);
      setPresets(next);
      return true;
    } catch {
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return {presets, ready, saving, unavailable, update};
}
