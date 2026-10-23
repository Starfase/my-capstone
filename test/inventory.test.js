import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  findBookingByReference,
  publishEvent,
  unpublishEvent,
  listEventSummaries,
} from '../src/domain/inventory.js';
import { DomainError, ErrorCode } from '../src/domain/errors.js';

describe('inventory', () => {
  // ---------- Shared helpers ----------

  function deepCloneEvent(event) {
    return JSON.parse(JSON.stringify(event));
  }

  function snapshotEvents(store) {
    const events = [];
    for (const event of store.events.values()) {
      events.push(deepCloneEvent(event));
    }
    return events;
  }

  function assertEventUnchanged(store, eventId, label) {
    const event = store.events.get(eventId);
    assert.ok(event, label + ': event still exists');
  }

  function assertTiersUnchanged(store, eventId, savedEvent, label) {
    const currentEvent = store.events.get(eventId);
    assert.ok(currentEvent, label + ': event still exists');
    assert.deepStrictEqual(
      currentEvent.tiers,
      savedEvent.tiers,
      label + ': event tiers unchanged'
    );
  }

  function eventsMatchExpected(store, expectedEvents) {
    const actualEvents = snapshotEvents(store);
    assert.strictEqual(
      actualEvents.length,
      expectedEvents.length,
      'event count unchanged'
    );
    for (let i = 0; i < expectedEvents.length; i++) {
      assert.deepStrictEqual(actualEvents[i], expectedEvents[i], 'event unchanged at index ' + i);
    }
  }

  function assertValidation(fn) {
    assert.throws(
      fn,
      (error) =>
        error instanceof DomainError && error.code === ErrorCode.VALIDATION,
      'expected DomainError with code VALIDATION'
    );
  }

  function assertNotFound(fn) {
    assert.throws(
      fn,
      (error) =>
        error instanceof DomainError && error.code === ErrorCode.NOT_FOUND,
      'expected DomainError with code NOT_FOUND'
    );
  }

  function assertSoldOut(fn) {
    assert.throws(
      fn,
      (error) =>
        error instanceof DomainError && error.code === ErrorCode.SOLD_OUT,
      'expected DomainError with code SOLD_OUT'
    );
  }

  // ---------- S02: event creation and validation ----------

  describe('S02: event creation', () => {
    it('saves a draft event with a new id and hides it from the public list', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'Lagos Tech Meetup',
        city: 'Lagos',
        venue: 'Hall A',
        date: '2026-12-05',
      });

      assert.ok(typeof event.id === 'string' && event.id.length > 0, 'event has an id');
      assert.strictEqual(event.title, 'Lagos Tech Meetup');
      assert.strictEqual(event.city, 'Lagos');
      assert.strictEqual(event.venue, 'Hall A');
      assert.strictEqual(event.date, '2026-12-05');
      assert.strictEqual(event.published, false, 'event is a draft');
      assert.deepStrictEqual(event.tiers, [], 'event starts with no tiers');

      const publicSummaries = listEventSummaries(store);
      const publicIds = publicSummaries.map((s) => s.id);
      assert.strictEqual(
        publicIds.includes(event.id),
        false,
        'draft event is not on the public list'
      );
    });

    it('retains the created event in the store', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'Abuja Jazz Night',
        city: 'Abuja',
        date: '2026-12-06',
      });

      assert.ok(store.events.has(event.id), 'event is in the store');
      assert.strictEqual(store.events.get(event.id).title, 'Abuja Jazz Night');
    });

    it('rejects a blank title with VALIDATION and preserves existing events', () => {
      const existingStore = createStore();
      createEvent(existingStore, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(existingStore);

      assertValidation(() =>
        createEvent(existingStore, {
          title: '',
          city: 'Lagos',
          date: '2026-12-05',
        })
      );

      eventsMatchExpected(existingStore, savedEvents);
    });

    it('rejects a blank city with VALIDATION and preserves existing events', () => {
      const existingStore = createStore();
      createEvent(existingStore, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(existingStore);

      assertValidation(() =>
        createEvent(existingStore, {
          title: 'X',
          city: '',
          date: '2026-12-05',
        })
      );

      eventsMatchExpected(existingStore, savedEvents);
    });

    it('rejects an invalid date and preserves existing events', () => {
      const existingStore = createStore();
      createEvent(existingStore, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(existingStore);

      assertValidation(() =>
        createEvent(existingStore, {
          title: 'X',
          city: 'C',
          date: 'not-a-date',
        })
      );

      eventsMatchExpected(existingStore, savedEvents);

      assertValidation(() =>
        createEvent(existingStore, {
          title: 'X',
          city: 'C',
          date: '2026-02-30',
        })
      );

      eventsMatchExpected(existingStore, savedEvents);
    });

    it('rejects a missing title with VALIDATION and preserves existing events', () => {
      const existingStore = createStore();
      createEvent(existingStore, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(existingStore);

      assertValidation(() =>
        createEvent(existingStore, {
          city: 'C',
          date: '2026-12-05',
        })
      );

      eventsMatchExpected(existingStore, savedEvents);
    });

    it('rejects a missing city with VALIDATION and preserves existing events', () => {
      const existingStore = createStore();
      createEvent(existingStore, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(existingStore);

      assertValidation(() =>
        createEvent(existingStore, {
          title: 'X',
          date: '2026-12-05',
        })
      );

      eventsMatchExpected(existingStore, savedEvents);
    });

    it('rejects a non-string date and preserves existing events', () => {
      const existingStore = createStore();
      createEvent(existingStore, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(existingStore);

      assertValidation(() =>
        createEvent(existingStore, {
          title: 'X',
          city: 'C',
          date: null,
        })
      );

      eventsMatchExpected(existingStore, savedEvents);

      assertValidation(() =>
        createEvent(existingStore, {
          title: 'X',
          city: 'C',
          date: 20261205,
        })
      );

      eventsMatchExpected(existingStore, savedEvents);
    });

    it('creates an event with no venue and stores an empty venue string', () => {
      const event = createEvent(createStore(), {
        title: 'No Venue Event',
        city: 'C',
        date: '2026-12-05',
      });

      assert.strictEqual(event.venue, '');
    });

    it('rejects an explicitly provided blank venue with VALIDATION', () => {
      assertValidation(() =>
        createEvent(createStore(), {
          title: 'X',
          city: 'C',
          venue: '',
          date: '2026-12-05',
        })
      );

      assertValidation(() =>
        createEvent(createStore(), {
          title: 'X',
          city: 'C',
          venue: '   ',
          date: '2026-12-05',
        })
      );
    });

    it('preserves a date-only string with surrounding whitespace as-is', () => {
      const event = createEvent(createStore(), {
        title: '  Lagos Tech  ',
        city: ' Lagos ',
        date: '  2026-12-05  ',
      });

      assert.strictEqual(event.title, 'Lagos Tech');
      assert.strictEqual(event.city, 'Lagos');
      assert.strictEqual(
        event.date,
        '  2026-12-05  ',
        'date is stored as-is, including surrounding whitespace'
      );
    });

    it('trims a provided venue', () => {
      const event = createEvent(createStore(), {
        title: 'X',
        city: 'C',
        venue: '  Hall A  ',
        date: '2026-12-05',
      });

      assert.strictEqual(event.venue, 'Hall A');
    });
  });

  // ---------- S03: ticket tier creation and validation ----------

  describe('S03: ticket tier creation', () => {
    it('saves a tier with 0 sold and the requested capacity, leaving 100 seats left', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'Lagos Tech Meetup',
        city: 'Lagos',
        date: '2026-12-05',
      });
      addTier(store, event.id, {
        name: 'General',
        priceCents: 500000,
        capacity: 100,
      });

      const storedEvent = store.events.get(event.id);
      assert.ok(storedEvent, 'event still exists');
      assert.strictEqual(storedEvent.tiers.length, 1, 'event has one tier');

      const tier = storedEvent.tiers[0];
      assert.strictEqual(tier.name, 'General');
      assert.strictEqual(tier.priceCents, 500000);
      assert.strictEqual(tier.capacity, 100);
      assert.strictEqual(tier.sold, 0, 'tier starts with 0 sold');
      assert.strictEqual(
        tier.capacity - tier.sold,
        100,
        'this tier has 100 seats left'
      );

      const summaries = listEventSummaries(store, { publishedOnly: false });
      const summary = summaries.find((s) => s.id === event.id);
      assert.ok(summary, 'event has a summary');
      assert.strictEqual(summary.cheapestPriceCents, 500000);
      assert.strictEqual(summary.seatsLeft, 100);
    });

    it('rejects a non-whole-number price with VALIDATION and preserves the event after each failure', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'X',
        city: 'C',
        date: '2026-12-05',
      });

      const snapshot1 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: 'General',
          priceCents: 50000.5,
          capacity: 100,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), snapshot1, 'event unchanged after fractional price');

      const snapshot2 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: 'General',
          priceCents: -100,
          capacity: 100,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), snapshot2, 'event unchanged after negative price');

      const snapshot3 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: 'General',
          priceCents: '500000',
          capacity: 100,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), snapshot3, 'event unchanged after non-number price');
    });

    it('rejects a capacity less than 1 with VALIDATION and preserves the event after each failure', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'X',
        city: 'C',
        date: '2026-12-05',
      });

      const capSnapshot1 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: 'General',
          priceCents: 500000,
          capacity: 100.5,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), capSnapshot1, 'event unchanged after fractional capacity');

      const capSnapshot2 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: 'General',
          priceCents: 500000,
          capacity: 0,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), capSnapshot2, 'event unchanged after zero capacity');

      const capSnapshot3 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: 'General',
          priceCents: 500000,
          capacity: -1,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), capSnapshot3, 'event unchanged after negative capacity');

      const capSnapshot4 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: 'General',
          priceCents: 500000,
          capacity: '100',
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), capSnapshot4, 'event unchanged after non-number capacity');
    });

    it('rejects a non-existent event id with NOT_FOUND and preserves existing events', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(store);

      assertNotFound(() =>
        addTier(store, 'no-such-event', {
          name: 'General',
          priceCents: 500000,
          capacity: 100,
        })
      );

      eventsMatchExpected(store, savedEvents);
    });

    it('rejects a blank tier name with VALIDATION and preserves the event', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'X',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvent = deepCloneEvent(event);

      const preInvalidName1 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: '',
          priceCents: 500000,
          capacity: 100,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), preInvalidName1, 'event unchanged after blank tier name');

      const preInvalidName2 = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: '   ',
          priceCents: 500000,
          capacity: 100,
        })
      );
      assert.deepStrictEqual(store.events.get(event.id), preInvalidName2, 'event unchanged after whitespace tier name');

      assertEventUnchanged(store, event.id, 'blank tier name');
      assert.deepStrictEqual(
        store.events.get(event.id),
        savedEvent,
        'event unchanged after blank tier name attempts'
      );
    });

    it('rejects a duplicate tier name with VALIDATION and leaves the event unchanged', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'X',
        city: 'C',
        date: '2026-12-05',
      });
      addTier(store, event.id, {
        name: 'General',
        priceCents: 500000,
        capacity: 100,
      });

      const savedEvent = deepCloneEvent(event);

      const preDuplicate = deepCloneEvent(event);
      assertValidation(() =>
        addTier(store, event.id, {
          name: '  General  ',
          priceCents: 300000,
          capacity: 50,
        })
      );

      assert.deepStrictEqual(store.events.get(event.id), preDuplicate, 'event unchanged after duplicate tier name');
      assert.deepStrictEqual(event, savedEvent, 'event tiers unchanged after duplicate name');
      assert.strictEqual(event.tiers.length, 1);
      assert.strictEqual(event.tiers[0].priceCents, 500000);
      assert.strictEqual(event.tiers[0].capacity, 100);
    });

    it('trims a tier name', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'X',
        city: 'C',
        date: '2026-12-05',
      });
      const tier = addTier(store, event.id, {
        name: '  General  ',
        priceCents: 500000,
        capacity: 100,
      });

      assert.strictEqual(tier.name, 'General');
    });
  });

  // ---------- S04: publish and unpublish ----------

  describe('S04: publish and unpublish', () => {
    function makePublishedEvent() {
      const store = createStore();
      const event = createEvent(store, {
        title: 'Lagos Tech Meetup',
        city: 'Lagos',
        date: '2026-12-05',
      });
      addTier(store, event.id, {
        name: 'General',
        priceCents: 500000,
        capacity: 10,
      });
      publishEvent(store, event.id);
      return { store, event };
    }

    it('publishes an existing draft event with at least one tier and shows it on the public list', () => {
      const store = createStore();
      const event = createEvent(store, {
        title: 'Lagos Tech Meetup',
        city: 'Lagos',
        date: '2026-12-05',
      });
      addTier(store, event.id, {
        name: 'General',
        priceCents: 500000,
        capacity: 10,
      });

      const published = publishEvent(store, event.id);

      assert.strictEqual(published.id, event.id);
      assert.strictEqual(published.published, true);

      const publicSummaries = listEventSummaries(store, { publishedOnly: true });
      const publicIds = publicSummaries.map((s) => s.id);
      assert.ok(
        publicIds.includes(event.id),
        'published event appears on the public list'
      );
    });

    it('unpublishes an existing published event and removes it from the public list', () => {
      const { store, event } = makePublishedEvent();

      assert.strictEqual(event.published, true, 'event starts published');

      const unpublished = unpublishEvent(store, event.id);

      assert.strictEqual(unpublished.id, event.id);
      assert.strictEqual(unpublished.published, false);

      const publicSummaries = listEventSummaries(store, { publishedOnly: true });
      assert.ok(
        publicSummaries.every((s) => s.id !== event.id),
        'unpublished event is not on the public list'
      );
    });

    it('fails with NOT_FOUND for a nonexistent event id and changes nothing', () => {
      const store = createStore();
      createEvent(store, {
        title: 'Existing Event',
        city: 'C',
        date: '2026-12-05',
      });
      const savedEvents = snapshotEvents(store);

      assertNotFound(() => publishEvent(store, 'no-such-event'));
      assertNotFound(() => unpublishEvent(store, 'no-such-event'));

      eventsMatchExpected(store, savedEvents);
    });
  });

  // ---------- S06: ticket booking, sold-out errors, and quantity validation ----------

  describe('S06: ticket booking', () => {
    function makePublishedStoreWithTier(tierCapacity) {
      const store = createStore();
      const event = createEvent(store, {
        title: 'Lagos Tech Meetup',
        city: 'Lagos',
        date: '2026-12-05',
      });
      addTier(store, event.id, {
        name: 'General',
        priceCents: 500000,
        capacity: tierCapacity,
      });
      publishEvent(store, event.id);
      return { store, event };
    }

    it('creates a pending booking and reduces seats left', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      const booking = bookTickets(store, event.id, 'General', 2);

      assert.strictEqual(booking.eventId, event.id);
      assert.strictEqual(booking.tierName, 'General');
      assert.strictEqual(booking.quantity, 2);
      assert.strictEqual(booking.amountCents, 1000000);
      assert.strictEqual(booking.status, 'pending');
      assert.ok(typeof booking.reference === 'string' && booking.reference.length > 0);

      const storedBooking = findBookingByReference(store, booking.reference);
      assert.ok(storedBooking, 'booking is stored by reference');
      assert.strictEqual(storedBooking.tierName, 'General');
      assert.strictEqual(storedBooking.quantity, 2);

      const tier = event.tiers.find((t) => t.name === 'General');
      assert.strictEqual(tier.sold, 2);

      const summaries = listEventSummaries(store, { publishedOnly: true });
      const summary = summaries.find((s) => s.id === event.id);
      assert.strictEqual(summary.cheapestPriceCents, 500000);
      assert.strictEqual(summary.seatsLeft, 1);
    });

    it('rejects a quantity of 0 with VALIDATION', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      assertValidation(() => bookTickets(store, event.id, 'General', 0));
    });

    it('rejects a negative quantity with VALIDATION', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      assertValidation(() => bookTickets(store, event.id, 'General', -1));
    });

    it('rejects a fractional quantity with VALIDATION', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      assertValidation(() => bookTickets(store, event.id, 'General', 2.5));
    });

    it('rejects a quantity greater than 10 with VALIDATION', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      assertValidation(() => bookTickets(store, event.id, 'General', 11));
    });

    it('rejects a non-number quantity with VALIDATION and preserves the event', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      const tierBefore = deepCloneEvent(event.tiers[0]);
      const bookingCountBefore = store.bookings.size;

      assertValidation(() => bookTickets(store, event.id, 'General', '2'));

      assert.deepStrictEqual(
        event.tiers.find((t) => t.name === 'General'),
        tierBefore,
        'tier unchanged after invalid quantity'
      );
      assert.strictEqual(
        store.bookings.size,
        bookingCountBefore,
        'no booking added'
      );
    });

    it('rejects a sold-out booking with SOLD_OUT and changes nothing', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      bookTickets(store, event.id, 'General', 2);

      const tierBefore = deepCloneEvent(event.tiers[0]);
      const bookingCountBefore = store.bookings.size;

      assertSoldOut(() => bookTickets(store, event.id, 'General', 2));

      assert.deepStrictEqual(
        event.tiers.find((t) => t.name === 'General'),
        tierBefore,
        'tier sold count unchanged after sold-out failure'
      );
      assert.strictEqual(store.bookings.size, bookingCountBefore, 'no booking added');
    });

    it('rejects an unknown event with NOT_FOUND and adds no booking', () => {
      const store = createStore();
      assertNotFound(() => bookTickets(store, 'no-such-event', 'General', 1));
      assert.strictEqual(
        store.bookings.size,
        0,
        'no booking added for unknown event'
      );
    });

    it('rejects an unknown tier name with NOT_FOUND and preserves the event', () => {
      const { store, event } = makePublishedStoreWithTier(5);
      const tierBefore = deepCloneEvent(event.tiers[0]);
      const bookingCountBefore = store.bookings.size;

      assertNotFound(() => bookTickets(store, event.id, 'VIP', 1));

      const tier = event.tiers.find((t) => t.name === 'General');
      assert.deepStrictEqual(
        tier,
        tierBefore,
        'tier unchanged after unknown tier failure'
      );
      assert.strictEqual(
        store.bookings.size,
        bookingCountBefore,
        'no booking added'
      );
    });

    it('prices the booking in whole cents', () => {
      const { store, event } = makePublishedStoreWithTier(10);
      addTier(store, event.id, {
        name: 'VIP',
        priceCents: 300000,
        capacity: 10,
      });
      const booking = bookTickets(store, event.id, 'VIP', 3);

      assert.strictEqual(booking.amountCents, 900000);
      assert.strictEqual(booking.tierName, 'VIP');
    });

    it('fails before it mutates the store for an invalid quantity', () => {
      const { store, event } = makePublishedStoreWithTier(3);
      const tierBefore = deepCloneEvent(event.tiers[0]);
      const bookingCountBefore = store.bookings.size;

      assertValidation(() => bookTickets(store, event.id, 'General', -1));

      assert.deepStrictEqual(
        event.tiers.find((t) => t.name === 'General'),
        tierBefore,
        'tier unchanged after invalid quantity'
      );
      assert.strictEqual(store.bookings.size, bookingCountBefore, 'no booking added');
    });
  });
});
