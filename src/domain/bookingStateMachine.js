// src/domain/bookingStateMachine.js
// Build 3 Step 2 — explicit booking life cycle.
//
// States and allowed moves live here as data so that the same rules can be
// used by tests, the HTTP layer and any future UI. The HTTP layer must never
// decide whether a move is legal itself.
//
// States: pending, paid, cancelled, refunded, checked_in.
// Final states: cancelled, refunded, checked_in — nothing leaves them.

import { DomainError, ErrorCode } from "./errors.js";

/** @type {ReadonlyMap<string, string[]>} */
const ALLOWED = new Map([
  ["pending", ["paid", "cancelled"]],
  ["paid", ["checked_in", "refunded", "cancelled"]],
  ["cancelled", []],
  ["refunded", []],
  ["checked_in", []],
]);

/**
 * Return every known state name.
 *
 * @returns {string[]}
 */
export function states() {
  return [...ALLOWED.keys()];
}

/**
 * Return the allowed next states for a current state.
 *
 * @param {string} currentState
 * @returns {string[]}
 */
export function allowedTransitions(currentState) {
  const next = ALLOWED.get(currentState);
  if (!next) {
    throw new DomainError(
      "Unknown booking state: " + currentState,
      ErrorCode.INVALID_STATE,
    );
  }
  return next.slice();
}

/**
 * Describe the booking state machine.
 *
 * @returns {{ states: Function, allowedTransitions: Function, isFinal: Function }}
 */
export function describeStateMachine() {
  return Object.freeze({
    states,
    allowedTransitions,
    isFinal(state) {
      return ALLOWED.get(state)?.length === 0;
    },
  });
}

/**
 * Return true when a transition is allowed.
 *
 * @param {string} fromState
 * @param {string} toState
 * @returns {boolean}
 */
export function canTransition(fromState, toState) {
  const allowed = ALLOWED.get(fromState);
  if (!allowed) {
    return false;
  }
  return allowed.includes(toState);
}

/**
 * Assert that a transition is allowed, otherwise throw a DomainError.
 *
 * @param {string} fromState
 * @param {string} toState
 * @throws {DomainError}
 */
export function assertTransition(fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new DomainError(
      `Cannot move booking from "${fromState}" to "${toState}".`,
      ErrorCode.INVALID_TRANSITION,
    );
  }
}
