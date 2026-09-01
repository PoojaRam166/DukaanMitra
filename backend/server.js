const app = require('./app');
const db = require('./config/db');
const ensureSchema = require('./db/ensureSchema');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // Test DB connection
    await db.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');

    // Self-heal the schema (adds any columns/tables the code now expects
    // but an older/fresh database may be missing) before serving requests.
    await ensureSchema();
    console.log('✅ Database schema up to date');

    app.listen(PORT, () => {
      console.log(`🚀 DukaanMitra API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err.message);
    process.exit(1);
  }
};

start();
