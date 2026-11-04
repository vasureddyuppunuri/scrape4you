# 🕷️ Scrape4you (CrawlX) — Autonomous AI Web Scraping & Stealth Extraction Engine

> **Autonomous AI web-scraping and multi-source extraction engine** with stealth browser automation, intelligent content extraction, zero-hallucination evidence quotes, and endpoint security.

---

## ⚡ Quick Start

```bash
npm install
npm start
```

Open **http://localhost:3000** — that's it.

---

| Feature | CrawlX | Firecrawl | Browser Use |
|---|---|---|---|
| **Natural Language AI Extraction** | ✅ OpenRouter (Any LLM) | ⚠️ Limited schema | ❌ Complex agent loops |
| **Self-hosted & Unlimited** | ✅ $0 platform | ❌ Expensive credits | ❌ Heavy local agent |
| **JS Rendering & SPAs** | ✅ Stealth Chromium | ✅ Cloud | ✅ Cloud/Local |
| **Cross-Browser Stealth** | ✅ Chrome/Safari/Edge/Firefox | ❌ Standard headless | ❌ Basic |
| **Clean Human-Crafted UI** | ✅ White & Blue Dashboard | ❌ Dashboard only | ❌ CLI / Minimal |
| **Multi-Format Output** | ✅ Clean JSON, Markdown, HTML | ✅ Markdown/JSON | ❌ Raw agent trace |
| **Auto-Fallback Engine** | ✅ Stealth fetch fallback | ❌ | ❌ |
| **Screenshots & Tables** | ✅ Full page + auto table parse | ❌ | ❌ |
| **Cost** | **$0 / BYO Key** | **$$$ Monthly** | **$$$ Tokens** |

---

## 🧠 Natural Language AI Extraction (OpenRouter)

Instead of manually guessing CSS selectors or receiving raw messy HTML from complex sites like Amazon or dynamic SPAs, simply tell CrawlX what to extract in plain English:

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.amazon.com/dp/B08N5WRWNW",
    "prompt": "Extract the product title, current price, rating, review count, and top 3 key features as clean JSON",
    "options": {
      "openRouterApiKey": "sk-or-v1-...",
      "llmModel": "google/gemini-2.0-flash-001"
    }
  }'
```

You can also set `OPENROUTER_API_KEY` in your `.env` file or enter it directly into the dashboard.

---

## 🎯 Features

### 🔎 Search & Extract (Web & Site)
- **Web Search**: Enter any question or prompt (e.g. *"Compare pricing for Linear, Notion, and Jira"*), CrawlX automatically queries the web, discovers top sources, scrapes them, ranks them using semantic embeddings, and extracts structured data with zero manual URL input.
- **Site Search**: Provide any root domain (e.g. `stripe.com`) and prompt, CrawlX maps internal links, navigates to the exact relevant subpages, and extracts structured records.
- **Live 3-Step Stepper UI**: Real-time progress tracking showing Discovery → Parallel Scraping → Neural AI Extraction.
- **Multi-Format Export**: One-click download as JSON or CSV.

### 🧬 OpenRouter Embeddings (`/api/embed`)
- Default embedding model: High-density semantic vectorizer (`2048` dimensions)
- Supports single strings and batch arrays (`input: ["text1", "text2"]`)
- Built-in cosine similarity for chunk ranking and semantic extraction

### 🔍 Single URL Scrape
- JavaScript rendering with headless Chromium
- Comprehensive DOM extraction (preserves e-commerce product grids, tables, and price tags)
- Custom CSS selector extraction
- Multi-format output: Markdown, JSON, HTML, Text
- Full-page screenshots
- Metadata & SEO data extraction
- Table extraction
- Link & image harvesting
- Structured data mining (JSON-LD, OpenGraph)

### 🕸️ Deep Crawl
- Crawl entire websites with configurable depth
- Concurrent workers with rate limiting
- Same-domain filtering
- URL pattern include/exclude
- Auto-discovery of internal links
- robots.txt compliance

### 📦 Batch Scrape
- Scrape up to 100 URLs in parallel
- Configurable concurrency & delay
- Progress tracking per URL
- Bulk export

### 🥷 Stealth Suite
- Puppeteer Extra + Stealth Plugin
- Randomized user agents (8+ realistic agents)
- Randomized viewports
- Canvas fingerprint noise
- WebDriver flag masking
- Chrome runtime spoofing
- Navigator property overrides

### 📡 REST API
Drop-in replacement for Firecrawl. Full programmatic access:

```bash
# Scrape a URL
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "options": {"format": "markdown"}}'

# Deep crawl
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.example.com", "options": {"maxDepth": 3, "maxPages": 50}}'

# Batch scrape
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://a.com", "https://b.com"], "options": {"concurrency": 5}}'

# Screenshot
curl -X POST http://localhost:3000/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "options": {"fullPage": true}}'
```

---

## 🛠️ API Reference

### `POST /api/scrape`
| Option | Type | Default | Description |
|---|---|---|---|
| `renderJs` | boolean | `true` | Use headless browser |
| `waitFor` | number | `2000` | Wait ms after page load |
| `format` | string | `markdown` | Output: markdown/json/html/text |
| `extractContent` | boolean | `true` | Smart content extraction |
| `selectors` | object | `{}` | Custom CSS selectors |
| `screenshot` | boolean | `false` | Capture screenshot |
| `mobile` | boolean | `false` | Mobile emulation |
| `scrollToBottom` | boolean | `false` | Auto-scroll for infinite pages |
| `removeSelectors` | string[] | `[]` | Elements to remove |
| `headers` | object | `{}` | Custom HTTP headers |
| `timeout` | number | `30000` | Request timeout ms |
| `respectRobots` | boolean | `true` | Respect robots.txt |

### `POST /api/crawl`
| Option | Type | Default | Description |
|---|---|---|---|
| `maxDepth` | number | `3` | Maximum crawl depth |
| `maxPages` | number | `50` | Maximum pages |
| `concurrency` | number | `3` | Parallel workers |
| `delay` | number | `500` | Delay between requests ms |
| `sameDomain` | boolean | `true` | Stay on same domain |
| `includePatterns` | string[] | `[]` | URL patterns to include |
| `excludePatterns` | string[] | `[]` | URL patterns to exclude |

### `POST /api/batch`
| Option | Type | Default | Description |
|---|---|---|---|
| `urls` | string[] | required | URLs to scrape (max 100) |
| `concurrency` | number | `3` | Parallel workers |
| `delay` | number | `300` | Delay between requests ms |

---

## 📂 Project Structure

```
crawlx/
├── server.js              # Express + Socket.IO server
├── package.json           # Dependencies
├── src/
│   ├── engine.js          # Core scraping engine (the brain)
│   └── routes.js          # REST API routes
└── public/
    ├── index.html         # Dashboard UI
    ├── css/
    │   └── styles.css     # Cyberpunk dark theme
    └── js/
        └── app.js         # Frontend logic
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Start scraping (when URL input focused) |
| `Ctrl+K` | Focus URL input |

---

## 📄 License

MIT — Free to use, modify, and distribute.
