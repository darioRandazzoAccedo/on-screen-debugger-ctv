# @accedo/onscreen-debugger

On-screen debugger UI component for TV apps built with React and the Accedo XDK.

---

## Overview

`@accedo/onscreen-debugger` is a non-intrusive, overlay-style debugging panel designed for connected-TV and set-top-box applications. It intercepts console methods and network calls at runtime and surfaces the captured data in a TV-navigable modal UI — without requiring a laptop or remote DevTools connection.

The tool is **fully gated by environment**: it is a no-op in production builds and can be toggled on/off per session via a key sequence on the remote control.

---

## Features

| Category | Detail |
|---|---|
| **Console capture** | Wraps `console.log`, `debug`, `info`, `warn`, and `error`. Each entry records the call site (file + function name). |
| **Network capture** | Intercepts `fetch`, `XMLHttpRequest`, and `navigator.sendBeacon`. Uses a hybrid `PerformanceObserver` + wrapper approach to merge request detail with resource timing data (duration, transfer size, etc.). Falls back gracefully when `PerformanceObserver` is unavailable. |
| **Analytics filters** | Built-in URL filters for DAL, SAS, and Logstash traffic. |
| **TV-native navigation** | Dedicated LRUD (directional focus management) instance isolated from the host app's own navigation tree. Arrow keys and OK/BACK are handled entirely within the modal. |
| **Key sequence trigger** | Press `← ← ← → ←` to open/focus the modal without disrupting the host app's remote-control flow. |
| **Persistent state** | Recording flags, enabled mode, and quick-key-sequence setting are persisted to `localStorage` via Zustand. |
| **Auto-refresh** | The entry list polls every 2 s by default; auto-scroll to the latest entry is also configurable. |
| **Three visibility modes** | `hidden` — modal not rendered; `not-focusable` — modal visible in the background; `focusable` — modal takes full remote-control focus. |
| **Entry limits** | 100 entries per console type (oldest 50% flushed when full); 500 entries for network traffic. |

---

## Requirements

| Dependency | Version |
|---|---|
| Node.js | `>= 14.16.0` (project is developed and tested on **14.16.1**) |
| React | `>= 17` |
| `@accedo/xdk-core` | `>= 4.0.0` |
| `@accedo/xdk-virtual-key` | `>= 4.0.0` |

The host application must provide a working XDK environment (key-event dispatch, `environment.addEventListener`, etc.).

---

## Installation

```bash
npm install @accedo/onscreen-debugger
```

> The package is published to the Accedo Artifactory registry. Make sure your `.npmrc` points to `https://repo.cloud.accedo.tv/artifactory/api/npm/accedo-ps-npm-local/` for the `@accedo` scope.

---

## Usage 1 (data and UI)

### 1. Set up the hook at the root of your app

Call `useOnScreenDebugger` once, near the top of your component tree. This hook installs all the console and network interceptors and registers the key-sequence listener.

```tsx
import { useOnScreenDebugger } from '@accedo/onscreen-debugger';

const App = () => {
  useOnScreenDebugger();

  return <YourApp />;
};
```

Optional **`networkUrlPatterns`** (`NetworkApiUrlPatternsFamily[]`): each item is one **toolbar section**. Within a family, each **key** of `urlPatterns` is a filter button; each **value** is a substring matched with `String.includes` against the request URL. The last button in that section is **`Every ${name}`** (union of all patterns in that family). Omit the option or pass `[]` to hide all Network API sections. Prefer a **`useMemo`**’d array when passing an inline literal so the hook does not reset on every render.

```tsx
import { useMemo } from 'react';
import { useOnScreenDebugger } from '@accedo/onscreen-debugger';

const families = useMemo(
  () => [
    {
      name: 'Analytics',
      urlPatterns: {
        myAnalytics: 'analytics.example.com',
        billingApi: '/api/billing',
      },
    },
    {
      name: 'CDN',
      id: 'cdn',
      urlPatterns: { assets: '/static/' },
    },
  ],
  []
);

useOnScreenDebugger({ networkUrlPatterns: families });
```

