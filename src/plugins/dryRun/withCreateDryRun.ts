import { type CollectionConfig, type PayloadRequest } from 'payload'

import { APIError } from '../../lib/APIError.js'

const wrappedCollections = new WeakSet<CollectionConfig>()

function dryRunLog(...args: any[]) {
  if (process.env.DEBUG !== 'true') {
    return
  }
  console.log('[DRY RUN] LOG:', ...args)
}

function dryRunError(...args: any[]) {
  if (process.env.DEBUG !== 'true') {
    return
  }
  console.error('[DRY RUN] ERROR:', ...args)
}

const isTruthyFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value === 1
  }
  if (typeof value === 'string') {
    return ['1', 'on', 'true', 'yes'].includes(value.trim().toLowerCase())
  }
  return false
}

const is_dryRunCreateRequested = (req: PayloadRequest, fieldName: string, args?: any): boolean => {
  if (
    [
      req.context?.[fieldName],
      req.query?.[fieldName],
      req.searchParams?.get(fieldName),
      args?.[fieldName],
      args?.data?.[fieldName],
    ].some(isTruthyFlag)
  ) {
    req.context[fieldName] = true
    return true
  }
  return false
}

const getResultID = (result: unknown): number | string | undefined => {
  if (!result || typeof result !== 'object' || !('id' in result)) {
    return undefined
  }
  const { id } = result

  return typeof id === 'number' || typeof id === 'string' ? id : undefined
}

export function withCreateDryRun<T extends CollectionConfig>(
  collection: T,
  fieldName = '_dryRun',
): T {
  if (wrappedCollections.has(collection)) {
    return collection
  }

  if (!collection.fields.some((field) => 'name' in field && field.name === fieldName)) {
    collection.fields = [
      ...collection.fields,
      {
        name: fieldName,
        type: 'checkbox',
        admin: {
          hidden: true,
          readOnly: true,
        },
        virtual: true,
      } as const,
    ]
  }

  collection.hooks = {
    ...collection.hooks,
    afterOperation: [
      ...(collection.hooks?.afterOperation ?? []),
      async ({ operation, req, result }) => {
        dryRunLog('[DRY RUN] afterOperation hook triggered with operation:', operation)
        const resultID = getResultID(result)
        dryRunLog('[DRY RUN] Extracted result ID:', resultID)

        if (
          operation !== 'create' ||
          !is_dryRunCreateRequested(req, fieldName) ||
          resultID === undefined
        ) {
          dryRunLog(
            '[DRY RUN] Not a create operation, dry-run not requested, or result does not have a valid ID, skipping hook logic.',
          )
          return result
        }

        if (!req.transactionID) {
          dryRunError(
            '[DRY RUN] No transaction ID found in request context. Cannot perform rollback for dry-run create.',
          )
          throw new APIError(
            'Dry-run create operation failed: no transaction ID available for rollback.',
            500,
          )
        }

        dryRunLog('[DRY RUN] Rolling back created document with ID:', resultID)
        await req.payload.db.rollbackTransaction(req.transactionID)
        dryRunLog('[DRY RUN] Document rolled back successfully.')

        return result
      },
    ],
    beforeOperation: [
      ({ args, operation, req }) => {
        dryRunLog('beforeOperation hook triggered with operation:', operation)
        if (operation !== 'create' || !is_dryRunCreateRequested(req, fieldName, args)) {
          dryRunLog(
            '[DRY RUN] Not a create operation or dry-run not requested, skipping hook logic.',
          )
          return args
        }
        // Check if the collection uses verification
        if (collection.auth && (collection.auth as any).verify) {
          dryRunLog(
            '[DRY RUN] Collection has auth with verification enabled, disabling verification email for dry-run create.',
          )
          return {
            ...args,
            disableVerificationEmail: true,
          }
        }

        dryRunLog('[DRY RUN] Marking create operation as dry-run without modifying args.')
        // If dry run, in case auth is enabled, we
        // disable the verification email
        return args
      },
      ...(collection.hooks?.beforeOperation ?? []),
    ],
  }

  wrappedCollections.add(collection)

  return collection
}
