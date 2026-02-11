import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { WhatsNewEntry, whatsNewEntries } from "../lib/whatsNewData";

const STORAGE_KEY = "@boilerbites_last_seen_version";

export function useWhatsNew() {
  const [visible, setVisible] = useState(false);
  const [entry, setEntry] = useState<WhatsNewEntry | null>(null);
  const [ready, setReady] = useState(false);

  const currentVersion = Constants.expoConfig?.version ?? "0.0.0";

  // Find the changelog entry for the current version
  const currentEntry =
    whatsNewEntries.find((e) => e.version === currentVersion) ?? null;

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const lastSeenVersion = await AsyncStorage.getItem(STORAGE_KEY);

        if (lastSeenVersion !== currentVersion && currentEntry) {
          setEntry(currentEntry);
          setVisible(true);
        }
      } catch {
        // If AsyncStorage fails, don't show the modal
      } finally {
        setReady(true);
      }
    };

    checkVersion();
  }, [currentVersion, currentEntry]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, currentVersion);
    } catch {
      // Silently fail — worst case the modal shows again next open
    }
  }, [currentVersion]);

  const forceShow = useCallback(() => {
    const entryToShow = currentEntry ?? whatsNewEntries[whatsNewEntries.length - 1];
    if (entryToShow) {
      setEntry(entryToShow);
      setVisible(true);
    }
  }, [currentEntry]);

  return { visible, entry, ready, dismiss, forceShow };
}
