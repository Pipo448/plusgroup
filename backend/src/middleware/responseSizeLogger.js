// src/middleware/responseSizeLogger.js
//
// ⚠️ ZOUTI DYAGNOSTIK TANPORÈ — mezire konbyen bytes CHAK repons API voye,
// epi ekri nan lòg (Render Logs) sèlman repons ki DEPASE yon sèy (100 KB
// pa default). Objektif: jwenn PRÈV DIRÈK — pa teyori — sou ki wout (route)
// egzat k ap voye pi gwo volim done yo.
//
// KOMAN SÈVI AK LI:
//   1. Ajoute nan index.js, JISTE apre `app.use(express.json(...))` yo,
//      anvan tout lòt routes:
//        const responseSizeLogger = require('./middleware/responseSizeLogger');
//        app.use(responseSizeLogger);
//   2. Deplwaye, kite l ran pandan 12-24è (yon jounen biznis konplè).
//   3. Nan Render Logs, filtre pou "BIG_RESPONSE" pou wè lis la, triye pa
//      gwosè pou jwenn pi gwo koupab yo.
//   4. Yon fwa ou jwenn repons ou bezwen an, RETIRE middleware sa a
//      (li ajoute yon ti overhead, pa kite l pou tout tan an pwodiksyon).
//
const THRESHOLD_BYTES = 100 * 1024; // 100 KB — ajiste si ou vle plis/mwens detay

function responseSizeLogger(req, res, next) {
  const chunks = [];
  const originalWrite = res.write;
  const originalEnd = res.end;

  res.write = function (chunk, ...args) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalWrite.apply(res, [chunk, ...args]);
  };

  res.end = function (chunk, ...args) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);

    if (totalBytes > THRESHOLD_BYTES) {
      const kb = (totalBytes / 1024).toFixed(1);
      console.log(
        `BIG_RESPONSE ${kb}KB ${req.method} ${req.originalUrl} ` +
        `tenant=${req.headers['x-tenant-slug'] || '?'} ` +
        `status=${res.statusCode} ` +
        `at=${new Date().toISOString()}`
      );
    }

    return originalEnd.apply(res, [chunk, ...args]);
  };

  next();
}

module.exports = responseSizeLogger;
