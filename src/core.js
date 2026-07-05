/**
 * Create a validated event object.
 * @param {Object} opts
 * @param {number} opts.age - Age at which the event occurred (required)
 * @param {string} opts.title - Event title (required)
 * @param {string} [opts.description] - Detailed description
 * @param {string} [opts.stage] - Life stage label
 * @param {number} [opts.impact] - Impact score 0-10
 * @returns {Object} Event object
 */
function createEvent({ age, title, description, stage, impact } = {}) {
  if (age === undefined || age === null) {
    throw new Error('age is required');
  }
  if (title === undefined || title === null || title === '') {
    throw new Error('title is required');
  }
  if (typeof age !== 'number' || age < 0 || !Number.isFinite(age)) {
    throw new Error('age must be a non-negative number');
  }
  if (impact !== undefined) {
    if (typeof impact !== 'number' || impact < 0 || impact > 10 || !Number.isInteger(impact)) {
      throw new Error('impact must be an integer between 0 and 10');
    }
  }

  return {
    id: generateId(),
    age,
    title,
    description: description || '',
    stage: stage || '',
    impact: impact !== undefined ? impact : 0,
  };
}

let _idCounter = 0;

function generateId() {
  return 'evt_' + Date.now().toString(36) + '_' + (++_idCounter).toString(36);
}

/**
 * Add an event to an array (immutable).
 * @param {Array} events
 * @param {Object} event
 * @returns {Array} New array with the event appended
 */
function addEvent(events, event) {
  return [...events, event];
}

/**
 * Update an event by id (immutable).
 * @param {Array} events
 * @param {string} id
 * @param {Object} changes
 * @returns {Array} New array with the updated event
 */
function updateEvent(events, id, changes) {
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) {
    throw new Error('Event not found: ' + id);
  }
  const updated = { ...events[idx], ...changes };
  return [
    ...events.slice(0, idx),
    updated,
    ...events.slice(idx + 1),
  ];
}

/**
 * Delete an event by id (immutable).
 * @param {Array} events
 * @param {string} id
 * @returns {Array} New array without the event
 */
function deleteEvent(events, id) {
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) {
    throw new Error('Event not found: ' + id);
  }
  return [
    ...events.slice(0, idx),
    ...events.slice(idx + 1),
  ];
}

/**
 * Infer life stages from events sorted by age.
 * Each stage spans from the previous event's age to the current event's age.
 * Consecutive events with the same stage are merged.
 * Events without a stage are skipped.
 * @param {Array} events
 * @returns {Array} [{startAge, endAge, stage}]
 */
function inferStages(events) {
  const withStage = [...events]
    .filter(e => e.stage)
    .sort((a, b) => a.age - b.age);

  if (withStage.length === 0) return [];

  const result = [];
  let prevStage = withStage[0];

  // First stage: from 0 to the first staged event's age
  result.push({
    stage: prevStage.stage,
    startAge: 0,
    endAge: prevStage.age,
  });

  for (let i = 1; i < withStage.length; i++) {
    const curr = withStage[i];
    if (curr.stage === prevStage.stage) {
      // Same stage — extend the endAge of the previous segment
      result[result.length - 1].endAge = curr.age;
    } else {
      // Different stage — start a new segment
      result.push({
        stage: curr.stage,
        startAge: prevStage.age,
        endAge: curr.age,
      });
    }
    prevStage = curr;
  }

  return result;
}

module.exports = { createEvent, addEvent, updateEvent, deleteEvent, inferStages };
