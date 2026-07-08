import { supabase } from "./supabase";

/** UTC times when populate_menu_v3 runs (matches pg_cron). */
export const DEFAULT_MENU_REFRESH_SCHEDULE_UTC = [
  "06:00",
  "11:50",
  "15:50",
  "21:50",
];

let refreshScheduleUtc = [...DEFAULT_MENU_REFRESH_SCHEDULE_UTC];

const globalMenuVersionState = {
  version: null as string | null,
  confirmedAt: 0,
};

export function setMenuRefreshSchedule(scheduleCsv: string): void {
  const parsed = scheduleCsv
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parsed.length > 0) {
    refreshScheduleUtc = parsed;
  }
}

function parseScheduleMinutes(schedule: string[]): number[] {
  return schedule
    .map((entry) => {
      const [h, m] = entry.split(":").map((part) => parseInt(part, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
}

/** Milliseconds of the most recent cron boundary at or before `now` (UTC). */
export function getMostRecentMenuBoundaryMs(now = Date.now()): number {
  const scheduleMinutes = parseScheduleMinutes(refreshScheduleUtc);
  if (scheduleMinutes.length === 0) {
    return 0;
  }

  const utc = new Date(now);
  const todayStart = Date.UTC(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
  );
  const nowMinutes = utc.getUTCHours() * 60 + utc.getUTCMinutes();

  let boundaryMs = todayStart - 24 * 60 * 60 * 1000;
  for (const dayOffset of [0, -1]) {
    const dayStart = todayStart + dayOffset * 24 * 60 * 60 * 1000;
    for (const minutes of scheduleMinutes) {
      const candidate = dayStart + minutes * 60 * 1000;
      if (candidate <= now) {
        boundaryMs = Math.max(boundaryMs, candidate);
      }
    }
  }

  return boundaryMs;
}

export function hasCrossedMenuBoundarySince(timestamp: number): boolean {
  if (!timestamp) return true;
  return timestamp < getMostRecentMenuBoundaryMs();
}

export function getGlobalMenuVersionState(): {
  version: string | null;
  confirmedAt: number;
} {
  return { ...globalMenuVersionState };
}

export async function probeGlobalMenuVersion(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("app_runtime_config")
      .select("value")
      .eq("key", "menu_version")
      .maybeSingle();

    const version = (data?.value as string | undefined) ?? null;
    globalMenuVersionState.version = version;
    globalMenuVersionState.confirmedAt = Date.now();
    return version;
  } catch {
    return globalMenuVersionState.version;
  }
}

export async function ensureGlobalMenuVersionFresh(): Promise<string | null> {
  if (
    globalMenuVersionState.confirmedAt >= getMostRecentMenuBoundaryMs() &&
    globalMenuVersionState.version !== null
  ) {
    return globalMenuVersionState.version;
  }
  return probeGlobalMenuVersion();
}

export async function loadMenuVersionConfig(): Promise<void> {
  try {
    const { data } = await supabase
      .from("app_runtime_config")
      .select("key, value")
      .in("key", ["menu_version", "menu_refresh_schedule"]);

    if (!data) return;

    for (const row of data) {
      if (row.key === "menu_refresh_schedule" && typeof row.value === "string") {
        setMenuRefreshSchedule(row.value);
      }
      if (row.key === "menu_version" && typeof row.value === "string") {
        globalMenuVersionState.version = row.value;
        globalMenuVersionState.confirmedAt = Date.now();
      }
    }
  } catch {
    // Fall back to defaults.
  }
}

export function shouldRefreshAfterForeground(
  backgroundTimestamp: number | null,
): boolean {
  if (!backgroundTimestamp) return false;
  return hasCrossedMenuBoundarySince(backgroundTimestamp);
}
