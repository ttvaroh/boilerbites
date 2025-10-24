/**
 * Utility functions for handling dates and times in local timezone
 * This ensures consistent timezone handling across the application
 */

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * @returns String in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert a local date to UTC date string for database queries
 * This handles the timezone conversion properly for database operations
 * @param date Date object in local timezone
 * @returns String in YYYY-MM-DD format in UTC
 */
export function getUTCDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get the start and end of a local date in UTC for database queries
 * This ensures we capture all entries for a local date regardless of timezone
 * @param localDate Date object in local timezone
 * @returns Object with start and end UTC timestamps
 */
export function getLocalDateUTCBounds(localDate: Date): { start: string; end: string } {
  // Get the start of the day in local timezone
  const startOfDay = new Date(localDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Get the end of the day in local timezone
  const endOfDay = new Date(localDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    start: startOfDay.toISOString(),
    end: endOfDay.toISOString()
  };
}

/**
 * Get a date N days from today in YYYY-MM-DD format (local timezone)
 * @param days Number of days to add (can be negative)
 * @returns String in YYYY-MM-DD format
 */
export function getDateStringFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time for time comparisons (local timezone)
 * @returns Object with hours and minutes in 24-hour format
 */
export function getCurrentTimeInEST(): { hours: number; minutes: number } {
  const now = new Date();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
  };
}

/**
 * Get current timestamp in ISO format
 * @returns ISO string
 */
export function getCurrentTimestampInEST(): string {
  return new Date().toISOString();
}

/**
 * Create a Date object from a YYYY-MM-DD string in local timezone
 * This prevents the common UTC midnight interpretation bug
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object at midnight local time
 */
export function createLocalDateFromString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Add days to a date string and return new date string
 * @param dateStr Date string in YYYY-MM-DD format
 * @param days Number of days to add (can be negative)
 * @returns New date string in YYYY-MM-DD format
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = createLocalDateFromString(dateStr);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}