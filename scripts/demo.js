import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  nextOnWaitlist,
} from "../src/domain/inventory.js";
import { DomainError } from "../src/domain/errors.js";

const store = createStore();

const event = createEvent(store, {
  title: "Lagos Tech Meetup",
  city: "Lagos",
  venue: "Yaba",
  date: "2026-12-05",
});

const tier = addTier(store, event.id, {
  name: "General",
  priceCents: 500000,
  capacity: 3,
});

console.log("1. create Lagos Tech Meetup with General tier: OK");
console.log(
  "   seats left:",
  tier.capacity - tier.sold,
);

const adaBooking = bookTickets(store, event.id, "General", 2);
console.log("2. Ada books 2 tickets: OK");
console.log("   seats left:", tier.capacity - tier.sold);

let bayoAskError;
try {
  bookTickets(store, event.id, "General", 2);
} catch (error) {
  bayoAskError = error;
}

if (!(bayoAskError instanceof DomainError)) {
  throw bayoAskError;
}

console.log("3. Bayo asks for 2: FAIL");
console.log("   code:", bayoAskError.code);
console.log("   message:", bayoAskError.message);
console.log("   seats left:", tier.capacity - tier.sold);

const bayoBooking = bookTickets(store, event.id, "General", 1);
console.log("4. Bayo books 1: OK");
console.log("   seats left:", tier.capacity - tier.sold);

joinWaitlist(store, event.id, "General", "Chidi");
console.log("5. Chidi joins waitlist: OK");

joinWaitlist(store, event.id, "General", "Dayo");
console.log("6. Dayo joins waitlist: OK");

const adaFound = findBookingByReference(store, adaBooking.reference);
console.log("7. Ada booking by reference: OK");
console.log("   reference:", adaFound.reference);
console.log("   quantity:", adaFound.quantity);
console.log("   amountCents:", adaFound.amountCents);
console.log("   status:", adaFound.status);

const adaCancelled = cancelBooking(store, adaBooking.reference);
console.log("8. Ada cancels: OK");
console.log("   seats left:", tier.capacity - tier.sold);

const nextInLine = nextOnWaitlist(store, event.id, "General");
console.log("9. next in line:", nextInLine);
