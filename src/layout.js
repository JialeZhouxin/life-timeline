const { inferStages } = require('./core');

const DEFAULT_PADDING = { top: 40, bottom: 40 };
const MIN_RADIUS = 6;
const MAX_RADIUS = 24;

/**
 * Calculate the layout positions for a vertical timeline.
 * @param {Object} opts
 * @param {Array} opts.events - Event objects (with .age, .impact)
 * @param {number} opts.currentAge - User's current age
 * @param {number} opts.height - Container height in pixels
 * @param {Object} [opts.padding] - {top, bottom}
 * @returns {{ events: Array, stages: Array, totalHeight: number, padding: Object }}
 */
function calculateLayout({ events, currentAge, height, padding = DEFAULT_PADDING }) {
  const sorted = [...events].sort((a, b) => a.age - b.age);
  const usableHeight = height - padding.top - padding.bottom;
  const ageRange = Math.max(currentAge, 1); // avoid division by zero

  // Map age to y position (linear interpolation)
  function ageToY(age) {
    const ratio = age / ageRange;
    return padding.top + ratio * usableHeight;
  }

  // Calculate node radius from impact score (0-10 → 6-24)
  function impactToRadius(impact) {
    const clamped = Math.max(0, Math.min(10, impact || 0));
    return MIN_RADIUS + (clamped / 10) * (MAX_RADIUS - MIN_RADIUS);
  }

  const positionedEvents = sorted.map(event => ({
    event,
    y: ageToY(event.age),
    radius: impactToRadius(event.impact),
  }));

  // Compute stage regions
  const stages = inferStages(sorted).map(s => ({
    stage: s.stage,
    startAge: s.startAge,
    endAge: s.endAge,
    startY: ageToY(s.startAge),
    endY: ageToY(s.endAge),
  }));

  return {
    events: positionedEvents,
    stages,
    totalHeight: height,
    padding: { ...padding },
  };
}

module.exports = { calculateLayout };
