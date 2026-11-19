// Scratch script for trying Drizzle queries: npm run db:prototype
// Uses the facebook_post cache table (no foreign keys, and the worker rebuilds
// it on each sync). Every write targets only TEST_POST_ID, so real posts are
// never changed.
import { eq } from 'drizzle-orm'
import { dbClient, dbConn } from '@db/client.js'
import { facebookPost } from '@db/schema.js'

const TEST_POST_ID = 'prototype-test-post'

async function insertData() {
  await dbClient
    .insert(facebookPost)
    .values({
      id: TEST_POST_ID,
      createdTime: new Date(),
      message: 'Finish reading',
      permalinkUrl: 'https://example.com/prototype-test-post',
    })
    .onConflictDoNothing()
}

async function queryData() {
  const results = await dbClient.query.facebookPost.findMany({
    columns: { id: true, createdTime: true, message: true },
  })
  console.log(results)
}

async function updateData() {
  const results = await dbClient
    .update(facebookPost)
    .set({ message: 'AAA' })
    .where(eq(facebookPost.id, TEST_POST_ID))
    .returning({ id: facebookPost.id })
  if (results.length === 0) console.log('Test post not found; run insertData first.')
}

async function deleteData() {
  await dbClient.delete(facebookPost).where(eq(facebookPost.id, TEST_POST_ID))
}

async function main() {
  try {
    // await insertData()
    await queryData()
    // await updateData()
    // await deleteData()
  } finally {
    await dbConn.end()
  }
}

main()
