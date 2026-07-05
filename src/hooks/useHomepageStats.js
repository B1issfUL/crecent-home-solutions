import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices } from '../lib/firebase.js';
import { DEFAULT_HOME_STATS, normalizeHomepageStats } from '../lib/homepageStats.js';

export default function useHomepageStats() {
  const [stats, setStats] = useState(DEFAULT_HOME_STATS);
  const [status, setStatus] = useState('fallback');

  useEffect(() => {
    const services = getFirebaseServices();

    if (!services?.db) {
      setStats(DEFAULT_HOME_STATS);
      setStatus('fallback');
      return undefined;
    }

    setStatus('loading');

    const statsRef = doc(services.db, 'siteSettings', 'homepageStats');
    const unsubscribe = onSnapshot(
      statsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setStats(DEFAULT_HOME_STATS);
          setStatus('fallback');
          return;
        }

        setStats(normalizeHomepageStats(snapshot.data()));
        setStatus('ready');
      },
      () => {
        setStats(DEFAULT_HOME_STATS);
        setStatus('error');
      },
    );

    return unsubscribe;
  }, []);

  return { stats, status };
}
