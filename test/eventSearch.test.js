import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents, sortEvents, searchEvents } from '../src/domain/eventSearch.js';
import { DomainError, ErrorCode } from '../src/domain/errors.js';

describe('eventSearch', () => {
  // ---------- Shared helpers ----------

  function copySummaries(summaries) {
    return JSON.parse(JSON.stringify(summaries));
  }

  function assertValidation(fn) {
    assert.throws(
      fn,
      (error) =>
        error instanceof DomainError && error.code === ErrorCode.VALIDATION,
      'expected DomainError with code VALIDATION',
    );
  }

  function assertUnchanged(original, savedCopy, label) {
    assert.deepStrictEqual(original, savedCopy, label + ' original array unchanged');
  }

  // ---------- Fixtures ----------

  const textCityRows = [
    {
      id: 'lagos-tech',
      title: 'Lagos Tech Meetup',
      venue: 'Hall A',
      city: 'Lagos',
      date: '2026-12-05',
      cheapestPriceCents: 500000,
      seatsLeft: 10,
    },
    {
      id: 'abuja-jazz',
      title: 'Abuja Jazz Night',
      venue: 'Cafe B',
      city: 'Abuja',
      date: '2026-12-05',
      cheapestPriceCents: 300000,
      seatsLeft: 5,
    },
    {
      id: 'remote-meetup',
      title: 'Remote Meetup',
      venue: 'Online',
      city: 'Lagos',
      date: '2026-12-06',
      cheapestPriceCents: null,
      seatsLeft: 0,
    },
  ];

  const dateRangeRows = [
    {
      id: 'before-day',
      title: 'Before Day',
      venue: 'V',
      city: 'C',
      date: '2026-12-04',
      cheapestPriceCents: 100000,
      seatsLeft: 1,
    },
    {
      id: 'whole-day',
      title: 'Whole Day Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-05',
      cheapestPriceCents: 200000,
      seatsLeft: 1,
    },
    {
      id: 'afternoon-event',
      title: 'Afternoon Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-05T17:00:00',
      cheapestPriceCents: 250000,
      seatsLeft: 1,
    },
    {
      id: 'next-day',
      title: 'Next Day Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-06',
      cheapestPriceCents: 300000,
      seatsLeft: 1,
    },
    {
      id: 'midnight-event',
      title: 'Midnight Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-05T00:00:00',
      cheapestPriceCents: 150000,
      seatsLeft: 1,
    },
  ];

  const priceAvailRows = [
    {
      id: 'cheap',
      title: 'Cheap Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-01',
      cheapestPriceCents: 100000,
      seatsLeft: 4,
    },
    {
      id: 'mid',
      title: 'Mid Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-02',
      cheapestPriceCents: 300000,
      seatsLeft: 2,
    },
    {
      id: 'no-price',
      title: 'No Price Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-03',
      cheapestPriceCents: null,
      seatsLeft: 1,
    },
    {
      id: 'sold-out',
      title: 'Sold Out Event',
      venue: 'V',
      city: 'C',
      date: '2026-12-04',
      cheapestPriceCents: 200000,
      seatsLeft: 0,
    },
  ];

  const idTieRows = [
    { id: 'b', title: 'Same Event', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
    { id: 'a', title: 'Same Event', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
  ];

  // ---------- Text search ----------

  describe('text search', () => {
    it('matches a title case-insensitively', () => {
      const result = filterEvents(textCityRows, { q: 'JAZZ' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'abuja-jazz');
    });

    it('matches a venue as well as a title', () => {
      const jazzInVenue = [
        { ...textCityRows[0], id: 'hall-jazz', title: 'Something Else', venue: 'Jazz Club' },
        { ...textCityRows[1], id: 'abuja-jazz-2', title: 'Abuja Jazz Night', venue: 'Cafe B' },
      ];
      const result = filterEvents(jazzInVenue, { q: 'jazz' });
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result.map((r) => r.id).sort().join(','), 'abuja-jazz-2,hall-jazz');
    });

    it('is case-insensitive', () => {
      const result = filterEvents(textCityRows, { q: 'lagos' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'lagos-tech');
    });
  });

  // ---------- City filtering ----------

  describe('city filtering', () => {
    it('filters by city ignoring case', () => {
      const result = filterEvents(textCityRows, { city: 'lagos' });
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result.every((r) => r.city.toLowerCase() === 'lagos'), true);
    });

    it('matches uppercase city input', () => {
      const result = filterEvents(textCityRows, { city: 'ABUJA' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'abuja-jazz');
    });
  });

  // ---------- Date filtering ----------

  describe('date filtering', () => {
    it('includes an event exactly on the inclusive from date', () => {
      const saved = copySummaries(dateRangeRows);
      const result = filterEvents(dateRangeRows, { from: '2026-12-05' });
      assert.strictEqual(result !== dateRangeRows, true, 'filterEvents returns a new array');
      assertUnchanged(dateRangeRows, saved, 'date inclusive from');
      assert.strictEqual(result.length, 4);
      assert.strictEqual(result.some((r) => r.id === 'whole-day'), true);
    });

    it('regression: date-only from includes an event on the selected start date', () => {
      const rows = [
        { id: 'on-day', title: 'On Day', venue: 'V', city: 'C', date: '2026-10-23', cheapestPriceCents: 100000, seatsLeft: 1 },
        { id: 'before-day', title: 'Before Day', venue: 'V', city: 'C', date: '2026-10-22', cheapestPriceCents: 100000, seatsLeft: 1 },
      ];
      const saved = copySummaries(rows);
      const result = filterEvents(rows, { from: '2026-10-23' });
      assert.strictEqual(result !== rows, true, 'filterEvents returns a new array');
      assertUnchanged(rows, saved, 'date-only from start date inclusive');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'on-day');
    });

    it('date-only to includes the whole specified day, including an afternoon event', () => {
      const saved = copySummaries(dateRangeRows);
      const result = filterEvents(dateRangeRows, { to: '2026-12-05' });
      assert.strictEqual(result !== dateRangeRows, true, 'filterEvents returns a new array');
      assertUnchanged(dateRangeRows, saved, 'date-only to whole day');
      assert.strictEqual(result.length, 4);
      assert.strictEqual(result.some((r) => r.id === 'whole-day'), true);
      assert.strictEqual(result.some((r) => r.id === 'afternoon-event'), true);
      assert.strictEqual(result.some((r) => r.id === 'before-day'), true);
      assert.strictEqual(result.some((r) => r.id === 'midnight-event'), true);
    });

    it('date-only to excludes the next calendar day', () => {
      const saved = copySummaries(dateRangeRows);
      const result = filterEvents(dateRangeRows, { to: '2026-12-05' });
      assert.strictEqual(result !== dateRangeRows, true, 'filterEvents returns a new array');
      assertUnchanged(dateRangeRows, saved, 'date-only to excludes next day');
      assert.strictEqual(result.some((r) => r.id === 'next-day'), false);
    });

    it('from and date-only to together form an inclusive single-day range', () => {
      const saved = copySummaries(dateRangeRows);
      const result = filterEvents(dateRangeRows, { from: '2026-12-05', to: '2026-12-05' });
      assert.strictEqual(result !== dateRangeRows, true, 'filterEvents returns a new array');
      assertUnchanged(dateRangeRows, saved, 'date from+to range');
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result.some((r) => r.id === 'whole-day'), true);
      assert.strictEqual(result.some((r) => r.id === 'afternoon-event'), true);
      assert.strictEqual(result.some((r) => r.id === 'midnight-event'), true);
    });

    it('date-time to includes events at or before the boundary, including an earlier day', () => {
      const saved = copySummaries(dateRangeRows);
      const result = filterEvents(dateRangeRows, { to: '2026-12-05T00:00:00' });
      assert.strictEqual(result !== dateRangeRows, true, 'filterEvents returns a new array');
      assertUnchanged(dateRangeRows, saved, 'date-time to inclusive boundary');
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result.some((r) => r.id === 'before-day'), true);
      assert.strictEqual(result.some((r) => r.id === 'midnight-event'), true);
    });

    it('date-only to includes an event at 5 PM on that day', () => {
      const eventAt5Pm = [
        { id: 'eve', title: 'Event', venue: 'V', city: 'C', date: '2026-12-05T17:00:00', cheapestPriceCents: 100000, seatsLeft: 1 },
      ];
      const saved = copySummaries(eventAt5Pm);
      const result = filterEvents(eventAt5Pm, { to: '2026-12-05' });
      assert.strictEqual(result !== eventAt5Pm, true, 'filterEvents returns a new array');
      assertUnchanged(eventAt5Pm, saved, 'date-only to includes 5pm event');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'eve');
    });
  });

  // ---------- Invalid date filters ----------

  describe('invalid date filters', () => {
    it('rejects an invalid from string', () => {
      assertValidation(() => filterEvents([], { from: 'not-a-date' }));
    });

    it('rejects an invalid to string', () => {
      assertValidation(() => filterEvents([], { to: 'nope' }));
    });

    it('rejects null from', () => {
      assertValidation(() => filterEvents([], { from: null }));
    });

    it('rejects null to', () => {
      assertValidation(() => filterEvents([], { to: null }));
    });

    it('rejects an impossible date-only from', () => {
      assertValidation(() => filterEvents([], { from: '2026-02-30' }));
    });

    it('rejects an impossible date-only to', () => {
      assertValidation(() => filterEvents([], { to: '2026-02-30' }));
    });

    it('accepts a valid date-only from with surrounding whitespace', () => {
      const rows = [
        { id: 'x', title: 'X', venue: 'V', city: 'C', date: '2026-12-05', cheapestPriceCents: 100000, seatsLeft: 1 },
      ];
      const saved = copySummaries(rows);
      const result = filterEvents(rows, { from: '  2026-12-05  ' });
      assert.strictEqual(result !== rows, true, 'filterEvents returns a new array');
      assertUnchanged(rows, saved, 'valid date-only from with whitespace');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'x');
    });

    it('rejects an invalid date-only string with surrounding whitespace', () => {
      assertValidation(() => filterEvents([], { from: '   bad-date   ' }));
    });

    it('rejects an impossible date-only string with surrounding whitespace', () => {
      assertValidation(() => filterEvents([], { from: '  2026-02-30  ' }));
    });
  });

  // ---------- Maximum-price filter ----------

  describe('maximum-price filter', () => {
    it('keeps only events within the maximum', () => {
      const saved = copySummaries(priceAvailRows);
      const result = filterEvents(priceAvailRows, { maxPriceCents: 200000 });
      assert.strictEqual(result !== priceAvailRows, true, 'filterEvents returns a new array');
      assertUnchanged(priceAvailRows, saved, 'maxPrice keeps within limit');
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result.map((r) => r.id).sort().join(','), 'cheap,sold-out');
    });

    it('excludes events with no price', () => {
      const saved = copySummaries(priceAvailRows);
      const result = filterEvents(priceAvailRows, { maxPriceCents: 999999 });
      assert.strictEqual(result !== priceAvailRows, true, 'filterEvents returns a new array');
      assertUnchanged(priceAvailRows, saved, 'maxPrice excludes no-price');
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result.some((r) => r.id === 'no-price'), false);
    });

    it('rejects a fractional maxPriceCents', () => {
      assertValidation(() => filterEvents([], { maxPriceCents: 10.5 }));
    });

    it('rejects a non-number maxPriceCents', () => {
      assertValidation(() => filterEvents([], { maxPriceCents: '500' }));
    });
  });

  // ---------- Availability filter ----------

  describe('availability filter', () => {
    it('keeps events with seatsLeft greater than zero', () => {
      const saved = copySummaries(priceAvailRows);
      const result = filterEvents(priceAvailRows, { onlyAvailable: true });
      assert.strictEqual(result !== priceAvailRows, true, 'filterEvents returns a new array');
      assertUnchanged(priceAvailRows, saved, 'onlyAvailable keeps seatsLeft>0');
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result.every((r) => r.seatsLeft > 0), true);
    });

    it('excludes events with zero seats left', () => {
      const saved = copySummaries(priceAvailRows);
      const result = filterEvents(priceAvailRows, { onlyAvailable: true });
      assert.strictEqual(result !== priceAvailRows, true, 'filterEvents returns a new array');
      assertUnchanged(priceAvailRows, saved, 'onlyAvailable excludes sold out');
      assert.strictEqual(result.some((r) => r.id === 'sold-out'), false);
    });
  });

  // ---------- Sorting ----------

  describe('sorting', () => {
    it('sorts by date earliest first', () => {
      const rows = [
        { id: 'later', title: 'Later', venue: 'V', city: 'C', date: '2026-12-02', cheapestPriceCents: 100000, seatsLeft: 1 },
        { id: 'earlier', title: 'Earlier', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
      ];
      const saved = copySummaries(rows);
      const sorted = sortEvents(rows, 'date');
      assert.strictEqual(sorted !== rows, true, 'sortEvents returns a new array');
      assertUnchanged(rows, saved, 'date sort earliest first');
      assert.strictEqual(sorted[0].id, 'earlier');
      assert.strictEqual(sorted[1].id, 'later');
    });

    it('sorts same-day events by title then id when titles differ', () => {
      const rows = [
        { id: 'b', title: 'B Event', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
        { id: 'a', title: 'A Event', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
      ];
      const saved = copySummaries(rows);
      const sorted = sortEvents(rows, 'date');
      assert.strictEqual(sorted !== rows, true, 'sortEvents returns a new array');
      assertUnchanged(rows, saved, 'date sort title tie break');
      assert.strictEqual(sorted[0].id, 'a');
      assert.strictEqual(sorted[1].id, 'b');
    });

    it('sorts by price cheapest first', () => {
      const rows = [
        { id: 'expensive', title: 'Expensive', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 500000, seatsLeft: 1 },
        { id: 'cheap', title: 'Cheap', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
      ];
      const saved = copySummaries(rows);
      const sorted = sortEvents(rows, 'price');
      assert.strictEqual(sorted !== rows, true, 'sortEvents returns a new array');
      assertUnchanged(rows, saved, 'price sort cheapest first');
      assert.strictEqual(sorted[0].id, 'cheap');
      assert.strictEqual(sorted[1].id, 'expensive');
    });

    it('puts no-price events last in price sorting', () => {
      const rows = [
        { id: 'no-price', title: 'No Price', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: null, seatsLeft: 1 },
        { id: 'priced', title: 'Priced', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 200000, seatsLeft: 1 },
      ];
      const saved = copySummaries(rows);
      const sorted = sortEvents(rows, 'price');
      assert.strictEqual(sorted !== rows, true, 'sortEvents returns a new array');
      assertUnchanged(rows, saved, 'price sort no-price last');
      assert.strictEqual(sorted[0].id, 'priced');
      assert.strictEqual(sorted[1].id, 'no-price');
    });

    it('sorts by availability most seats first', () => {
      const rows = [
        { id: 'few', title: 'Few', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
        { id: 'many', title: 'Many', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 5 },
      ];
      const saved = copySummaries(rows);
      const sorted = sortEvents(rows, 'availability');
      assert.strictEqual(sorted !== rows, true, 'sortEvents returns a new array');
      assertUnchanged(rows, saved, 'availability sort most seats first');
      assert.strictEqual(sorted[0].id, 'many');
      assert.strictEqual(sorted[1].id, 'few');
    });

    it('breaks equal primary sort values by id when titles are identical', () => {
      const saved = copySummaries(idTieRows);
      const sorted = sortEvents(idTieRows, 'date');
      assert.strictEqual(sorted !== idTieRows, true, 'sortEvents returns a new array');
      assertUnchanged(idTieRows, saved, 'id tie break on date');
      assert.strictEqual(sorted[0].id, 'a');
      assert.strictEqual(sorted[1].id, 'b');
    });

    it('rejects an unknown sortBy', () => {
      assertValidation(() => sortEvents([], 'bad'));
    });

    it('rejects a null sortBy', () => {
      assertValidation(() => sortEvents([], null));
    });

    it('rejects an omitted sortBy', () => {
      assertValidation(() => sortEvents([]));
    });
  });

  // ---------- Combined search ----------

  describe('combined search', () => {
    it('filters first, then sorts', () => {
      const rows = [
        { id: 'b', title: 'B', venue: 'V', city: 'Lagos', date: '2026-12-05', cheapestPriceCents: 200000, seatsLeft: 1 },
        { id: 'a', title: 'A', venue: 'V', city: 'Lagos', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 },
        { id: 'c', title: 'C', venue: 'V', city: 'Abuja', date: '2026-12-03', cheapestPriceCents: 150000, seatsLeft: 1 },
      ];
      const saved = copySummaries(rows);
      const result = searchEvents(rows, { city: 'lagos' }, 'date');
      assert.strictEqual(result !== rows, true, 'searchEvents returns a new array');
      assertUnchanged(rows, saved, 'searchEvents filter then sort');
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'a');
      assert.strictEqual(result[1].id, 'b');
    });
  });

  // ---------- Empty input and empty results ----------

  describe('empty input and empty results', () => {
    it('filterEvents returns an empty array for an empty input', () => {
      assert.strictEqual(filterEvents([], {}).length, 0);
    });

    it('sortEvents returns an empty array for an empty input', () => {
      assert.strictEqual(sortEvents([], 'date').length, 0);
    });

    it('searchEvents returns an empty array for an empty input', () => {
      assert.strictEqual(searchEvents([], {}, 'date').length, 0);
    });

    it('filterEvents returns an empty array when nothing matches', () => {
      const rows = [{ id: 'x', title: 'X', venue: 'V', city: 'C', date: '2026-12-01', cheapestPriceCents: 100000, seatsLeft: 1 }];
      const saved = copySummaries(rows);
      const result = filterEvents(rows, { q: 'zzz', city: 'Other' });
      assert.strictEqual(result !== rows, true, 'filterEvents returns a new array');
      assertUnchanged(rows, saved, 'filterEvents no match');
      assert.strictEqual(result.length, 0);
    });
  });

  // ---------- Input immutability ----------

  describe('input immutability', () => {
    it('filterEvents does not mutate the input', () => {
      const saved = copySummaries(textCityRows);
      const result = filterEvents(textCityRows, { city: 'lagos' });
      assert.strictEqual(result !== textCityRows, true, 'filterEvents returns a new array');
      assertUnchanged(textCityRows, saved, 'filterEvents');
    });

    it('sortEvents does not mutate the input', () => {
      const saved = copySummaries(idTieRows);
      const result = sortEvents(idTieRows, 'date');
      assert.strictEqual(result !== idTieRows, true, 'sortEvents returns a new array');
      assertUnchanged(idTieRows, saved, 'sortEvents');
    });

    it('searchEvents does not mutate the input', () => {
      const saved = copySummaries(textCityRows);
      const result = searchEvents(textCityRows, { city: 'lagos' }, 'date');
      assert.strictEqual(result !== textCityRows, true, 'searchEvents returns a new array');
      assertUnchanged(textCityRows, saved, 'searchEvents');
    });
  });
});
