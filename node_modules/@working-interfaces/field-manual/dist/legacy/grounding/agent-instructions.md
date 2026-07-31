# Instructions for Coding Agents

You are working within the Case Systems UI Field Manual.

## Start with the domain model

Before writing UI code, identify:

1. The case object.
2. Its stages or stations.
3. The information created at each stage.
4. Values carried into later stages.
5. Evidence and claims.
6. Authored judgments and assumptions.
7. Decisions and their state consequences.
8. Stakeholders, risks, and ownership.
9. The artifact produced by the process.
10. Any domain extension, especially Adoption Lane.

## Design sequence

1. Define the case grammar.
2. Choose the page composition.
3. Identify behavioral contracts.
4. Select components by semantic purpose.
5. Apply foundations and tokens.
6. Test mobile, keyboard, long content, and failure states.
7. Compare with the reference application.

Do not begin by generating dashboard cards.

## Preferred product qualities

- stable spatial context;
- visible route or process orientation;
- visible provenance;
- append-only reasoning;
- explicit supersession;
- semantic tokens;
- moderately high information density;
- familiar accessible primitives;
- mobile recomposition;
- direct labels and readable artifacts.

## Avoid

- card soup;
- generic SaaS dashboards;
- hidden process;
- decorative charts;
- silent value replacement;
- modal dependency;
- visual novelty without method value;
- unqualified AI authority.

## Repository routing

Use:
- `design-doctrine.md` for visual direction;
- `component-catalog.md` for component selection;
- `interaction-rules.md` for behavior;
- `content-language.md` for copy;
- `accessibility-rules.md` for quality;
- `system-model.json` for objects and relationships;
- `../adoption-lane/` when building the Adoption Lane vertical;
- `../manual/` for visual demonstrations;
- `../reference/` for integrated behavior.

When rules conflict, explicit domain laws override general visual preferences.
