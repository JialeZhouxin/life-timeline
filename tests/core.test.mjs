import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createEvent, addEvent, updateEvent, deleteEvent, inferStages } from '../src/core.mjs';

describe('createEvent', () => {
  it('creates an event with required fields', () => {
    const event = createEvent({ age: 22, title: '大学毕业' });

    assert.equal(typeof event.id, 'string');
    assert.ok(event.id.length > 0);
    assert.equal(event.age, 22);
    assert.equal(event.title, '大学毕业');
    assert.equal(event.description, '');
    assert.equal(event.stage, '');
    assert.equal(event.impact, 0);
  });

  it('creates an event with all optional fields', () => {
    const event = createEvent({
      age: 28,
      title: '创业',
      description: '和合伙人一起创办了科技公司',
      stage: '职场',
      impact: 8,
    });

    assert.equal(event.age, 28);
    assert.equal(event.title, '创业');
    assert.equal(event.description, '和合伙人一起创办了科技公司');
    assert.equal(event.stage, '职场');
    assert.equal(event.impact, 8);
  });

  it('throws when age is missing', () => {
    assert.throws(() => createEvent({ title: 'test' }), /age.*required/i);
  });

  it('throws when title is missing', () => {
    assert.throws(() => createEvent({ age: 20 }), /title.*required/i);
  });

  it('throws when age is negative', () => {
    assert.throws(() => createEvent({ age: -1, title: 'test' }), /age/i);
  });

  it('throws when impact is out of range', () => {
    assert.throws(() => createEvent({ age: 20, title: 'test', impact: 11 }), /impact.*0.*10/i);
    assert.throws(() => createEvent({ age: 20, title: 'test', impact: -1 }), /impact.*0.*10/i);
  });
});

describe('addEvent', () => {
  it('adds an event to an empty list', () => {
    const event = createEvent({ age: 22, title: '大学毕业' });
    const result = addEvent([], event);

    assert.equal(result.length, 1);
    assert.equal(result[0], event);
  });

  it('adds an event to an existing list', () => {
    const e1 = createEvent({ age: 10, title: 'A' });
    const e2 = createEvent({ age: 20, title: 'B' });
    const result = addEvent([e1], e2);

    assert.equal(result.length, 2);
    assert.equal(result[0], e1);
    assert.equal(result[1], e2);
  });

  it('does not mutate the original array', () => {
    const original = [createEvent({ age: 10, title: 'A' })];
    const newEvent = createEvent({ age: 20, title: 'B' });
    const result = addEvent(original, newEvent);

    assert.equal(original.length, 1);
    assert.equal(result.length, 2);
  });
});

describe('updateEvent', () => {
  it('updates an event by id', () => {
    const event = createEvent({ age: 22, title: '大学毕业' });
    const events = [event];
    const result = updateEvent(events, event.id, { title: '研究生毕业', age: 25 });

    assert.equal(result.length, 1);
    assert.equal(result[0].title, '研究生毕业');
    assert.equal(result[0].age, 25);
    assert.equal(result[0].description, ''); // unchanged
  });

  it('does not mutate the original array or event', () => {
    const event = createEvent({ age: 22, title: '大学毕业' });
    const events = [event];
    const result = updateEvent(events, event.id, { title: '研究生毕业' });

    assert.equal(events[0].title, '大学毕业'); // original unchanged
    assert.equal(result[0].title, '研究生毕业');
  });

  it('throws when event id not found', () => {
    assert.throws(() => updateEvent([], 'nonexistent', { title: 'x' }), /not found/i);
  });
});

describe('deleteEvent', () => {
  it('deletes an event by id', () => {
    const e1 = createEvent({ age: 10, title: 'A' });
    const e2 = createEvent({ age: 20, title: 'B' });
    const result = deleteEvent([e1, e2], e1.id);

    assert.equal(result.length, 1);
    assert.equal(result[0].id, e2.id);
  });

  it('does not mutate the original array', () => {
    const e1 = createEvent({ age: 10, title: 'A' });
    const events = [e1];
    deleteEvent(events, e1.id);

    assert.equal(events.length, 1);
  });

  it('throws when event id not found', () => {
    assert.throws(() => deleteEvent([], 'nonexistent'), /not found/i);
  });
});

describe('inferStages', () => {
  it('returns empty array for no events', () => {
    assert.deepEqual(inferStages([]), []);
  });

  it('returns no stages when no events have a stage', () => {
    const events = [
      createEvent({ age: 10, title: 'A' }),
      createEvent({ age: 20, title: 'B' }),
    ];
    assert.deepEqual(inferStages(events), []);
  });

  it('infers a single stage from one event', () => {
    const events = [
      createEvent({ age: 10, title: '搬家', stage: '童年' }),
    ];
    const stages = inferStages(events);
    assert.equal(stages.length, 1);
    assert.equal(stages[0].stage, '童年');
    assert.equal(stages[0].startAge, 0);
    assert.equal(stages[0].endAge, 10);
  });

  it('infers stages between events with different stages', () => {
    const events = [
      createEvent({ age: 12, title: '上初中', stage: '青春期' }),
      createEvent({ age: 18, title: '上大学', stage: '青年' }),
    ];
    const stages = inferStages(events);

    assert.equal(stages.length, 2);
    // First stage: before the first event, we use its stage
    assert.equal(stages[0].stage, '青春期');
    assert.equal(stages[0].startAge, 0);
    assert.equal(stages[0].endAge, 12);
    // Second stage:
    assert.equal(stages[1].stage, '青年');
    assert.equal(stages[1].startAge, 12);
    assert.equal(stages[1].endAge, 18);
  });

  it('merges consecutive events with the same stage', () => {
    const events = [
      createEvent({ age: 10, title: 'A', stage: '童年' }),
      createEvent({ age: 12, title: 'B', stage: '童年' }),
      createEvent({ age: 18, title: 'C', stage: '青年' }),
    ];
    const stages = inferStages(events);

    assert.equal(stages.length, 2);
    // 童年 covers 0-12 (merged A and B)
    assert.equal(stages[0].stage, '童年');
    assert.equal(stages[0].startAge, 0);
    assert.equal(stages[0].endAge, 12);
    // 青年 covers 12-18
    assert.equal(stages[1].stage, '青年');
    assert.equal(stages[1].startAge, 12);
    assert.equal(stages[1].endAge, 18);
  });
});
