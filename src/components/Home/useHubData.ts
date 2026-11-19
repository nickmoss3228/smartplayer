// components/Home/useHubData.ts
//
// What the hub reads, fetched once per visit.
//
// Progress is the dashboard's own request and cache (fetchAllDashboardData and
// sessionStorage "dashboardData", see auth/Dashboard/Dashboard.tsx), so going
// between the hub and the profile costs no second download and a repeat visit
// paints from the cache at once. The school is one more GET, read only for its
// name, its size and the advisor's line.

import { useEffect, useState } from 'react';
import { fetchAllDashboardData } from '../../services/dashboardServices';
import { fetchSchool, type SchoolState, type WalletBalances } from '../../services/schoolServices';
import type { DetailedProgressMap, OverviewData } from '../../types/Dashboard';

const CACHE_KEY = 'dashboardData';

interface Progress {
  overview: OverviewData | null;
  detailed: DetailedProgressMap | null;
}

const readCache = (): Progress | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { overviewData, detailedProgress } = JSON.parse(raw);
    return { overview: overviewData ?? null, detailed: detailedProgress ?? null };
  } catch {
    return null;
  }
};

const token = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

export const useHubProgress = () => {
  const [cached] = useState(readCache);
  const [progress, setProgress] = useState<Progress>(cached ?? { overview: null, detailed: null });
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = token();
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const { overviewData, detailedProgress } = await fetchAllDashboardData(t);
        if (!alive) return;
        setProgress({ overview: overviewData, detailed: detailedProgress });
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ overviewData, detailedProgress }));
        } catch {
          // The cache is a convenience.
        }
      } catch (error) {
        console.error('Failed to load hub progress:', error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { ...progress, loading };
};

export const useHubSchool = () => {
  const [state, setState] = useState<{ school: SchoolState; wallet: WalletBalances } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = token();
      if (!t) return;
      try {
        const res = await fetchSchool(t);
        if (alive) setState({ school: res.school, wallet: res.wallet });
      } catch {
        // The card falls back to a plain way in.
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { ...state, failed };
};
