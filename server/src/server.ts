import http from 'http';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import app from './app';

let server: http.Server | null = null;
let isShuttingDown = false;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('CRITICAL: Database connection failed during startup:');
    console.error(error instanceof Error ? error.message : error);

    if (env.NODE_ENV === 'production') {
      console.error('Production server cannot accept requests without a database connection. Exiting with code 1.');
      process.exit(1);
    }

    console.warn(
      'Warning: Server started in non-production mode without active MongoDB connection. Verify MONGODB_URI in .env'
    );
  }

  server = app.listen(env.PORT, () => {
    console.log(`Server listening in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

const handleGracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Gracefully shutting down HTTP server and database...`);

  if (server) {
    server.close(async (err) => {
      if (err) {
        console.error('Error closing HTTP server:', err);
      } else {
        console.log('HTTP server closed successfully.');
      }

      try {
        await disconnectDB();
        process.exit(0);
      } catch (dbError) {
        console.error('Error during MongoDB disconnection:', dbError);
        process.exit(1);
      }
    });
  } else {
    try {
      await disconnectDB();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

startServer();

