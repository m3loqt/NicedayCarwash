<!-- Copilot instructions for the NicedayCarwash repo -->

# AI Coding Agent Guide — NicedayCarwash

This short guide contains the repository-specific knowledge an AI coding agent needs to be immediately productive.

## Big picture

- **Platform:** Expo / React Native app (managed workflow) using `expo-router` for file-based routing.
- **Language / tooling:** TypeScript, React 19, React Native 0.81, `nativewind` (Tailwind for RN), ESLint.
- **High-level layout:** `app/` contains route files and Layouts. There are two primary feature areas: `app/admin` and `app/user`. Each area uses nested route groups (see `(tabs)` folders) and layout files (`_layout.tsx`).

## Key files & directories (first places to look)

- `package.json` — scripts and deps (use `npm start`, `npm run web`, `npm run android`, `npm run ios`, `npm run reset-project`, `npm run lint`).
- `app/_layout.tsx` — global ThemeProvider, splash handling, `global.css` import, NativeWind initialization.
- `app/admin/_layout.tsx`, `app/user/_layout.tsx` — per-area navigation stacks; modal screens are declared here (example: `add-vehicle` and `edit-profile` are registered in `app/user/_layout.tsx` with `presentation: 'modal'`).
- `app/(tabs)/` style directories and any `(tabs)` grouped folders — used by `expo-router` to represent tabbed navigation.
- `components/` and `components/ui/` — reusable UI pieces. `components/ui/user/*` contains user-facing widgets (Bookings, History, Vehicles, etc.).
- `assets/images/` — image assets used by the app.
- `tailwind.config.js` & `global.css` — NativeWind / Tailwind configuration and global styles.

## Project-specific conventions and patterns

- **File-based routing and grouping:** Uses `expo-router`. Parent layouts are `*_layout.tsx` files. Route groups use parentheses, e.g., `app/user/(tabs)/home.tsx`. To add a new top-level screen for the `user` stack that opens as a modal, add the route file (e.g., `app/user/add-vehicle.tsx`) and register it in `app/user/_layout.tsx` as a `Stack.Screen` if you need special presentation options.
- **Modal registration pattern:** Modal screens are declared in the Layout stack (see `app/user/_layout.tsx`):
  - Example: <code> <Stack.Screen name="add-vehicle" options={{ presentation: 'modal', headerShown: false }} /> </code>
- **Styling:** Uses `nativewind`. Add Tailwind classes in JSX. `tailwind.config.js` has content globs for `app` and `components` — update that file if you add new directories with tailwind-using components.
- **Hooks & theme:** Uses `hooks/use-color-scheme.ts` and `hooks/use-theme-color.ts` — `app/_layout.tsx` uses `use-color-scheme` to choose light/dark theme.
- **Directory semantics:** `components/ui/user/*` organizes UI by feature (booking/history/home/profile/vehicles); mirror that pattern for new user features.

## Developer workflows & commands (Windows PowerShell examples)

- Install deps: `npm install`
- Start Metro + Expo dev tools: `npm start` (runs `expo start`)
- Open on web: `npm run web`
- Open on Android emulator: `npm run android`
- Open on iOS simulator: `npm run ios`
- Reset starter project: `npm run reset-project` (reads `./scripts/reset-project.js`)
- Lint: `npm run lint`

Notes: these scripts are declared in `package.json` and are the canonical way to run tasks.

## Integration points & external dependencies

- Uses Expo SDK (see `expo` dependency) and `expo-router` for routing.
- Native capabilities: `expo-blur`, `expo-image`, `expo-splash-screen`, `expo-haptics`, `expo-linking`.
- Native libraries: `react-native-maps`, `@react-native-async-storage/async-storage`.
- Styling: `nativewind` + `tailwindcss`.

When changing dependencies, be mindful of Expo SDK compatibility.

## Where to look for network / data flows

- Search for `fetch(`, `axios`, or custom hooks in `components/ui/` and `app/` pages. Typical data flow:
  - UI components in `components/ui/*` call shared hooks or services
  - Route-level screens in `app/**` orchestrate navigation and pass props

## Editing & routing examples (concrete)

- Add a new tab screen: create `app/user/(tabs)/my-screen.tsx`. The filename determines the route path (`/user/my-screen`).
- Add a modal-only screen in the `user` stack: create `app/user/my-modal.tsx` and register in `app/user/_layout.tsx` as `<Stack.Screen name="my-modal" options={{ presentation: 'modal' }} />`.

## Safety & change guidance for AI agents

- Avoid changing Expo SDK version or `react-native` versions unless the change is explicitly requested.
- Respect existing layout stacks and route names; changing route file names will alter URLs and navigation behavior.
- When adding Tailwind classes, ensure `tailwind.config.js` `content` includes the new file paths.

## Files to inspect for any change PR

- `package.json` (scripts & deps)
- `app/_layout.tsx`, `app/*/_layout.tsx` (routing + modal registrations)
- `tailwind.config.js`, `global.css` (styling)
- `components/ui/` (existing UI pattern)
- `scripts/reset-project.js` (understand what reset does before modifying)

---

If any section above is unclear or you want the instructions to include automated test/run commands, say which areas to expand and I'll iterate. After your feedback I can also add short code snippets for common edits (add route, add modal, add Tailwind class).
