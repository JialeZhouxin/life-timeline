import { inferStages } from './core.mjs';
import {
  PADDING_TOP, PADDING_BOTTOM,
  MIN_RADIUS, MAX_RADIUS, TICK_INTERVAL,
  getStageColor,
} from './constants.mjs';

/**
 * Calculate the layout positions for a vertical timeline.
 * @param {Object} opts
 * @param {Array} opts.events - Event objects (with .age, .impact)
 * @param {number} opts.currentAge - User's current age
 * @param {number} opts.height - Container height in pixels
 * @param {Object} [opts.padding] - {top, bottom}
 * @returns {{ events: Array, stages: Array, ticks: Array, totalHeight: number, padding: Object }}
 */
function calculateLayout({ events, currentAge, height, padding = {} }) {
  const top = padding.top ?? PADDING_TOP;
  const bottom = padding.bottom ?? PADDING_BOTTOM;

  const sorted = [...events].sort((a, b) => a.age - b.age);
  const usableHeight = height - top - bottom;
  const ageRange = Math.max(currentAge, 1); // avoid division by zero

  // Map age to y position (linear interpolation)
  function ageToY(age) {
    const ratio = age / ageRange;
    return top + ratio * usableHeight;
  }

  // Calculate node radius from impact score (0-10 → 6-24)
  function impactToRadius(impact) {
    const clamped = Math.max(0, Math.min(10, impact || 0));
    return MIN_RADIUS + (clamped / 10) * (MAX_RADIUS - MIN_RADIUS);
  }

  // Flattened events with computed positions
  const positionedEvents = sorted.map(event => ({
    id: event.id,
    age: event.age,
    title: event.title,
    description: event.description,
    stage: event.stage,
    impact: event.impact,
    y: ageToY(event.age),
    radius: impactToRadius(event.impact),
  }));

  // Age ticks
  const ticks = [];
  for (let a = 0; a <= currentAge; a += TICK_INTERVAL) {
    ticks.push({ age: a, y: ageToY(a) });
  }
  if (currentAge % TICK_INTERVAL !== 0) {
    ticks.push({ age: currentAge, y: ageToY(currentAge) });
  }

  // Compute stage regions with colors
  const stages = inferStages(sorted).map(s => ({
    stage: s.stage,
    color: getStageColor(s.stage),
    startAge: s.startAge,
    endAge: s.endAge,
    startY: ageToY(s.startAge),
    endY: ageToY(s.endAge),
  }));

  return {
    events: positionedEvents,
    stages,
    ticks,
    totalHeight: height,
    padding: { top, bottom },
  };
}

export { calculateLayout };
