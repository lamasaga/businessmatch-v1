import { useEffect, useRef } from 'react';
import { useCareerStore } from '../stores/careerStore';

/** 比赛首次进入 finished 时刷新生涯余额与近期对局（后端已在终局入账）。 */
export function useRefreshCareerOnMatchFinish(finished: boolean) {
  const refreshed = useRef(false);
  const fetchProfile = useCareerStore((s) => s.fetchProfile);
  const fetchRecentMatches = useCareerStore((s) => s.fetchRecentMatches);

  useEffect(() => {
    if (!finished || refreshed.current) return;
    refreshed.current = true;
    void fetchProfile();
    void fetchRecentMatches();
  }, [finished, fetchProfile, fetchRecentMatches]);
}
