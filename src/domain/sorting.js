// src/domain/sorting.js
//
// Hand-written merge sort for Build 2.
// It returns a new sorted array and never changes the input array.
// When two items compare equal, the one from the left side is taken first,
// so the sort is stable: equal items keep their original order.

export function mergeSort(items, compare) {
  // Base case: an array with 0 or 1 items is already sorted.
  // We still return a new array so the caller always gets a fresh copy.
  if (items.length <= 1) {
    return items.slice();
  }

  // Split the array into two halves.
  const middle = Math.floor(items.length / 2);
  const left = items.slice(0, middle);
  const right = items.slice(middle);

  // Recursively sort each half.
  const sortedLeft = mergeSort(left, compare);
  const sortedRight = mergeSort(right, compare);

  // Merge the two sorted halves into one new sorted array.
  return merge(sortedLeft, sortedRight, compare);
}

// Merge two already-sorted arrays into a new sorted array.
// When compare(left[i], right[j]) === 0, we take the left item first.
// That is what makes the overall sort stable.
function merge(left, right, compare) {
  const result = [];
  let i = 0;
  let j = 0;

  // Walk through both arrays until one of them is used up.
  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      // Left item comes first, or left and right are equal.
      // Taking the left item first is what keeps the sort stable.
      result.push(left[i]);
      i++;
    } else {
      // Right item comes first.
      result.push(right[j]);
      j++;
    }
  }

  // One array still has leftovers. Append them unchanged.
  while (i < left.length) {
    result.push(left[i]);
    i++;
  }
  while (j < right.length) {
    result.push(right[j]);
    j++;
  }

  return result;
}
