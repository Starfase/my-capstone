// src/domain/inventory.js
//
// In-memory event, tier and booking store for Build 1.
//
// Money is stored as whole numbers of kobo/cents. Dates are ISO strings.
// A failed operation must not change any data.

import { DomainError, ErrorCode } from "./errors.js";

function isWholeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

import { newId, newReference } from "./ids.js";
import { Queue } from "./waitlistQueue.js";

const BOOKING_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
});

const VALID_STATUSES = Object.freeze([
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.CANCELLED,
]);

export function createStore() {
  return {
    events: new Map(),
    bookings: new Map(),
    waitlists: new Map(),
  };
}

export function createEvent(store, event) {
  const title = event.title;
  const city = event.city;
  const venue = event.venue;
  const date = event.date;

  if (typeof title !== "string" || title.trim() === "") {
    throw new DomainError("event title must not be blank", ErrorCode.VALIDATION);
  }
  if (typeof city !== "string" || city.trim() === "") {
    throw new DomainError("event city must not be blank", ErrorCode.VALIDATION);
  }
  if (typeof date !== "string" || !isValidDate(date)) {
    throw new DomainError("event date must be a valid date", ErrorCode.VALIDATION);
  }
  if (venue !== undefined && (typeof venue !== "string" || venue.trim() === "")) {
    throw new DomainError("event venue must not be blank if provided", ErrorCode.VALIDATION);
  }

  const id = newId();
  const newEvent = {
    id,
    title: title.trim(),
    city: city.trim(),
    venue: venue ? venue.trim() : "",
    date,
    published: false,
    tiers: [],
  };

  store.events.set(id, newEvent);
  return newEvent;
}

export function addTier(store, eventId, tier) {
  const event = store.events.get(eventId);
  if (!event) {
    throw new DomainError("event not found", ErrorCode.NOT_FOUND);
  }

  const name = tier.name;
  const priceCents = tier.priceCents;
  const capacity = tier.capacity;

  if (typeof name !== "string" || name.trim() === "") {
    throw new DomainError("tier name must not be blank", ErrorCode.VALIDATION);
  }
  if (!isWholeNumber(priceCents)) {
    throw new DomainError("tier price must be a whole number of kobo/cents", ErrorCode.VALIDATION);
  }
  if (typeof capacity !== "number" || !Number.isFinite(capacity) || !Number.isInteger(capacity) || capacity < 1) {
    throw new DomainError("tier capacity must be a whole number of at least 1", ErrorCode.VALIDATION);
  }

  if (event.tiers.some((t) => t.name === name.trim())) {
    throw new DomainError("tier name must be unique per event", ErrorCode.VALIDATION);
  }

  const newTier = {
    id: newId(),
    name: name.trim(),
    priceCents,
    capacity,
    sold: 0,
  };

  event.tiers.push(newTier);
  return newTier;
}

export function bookTickets(store, eventId, tierName, quantity) {
  if (!isWholeNumber(quantity) || quantity < 1 || quantity > 10) {
    throw new DomainError("ticket quantity must be a whole number from 1 to 10", ErrorCode.VALIDATION);
  }

  const event = store.events.get(eventId);
  if (!event) {
    throw new DomainError("event not found", ErrorCode.NOT_FOUND);
  }

  const tier = event.tiers.find((t) => t.name === tierName);
  if (!tier) {
    throw new DomainError("tier not found", ErrorCode.NOT_FOUND);
  }

  const seatsLeft = tier.capacity - tier.sold;
  if (seatsLeft < quantity) {
    throw new DomainError("not enough seats available", ErrorCode.SOLD_OUT);
  }

  const booking = {
    id: newId(),
    reference: newReference(),
    eventId,
    tierId: tier.id,
    tierName: tier.name,
    quantity,
    amountCents: tier.priceCents * quantity,
    status: BOOKING_STATUS.PENDING,
    created: new Date().toISOString(),
  };

  tier.sold += quantity;
  store.bookings.set(booking.reference, booking);
  return booking;
}

export function cancelBooking(store, reference) {
  const booking = store.bookings.get(reference);
  if (!booking) {
    throw new DomainError("booking not found", ErrorCode.NOT_FOUND);
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw new DomainError("booking is already cancelled", ErrorCode.INVALID_STATE);
  }

  booking.status = BOOKING_STATUS.CANCELLED;

  const event = store.events.get(booking.eventId);
  if (event) {
    const tier = event.tiers.find((t) => t.id === booking.tierId);
    if (tier) {
      tier.sold -= booking.quantity;
    }
  }

  return booking;
}

export function findBookingByReference(store, reference) {
  return store.bookings.get(reference);
}

export function joinWaitlist(store, eventId, tierName, person) {
  const event = store.events.get(eventId);
  if (!event) {
    throw new DomainError("event not found", ErrorCode.NOT_FOUND);
  }

  const tier = event.tiers.find((t) => t.name === tierName);
  if (!tier) {
    throw new DomainError("tier not found", ErrorCode.NOT_FOUND);
  }

  if (tier.capacity - tier.sold > 0) {
    throw new DomainError("tier still has seats available", ErrorCode.NOT_SOLD_OUT);
  }

  const key = `${eventId}:${tier.id}`;
  let queue = store.waitlists.get(key);
  if (!queue) {
    queue = new Queue();
    store.waitlists.set(key, queue);
  }

  queue.enqueue(person);
  return queue.size();
}

function isValidDate(date) {
  if (typeof date !== "string") {
    return false;
  }
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime());
}
