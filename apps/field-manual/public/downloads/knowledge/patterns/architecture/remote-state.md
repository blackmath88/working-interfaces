---
id: remote-state
title: Remote State
status: reference
kind: pattern
revision: 1
summary: One state value behind a backend the application never inspects, written through debounce, coalescing, single-flight, and one retry.
related: []
implementation: { html: "packages/worker-kit", status: "stable" }
---

## The backend contract

An application holds a backend, not a storage mechanism. A backend loads one
state value and saves one state value, and both are asynchronous whether or not
the work is. Nothing else about it is visible.

```
kind: 'local' | 'remote'
load(): Promise<State>
save(state: State): Promise<void>
```

The application never asks which kind it has. That is the whole point: a
prototype starts against the browser, and the day it needs a shared server the
change is a different constructor in the composition root, not a rewrite of
every call site. `kind` exists so the shell can *say* where data lives — a
badge, a warning before closing the tab — never so logic can branch on it.

Making `save` return a promise even locally is deliberate. If the local path
were synchronous, every caller would be written against synchronous saving and
would have to be revisited when the remote path arrived.

## The write path

A remote save is not a request. It is four decisions, and each one exists
because something went wrong without it.

**Debounce.** A keystroke is not a save. Edits arrive faster than any server
should be asked to answer, so the write waits a moment — 300 ms by default —
for the typing to stop.

**Coalesce.** Only one snapshot is pending, and a newer one replaces it. Ten
edits in a second are one request carrying the last state, not ten requests
carrying nine dead ones. This works because the unit is whole state: a newer
snapshot fully supersedes an older one, which would not be true of a queue of
diffs.

**Single-flight.** One request is in the air at a time. Two overlapping writes
can arrive out of order, and the loser overwrites the winner — a lost update
that looks like the app silently discarding work.

**Re-arm.** If an edit arrives while a request is in flight, the timer restarts
when that request finishes. The obvious implementation drops the edit, and the
bug only shows up under a slow connection, which is exactly where it hurts.

**Retry once.** One failure is usually noise. Retrying once after a short pause
turns a blip into nothing; a second failure is real and goes to the error
handler. Saves never throw at the caller — a background write has no call site
left to catch it — so the handler is the only channel and must be wired.

**`load` clears the queue.** Loading cancels any pending timer and drops the
pending snapshot first. Otherwise a save queued a moment before the load lands
a moment after it and overwrites the state that was just fetched.

An error message from the server beats a generic one. The response's own
`error` field is preferred, falling back only when there is nothing to read.

## Mark and sweep instead of diffing

Whole-state replacement writes the entire state on every save. The naive
implementation compares old and new to work out inserts, updates, and deletes,
which means holding both, getting the comparison right, and being wrong quietly
when it is not.

The alternative: blank a timestamp column on every row, upsert the full current
set with a real timestamp, delete the rows still holding the blank. Anything
the client no longer sends is swept, so deletions require no detection at all.
The whole thing runs as one batch, so a half-applied replacement is not a
state the database can be left in.

The cost is honest: every save rewrites every row. That is the right trade at
the scale where one person edits one shared document, and the wrong one when
rows are many or writers are concurrent. Nothing here handles two people
editing at once — last writer wins, and the version counter records that it
happened rather than preventing it.

Batched multi-row inserts have to be split by column count rather than row
count, because the bound-variable limit is per statement. It is easy to miss
and only fails once the data grows.

## Growing out of zero infrastructure

A project that starts in the browser has real data in it before it has a
server. The migrate-from-local path is what keeps that data: when the server
reports itself empty and the browser still holds state, the application can
offer to seed the server once. It is one-way and one-time, guarded by the
server being empty, and it exists so that "prototype locally first" does not
end in "and then retype everything."

## The gate

Access is one shared password with no accounts. The cookie is a salted hash of
the password rather than a stored session, so rotating the secret ends every
session at once and there is no session table to keep.

The limits are the point of stating it. Nobody is identified, so there is no
per-person audit trail, no revoking one seat, and no recovery but changing the
secret for everyone. That is a correct trade for a small team sharing one
instrument and the wrong one the moment anyone needs to know who changed what.
Application HTML is served only after the check passes and only through the
platform's asset binding — a login page that inlines the app is a login page
that can be skipped.
