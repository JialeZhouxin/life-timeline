import { STORAGE_KEY } from './constants.mjs';

/**
 * Save events to localStorage.
 * @param {Array} events
 */
export function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/**
 * Load events from localStorage.
 * @returns {Array}
 */
export function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
