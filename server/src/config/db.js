const mongoose = require('mongoose');

/**
 * Cached connection for serverless (Vercel) cold starts.
 * Reuses the same connection across invocations in a warm lambda.
 */
async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is not defined');
  }

  // Vercel env values can pick up accidental trailing whitespace/newlines
  uri = String(uri).trim();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 10,
  });

  return mongoose.connection;
}

module.exports = { connectDB };
