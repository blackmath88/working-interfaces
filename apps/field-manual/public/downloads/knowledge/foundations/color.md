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
  focus.primary:       { note: "keyboard and active selection" }
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
- `focus.primary` identifies keyboard focus and active selection. Do not use colour alone; preserve a visible shape or outline.
- `state.settled` marks validated, agreed, or complete states. Do not equate it with generic positivity.
- `state.uncertain` marks assumed, provisional, or unresolved states. Do not use it for harmless neutral metadata.
- `state.blocked` marks No-Go, blocked, or closed gates. Do not use it for routine destructive-action styling without the same meaning.
- `track.primary` identifies a domain or method track. Do not use it as an arbitrary accent.

Colour never carries meaning alone. Text, structure, or a symbol must communicate the same distinction.
