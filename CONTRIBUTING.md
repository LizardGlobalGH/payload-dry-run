# Contributing

Thanks for your interest in improving `@lizardglobal/payload-discord-sync`.

## Getting started

Requirements:

- Node.js `^18.20.2 || >=20.9.0`
- [pnpm](https://pnpm.io) `^9 || ^10`

```bash
git clone https://github.com/LizardGlobalGH/payload-discord-sync.git
cd payload-discord-sync
pnpm install
```

Useful commands:

```bash
pnpm test        # unit tests
pnpm typecheck   # TypeScript
pnpm build       # compile to dist/
pnpm changeset   # add a changeset for your PR (see below)
```

## Pull requests

1. Create a branch from `main`
2. Make your changes with a clear focus (one concern per PR when possible)
3. Ensure `pnpm test`, `pnpm typecheck`, and `pnpm build` pass
4. Open a PR against `main` — CI must be green before merge

### Changesets

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and the changelog.

If your PR should result in a package release (feature, fix, or breaking change), run:

```bash
pnpm changeset
```

Choose the bump type (`patch` / `minor` / `major`), write a short summary, and **commit the generated file** under `.changeset/` with your PR.

You can skip a changeset for docs-only or internal changes that should not bump the npm version.

## How releases work

Maintainers (and anyone merging to `main`) should know:

1. Merging a feature PR that includes a changeset does **not** publish immediately
2. The Release workflow opens or updates a **Version Packages** PR (version bump + `CHANGELOG.md`)
3. Merging **that** Version Packages PR publishes to npm and creates a GitHub Release

See [CHANGELOG.md](./CHANGELOG.md) for published history.

## Code guidelines

- Match existing TypeScript style and project patterns
- Prefer small, focused changes over large refactors mixed with features
- Do not commit secrets (bot tokens, `.env`, npm tokens)
- Keep public API changes documented in the changeset summary

## Reporting issues

Use [GitHub Issues](https://github.com/LizardGlobalGH/payload-discord-sync/issues) for bugs and feature requests. Include:

- Payload and plugin versions
- Relevant plugin config (redact tokens)
- Expected vs actual behavior
- Logs or stack traces when available

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
