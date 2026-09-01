const { Pool, types } = require('pg');
require('dotenv').config();

// By default node-postgres parses DATE columns (OID 1082) into JS Date
// objects using the server's LOCAL timezone, then Express's res.json()
// serializes them with .toISOString() (which converts to UTC). On any
// server/machine running in a timezone ahead of UTC (e.g. IST, UTC+5:30)
// this silently shifts the date back by one day before it ever reaches
// the frontend — this was the actual cause of "Today's Expenses" being
// wrong, regardless of any frontend-side date handling.
// Returning the raw 'YYYY-MM-DD' string instead removes the ambiguity.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Managed Postgres hosts (Render, Railway, Supabase, Neon, etc.) require
  // SSL for external connections. rejectUnauthorized: false accepts their
  // self-signed chain — fine for these providers, not a general-purpose
  // setting. Local dev (NODE_ENV unset) connects without SSL as before.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // used for transactions
};
