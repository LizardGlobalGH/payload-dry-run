import { type Config, type Plugin } from 'payload'

import { withCreateDryRun } from './withCreateDryRun.js'

//How to use dryRunCreatePlugin in paylaod.config.ts

// Same field name for all collections (default behavior)
// dryRunCreatePlugin({
//   collections: ['users', 'orders'],
//   dryRunFieldName: '_dryRun',
// }),

// Per-collection field names
// dryRunCreatePlugin({
//   collections: ['users', 'orders'],
//   dryRunFieldName: {
//     users: '_dryRunUser',
//     orders: '_dryRunOrder',
//   },
// }),

// Per-collection with a fallback for unspecified collections
// dryRunCreatePlugin({
//   collections: ['users', 'orders', 'products'],
//   dryRunFieldName: {
//     users: '_dryRunUser',
//     _default: '_dryRun',
//   },
// }),

type DryRunCreatePluginOptions = {
  collections: string[]
  disabled?: boolean
  dryRunFieldName?: ({ _default?: string } & Partial<Record<string, string>>) | string
}

const resolveFieldName = (
  dryRunFieldName: DryRunCreatePluginOptions['dryRunFieldName'],
  slug: string,
): string => {
  if (!dryRunFieldName || typeof dryRunFieldName === 'string') {
    return dryRunFieldName ?? '_dryRun'
  }
  return dryRunFieldName[slug] ?? dryRunFieldName['_default'] ?? '_dryRun'
}

export const dryRunCreatePlugin = (options: DryRunCreatePluginOptions): Plugin => {
  const { collections, disabled = false, dryRunFieldName } = options

  return (incomingConfig: Config): Config => {
    if (disabled) {
      return incomingConfig
    }
    return {
      ...incomingConfig,
      collections: (incomingConfig.collections ?? []).map((collection) => {
        if (!collections.includes(collection.slug)) {
          return collection
        }
        const fieldName = resolveFieldName(dryRunFieldName, collection.slug)
        return withCreateDryRun(collection, fieldName)
      }),
    }
  }
}

export { APIError } from '../../lib/APIError.js'
export { withCreateDryRun } from './withCreateDryRun.js'
