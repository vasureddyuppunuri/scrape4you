// ============================================================
//  CrawlX Security & Endpoint Protection Middleware
// ============================================================

const fs = require('fs');
const path = require('path');

// ── In-Memory Rate Limiter ────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120;     // 120 requests per minute per IP

// Periodically clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * Rate Limiter Middleware
 */
function rateLimiter(req, res, next) {
  // Exclude static assets and health check
  if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path === '/health' || req.path === '/') {
    return next();
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = rateLimitMap.get(ip);
  if (!entry || (now - entry.windowStart > RATE_LIMIT_WINDOW_MS)) {
    entry = { count: 1, windowStart: now };
    rateLimitMap.set(ip, entry);
  } else {
    entry.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count));

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down and try again shortly.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  next();
}

/**
 * Security Headers Middleware
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * Sensitive Files Blocker Middleware
 * Prevents direct HTTP requests from accessing configuration or source files
 */
function blockSensitiveFiles(req, res, next) {
  const normalized = (req.path || '').toLowerCase();
  const blockedPatterns = [
    /\/\.env/,
    /\/\.git/,
    /\/package\.json/,
    /\/package-lock\.json/,
    /\/node_modules/,
    /\/server\.js/,
    /\/src\//
  ];

  if (blockedPatterns.some(pattern => pattern.test(normalized))) {
    return res.status(403).json({
      success: false,
      error: 'Access to configuration and source files is forbidden.',
      code: 'ACCESS_DENIED'
    });
  }

  next();
}

/**
 * API Key / Auth Protection Middleware
 * If CRAWLX_API_KEY is configured in .env:
 * - External programmatic requests to /api/* must supply 'x-api-key' or 'Authorization: Bearer <key>'
 * - Web dashboard / local browser requests are verified and permitted
 */
function apiAuthMiddleware(req, res, next) {
  const configuredApiKey = (process.env.CRAWLX_API_KEY || '').trim();

  // If no internal API key protection configured, allow all
  if (!configuredApiKey) {
    return next();
  }

  // Exempt public informational endpoints and health check
  if (req.path === '/health' || req.path === '/api' || req.path === '/api/') {
    return next();
  }

  // Exempt local frontend dashboard requests (verified via referer, origin, or sec-fetch-site)
  const origin = req.headers['origin'] || '';
  const referer = req.headers['referer'] || '';
  const host = req.headers['host'] || '';
  const secFetchSite = req.headers['sec-fetch-site'] || '';

  const isLocalDashboard =
    secFetchSite === 'same-origin' ||
    (origin && host && origin.includes(host)) ||
    (referer && host && referer.includes(host));

  if (isLocalDashboard) {
    return next();
  }

  // Check incoming API Key
  const clientKey =
    req.headers['x-api-key'] ||
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim() ||
    req.query.api_key;

  if (clientKey && clientKey === configuredApiKey) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Missing or invalid API key. Provide header "x-api-key" or "Authorization: Bearer <key>".',
    code: 'UNAUTHORIZED'
  });
}

/**
 * Deep Redaction Helper: Recursively removes or masks sensitive credentials
 */
function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Mask any OpenRouter or other AI key patterns (sk-or-v1-...)
      return obj.replace(/sk-or-v1-[a-zA-Z0-9]{20,}/gi, 'sk-or-***[REDACTED]***');
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const sanitized = {};
  const sensitiveFieldNames = new Set([
    'openrouterapikey',
    'apikey',
    'api_key',
    'password',
    'secret',
    'crawlx_api_key'
  ]);

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFieldNames.has(key.toLowerCase())) {
      // Exclude completely or mask if strictly required
      continue;
    }
    sanitized[key] = redactSensitiveData(value);
  }

  return sanitized;
}

/**
 * Response Sanitization Middleware
 * Intercepts res.json() to strip any accidentally leaked API keys or credentials
 */
function responseSanitizer(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    try {
      const cleaned = redactSensitiveData(body);
      return originalJson(cleaned);
    } catch {
      return originalJson(body);
    }
  };

  next();
}

/**
 * Validate URL Input Helper
 */
function isValidTargetUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  if (urlStr.length > 2048) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = {
  rateLimiter,
  securityHeaders,
  blockSensitiveFiles,
  apiAuthMiddleware,
  responseSanitizer,
  isValidTargetUrl,
  redactSensitiveData,
};

