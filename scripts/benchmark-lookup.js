const BOOKINGS = 100000;
const LOOKUPS = 500;

import { newReference } from "../src/domain/ids.js";

const bookingsArray = [];
const bookingsMap = new Map();
const seenRefs = new Set();

let i = 0;
while (i < BOOKINGS) {
  let ref = newReference();
  if (seenRefs.has(ref)) {
    continue;
  }
  seenRefs.add(ref);
  const booking = {
    reference: ref,
    eventId: "event-1",
    quantity: 1,
    amountCents: 500000,
    status: "pending",
  };
  bookingsArray.push(booking);
  bookingsMap.set(ref, booking);
  i++;
}

const lookupRefs = [];
for (let k = 0; k < LOOKUPS; k++) {
  const idx = Math.floor(k * BOOKINGS / LOOKUPS);
  lookupRefs.push(bookingsArray[idx].reference);
}

const arrayResults = [];
const arrayStart = performance.now();
for (let k = 0; k < LOOKUPS; k++) {
  const ref = lookupRefs[k];
  const found = bookingsArray.find((b) => b.reference === ref);
  arrayResults.push(found);
}
const arrayEnd = performance.now();
const arrayMs = arrayEnd - arrayStart;

const mapResults = [];
const mapStart = performance.now();
for (let k = 0; k < LOOKUPS; k++) {
  const ref = lookupRefs[k];
  const found = bookingsMap.get(ref);
  mapResults.push(found);
}
const mapEnd = performance.now();
const mapMs = mapEnd - mapStart;

let allGood = true;
for (let k = 0; k < LOOKUPS; k++) {
  const expected = lookupRefs[k];
  const arrayFound = arrayResults[k];
  const mapFound = mapResults[k];
  if (!arrayFound || arrayFound.reference !== expected) {
    allGood = false;
  }
  if (!mapFound || mapFound.reference !== expected) {
    allGood = false;
  }
}

if (!allGood) {
  console.log("FAIL");
  process.exit(1);
}

console.log("bookings:", BOOKINGS);
console.log("lookups:", LOOKUPS);
console.log("array.find time:", arrayMs.toFixed(3), "ms");
console.log("Map.get time:", mapMs.toFixed(3), "ms");

if (mapMs === 0) {
  console.log("Map was: too fast to measure");
} else {
  console.log("Map was:", (arrayMs / mapMs).toFixed(1), "x faster");
}

console.log();
console.log("Why the times differ:");
console.log(
  "Array.find is O(n) per lookup because it can scan the whole array, so a larger",
);
console.log(
  "booking list tends to make each lookup slower. Map.get is O(1) on average,",
);
console.log(
  "so it stays almost flat as bookings grow. Doubling BOOKINGS should roughly",
);
console.log(
  "double the Array.find time and leave the Map time nearly unchanged. This",
);
console.log(
  "benchmark times only the lookups, then checks every result after the timer",
);
console.log("stops, so a wrong result cannot look fast.");
