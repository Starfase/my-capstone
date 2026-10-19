# RULES FOR ANY AI ASSISTANT IN THIS PROJECT

(Read this fully before doing anything, every session.)

## Who I am and what this is

I am a beginner in a software development course (DSA 2.0). This folder is
my capstone project. The course is AI-assisted, not "vibe coding": you may
write code, but I must understand, review and test every line, and I must be
able to explain it. I may switch between AI tools (Cursor, FreeBuff) on this
same folder, so PROGRESS.md is our shared memory.

## The project

An event ticketing and booking system. Organizers publish events, attendees
buy tickets, staff check people in by scanning a QR code. It is built in 9
weekly builds. The source of truth for what each build requires is the docs/
folder (README, milestones, user stories, build-1, build-2, etc.). If these
rules and docs/ disagree, stop and tell me.

Language: JavaScript on Node.js, ES modules. Back end first. No server and
no database until the build that requires it.

## STRICT SCOPE RULES (most important)

1. Do ONLY the task I give you in this session. Nothing extra: no bonus
   features, no refactors, no "improvements", no cleanup I did not ask for.
2. Before writing any code, restate the task in 2-3 lines and wait for me to
   say "go".
3. Work in small steps: one file or one function at a time. After each step,
   STOP and wait for me.
4. Do not create, rename, move or delete any file or folder unless I named
   it. If you think one is needed, ask first.
5. Do not install npm packages. Do not edit package.json unless I ask.
6. Do NOT run git commands (add, commit, push, pull, branch, anything). I run
   all git commands myself.
7. Do NOT read or copy the teacher's solution code. Only use docs/ and what I
   paste to you. I build my own solution first and compare afterwards.
8. If my request is vague, unclear or outside this project, ask me one
   question instead of guessing.
9. If you think something I asked for is wrong, risky or inefficient, tell me
   plainly before doing it.
10. Never overwrite or restructure existing code silently. Say what you are
    changing and why.

## How to teach me

- After each piece of code, explain it line by line in simple language and
  define any new term.
- Tell me exactly how to run or test it and what output I should see.
- When I paste an error, first explain what it means in plain words, then fix
  only that error.

## Technical rules for this project

- Money is stored as whole numbers in the smallest unit (kobo), never
  decimals. Reject non-integer or negative amounts.
- Validate inputs: blank title/city, invalid date, ticket quantity that is
  zero, negative, fractional or over 10 must be rejected with a clear error
  and NOTHING must change.
- Use a Map for lookup by booking reference code.
- Search and sort functions must NEVER change the original list (work on a
  copy). When I ask for a sort, write the algorithm by hand, not .sort().
- The waitlist is first-in-first-out (FIFO).
- Tests use Node's built-in runner (node:test, node:assert), run with
  `node --test`. Every function you write gets a test when I ask for tests.
- Follow the structure and file names given in docs/ (src/domain/ etc.).
  Do not invent a different structure.
- Keep code simple and readable, in a style a beginner can follow.

## End of every session

When I say "wrap up", update PROGRESS.md (done, in progress, next, open
questions) and nothing else. Then tell me what to commit.
