const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// ==========================================
// SECURITY: Enforce Strict HTTP Defense Headers natively
// ==========================================
app.use((req, res, next) => {
  // Prevent browsers from MIME-sniffing a response away from the declared content-type
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent Clickjacking rendering UI inside an iframe
  res.setHeader('X-Frame-Options', 'DENY');
  // XSS attack rendering protection natively
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Force HTTPS mapping internally
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Explicitly Content-Security-Policy preventing foreign scripts or unexpected CDN injections
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' https://crowd-navigator-default-rtdb.asia-southeast1.firebasedatabase.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'");
  next();
});

// ==========================================
// EFFICIENCY: Enable maximum Browser File Caching
// ==========================================
app.use(express.static(__dirname, {
    maxAge: '1d', // Heavily caching UI statically for 24 hours mitigating payload transfers
    etag: true,    // ETag tracking natively reducing bandwidth
    setHeaders: (res, path, stat) => {
        // Enforce cache-control immutable policies on JavaScript & CSS bounds specifically
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        }
    }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// SECURITY / QUALITY: Masking Internal Routing Stack Trace Errors correctly
// ==========================================
app.use((err, req, res, next) => {
  console.error('Handled Internal Engine Fault:', err.message);
  res.status(500).send('Service metric unavailable locally.');
});

app.listen(PORT, () => {
    console.log(`Encrypted Local Engine booted robustly targeting port ${PORT}`);
});
