// File: api/rss.js
import Parser from 'rss-parser'
import { MongoClient } from 'mongodb'

const parser = new Parser()
const MONGO_URI = process.env.MONGO_URI
const DB_NAME = 'steep_scanner'
const COLLECTION = 'signals'

const STEEP_KEYWORDS = {
  Technological: ['ai', 'quantum', 'robotics', 'encryption', 'innovation'],
  Economic: ['finance', 'economy', 'investment', 'inflation'],
  Environmental: ['climate', 'fusion', 'sustainability', 'ecology'],
  Political: ['policy', 'government', 'regulation', 'election'],
  Social: ['culture', 'society', 'education', 'lifestyle']
}

const classify = (text) => {
  const lower = text.toLowerCase()
  for (const [cat, words] of Object.entries(STEEP_KEYWORDS)) {
    if (words.some(word => lower.includes(word))) return cat
  }
  return 'Other'
}

async function saveToDB(signals) {
  if (!MONGO_URI) throw new Error('MONGO_URI not set')
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  const collection = db.collection(COLLECTION)

  const ops = signals.map(s => ({
    updateOne: {
      filter: { id: s.id },
      update: { $set: s },
      upsert: true
    }
  }))
  await collection.bulkWrite(ops)
  await client.close()
}

export default async function handler(req, res) {
  const feeds = req.method === 'POST' ? req.body.feeds : req.query.feeds?.split(',') || []
  if (!feeds.length) return res.status(400).json({ error: 'No feeds provided' })

  const results = []
  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url)
      const articles = feed.items.slice(0, 5).map((item, i) => ({
        id: `${url}-${i}`,
        title: item.title,
        summary: item.contentSnippet || item.content || '',
        source: feed.title,
        date: item.pubDate || new Date().toISOString(),
        category: classify(`${item.title} ${item.contentSnippet}`),
        score: Math.floor(Math.random() * 20 + 80),
        impact: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
        url: item.link
      }))
      results.push(...articles)
    } catch (err) {
      console.error('Error parsing feed:', url, err)
    }
  }

  await saveToDB(results)

  res.setHeader('Cache-Control', 's-maxage=1800')
  res.status(200).json({ signals: results })
}
