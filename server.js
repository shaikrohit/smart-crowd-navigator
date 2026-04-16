/**
 * Smart Crowd Navigator – Express Server
 * 
 * Responsibilities:
 *   - Serve static frontend files (index.html, assistant.js, data.json)
 *   - Enforce HTTP security headers (CSP, HSTS, X-Frame-Options)
 *   - Rate-limit requests per IP (DDoS protection, zero dependencies)
 *   - Emit structured JSON logs for Google Cloud Logging integration
 *   - Apply browser cache headers for efficiency
 */

'use strict';

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ==========================================================================
// SECURITY: Zero-dependency IP rate limiter
// ==========================================================================
const rateLimit = new Map();
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX_REQUESTS = 100;

app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    if (!rateLimit.has(clientIp)) {
        rateLimit.set(clientIp, { count: 1, windowStart: now });
    } else {
        const record = rateLimit.get(clientIp);
        if (now - record.windowStart > RATE_WINDOW_MS) {
            // Reset window
            rateLimit.set(clientIp, { count: 1, windowStart: now });
        } else {
            record.count++;
            if (record.count > RATE_MAX_REQUESTS) {
                // Google Cloud Logging: Structured JSON log for security monitoring
                console.warn(JSON.stringify({
                    severity: 'WARNING',
                    message: 'Rate limit exceeded',
                    clientIp: clientIp,
                    requestCount: record.count
                }));
                return res.status(429).send('Too many requests. Please try again later.');
            }
        }
    }
    next();
});

// ==========================================================================
// SECURITY: HTTP response headers
// ==========================================================================
app.use((req, res, next) => {
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Block clickjacking by preventing iframe embedding
    res.setHeader('X-Frame-Options', 'DENY');
    // Enable browser XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Enforce HTTPS for 1 year
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Restrict resource origins via Content Security Policy
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "connect-src 'self' https://crowd-navigator-default-rtdb.asia-southeast1.firebasedatabase.app",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "script-src 'self' 'unsafe-inline'"
    ].join('; '));
    next();
});

// ==========================================================================
// EFFICIENCY: Static file serving with browser caching
// ==========================================================================
app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        }
    }
}));

// Explicit route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================================================
// CODE QUALITY: Global error handler – masks internal stack traces
// ==========================================================================
app.use((err, req, res, next) => {
    // Google Cloud Logging: Structured error log
    console.error(JSON.stringify({
        severity: 'ERROR',
        message: err.message,
        stack: err.stack
    }));
    res.status(500).send('An internal error occurred.');
});

// ==========================================================================
// START SERVER
// ==========================================================================
app.listen(PORT, () => {
    // Google Cloud Logging: Structured startup log
    console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Smart Crowd Navigator server started on port ' + PORT
    }));
});
