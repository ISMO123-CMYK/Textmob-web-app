import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPushPermission,
  setPushEnabled as setPushEnabledRaw,
} from '../louda/push';
import { getStore, setStore } from '../utils/storage';

// One opt-in flag + one OS permission check drive EVERY toggle in the app
// (Accounts Center, Menu, Louda Settings). Turning off drops this device's
// token server-side, which stops BOTH Textmob activity and Louda messages.
const OPT_IN_KEY = 'textmobPushOptIn';
const LEGACY_KEY = 'louda:notifPrefs';

export function usePushNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [optIn, legacy, granted] = await Promise.all([
        getStore(OPT_IN_KEY),
        getStore(LEGACY_KEY),
        getPushPermission(),
      ]);
      // Read order: new flag -> legacy Louda flag -> default on.
      let optedIn: boolean;
      if (optIn !== null) {
        optedIn = optIn === 'true';
      } else if (legacy !== null) {
        try {
          optedIn = JSON.parse(legacy)?.enabled === true;
        } catch {
          optedIn = true;
        }
      } else {
        optedIn = true;
      }
      if (alive.current) setEnabled(optedIn && granted);
    } catch {
      if (alive.current) setEnabled(false);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setEnabledAsync = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (alive.current) setBusy(true);
      try {
        const granted = await setPushEnabledRaw(next);
        await setStore(OPT_IN_KEY, next ? 'true' : 'false');
        // Keep the legacy Louda key aligned so old readers stay in sync.
        await setStore(LEGACY_KEY, JSON.stringify({ enabled: next })).catch(() => {});
        const value = next && granted;
        if (alive.current) setEnabled(value);
        return value;
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [],
  );

  return { enabled, loading, busy, setEnabled: setEnabledAsync, refresh };
}
