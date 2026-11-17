import { useState, useEffect, useRef, useCallback } from 'react';
import { NWPModelId } from '../data/nwpModels';
import { NWPModelRun, NWPModelDataset, NWPState, ModelState } from '../types/nwp';
import { fetchAllNWPModels } from '../services/nwp/nwpService';

const initialModelState = <T,>(modelId: NWPModelId): ModelState<T> => ({
  status: 'idle',
  data: null,
  error: modelId === 'WRF' ? 'IMD WRF source not configured' : null,
  fetchedAt: null,
  runTime: null,
  requestId: null,
});

export function useNWPWorkspace(latitude: number, longitude: number, locationName: string) {
  const [selectedModel, setSelectedModel] = useState<NWPModelId>('ECMWF');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const [modelsState, setModelsState] = useState<{
    WRF: ModelState<NWPModelRun>;
    GEFS: ModelState<NWPModelRun>;
    ECMWF: ModelState<NWPModelRun>;
  }>({
    WRF: initialModelState('WRF'),
    GEFS: initialModelState('GEFS'),
    ECMWF: initialModelState('ECMWF'),
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);

      // Set loading state on models without clearing previous data
      setModelsState((prev) => ({
        WRF: { ...prev.WRF, status: prev.WRF.data ? prev.WRF.status : 'loading' },
        GEFS: { ...prev.GEFS, status: prev.GEFS.data ? prev.GEFS.status : 'loading' },
        ECMWF: { ...prev.ECMWF, status: prev.ECMWF.data ? prev.ECMWF.status : 'loading' },
      }));

      try {
        const results = await fetchAllNWPModels(latitude, longitude, locationName, signal);
        setModelsState(results);
        setLastRefresh(new Date().toLocaleTimeString());
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[NWP Workspace] Fetch all failed:', err);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [latitude, longitude, locationName]
  );

  // Trigger parallel fetching whenever location coordinates change
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchAll(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchAll]);

  // Dedicated UI selector: changes selectedModel WITHOUT modifying or re-fetching other model states
  const handleSelectModel = useCallback((model: NWPModelId) => {
    setSelectedModel(model);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  // Construct canonical NWPState
  const nwpState: NWPState = {
    WRF: modelsState.WRF,
    GEFS: modelsState.GEFS,
    ECMWF: modelsState.ECMWF,
    selectedModel,
    location: {
      latitude,
      longitude,
      name: locationName,
    },
    lastRefresh,
  };

  // Synthesize canonical dataset for backwards compatibility with existing visualizers
  const dataset: NWPModelDataset = {
    location: {
      latitude,
      longitude,
      name: locationName,
    },
    models: {
      WRF: modelsState.WRF.data || undefined,
      GEFS: modelsState.GEFS.data || undefined,
      ECMWF: modelsState.ECMWF.data || undefined,
    },
    fetchedAt: lastRefresh || new Date().toISOString(),
    overallStatus:
      modelsState.ECMWF.data && modelsState.GEFS.data ? 'COMPLETE' : 'PARTIAL',
  };

  const activeModelRun = modelsState[selectedModel]?.data || null;

  return {
    nwpState,
    dataset,
    selectedModel,
    setSelectedModel: handleSelectModel,
    activeModelRun,
    isLoading,
    lastRefresh,
    refreshAll: handleRefresh,
  };
}
