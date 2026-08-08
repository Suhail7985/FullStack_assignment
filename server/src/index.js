require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const parameterRoutes = require('./routes/parameters');
const feedbackRoutes = require('./routes/feedback');
const performanceRoutes = require('./routes/performance');
const hrRoutes = require('./routes/hr');

const app = express();

function getAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

app.use(
  cors({
    origin(origin, callback) {
      const allowed = getAllowedOrigins();
      // Same-origin / server-to-server / curl (no Origin header)
      if (!origin || allowed.includes('*') || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Ensure DB is connected before handling requests (needed on Vercel serverless)
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/hr', hrRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

// Local / traditional Node hosting only — Vercel imports the app as a serverless handler
if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
