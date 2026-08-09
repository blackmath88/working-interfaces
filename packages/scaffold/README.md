# @working-interfaces/scaffold

A framework-free floor for information-rich interfaces. It contains proven
formatting, storage, subscription, journal, routing, view-state, and camera
primitives without naming a product domain.

The package has no runtime dependencies. Import only the named APIs exposed by
`src/index.ts`; domain models and application shells remain in each project.

Storage is created, not configured. `createStorage({ driver, namespace })`
returns an independent instance exposing `read`, `write`, `remove`,
`keysWithPrefix`, `key`, and `migrate`; there is no module-level driver.
Drivers are passed in explicitly — `memoryDriver()` or `localStorageDriver()`.

`migrate` checkpoints the schema version after each individual migration
succeeds. It returns a `MigrationReport` instead of throwing: `applied` lists
the steps that completed, `failed` names the step that stopped the run, and
`to` is the version actually reached. Because a failure stops at a known
version and the next run resumes there, no migration ever runs twice.
