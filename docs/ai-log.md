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