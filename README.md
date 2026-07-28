# `@lizardglobal/payload-dry-run`

[Payload CMS](https://payloadcms.com/docs/plugins/overview) plugin that allows you to test your <code>create</code> operations without persisting data — full validation, hooks, and business logic, automatically rolled back.

[![npm](https://img.shields.io/npm/v/@lizardglobal/payload-dry-run.svg)](https://www.npmjs.com/package/@lizardglobal/payload-dry-run)

[![Release](https://github.com/LizardGlobalGH/payload-dry-run/actions/workflows/release.yml/badge.svg)](https://github.com/LizardGlobalGH/payload-dry-run/actions/workflows/release.yml)

> [!WARNING]
> This plugin is still **experimental**. APIs, collection schemas, and behavior may change without a stable compatibility guarantee. Use in production with caution and pin versions deliberately.

## Features

- Validate create requests end-to-end without writing to the database.
- Full hook and validation pipeline runs — only the final commit is rolled back.
- Per-collection field names, or a single shared name for all collections.
- Disables verification emails automatically for auth collections on dry-run creates.
- Zero-overhead when not triggered — no impact on normal create operations.
- `disabled` flag for environment-based opt-out.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Plugin Options](#plugin-options)
  - [Field Name Resolution](#field-name-resolution)
- [Triggering a Dry Run](#triggering-a-dry-run)
- [Low-Level API](#low-level-api)
  - [`withCreateDryRun`](#withcreatedryrun)
  - [`APIError`](#apierror)
- [How It Works](#how-it-works)
- [Debugging](#debugging)

## Requirements

- Payload `^3.0.0`
- Node.js `>=20`

## Installation

```bash
pnpm add @lizardglobal/payload-dry-run
# or
npm install @lizardglobal/payload-dry-run
# or
yarn add @lizardglobal/payload-dry-run
```

## Quick Start

```ts
import { dryRunCreatePlugin } from '@lizardglobal/payload-dry-run'
import { buildConfig } from 'payload'

export default buildConfig({
  // ...
  plugins: [
    dryRunCreatePlugin({
      collections: ['users', 'orders'],
    }),
  ],
})
```

To test a create without persisting, pass `_dryRun=true` anywhere Payload reads it — query string, request body, or context:

```bash
POST /api/orders?_dryRun=true
```

The full operation runs. Validation, hooks, access control — everything executes. The created document is then rolled back. The response is the would-be result, as if the create had committed.

## Configuration

### Plugin Options

| Option             | Type                                             | Default      | Description                                                  |
| ------------------ | ------------------------------------------------ | ------------ | ------------------------------------------------------------ |
| `collections`      | `string[]`                                       | **required** | Slugs of the collections to enable dry-run creates on        |
| `dryRunFieldName`  | `string \| { _default?: string; [slug]: string }` | `'_dryRun'`  | Field name(s) used to trigger the dry run ([details](#field-name-resolution)) |
| `disabled`         | `boolean`                                        | `false`      | Set `true` to skip the plugin entirely (e.g. in production)  |

### Field Name Resolution

`dryRunFieldName` controls what query param / body key / context key triggers the dry run. Three forms are supported:

**A single string — same field name for every collection (default behavior):**

```ts
dryRunCreatePlugin({
  collections: ['users', 'orders'],
  dryRunFieldName: '_dryRun',
})
```

**An object — per-collection field names:**

```ts
dryRunCreatePlugin({
  collections: ['users', 'orders'],
  dryRunFieldName: {
    users: '_dryRunUser',
    orders: '_dryRunOrder',
  },
})
```

**An object with `_default` — per-collection overrides with a fallback for anything not listed:**

```ts
dryRunCreatePlugin({
  collections: ['users', 'orders', 'products'],
  dryRunFieldName: {
    users: '_dryRunUser',
    _default: '_dryRun', // used for 'orders' and 'products'
  },
})
```

If a collection is listed in `collections` but has no entry in the object and no `_default`, the plugin falls back to `'_dryRun'`.

## Triggering a Dry Run

The plugin reads the dry-run flag from several places. Any one of these is sufficient:

| Source           | Example                                              |
| ---------------- | ---------------------------------------------------- |
| Query string     | `POST /api/orders?_dryRun=true`                      |
| Request body     | `{ ..., "_dryRun": true }`                           |
| Request context  | `req.context._dryRun = true`                         |
| Search params    | `searchParams.get('_dryRun')`                        |

Accepted truthy values: `true`, `1`, `"1"`, `"on"`, `"true"`, `"yes"` (case-insensitive). Everything else is treated as falsy.

When the flag is detected, `req.context._dryRun` is set to `true` for the remainder of the request lifecycle — subsequent hooks can read it too.

## Low-Level API

### `withCreateDryRun`

Applies the dry-run behavior directly to a single `CollectionConfig`, without going through the plugin. Use this when you're building your own plugin or composing collection configs manually:

```ts
import { withCreateDryRun } from '@lizardglobal/payload-plugin-dry-run-create'

const Orders: CollectionConfig = withCreateDryRun(
  {
    slug: 'orders',
    fields: [...],
  },
  '_dryRun', // optional, defaults to '_dryRun'
)
```

`withCreateDryRun` is idempotent — calling it twice on the same config object is a no-op.

### `APIError`

A thin wrapper around Payload's built-in `APIError`. Exposed for use in hooks or custom endpoints that need to throw a formatted Payload error:

```ts
import { APIError } from '@lizardglobal/payload-plugin-dry-run-create'

throw new APIError('Something went wrong', 422)
```

The second argument is the HTTP status code (defaults to `400`). The error is always marked as public.

## How It Works

The plugin injects two hooks on each configured collection:

1. **`beforeOperation`** — detects the dry-run flag and, if the collection uses auth with email verification, sets `disableVerificationEmail: true` so no email is sent during validation.

2. **`afterOperation`** — after a successful `create`, checks whether this was a dry-run request. If it was, it calls `req.payload.db.rollbackTransaction(req.transactionID)` to undo the write. The already-computed result is returned as-is, so the caller receives the full would-be document.

If no transaction ID is present when a rollback is needed, the plugin throws rather than silently leaving behind a committed document.

A hidden, read-only, virtual checkbox field (`_dryRun` by default) is added to each collection. This field is never persisted — it exists so Payload's own input handling recognises the key in submitted data.

## Debugging

Set `DEBUG=true` in your environment to enable verbose logging:

```bash
DEBUG=true pnpm dev
```

The plugin will log each hook invocation, the extracted result ID, the transaction ID, and whether a rollback was performed — all prefixed with `[DRY RUN]`.