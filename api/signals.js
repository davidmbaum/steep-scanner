// File: api/signals.js
import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGO_URI
const DB_NAME = 'steep_scanner'
const COLLECTION = 'signals'

export default async function handler(req, res) {
  if (!MONGO_URI) return res.status(500).json({ error: 'MONGO_URI missing' })

  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  const collection = db.collection(COLLECTION)

  const signals = await collection.find().sort({ date: -1 }).limit(100).toArray()
  await client.close()

  res.status(200).json({ signals })
}
