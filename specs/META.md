# Specs

## Intent

The architecture and intended behavior of this system should be captured in a set of "specs" that live in `specs/`.

- Audience: humans and AI agents collaborating to build and maintain the system.
- Specs should be the single source of truth for the system's design and behavior. Avoid duplicating spec content in other documents.
- Break specs up sensibly, with each domain or technical topic getting its own spec file
- Typically, specs should not redundantly capture code-level details such as data types, API contracts, invariants, that are more appropriately captured in the code itself

A good set of specs should:

- capture the architecture and intended behavior of the system
- "carve at the joints" of the system's structure and design
- avoid redundancy or fluff

The ideal state we are going for is that if we deleted every line of code, these specs would be sufficient to drive a high quality replacement implementation of the whole system.

## Layout

`AGENTS.md` should contain an index of specs. E.g.:

```
## Specification

Detailed specifications for each domain live in the `specs/` directory.

| Topic | Description | Link |

| --------------- | ------------------------------------------------ | ------------------------------------------- |
| Architecture | Overall system architecture and design decisions | [Architecture](specs/architecture.md) |
| Some component | ...description... | [Some component](specs/some-component.md) |
```

And all spec documents should live in a `specs/` dir at the root of the repo.

## Style Guidelines

- **Prefer contracts and invariants** over code signatures and request/response schemas
- **Mark implementation gaps**: If current behavior differs from intended, use the Known Gaps section below with reference to tracking issue
- **Avoid brittle details**: Parameter names, exact endpoints, and type signatures belong in code
- **Link to avoid duplication**: Reference authoritative sections rather than repeating information

## Known Gaps

Use this space to capture known gaps between current implementation and intended behavior.

## Decisions

Use this space to log key decisions we've made. Most decisions won't be be included here, since they should already be reflected in the content of the specs. This space is for highlighting or emphasizing particularly salient or pivotal decisions.
