import { useState, useEffect } from 'react';
import { safeStorageGetJson, safeStorageSetJson } from '../utils/safeStorage';

const SAVED_REPORTS_KEY = 'mausam_saved_reports_v1';
const RECENTLY_VIEWED_KEY = 'mausam_recent_reports_v1';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function useSavedReports() {
  const [savedReportIds, setSavedReportIds] = useState<string[]>(() => {
    return safeStorageGetJson<string[]>('local', SAVED_REPORTS_KEY, isStringArray) ?? [];
  });

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    return safeStorageGetJson<string[]>('local', RECENTLY_VIEWED_KEY, isStringArray) ?? [];
  });

  useEffect(() => {
    safeStorageSetJson('local', SAVED_REPORTS_KEY, savedReportIds);
  }, [savedReportIds]);

  useEffect(() => {
    safeStorageSetJson('local', RECENTLY_VIEWED_KEY, recentlyViewedIds);
  }, [recentlyViewedIds]);

  const toggleSaveReport = (reportId: string) => {
    setSavedReportIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const isReportSaved = (reportId: string) => savedReportIds.includes(reportId);

  const addRecentlyViewed = (reportId: string) => {
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== reportId);
      return [reportId, ...filtered].slice(0, 6);
    });
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewedIds([]);
  };

  return {
    savedReportIds,
    toggleSaveReport,
    isReportSaved,
    recentlyViewedIds,
    addRecentlyViewed,
    clearRecentlyViewed,
  };
}
