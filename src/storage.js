const STORAGE_KEY = 'life-timeline-events';

/**
 * Save events to localStorage.
 * @param {Array} events
 */
function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/**
 * Load events from localStorage.
 * @returns {Array}
 */
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

module.exports = { saveEvents, loadEvents };