Composite filter ids (for custom UIs reading the store) use `familyId`, a NUL delimiter (`\u0000`), then either a pattern key or `__every__` for the aggregate. Helpers **`buildNetworkApiFilterMode`**, **`parseNetworkApiFilterMode`**, and constants **`NETWORK_API_FILTER_DELIMITER`** / **`NETWORK_API_EVERY_SUBMODE`** are exported from the package.

### 2. Mount the modal component

Place `<OnScreenDebugger />` anywhere in the tree — it renders nothing when hidden and takes over the full viewport when active.

```tsx
import { OnScreenDebugger } from '@accedo/onscreen-debugger';

const App = () => {
  useOnScreenDebugger();

  return (
    <>
      <YourApp />
      <OnScreenDebugger />
    </>
  );
};
```

### 3. Control visibility programmatically (optional)

```tsx
import { useToggleDebugModal } from '@accedo/onscreen-debugger';

const MyComponent = () => {
  const { toggleDebugModal } = useToggleDebugModal();

  return (
    <button onClick={() => toggleDebugModal('focusable')}>
      Open Debugger
    </button>
  );
};
```

### 4. Read debugger state

```tsx
import {
  useIsDebuggerEnabled,
  useDebugModalVisibility,
  getDebugModalVisibilitySync,
  getIsOnScreenDebuggerActiveSync,
} from '@accedo/onscreen-debugger';
```

---

## Usage 2 (just data)

If you build **your own UI** for captured data instead of (or in addition to) `<OnScreenDebugger />`, your data components can import **`useOnScreenDebuggerStore` only**—they do not need `useOnScreenDebugger`. Subscribe with Zustand selectors for the same slices the modal uses (`log`, `debug`, `info`, `warn`, `error`, `networkTraffic`, `networkApiUrlPatternFamilies`, plus any other fields on the store you need).

Interceptors still have to be installed once for the store to fill: call **`useOnScreenDebugger()` a single time** near the root (see Usage 1). This package does not expose a separate installer; skip mounting `<OnScreenDebugger />` only when your UI fully replaces it.

```tsx
// App (or another top-level module): install capture — once
import { useOnScreenDebugger } from '@accedo/onscreen-debugger';

const App = () => {
  useOnScreenDebugger();
  return (
    <>
      <YourApp />
      <MyCustomDebugPanel />
    </>
  );
};
```

```tsx
// MyCustomDebugPanel.tsx — data only, no useOnScreenDebugger import
import { useOnScreenDebuggerStore } from '@accedo/onscreen-debugger';

const MyCustomDebugPanel = () => {
  const logs = useOnScreenDebuggerStore(s => s.log);
  const debugs = useOnScreenDebuggerStore(s => s.debug);
  const infos = useOnScreenDebuggerStore(s => s.info);
  const warns = useOnScreenDebuggerStore(s => s.warn);
  const errors = useOnScreenDebuggerStore(s => s.error);
  const networkTraffic = useOnScreenDebuggerStore(s => s.networkTraffic);

  // Render logs, debugs, infos, warns, errors, networkTraffic (LogEntry[] / your types) as you like
  return null;
};
```

