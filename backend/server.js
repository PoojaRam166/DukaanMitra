const app = require('./app');
const db = require('./config/db');
const ensureSchema = require('./db/ensureSchema');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  console.log('Starting server boot sequence...');
  console.log(`Checking DATABASE_URL: ${process.env.DATABASE_URL ? 'Provided' : 'MISSING'}`);
  console.log(`Checking NODE_ENV: ${process.env.NODE_ENV}`);
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    // Test DB connection
    await db.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');

    // Self-heal the schema (adds any columns/tables the code now expects
    // but an older/fresh database may be missing) before serving requests.
    await ensureSchema();
    console.log('✅ Database schema up to date');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DukaanMitra API running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err.message);
    process.exit(1);
  }
};

start();
