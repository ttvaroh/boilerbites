import { useCallback, useReducer } from 'react';
import { Station } from '../types/menu';

// ============================================================================
// Types
// ============================================================================

interface StationExpansionState {
  expandedStations: Record<string, boolean>;
  allExpanded: boolean;
}

type ExpansionAction =
  | { type: 'TOGGLE_STATION'; stationId: string }
  | { type: 'TOGGLE_ALL'; stations: Station[] }
  | { type: 'INITIALIZE'; stations: Station[] }
  | { type: 'RESET' };

// ============================================================================
// Reducer
// ============================================================================

function expansionReducer(
  state: StationExpansionState, 
  action: ExpansionAction
): StationExpansionState {
  switch (action.type) {
    case 'TOGGLE_STATION': {
      const newExpanded = {
        ...state.expandedStations,
        [action.stationId]: !state.expandedStations[action.stationId]
      };
      // Check if all stations are expanded
      const allExpanded = Object.values(newExpanded).every(v => v);
      return {
        expandedStations: newExpanded,
        allExpanded
      };
    }
    case 'TOGGLE_ALL': {
      const newAllExpanded = !state.allExpanded;
      const newExpanded: Record<string, boolean> = {};
      action.stations.forEach(station => {
        newExpanded[station.id] = newAllExpanded;
      });
      return {
        expandedStations: newExpanded,
        allExpanded: newAllExpanded
      };
    }
    case 'INITIALIZE': {
      const expanded: Record<string, boolean> = {};
      action.stations.forEach(station => {
        expanded[station.id] = true;
      });
      return {
        expandedStations: expanded,
        allExpanded: true
      };
    }
    case 'RESET':
      return {
        expandedStations: {},
        allExpanded: true
      };
    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useStationExpansion() {
  const [state, dispatch] = useReducer(expansionReducer, {
    expandedStations: {},
    allExpanded: true
  });

  const toggleStation = useCallback((stationId: string) => {
    dispatch({ type: 'TOGGLE_STATION', stationId });
  }, []);

  const toggleAll = useCallback((stations: Station[]) => {
    dispatch({ type: 'TOGGLE_ALL', stations });
  }, []);

  const initialize = useCallback((stations: Station[]) => {
    dispatch({ type: 'INITIALIZE', stations });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const isExpanded = useCallback((stationId: string): boolean => {
    return state.expandedStations[stationId] ?? true;
  }, [state.expandedStations]);

  return {
    expandedStations: state.expandedStations,
    allExpanded: state.allExpanded,
    toggleStation,
    toggleAll,
    initialize,
    reset,
    isExpanded
  };
}