import app from './app';
import { config } from './config';

// Initialise DB (side-effect import runs CREATE TABLE IF NOT EXISTS)
import './db';

app.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port} [${config.nodeEnv}]`);
});
