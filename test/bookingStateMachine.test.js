// test/bookingStateMachine.test.js
// Build 3 Step 5 — booking state machine tests.

import assert from "node:assert";
import { test } from "node:test";
import {
  states,
  allowedTransitions,
  describeStateMachine,
  canTransition,
  assertTransition,
} from "../src/domain/bookingStateMachine.js";
import { DomainError, ErrorCode } from "../src/domain/errors.js";

const FINAL_STATES = ["cancelled", "refunded", "checked_in"];
const NON_FINAL_STATES = ["pending", "paid"];

// ---------------------------------------------------------------------------
// 1. State machine data
// ---------------------------------------------------------------------------

test("states() returns every known state", () => {
  assert.deepStrictEqual(
    [...states()].sort(),
    ["cancelled", "checked_in", "paid", "pending", "refunded"].sort(),
  );
});

test("allowedTransitions lists only legitimate next states", () => {
  assert.deepStrictEqual(allowedTransitions("pending"), ["paid", "cancelled"]);
  assert.deepStrictEqual(allowedTransitions("paid"), [
    "checked_in",
    "refunded",
    "cancelled",
  ]);
});

test("allowedTransitions throws on an unknown state", () => {
  assert.throws(
    () => allowedTransitions("bogus"),
    (error) =>
      error instanceof DomainError &&
      error.code === ErrorCode.INVALID_STATE,
  );
});

test("describeStateMachine is frozen and truthful", () => {
  const machine = describeStateMachine();
  assert.throws(
    () => Object.defineProperty(machine, "states", { value: [] }),
    (error) => error.message.includes("Cannot redefine property"),
  );
  assert.deepStrictEqual(machine.states().sort(), states().sort());
  for (const state of FINAL_STATES) {
    assert.strictEqual(machine.isFinal(state), true);
  }
  for (const state of NON_FINAL_STATES) {
    assert.strictEqual(machine.isFinal(state), false);
  }
});

// ---------------------------------------------------------------------------
// 2. Transition rules
// ---------------------------------------------------------------------------

test("allowed moves per the build brief", () => {
  assert.strictEqual(canTransition("pending", "paid"), true);
  assert.strictEqual(canTransition("pending", "cancelled"), true);
  assert.strictEqual(canTransition("paid", "checked_in"), true);
  assert.strictEqual(canTransition("paid", "refunded"), true);
  assert.strictEqual(canTransition("paid", "cancelled"), true);
});

test("final states accept no outgoing moves", () => {
  for (const from of FINAL_STATES) {
    for (const to of states()) {
      assert.strictEqual(
        canTransition(from, to),
        false,
        `expected no move from ${from} to ${to}`,
      );
    }
  }
});

test("illegal moves are refused", () => {
  const bad = [
    ["pending", "checked_in"],
    ["pending", "refunded"],
    ["cancelled", "paid"],
    ["refunded", "checked_in"],
    ["checked_in", "pending"],
    ["paid", "pending"],
  ];
  for (const [from, to] of bad) {
    assert.strictEqual(canTransition(from, to), false);
  }
});

test("assertTransition lets legal moves pass", () => {
  assertTransition("pending", "paid");
  assertTransition("paid", "checked_in");
});

test("assertTransition throws INVALID_TRANSITION on illegal moves", () => {
  const illegal = [
    ["pending", "checked_in"],
    ["cancelled", "paid"],
    ["checked_in", "refunded"],
  ];
  for (const [from, to] of illegal) {
    assert.throws(
      () => assertTransition(from, to),
      (error) =>
        error instanceof DomainError &&
        error.code === ErrorCode.INVALID_TRANSITION,
    );
  }
});
