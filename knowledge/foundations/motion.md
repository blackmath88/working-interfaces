---
id: motion
title: Motion
kind: foundation
status: experiment
revision: 1
summary: Motion explains causality, continuity, and state change; it never decorates the interface.
tokens:
  duration.fast:     { range: "120–180ms", note: "hover, focus, selection" }
  duration.standard: { range: "220–320ms", note: "panels, save confirmation, inline expansion" }
  duration.travel:   { range: "350–550ms", note: "stage progression and carried information" }
  easing.standard:   { note: "default entrance and state-change curve" }
  easing.exit:       { note: "objects leaving the current context" }
related: []
---

## Purpose before animation

Use motion only to explain:

- save confirmation;
- information carried to another stage;
- supersession of an earlier value;
- provenance revealed in context;
- route progression.

Motion must show where information moved, what changed, and which state was preserved. Preserve spatial continuity.

## Prohibitions

- Do not animate every card on load.
- Do not use bouncing, floating, or decorative parallax.
- Do not let motion delay a critical action or hide history.

## Reduced motion

Reduced motion must communicate the same state change immediately through text and layout. Never merely omit the animation and leave the change unexplained.
