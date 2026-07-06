// src/constants.mjs
// Shared constants and helpers for the life-timeline app.

export const STORAGE_KEY = 'life-timeline-events';

export const PADDING_TOP = 60;
export const PADDING_BOTTOM = 60;
export const MIN_RADIUS = 6;
export const MAX_RADIUS = 24;
export const TICK_INTERVAL = 5;
export const BASE_HEIGHT = 1200;
export const MIN_TIMELINE_HEIGHT = 600;

export const STAGE_COLORS = {
  '童年': '#60A5FA',
  '青春期': '#FBBF24',
  '青年': '#34D399',
  '职场': '#3B82F6',
  '中年': '#A78BFA',
  '晚年': '#F87171',
};

export function getStageColor(stage) {
  return STAGE_COLORS[stage] || '#94A3B8';
}
