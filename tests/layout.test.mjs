import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createEvent } from '../src/core.mjs';
import { calculateLayout } from '../src/layout.mjs';

describe('calculateLayout', () => {
  it('returns empty layout for no events', () => {
    const layout = calculateLayout({ events: [], currentAge: 30, height: 600 });
    assert.equal(layout.events.length, 0);
    assert.ok(layout.totalHeight > 0);
  });

  it('positions events proportionally by age', () => {
    const events = [
      createEvent({ age: 10, title: '十岁', impact: 5 }),
      createEvent({ age: 20, title: '二十岁', impact: 5 }),
    ];
    const layout = calculateLayout({ events, currentAge: 20, height: 400 });

    assert.equal(layout.events.length, 2);
    // age 0 is at y=0 (top padding), age 20 is at y=400 (minus padding)
    // age 10 should be at ~50% of the usable height
    const topY = layout.events[0].y;
    const bottomY = layout.events[1].y;
    assert.ok(topY < bottomY, 'younger events should be higher (smaller y)');
  });

  it('positions age 0 at the top with padding', () => {
    const events = [
      createEvent({ age: 0, title: '出生', impact: 5 }),
      createEvent({ age: 30, title: '三十岁', impact: 5 }),
    ];
    const layout = calculateLayout({ events, currentAge: 30, height: 600 });

    // age 0 should be at the padding position from top
    assert.equal(layout.events[0].y, layout.padding.top);
  });

  it('positions currentAge at the bottom with padding', () => {
    const events = [
      createEvent({ age: 0, title: '出生', impact: 5 }),
      createEvent({ age: 30, title: '三十岁', impact: 5 }),
    ];
    const layout = calculateLayout({ events, currentAge: 30, height: 600 });

    // currentAge (30) should be at height - padding.bottom
    assert.equal(layout.events[1].y, 600 - layout.padding.bottom);
  });

  it('computes stage regions with start/end y positions', () => {
    const events = [
      createEvent({ age: 10, title: 'A', stage: '童年', impact: 3 }),
      createEvent({ age: 20, title: 'B', stage: '青年', impact: 7 }),
      createEvent({ age: 30, title: 'C', stage: '青年', impact: 5 }),
    ];
    const layout = calculateLayout({ events, currentAge: 30, height: 600 });

    assert.ok(layout.stages.length > 0);
    for (const stage of layout.stages) {
      assert.ok(stage.startY < stage.endY, 'stage startY must be less than endY');
      assert.ok(stage.startY >= 0);
      assert.ok(stage.endY <= 600);
    }
  });

  it('node radius reflects impact score', () => {
    const events = [
      createEvent({ age: 10, title: '低影响', impact: 1 }),
      createEvent({ age: 20, title: '高影响', impact: 10 }),
    ];
    const layout = calculateLayout({ events, currentAge: 30, height: 400 });

    assert.ok(layout.events[0].radius < layout.events[1].radius,
      'higher impact should have larger radius');
  });

  it('clamps node radius between min and max', () => {
    const events = [
      createEvent({ age: 10, title: '零影响', impact: 0 }),
      createEvent({ age: 20, title: '最大影响', impact: 10 }),
    ];
    const layout = calculateLayout({ events, currentAge: 30, height: 400 });

    assert.ok(layout.events[0].radius >= 6, 'min radius should be at least 6');
    assert.ok(layout.events[1].radius <= 24, 'max radius should be at most 24');
  });

  it('handles events sorted by age even if input is unsorted', () => {
    const events = [
      createEvent({ age: 30, title: 'C', impact: 3 }),
      createEvent({ age: 10, title: 'A', impact: 3 }),
      createEvent({ age: 20, title: 'B', impact: 3 }),
    ];
    const layout = calculateLayout({ events, currentAge: 30, height: 400 });

    assert.equal(layout.events[0].title, 'A');
    assert.equal(layout.events[1].title, 'B');
    assert.equal(layout.events[2].title, 'C');
  });

  it('returns age ticks from 0 to currentAge', () => {
    const events = [createEvent({ age: 10, title: 'X', impact: 5 })];
    const layout = calculateLayout({ events, currentAge: 25, height: 600 });
    assert.ok(Array.isArray(layout.ticks));
    assert.ok(layout.ticks.length >= 5); // 0,5,10,15,20,25 = 6
    assert.equal(layout.ticks[0].age, 0);
    assert.equal(layout.ticks[layout.ticks.length - 1].age, 25);
    layout.ticks.forEach(t => {
      assert.equal(typeof t.age, 'number');
      assert.equal(typeof t.y, 'number');
      assert.ok(t.y >= 0);
    });
  });

  it('stage bars have colors assigned', () => {
    const events = [
      createEvent({ age: 10, title: 'A', stage: '童年', impact: 3 }),
    ];
    const layout = calculateLayout({ events, currentAge: 30, height: 600 });
    assert.ok(layout.stages.length > 0);
    assert.ok(layout.stages[0].color);
    assert.match(layout.stages[0].color, /^#/);
  });

  it('uses custom tickInterval when provided', () => {
    const events = [createEvent({ age: 10, title: 'X', impact: 5 })];
    const layout = calculateLayout({ events, currentAge: 30, height: 600, tickInterval: 10 });
    // With tickInterval=10: ticks at 0,10,20,30 = 4 ticks
    assert.equal(layout.ticks.length, 4);
    assert.equal(layout.ticks[0].age, 0);
    assert.equal(layout.ticks[1].age, 10);
    assert.equal(layout.ticks[2].age, 20);
    assert.equal(layout.ticks[3].age, 30);
  });
});
