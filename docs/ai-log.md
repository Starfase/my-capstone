# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 1

### Prompt 1: Build 1 prompt (errors.js)
- **What I asked:** Plan and write src/domain/errors.js with a DomainError class that has a code.
- **What came back:** A DomainError class and a frozen ErrorCode object.
- **What was wrong (or "nothing"):** The plan had no code for cancelling twice, so I asked for INVALID_STATE. The AI also said Object.freeze catches typos, which is wrong. Freeze only stops changes to the object.

### Prompt 2: ids.js
- **What I asked:** Plan and write src/domain/ids.js with newId() and newReference().
- **What came back:** newId() using randomUUID and newReference() using randomInt on an 8-character alphabet.
- **What was wrong (or "nothing"):** The first plan's alphabet had 31 characters instead of 32, because Q was missing. It also used a pointless byte-rejection step, and I asked for randomInt instead. A later plan wrongly said Q was removed. The AI also edited a comment after I had told it to stop.

### Prompt 3: waitlistQueue.js and inventory.js
- **What I asked:** Write the FIFO queue (linked list) and the inventory
  rules, one file at a time.
- **What came back:** A Queue with private head, tail and size, and an
  inventory with event, tier, booking, cancel, lookup and waitlist functions.
- **What was wrong (or "nothing"):** The AI added things I did not ask for:
  extra error codes, a helper function inside ErrorCode, and a duplicate-person
  check on the waitlist. That check read queue.head, which is private, and
  crashed with a TypeError. The booking had no price field. Its first
  explanation of the failing check used the wrong scenario, and it claimed
  to have reverted a change that was still in the file. I removed the
  duplicate check, moved the helper out of ErrorCode, and added amountCents.

  ### Prompt 4: nextOnWaitlist and demo.js
- **What I asked:** A function to read who is next on a waitlist, and a demo
  script that tells the whole Build 1 story.
- **What came back:** nextOnWaitlist using the queue's peek, and a demo that
  prints OK/FAIL lines with seats left calculated from the tier.
- **What was wrong (or "nothing"):** The first plan called peek() on an empty
  queue, which throws NOT_FOUND, so it would have crashed instead of
  returning null. The plan also printed "seats left: 3" after Ada cancels;
  the right number is 2 because Bayo's ticket is still booked. I corrected
  both before saying go.

  ### Prompt 5: benchmark-lookup.js
- **What I asked:** A benchmark comparing Map.get with Array.find over many
  bookings, with timings and a Big O explanation.
- **What came back:** A script that builds 100000 bookings with unique
  references, times both lookups, and prints the results.
- **What was wrong (or "nothing"):** The first plan checked results inside the
  timed loop, which would have slowed both methods and hidden the difference.
  It chose lookups at random, which needed duplicate handling and gave
  different runs different results. It called a repeated reference "extremely
  unlikely" when it can happen about once in 200 runs at 100000 bookings. The
  report gave two different outputs as if they were one run. I fixed these by
  verifying after the timer stops, spacing the lookups evenly, and keeping the
  uniqueness check.

## Build 2

### Prompt 1: Inventory review and event publishing
- **What I asked:** Review the existing inventory behavior and verify event creation, ticket tiers, publishing, and public event summaries against the Build 2 requirements.
- **What came back:** An implementation review and manual verification steps for the existing inventory functions.
- **What was wrong (or "nothing"):** Date validation accepted an impossible date such as `2026-02-30` because JavaScript normalized it. I requested explicit calendar validation for ISO date strings.

### Prompt 2: Event search and handwritten merge sort
- **What I asked:** Implement event filtering, searching, and sorting using a handwritten merge sort, without changing the original list.
- **What came back:** `src/domain/eventSearch.js` and `src/domain/sorting.js`, with filtering, sorting, validation, and immutability checks.
- **What was wrong (or "nothing"):** The initial review and test corrections caught issues in the test setup and assertions. I corrected those before accepting the test results.

### Prompt 3: Inventory acceptance tests
- **What I asked:** Add automated tests for event creation (S02), ticket tiers (S03), and ticket booking (S06), including error codes and checks that failed operations change nothing.
- **What came back:** `test/inventory.test.js` with tests for successful operations, validation failures, missing records, and sold-out bookings.
- **What was wrong (or "nothing"):** The impossible-date test exposed the date-validation bug. I required the validator to check real calendar dates without changing unrelated date parsing behavior.

### Prompt 4: S04 publish and unpublish
- **What I asked:** Plan and implement publishing and unpublishing an event, including public-list behavior and missing-event errors.
- **What came back:** An exported `unpublishEvent()` function and S04 tests in `test/inventory.test.js`.
- **What was wrong (or "nothing"):** The three S04 acceptance criteria were drafted with AI and accepted by the user because class-written criteria were not available. The initial inventory code had no `unpublishEvent()` function. I reviewed the plan before approving the implementation.

### Prompt 5: Date validator cleanup against years 0–99
- **What I asked:** Correct `isValidDate()` in `src/domain/inventory.js` so calendar-only `YYYY-MM-DD` validation does not rely on a `Date` constructor path that remaps years 0–99.
- **What came back:** A revised validator that uses a month-length table and explicit Gregorian leap-year logic for exact ISO date strings, while preserving the existing non-ISO parseability fallback.
- **What was wrong (or "nothing"):** The first corrected version still used `new Date(year, month, 0)`, so it had not actually avoided the year 0–99 special case. I pointed out the mismatch between the explanation and the code and required the stricter explicit calendar check.

### Prompt 6: Full test verification
- **What I asked:** Run the inventory tests and the complete automated test suite after the approved changes.
- **What came back:** The inventory tests passed, followed by a complete test run with 76 tests passing and zero failures.
- **What was wrong (or "nothing"):** No failures remained in the final test run. The passing tests do not by themselves confirm that every Build 2 requirement is complete.