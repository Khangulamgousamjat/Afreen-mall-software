import dotenv from 'dotenv';
import { createApp } from './app.js';
import { bootstrapDatabase } from './bootstrap.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

const app = createApp();

// Start listening on 0.0.0.0 for Render compatibility
app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`===========================================================`);
  console.log(`  Afreen Mall API Server running on port ${PORT}`);
  console.log(`  Healthcheck: http://localhost:${PORT}/health`);
  console.log(`===========================================================`);

  // Auto-seed Super Admin & Staff roster into database
  await bootstrapDatabase();
});
