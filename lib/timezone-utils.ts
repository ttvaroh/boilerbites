/**
 * Utility functions for handling dates and times in Eastern Time (EST/EDT)
 * This ensures consistent timezone handling across the application
 */

/**
 * Get the current date in EST/EDT timezone
 * @returns Date object representing current time in Eastern Time
 */
export function getCurrentDateInEST(): Date {
  // Create a new date and convert to EST using the proper timezone
  const now = new Date();
  
  // Get the current time in EST/EDT using the Intl API
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Get today's date in YYYY-MM-DD format in EST/EDT
 * @returns String in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = getCurrentDateInEST();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get a date N days from today in YYYY-MM-DD format in EST/EDT
 * @param days Number of days to add (can be negative)
 * @returns String in YYYY-MM-DD format
 */
export function getDateStringFromToday(days: number): string {
  const date = getCurrentDateInEST();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in EST/EDT for time comparisons
 * @returns Object with hours and minutes in 24-hour format
 */
export function getCurrentTimeInEST(): { hours: number; minutes: number } {
  const now = getCurrentDateInEST();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
  };
}

/**
 * Get current timestamp in ISO format in EST/EDT
 * @returns ISO string in Eastern Time
 */
export function getCurrentTimestampInEST(): string {
  return getCurrentDateInEST().toISOString();
}

