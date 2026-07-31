# Adoption Lane color semantics

The reference app uses two restrained semantic families.

| Meaning | Token | Light value | Usage |
| --- | --- | --- | --- |
| Process | `--color-process` / `--accent-primary` | `#0b7778` | Navigation, links, current journey position, focus |
| Process background | `--color-process-soft` | `#dceeee` | Current-position halo |
| Judgment | `--color-judgment` / `--accent-secondary` | `#6f4b68` | Customer context, review, evidence interpretation |
| Judgment background | `--color-judgment-soft` | `#eee7ec` | Inherited/context surfaces |
| Decision | `--color-decision` / `--accent-secondary-strong` | `#56374f` | Irreversible or explicit decision actions |
| Customer context | `--color-customer-context` | `#6f4b68` | Inheritance markers and shared-context panels |

Petrol means process and movement. Aubergine means judgment and meaning. The
secondary accent is not used for decorative alternation, generic completion,
or every button. Status colors remain limited to success, warning, and danger.

Dark-mode tokens are semantic equivalents, not raw uses copied into individual
components. White text is only used with the stronger primary/decision fills;
standard aubergine is used for text and borders on light surfaces.

