# Database rules tests

Tests `../database.rules.emulator.json` (the exact file `firebase.json` wires the local
Database emulator to) against a real running emulator, using `@firebase/rules-unit-testing`.
Covers permission checks the app's UI won't exercise on its own - e.g. this is what caught the
notification `type` enum silently rejecting the Confirmed -> Ongoing auto-trigger.

## Running

From the repo root:

```
npm run test:rules
```

This starts the Database emulator, runs the suite against it, then shuts it down.

**Requires a JDK 21+ on `PATH`** (the RTDB emulator is Java-based; the Auth/Functions emulators
aren't, so this is easy to miss). If `java -version` shows something older, point `JAVA_HOME` at
a JDK 21 install for the command, e.g. on macOS with `brew install openjdk@21`:

```
JAVA_HOME=$(brew --prefix openjdk@21) npm run test:rules
```

## Adding a test

When you change `../database.rules.json`, mirror the change into `../database.rules.emulator.json`
first (they must stay in sync - the emulator only reads the `.emulator.json` copy), then add or
update the corresponding case here. Fixture staff accounts (`uid-superadmin`, `uid-admin-a`,
`uid-supervisor-a`, `uid-supervisor-b`) are seeded once in `beforeAll` - reuse them, or add a new
one there rather than re-seeding per test.
