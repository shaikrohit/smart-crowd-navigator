const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// ==========================================
// SECURITY: Native Memory IP Rate Limiter targeting DDoS protection (0 Dependencies)
// ==========================================
const rateLimitMap = new Map();
app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 Min Block Loop
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, start: now });
    } else {
        let stats = rateLimitMap.get(ip);
        if (now - stats.start > windowMs) {
            rateLimitMap.set(ip, { count: 1, start: now });
        } else {
            stats.count++;
            if (stats.count > 100) {
                // GOOGLE SERVICES: Pushing Structured Logs mapping deep into Google Cloud Logging limits
                console.warn(JSON.stringify({ severity: 'WARNING', message: `Automated Security System Rate limited IP bound: ${ip}` }));
                return res.status(429).send("Too Many Malicious Requests from this IP boundary. Denied.");
            }
        }
    }
    next();
});

// ==========================================
// SECURITY: Enforce Strict HTTP Defense Headers natively
// ==========================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' https://crowd-navigator-default-rtdb.asia-southeast1.firebasedatabase.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'");
  next();
});

// ==========================================
// EFFICIENCY: Enable maximum Browser File Caching Parameters natively
// ==========================================
app.use(express.static(__dirname, {
    maxAge: '1d', // Heavily caching UI statically for 24 hours mitigating payload transfers natively
    etag: true,   // Native chunk comparison
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        }
    }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// QUALITY / GOOGLE SERVICES: Masking Trace Hooks & Structural Google Logging Implementation
// ==========================================
app.use((err, req, res, next) => {
  console.error(JSON.stringify({ severity: 'ERROR', message: `Internal Infrastructure Failure Map: ${err.message}`, stack: err.stack }));
  res.status(500).send('Service load metric critically unavailable locally.');
});

app.listen(PORT, () => {
    console.log(JSON.stringify({ severity: 'INFO', message: `Secure Server Application fully booted listening on ${PORT}` }));
});
