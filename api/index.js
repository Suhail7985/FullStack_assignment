/**
 * Vercel serverless entry — exports the Express app.
 * All /api/* requests are rewritten here (see vercel.json).
 */
module.exports = require('../server/src/index');
