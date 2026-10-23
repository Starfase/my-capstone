import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSort } from '../src/domain/sorting.js';

describe('mergeSort', () => {
  it('sorts numbers in ascending order using a numeric comparison function', () => {
    const input = [5, 2, 9, 1, 5, 6];
    const sorted = mergeSort(input, (a, b) => a - b);
    assert.deepStrictEqual(sorted, [1, 2, 5, 5, 6, 9]);
  });

  it('returns an empty array when given an empty array', () => {
    const input = [];
    const sorted = mergeSort(input, (a, b) => a - b);
    assert.deepStrictEqual(sorted, []);
  });

  it('returns a new array and leaves the original input array unchanged', () => {
    const input = [4, 2, 7, 1];
    const originalCopy = input.slice();
    const sorted = mergeSort(input, (a, b) => a - b);
    assert.notStrictEqual(sorted, input);
    assert.deepStrictEqual(input, originalCopy);
  });

  it('is stable: equal sort keys keep their original relative order', () => {
    const input = [
      { key: 2, id: 'first-2' },
      { key: 1, id: 'first-1' },
      { key: 2, id: 'second-2' },
      { key: 1, id: 'second-1' },
    ];
    const originalCopy = input.map((item) => ({ ...item }));
    const sorted = mergeSort(input, (a, b) => a.key - b.key);

    assert.notStrictEqual(sorted, input);
    assert.deepStrictEqual(input, originalCopy);

    assert.strictEqual(sorted[0].key, 1);
    assert.strictEqual(sorted[0].id, 'first-1');
    assert.strictEqual(sorted[1].key, 1);
    assert.strictEqual(sorted[1].id, 'second-1');
    assert.strictEqual(sorted[2].key, 2);
    assert.strictEqual(sorted[2].id, 'first-2');
    assert.strictEqual(sorted[3].key, 2);
    assert.strictEqual(sorted[3].id, 'second-2');
  });

  it('handles a single-item array and returns a new array', () => {
    const input = [42];
    const originalCopy = input.slice();
    const sorted = mergeSort(input, (a, b) => a - b);
    assert.notStrictEqual(sorted, input);
    assert.deepStrictEqual(sorted, [42]);
    assert.deepStrictEqual(input, originalCopy);
  });

  it('correctly handles an already-sorted array without changing its input', () => {
    const input = [1, 2, 3, 4, 5];
    const originalCopy = input.slice();
    const sorted = mergeSort(input, (a, b) => a - b);
    assert.notStrictEqual(sorted, input);
    assert.deepStrictEqual(sorted, [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(input, originalCopy);
  });

  it('correctly handles reverse-sorted input', () => {
    const input = [9, 7, 5, 3, 1];
    const originalCopy = input.slice();
    const sorted = mergeSort(input, (a, b) => a - b);
    assert.notStrictEqual(sorted, input);
    assert.deepStrictEqual(sorted, [1, 3, 5, 7, 9]);
    assert.deepStrictEqual(input, originalCopy);
  });
});
