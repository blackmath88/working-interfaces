---
id: color
title: Colour
kind: foundation
status: experiment
revision: 1
summary: Semantic-only colour. Roles are named by meaning; no token names a hue.
tokens:
  surface.canvas:      { note: "page background" }
  surface.paper:       { note: "primary work plane" }
  surface.sunken:      { note: "secondary or recessed plane" }
  text.primary:        { note: "decision-relevant content" }
  text.muted:          { note: "metadata and secondary explanation" }
  border.structural:   { note: "planes, tables, persistent divisions" }
  border.subtle:       { note: "internal divisions within a plane; lighter than structural" }
  focus.primary:       { note: "keyboard and active selection" }
  text.on-accent:      { note: "text placed on a focus or accent fill" }
  state.settled:       { note: "validated, agreed, or complete" }
  state.uncertain:     { note: "assumed, provisional, unresolved" }
  state.blocked:       { note: "No-Go, blocked, or closed gate" }
  track.primary:       { note: "domain or method track identity" }
related: []
---

## Rules

Name colour semantically, by the job it performs. No token is named after a hue. A role may change its rendered colour without forcing consumers to adopt a new name.

- `surface.canvas` is the page background. Do not use it for a raised work plane.
- `surface.paper` is the primary work plane. Do not use it to imply status.
- `surface.sunken` is a secondary or recessed plane. Do not use it as decoration.
- `text.primary` is decision-relevant content. Do not weaken it for visual variety.
- `text.muted` is metadata and secondary explanation. Do not use it for essential instructions or low-contrast primary content.
- `border.structural` separates planes, tables, and persistent divisions. Do not use it to add ornamental boxes.
- `border.subtle` divides content inside one plane: rows in a log, items in a list, a header from the body it belongs to. Do not use it where two planes meet — that boundary is `border.structural`.
- `focus.primary` identifies keyboard focus and active selection. Do not use colour alone; preserve a visible shape or outline.
- `text.on-accent` is text placed on a `focus.primary` or accent fill. Do not use it on a plain surface, and do not bind it to a value that fails 4.5:1 against the fill it sits on.
- `state.settled` marks validated, agreed, or complete states. Do not equate it with generic positivity.
- `state.uncertain` marks assumed, provisional, or unresolved states. Do not use it for harmless neutral metadata.
- `state.blocked` marks No-Go, blocked, or closed gates. Do not use it for routine destructive-action styling without the same meaning.
- `track.primary` identifies a domain or method track. Do not use it as an arbitrary accent.

Colour never carries meaning alone. Text, structure, or a symbol must communicate the same distinction.
