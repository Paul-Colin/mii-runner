import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  migrate: {
    async adapter(env) {
      const pool = new pg.Pool({
        connectionString: env['DATABASE_URL'],
      })
      return new PrismaPg(pool)
    },
  },
})
