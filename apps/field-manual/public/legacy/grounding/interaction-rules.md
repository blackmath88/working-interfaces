# Interaction Rules

## Product contracts

### Edit
Mark work as dirty while preserving the last saved state.

### Save
Expose `unsaved`, `saving`, `saved`, and `failed`. A failure must preserve local edits.

### Carry forward
Create a source reference containing source stage, object, author, time, and original wording.

### Supersede
Create a new record linked to the earlier record. Never silently overwrite meaningful estimates, judgments, or decisions.

### Skip
Require a reason and keep the skipped stage visible.

### Conclude
Lock ordinary editing while preserving reading, export, audit history, and a controlled reopen path.

### No-Go
Treat as a legitimate case result, not an error state.

### Reopen
Append a reopening event and restore controlled editing.

### Undo
Prefer reversible actions over unnecessary confirmation dialogs.

## State architecture

Separate case lifecycle states from stage completion states.

Case examples:
Draft, Active, Waiting, Blocked, Ready for decision, Concluded, No-Go, Archived, Reopened.

Stage examples:
Not started, In progress, Incomplete, Ready, Completed, Skipped, Blocked, Superseded.

Every transition defines source, target, trigger, permissions, prerequisites, side effects, audit entry, notifications, and undo/reopen behavior.

## Persistence

Early implementations may use local storage or IndexedDB.

Provide visible import and export of structured JSON. Do not imply cloud synchronization when none exists.

## Provenance interaction

A provenance mark should name the source and, where possible, navigate to or reveal the source object.
