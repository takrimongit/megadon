import { buildApp } from './app.js';
import { config } from './lib/config.js';

const app = await buildApp();
app.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`API listening on :${config.port} role=${config.role} emulator=${config.isEmulator()}`);
});
