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
