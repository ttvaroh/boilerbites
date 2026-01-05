/**
 * Mock date for screenshots/development
 * Set MOCK_DATE to override the current date
 * Format: "YYYY-MM-DD" or null to use real date
 */
const MOCK_DATE: string | null = null //"2025-12-16"; // Set to null to disable
const MOCK_TIME: { hours: number; minutes: number } | null = null //{ hours: 17, minutes: 30 }; // Set to null to use real time

/**
 * Get the current date, either mocked or real
 */
export function getCurrentDate(): Date {
  if (MOCK_DATE) {
    const [year, month, day] = MOCK_DATE.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Set the time if MOCK_TIME is specified
    if (MOCK_TIME) {
      date.setHours(MOCK_TIME.hours, MOCK_TIME.minutes, 0, 0);
    }
    
    return date;
  }
  return new Date();
}

/**
 * Check if mock date is enabled
 */
export function isMockDateEnabled(): boolean {
  return MOCK_DATE !== null;
}

