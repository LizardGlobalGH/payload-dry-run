import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

// _dryRun is injected onto the collection at runtime by the plugin, so it isn't part of
// the generated `Post` type — cast is required to pass it through the Local API.
const createPost = (data: Record<string, unknown> = {}) =>
  payload.create({ collection: 'posts', data: data as never })

describe('dryRunCreatePlugin', () => {
  test('creates and persists a post when no dry-run flag is present', async () => {
    const post = await createPost()

    const found = await payload.findByID({
      id: post.id,
      collection: 'posts',
    })

    expect(found.id).toBe(post.id)
  })

  test('adds a hidden, virtual _dryRun field to the collection', () => {
    const postsConfig = payload.collections['posts'].config

    const field = postsConfig.fields.find((f) => 'name' in f && f.name === '_dryRun')

    expect(field).toBeDefined()
    expect(field).toMatchObject({
      type: 'checkbox',
      admin: { hidden: true, readOnly: true },
      virtual: true,
    })
  })

  test('does not persist the document when _dryRun is true, but returns the would-be result', async () => {
    const post = await createPost({ _dryRun: true })

    expect(post.id).toBeDefined()

    await expect(
      payload.findByID({
        id: post.id,
        collection: 'posts',
      }),
    ).rejects.toThrow()
  })

  test.each(['1', 'on', 'true', 'yes', 'TRUE', true, 1])(
    'treats %j as a truthy dry-run flag and rolls back the create',
    async (flagValue) => {
      const post = await createPost({ _dryRun: flagValue })

      await expect(
        payload.findByID({
          id: post.id,
          collection: 'posts',
        }),
      ).rejects.toThrow()
    },
  )

  test.each(['0', 'no', 'nope', false, 0, undefined])(
    'treats %j as a falsy dry-run flag and persists the create',
    async (flagValue) => {
      const post = await createPost({ _dryRun: flagValue })

      const found = await payload.findByID({
        id: post.id,
        collection: 'posts',
      })

      expect(found.id).toBe(post.id)
    },
  )
})
