// ============================================================
//  CrawlX API Routes
//  RESTful API for programmatic access
// ============================================================

const express = require('express');
const router = express.Router();
const { isValidTargetUrl } = require('./security');

module.exports = function createApiRoutes(engine) {

  // ── Single URL Scrape ────────────────────────────────────
  // POST /api/scrape
  router.post('/scrape', async (req, res) => {
    try {
      const { url, options = {}, prompt, llmPrompt, apiKey, openRouterApiKey, model, llmModel } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          code: 'MISSING_URL',
        });
      }

      if (!isValidTargetUrl(url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid target URL: Only valid http:// and https:// URLs are permitted (max 2048 characters).',
          code: 'INVALID_URL',
        });
      }

      const mergedOptions = {
        ...options,
        ...(prompt ? { prompt } : {}),
        ...(llmPrompt ? { llmPrompt } : {}),
        ...(apiKey ? { openRouterApiKey: apiKey } : {}),
        ...(openRouterApiKey ? { openRouterApiKey } : {}),
        ...(model ? { llmModel: model } : {}),
        ...(llmModel ? { llmModel } : {}),
      };

      const result = await engine.scrape(url, mergedOptions);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'SCRAPE_ERROR',
      });
    }
  });

  // ── Deep Crawl ───────────────────────────────────────────
  // POST /api/crawl
  router.post('/crawl', async (req, res) => {
    try {
      const { url, options = {}, prompt, llmPrompt, apiKey, openRouterApiKey, model, llmModel } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          code: 'MISSING_URL',
        });
      }

      if (!isValidTargetUrl(url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid target URL: Only valid http:// and https:// URLs are permitted (max 2048 characters).',
          code: 'INVALID_URL',
        });
      }

      const mergedOptions = {
        ...options,
        ...(prompt ? { prompt } : {}),
        ...(llmPrompt ? { llmPrompt } : {}),
        ...(apiKey ? { openRouterApiKey: apiKey } : {}),
        ...(openRouterApiKey ? { openRouterApiKey } : {}),
        ...(model ? { llmModel: model } : {}),
        ...(llmModel ? { llmModel } : {}),
      };

      const result = await engine.crawl(url, mergedOptions);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'CRAWL_ERROR',
      });
    }
  });

  // ── Batch Scrape ─────────────────────────────────────────
  // POST /api/batch
  router.post('/batch', async (req, res) => {
    try {
      const { urls, options = {}, prompt, llmPrompt, apiKey, openRouterApiKey, model, llmModel } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'URLs array is required',
          code: 'MISSING_URLS',
        });
      }

      if (urls.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 URLs per batch',
          code: 'TOO_MANY_URLS',
        });
      }

      for (const u of urls) {
        if (!isValidTargetUrl(u)) {
          return res.status(400).json({
            success: false,
            error: `Invalid URL in batch: "${u}". Only valid http:// and https:// URLs are permitted.`,
            code: 'INVALID_URL',
          });
        }
      }

      const mergedOptions = {
        ...options,
        ...(prompt ? { prompt } : {}),
        ...(llmPrompt ? { llmPrompt } : {}),
        ...(apiKey ? { openRouterApiKey: apiKey } : {}),
        ...(openRouterApiKey ? { openRouterApiKey } : {}),
        ...(model ? { llmModel: model } : {}),
        ...(llmModel ? { llmModel } : {}),
      };

      const result = await engine.batchScrape(urls, mergedOptions);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'BATCH_ERROR',
      });
    }
  });

  // ── Screenshot ───────────────────────────────────────────
  // POST /api/screenshot
  router.post('/screenshot', async (req, res) => {
    try {
      const { url, options = {} } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          code: 'MISSING_URL',
        });
      }

      if (!isValidTargetUrl(url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid target URL: Only valid http:// and https:// URLs are permitted (max 2048 characters).',
          code: 'INVALID_URL',
        });
      }

      const result = await engine.takeScreenshot(url, options);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'SCREENSHOT_ERROR',
      });
    }
  });

  // ── OpenRouter Embeddings ────────────────────────────────
  // POST /api/embed
  router.post('/embed', async (req, res) => {
    try {
      const { input, model, options = {} } = req.body;

      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'Input string or array of strings is required (e.g. "my text" or ["text1", "text2"])',
          code: 'MISSING_INPUT',
        });
      }

      const result = await engine.getEmbeddings(input, {
        embedModel: model,
        ...options,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'EMBED_ERROR',
      });
    }
  });

  // ── Search & Extract (Web, Follow-up & /display) ──────────
  // POST /api/search
  router.post('/search', async (req, res) => {
    try {
      const {
        query,
        url,
        prompt,
        limit = 4,
        format = 'json',
        isFollowup = false,
        parentQuery = null,
        previousContext = null,
        options = {}
      } = req.body;
      const targetQuery = query || prompt;

      if (!targetQuery && !url) {
        return res.status(400).json({
          success: false,
          error: 'Query or URL is required for Search & Extract.',
          code: 'MISSING_SEARCH_PARAMS',
        });
      }

      if (url && !isValidTargetUrl(url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid target URL: Only valid http:// and https:// URLs are permitted.',
          code: 'INVALID_URL',
        });
      }

      if (targetQuery && targetQuery.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Query exceeds maximum allowed length of 10,000 characters.',
          code: 'PAYLOAD_TOO_LARGE',
        });
      }

      // If user provided a /display command directly in search
      if (targetQuery && targetQuery.trim().startsWith('/display')) {
        const displayResult = await engine.searchSocialAndImages(targetQuery);
        return res.json(displayResult);
      }

      const result = await engine.searchAndExtract({
        query: targetQuery,
        url,
        prompt: prompt || query,
        limit: parseInt(limit) || 4,
        format,
        isFollowup,
        parentQuery,
        previousContext,
        ...options,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'SEARCH_ERROR',
      });
    }
  });

  // ── Social Media & Images Display (/display Command) ───────
  // POST /api/display
  router.post('/display', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Query is required for /display command',
          code: 'MISSING_QUERY',
        });
      }

      const result = await engine.searchSocialAndImages(query.trim());
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'DISPLAY_ERROR',
      });
    }
  });

  // ── Get Job ──────────────────────────────────────────────
  // GET /api/job/:id
  router.get('/job/:id', (req, res) => {
    const job = engine.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        code: 'JOB_NOT_FOUND',
      });
    }
    res.json(job);
  });

  // ── List Jobs ────────────────────────────────────────────
  // GET /api/jobs
  router.get('/jobs', (req, res) => {
    res.json({
      success: true,
      jobs: engine.getJobs(),
    });
  });

  // ── API Info ─────────────────────────────────────────────
  // GET /api
  router.get('/', (req, res) => {
    res.json({
      engine: 'CrawlX',
      version: '1.0.0',
      tagline: 'Next-Gen Stealth Web Extraction Engine',
      endpoints: {
        'POST /api/scrape': {
          description: 'Scrape a single URL',
          body: {
            url: 'string (required)',
            options: {
              renderJs: 'boolean — Use headless browser (default: true)',
              waitFor: 'number — Wait ms after page load (default: 2000)',
              format: 'string — Output format: markdown|json|html|text (default: markdown)',
              extractContent: 'boolean — Use Readability for clean content (default: true)',
              selectors: 'object — Custom CSS selectors { key: "selector" }',
              headers: 'object — Custom request headers',
              screenshot: 'boolean — Capture screenshot (default: false)',
              fullPage: 'boolean — Full page screenshot (default: true)',
              mobile: 'boolean — Emulate mobile device (default: false)',
              removeSelectors: 'string[] — CSS selectors to remove',
              timeout: 'number — Request timeout ms (default: 30000)',
              waitForSelector: 'string — Wait for specific CSS selector',
              scrollToBottom: 'boolean — Auto-scroll for infinite pages (default: false)',
              extractLinks: 'boolean — Extract all links (default: true)',
              extractImages: 'boolean — Extract all images (default: true)',
              extractMeta: 'boolean — Extract metadata (default: true)',
              respectRobots: 'boolean — Respect robots.txt (default: true)',
            },
          },
        },
        'POST /api/crawl': {
          description: 'Deep crawl a website',
          body: {
            url: 'string (required)',
            options: {
              maxDepth: 'number — Maximum crawl depth (default: 3)',
              maxPages: 'number — Maximum pages to crawl (default: 50)',
              concurrency: 'number — Parallel workers (default: 3)',
              delay: 'number — Delay between requests ms (default: 500)',
              sameDomain: 'boolean — Stay on same domain (default: true)',
              includePatterns: 'string[] — URL patterns to include',
              excludePatterns: 'string[] — URL patterns to exclude',
            },
          },
        },
        'POST /api/batch': {
          description: 'Scrape multiple URLs in parallel',
          body: {
            urls: 'string[] (required, max 100)',
            options: 'Same as /api/scrape options + concurrency, delay',
          },
        },
        'POST /api/screenshot': {
          description: 'Take a screenshot of a URL',
          body: {
            url: 'string (required)',
            options: {
              width: 'number (default: 1920)',
              height: 'number (default: 1080)',
              fullPage: 'boolean (default: true)',
              type: 'string — png|jpeg (default: png)',
              quality: 'number — JPEG quality 0-100 (default: 80)',
            },
          },
        },
        'GET /api/job/:id': 'Get a specific job result',
        'GET /api/jobs': 'List all jobs',
      },
    });
  });

  return router;
};
