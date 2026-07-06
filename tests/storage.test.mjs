import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createEvent } from '../src/core.mjs';
import { saveEvents, loadEvents } from '../src/storage.mjs';

// In-memory mock for localStorage
class MockStorage {
  constructor() {
    this._data = {};
  }
  getItem(key) { return this._data[key] || null; }
  setItem(key, value) { this._data[key] = String(value); }
  removeItem(key) { delete this._data[key]; }
  clear() { this._data = {}; }
}

describe('storage', () => {
  let mockStorage;

  before(() => {
    mockStorage = new MockStorage();
    // inject mock
    global.localStorage = mockStorage;
  });

  after(() => {
    delete global.localStorage;
  });

  it('saves and loads events', () => {
    const events = [
      createEvent({ age: 10, title: 'A' }),
      createEvent({ age: 20, title: 'B' }),
    ];
    saveEvents(events);
    const loaded = loadEvents();
    assert.equal(loaded.length, 2);
    assert.equal(loaded[0].title, 'A');
    assert.equal(loaded[0].age, 10);
  });

  it('returns empty array when no saved events', () => {
    mockStorage.clear();
    const loaded = loadEvents();
    assert.deepEqual(loaded, []);
  });

  it('overwrites previous data on save', () => {
    const e1 = createEvent({ age: 10, title: 'A' });
    saveEvents([e1]);

    const e2 = createEvent({ age: 20, title: 'B' });
    saveEvents([e2]);

    const loaded = loadEvents();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, 'B');
  });
});
