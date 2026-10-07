'use strict';

require('dotenv').config();

const { validateEnv } = require('./config/env');
const { env } = require('./config/env');
const { createApp } = require('./app');

// Validate required environment variables before starting
// In development, missing Supabase keys will warn but not crash the server
// so engineers can run the health endpoint without full Supabase credentials.
try {
  validateEnv();
} catch (err) {
  if (env.NODE_ENV === 'production') {
    console.error(err.message);
    process.exit(1);
  } else {
    console.warn('[DocuSaathi] WARNING:', err.message);
    console.warn('[DocuSaathi] Supabase-dependent routes will fail until credentials are configured.');
  }
}

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[DocuSaathi] Backend listening on http://localhost:${env.PORT}`);
  console.log(`[DocuSaathi] Environment: ${env.NODE_ENV}`);
});
