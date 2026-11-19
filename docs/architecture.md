# Architecture

This project is a Node.js event ticketing system written in ES modules. It is
organized in layers so that the HTTP layer delegates business decisions
downwards and never decides them itself.

## Top-level layout

- `src/http/` — Node HTTP server, router, JSON body parsing, static file
  serving, and the app factory that wires routes together.
- `src/domain/` — pure business logic: event search, sorting, waitlist queue,
  inventory capacity, booking state transitions, and ID generation. No HTTP
  imports anywhere in this layer.
- `test/` — Node built-in tests for each module, run with `node --test`.
- `docs/` — build specs, milestones, user stories, and the AI log.
- `public/` — static files served by the HTTP layer.
- `scripts/` — one-off demo or benchmark scripts.

## Layer diagram

Dependencies point downward only. Upper layers may call lower layers, never
the reverse.

```mermaid
graph TD
  ROUTES["Routes / HTTP handlers"]
  SERVICES["Services / use-case wiring"]
  RULES["Rules / domain logic"]
  DATA["Repositories / data"]

  ROUTES --> SERVICES
  SERVICES --> RULES
  RULES --> DATA
```

- Routes / HTTP handlers may translate an HTTP request into a call to a
  service or rule, and may return a response.
  They must not contain business rules.
- Services / use-case wiring may coordinate rules and repositories for one
  user-facing action.
  They must not redefine business rules that already belong in the rules layer.
- Rules / domain logic may contain pure business logic such as booking state
  transitions, inventory rules, waitlist order, sorting, and event search.
  They must not import Node HTTP modules or depend on the web server.
- Repositories / data may store and retrieve entities.
  They must not contain HTTP handling or UI concerns.

## Data model

```mermaid
classDiagram
  class User {
    id
    name
  }

  class Event {
    id
    title
    city
    published
    startsAt
  }

  class TicketTier {
    id
    eventId
    name
    priceInKobo
    capacity
  }

  class Booking {
    id
    reference
    userId
    eventId
    tierId
    state
  }

  User "1" *-- "0..*" Booking : makes
  Event "1" *-- "1..*" TicketTier : has
  TicketTier "1" *-- "0..*" Booking : used by
  Event "1" *-- "0..*" Booking : contains
```

This diagram describes the intended entities and relationships for the
ticketing system. It is part of the architecture, not a claim that every
relationship is already implemented.

## Booking lifecycle

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> paid : pay
  pending --> cancelled : cancel
  paid --> checked_in : check in
  paid --> refunded : refund
  paid --> cancelled : cancel

  state cancelled
  state refunded
  state checked_in
```

States:

- `pending`
- `paid`
- `cancelled`
- `refunded`
- `checked_in`

Permitted transitions:

- `pending` → `paid`
- `pending` → `cancelled`
- `paid` → `checked_in`
- `paid` → `refunded`
- `paid` → `cancelled`

Final states:

- `cancelled`
- `refunded`
- `checked_in`

Final states accept no further transitions.

## Cross-cutting rules

- Money is stored as whole numbers in the smallest unit (kobo), never decimals.
- Inputs are validated before any state changes.
- Search and sort functions must not mutate the original list.
- The waitlist is first-in-first-out.
- A failed operation must never change any data.