Outside React (e.g. logging, tests, or non-UI modules), read the latest snapshot with `useOnScreenDebuggerStore.getState()` and the same property names (`log`, `debug`, `info`, `warn`, `error`, `networkTraffic`, recording flags, etc.). See the store-backed helpers in the [API Reference](#api-reference) for other reactive accessors.

## API Reference

### Hooks

#### `useOnScreenDebugger(options?)`

Installs all runtime interceptors and key-sequence listener. Must be called once in a mounted React component. Is a no-op when `NODE_ENV === 'production'` or the debugger mode is `'off'`.

Optional argument: **`{ networkUrlPatterns?: NetworkApiUrlPatternsFamily[] }`**. When non-empty, the modal renders one “Filter by Network API — {name}” section per family (see Usage 1). Normalized families are mirrored on the store as **`networkApiUrlPatternFamilies`**; they are not persisted to `localStorage`.

Exported types: **`UseOnScreenDebuggerOptions`**, **`NetworkApiUrlPatternsFamily`**, **`NormalizedNetworkApiUrlPatternsFamily`**.

#### `useToggleDebugModal()`

Returns `{ toggleDebugModal(visibility: DebugModalVisibility) }`. Use to switch between `'hidden'`, `'not-focusable'`, and `'focusable'`.

#### `useIsDebuggerEnabled()`

Returns the current `OnScreenDebuggerMode` (`'off'` | `'active-on-start'` | `'active'`).

#### `useDebugModalVisibility()`

Returns the current `DebugModalVisibility` as a reactive value.

#### `useOnScreenDebuggerStore(selector)`

Direct access to the full Zustand store. Useful for reading or updating recording flags, flushing entries, etc.

### Components

#### `<OnScreenDebugger />`

The full debugger modal. Renders `null` when `debugModalVisibility === 'hidden'`. No props required.

### Types

```ts
type DebugModalVisibility = 'hidden' | 'not-focusable' | 'focusable';

type OnScreenDebuggerMode = 'off' | 'active-on-start' | 'active';

type LogEntry = {
  params: string[];
  extraParams?: {
    networkTraffic?: FetchEntryType;
    options?: Record<string, any>;
    log?: string[];
  };
  callSite?: CallSiteInfo;
  time: number;
  type: 'log' | 'debug' | 'info' | 'warn' | 'error' | 'networkTraffic';
  id: string;
};
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | — | Set to `'production'` to fully disable all interceptors and UI. |
| `APP_ENV` | `'dev'` | Controls whether the initial debugger mode reads from `localStorage` (`!== 'production'`) or is forced `'off'`. |

---

## Keyboard / Remote control

| Input | Action |
|---|---|
| `← ← ← → ←` | Toggle the modal to `focusable` mode (non-production only). |
| `↑ ↓ ← →` | Navigate entries and toolbar buttons while modal is focused. |
| `OK` | Open entry details / toggle super-expanded details view. |
| `BACK` | Step back through focus levels: details → entry list → toolbar → return to app. |

---

## State persistence

The following store keys are persisted to `localStorage` under the key `on-screen-debugger`:

- `isEnabled`
- `quickKeySequence`
- `recordLog`, `recordDebug`, `recordInfo`, `recordWarn`, `recordError`
- `recordNetworkTraffic`

Log entries and network traffic are **not** persisted (in-memory only).

---

## Development

```bash
# Install dependencies
npm install

# Build (ESM + CJS bundles + type declarations)
npm run build

# Watch mode (Rollup)
npm run dev

# Type check only
npm run typecheck

# Lint TypeScript
npm run lint
npm run lint:fix

# Lint SCSS
npm run lint:styles
npm run lint:styles:fix

# Format all source files
npm run format

# Check formatting without writing
npm run format:check
```

Husky runs [lint-staged](https://github.com/lint-staged/lint-staged) on pre-commit: ESLint + Prettier on staged `.ts` / `.tsx` files, and Stylelint + Prettier on staged `.scss` files.

### Build details

The build uses [Rollup](https://rollupjs.org/) with `@rollup/plugin-typescript`, [`rollup-plugin-postcss`](https://github.com/egoist/rollup-plugin-postcss), and Sass. `.scss` files are compiled as CSS Modules (`localsConvention: 'dashesOnly'`) and emitted into the JS bundles with runtime style injection. After Rollup, type declarations are emitted with `tsc --project tsconfig.build.json`.

Two entry points are published:

| Entry | Import path |
|---|---|
| Main (hooks, store, types) | `@accedo/onscreen-debugger` |
| Component only | `@accedo/onscreen-debugger/dist/OnScreenDebugger` |

---

## License

Internal Accedo package — not for public distribution.
