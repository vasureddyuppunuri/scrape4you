// ============================================================
//  Scrape 4 U — Client Controller
//  Clean Question Framing · Hovering Loading Box · No Thinking Output
//  Follow-up Scraping · /display Media & Social Discussions
// ============================================================

let currentSearchMode = 'web';
let activeResultData = null;
let timerInterval = null;
let isSearching = false;

// Socket.io for live updates
const socket = io();

// ── Search Mode Switch ──────────────────────────────────────
function switchSearchMode(mode) {
  currentSearchMode = mode;

  document.querySelectorAll('.nav-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const toggleWeb = document.getElementById('btnToggleWeb');
  const toggleSite = document.getElementById('btnToggleSite');
  if (toggleWeb) toggleWeb.classList.toggle('active', mode === 'web');
  if (toggleSite) toggleSite.classList.toggle('active', mode === 'site');

  const siteRow = document.getElementById('siteTargetRow');
  const searchInput = document.getElementById('mainSearchInput');

  if (mode === 'site') {
    if (siteRow) siteRow.style.display = 'flex';
    if (searchInput) searchInput.placeholder = 'What information do you want to scrape from this specific site?';
  } else {
    if (siteRow) siteRow.style.display = 'none';
    if (searchInput) searchInput.placeholder = 'Type what you want to scrape or search in depth... (e.g. React technical interview questions and answers)';
  }
}

// ── Quick Suggestions ───────────────────────────────────────
function applySuggestion(type) {
  const input = document.getElementById('mainSearchInput');
  if (!input) return;

  const suggestions = {
    interview: 'React technical interview questions with difficulty ratings, detailed answers, and code examples',
    python: 'Senior Python backend coding problems, algorithms, and comprehensive solutions',
    sysdesign: 'System design architecture patterns for high-throughput distributed microservices',
    pricing: 'Compare pricing tiers, feature limits, and billing models for Linear, Notion, and Jira',
    display: '/display React 19 architecture and release features',
  };

  if (suggestions[type]) {
    input.value = suggestions[type];
    input.focus();
    showToast('Applied suggestion', 'info');
  }
}

function resetToHome(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('mainSearchInput');
  if (input) input.value = '';
  const results = document.getElementById('resultsContainer');
  if (results) results.style.display = 'none';
  const loader = document.getElementById('loadingFloatingCard');
  if (loader) loader.style.display = 'none';
  stopTimer();
}

// ── Timer Handler ───────────────────────────────────────────
function startTimer(customHeadline) {
  const start = Date.now();
  const timerEl = document.getElementById('loadingElapsedTimer');
  const headlineEl = document.getElementById('loadingHeadline');
  const subtextEl = document.getElementById('loadingSubtext');
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (timerEl) {
      timerEl.textContent = `${elapsedSec.toFixed(1)}s (Limit 60s)`;
    }

    if (customHeadline) return;

    if (elapsedSec < 3) {
      if (headlineEl) headlineEl.textContent = 'Searching across top websites...';
      if (subtextEl) subtextEl.textContent = 'Discovering authoritative sources across the web';
    } else if (elapsedSec < 7) {
      if (headlineEl) headlineEl.textContent = 'Scraping source content in parallel...';
      if (subtextEl) subtextEl.textContent = 'Extracting deep text, tables, and reference links';
    } else if (elapsedSec < 16) {
      if (headlineEl) headlineEl.textContent = 'Synthesizing and framing Q&A answers...';
      if (subtextEl) subtextEl.textContent = 'Formulating clear questions, detailed explanations, and code';
    } else {
      if (headlineEl) headlineEl.textContent = 'Finalizing clean output and source links...';
      if (subtextEl) subtextEl.textContent = 'Polishing answers and preparing verified reference links';
    }
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ── Main Search Execution ───────────────────────────────────
async function executeSearch() {
  const query = document.getElementById('mainSearchInput')?.value.trim();
  const siteUrl = document.getElementById('siteTargetUrl')?.value.trim();

  if (!query && !siteUrl) {
    showToast('Please enter what you want to search', 'error');
    document.getElementById('mainSearchInput')?.focus();
    return;
  }

  if (isSearching) return;
  isSearching = true;

  const btn = document.getElementById('btnRunSearch');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Searching...</span>`;
  }

  // Hovering card from bottom
  const loadingCard = document.getElementById('loadingFloatingCard');
  const resultsContainer = document.getElementById('resultsContainer');
  if (loadingCard) {
    const headline = document.getElementById('loadingHeadline');
    const subtext = document.getElementById('loadingSubtext');
    if (query && query.startsWith('/display')) {
      if (headline) headline.textContent = 'Scraping social media & visual images...';
      if (subtext) subtext.textContent = 'Gathering discussions across Reddit, Twitter, YouTube & web galleries';
    } else {
      if (headline) headline.textContent = 'Searching across the web...';
      if (subtext) subtext.textContent = 'Extracting full details and formatting clean answers';
    }
    loadingCard.style.display = 'flex';
  }
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
  }

  startTimer();

  // Strict 65-second client timeout controller
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 65000);

  try {
    const payload = {
      query,
      prompt: query,
      url: currentSearchMode === 'site' ? siteUrl : undefined,
      limit: 4,
    };

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();
    stopTimer();

    if (!result.success) {
      throw new Error(result.error || 'Scraping encountered an issue');
    }

    activeResultData = result;

    if (loadingCard) loadingCard.style.display = 'none';

    // Route to /display gallery mode or deep text Q&A mode
    if (result.mode === 'display' || (query && query.startsWith('/display'))) {
      renderDisplayMode(result);
    } else {
      renderCleanResults(result);
    }

    if (resultsContainer) {
      resultsContainer.style.display = 'block';
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast('Extracted successfully', 'success');
  } catch (err) {
    clearTimeout(timeoutId);
    stopTimer();
    if (loadingCard) loadingCard.style.display = 'none';
    const msg = err.name === 'AbortError' ? 'Search exceeded 60s limit. Please try a more specific query.' : err.message;
    showToast(msg, 'error');
  } finally {
    isSearching = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <span>Scrape Now</span>
        <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
      `;
    }
  }
}

// ── Follow-Up Scraping Execution ────────────────────────────
async function executeFollowup() {
  const followupInput = document.getElementById('followupInput');
  const followupText = followupInput?.value.trim();

  if (!followupText) {
    showToast('Please type a follow-up question', 'error');
    followupInput?.focus();
    return;
  }

  const btn = document.getElementById('btnRunFollowup');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Scraping...</span>`;
  }

  // Preserve parent query and summary context
  const parentQuery = activeResultData?.prompt || activeResultData?.query || document.getElementById('mainSearchInput')?.value || '';
  let previousContext = '';
  if (activeResultData?.data) {
    if (typeof activeResultData.data === 'string') {
      previousContext = activeResultData.data.substring(0, 1500);
    } else {
      try {
        previousContext = JSON.stringify(activeResultData.data).substring(0, 1500);
      } catch {}
    }
  }

  const loadingCard = document.getElementById('loadingFloatingCard');
  if (loadingCard) {
    const headline = document.getElementById('loadingHeadline');
    const subtext = document.getElementById('loadingSubtext');
    if (headline) headline.textContent = `Scraping deeper on: "${followupText}"...`;
    if (subtext) subtext.textContent = 'Preserving thread context & discovering focused sources';
    loadingCard.style.display = 'flex';
  }

  startTimer(true);

  try {
    const payload = {
      query: followupText,
      prompt: followupText,
      isFollowup: true,
      parentQuery,
      previousContext,
      limit: 3,
    };

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    stopTimer();
    if (loadingCard) loadingCard.style.display = 'none';

    if (!result.success) {
      throw new Error(result.error || 'Follow-up scraping encountered an issue');
    }

    if (followupInput) followupInput.value = '';

    appendFollowupResult(result, followupText);
    showToast('Follow-up scraped successfully', 'success');
  } catch (err) {
    stopTimer();
    if (loadingCard) loadingCard.style.display = 'none';
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <span>Follow-Up</span>
        <span class="material-symbols-outlined" style="font-size:16px;">arrow_upward</span>
      `;
    }
  }
}

function applyFollowupChip(text) {
  const input = document.getElementById('followupInput');
  if (input) {
    input.value = text;
    executeFollowup();
  }
}

function triggerDisplayForCurrentQuery() {
  let topic = '';
  if (activeResultData && activeResultData.prompt) {
    topic = activeResultData.prompt;
  } else if (activeResultData && activeResultData.query) {
    topic = activeResultData.query;
  } else {
    const input = document.getElementById('mainSearchInput');
    topic = input ? input.value : '';
  }
  topic = topic.replace(/^\/display\s*/i, '').trim();
  if (!topic) {
    showToast('Please enter a topic to display images and social media for', 'info');
    document.getElementById('mainSearchInput')?.focus();
    return;
  }
  const input = document.getElementById('mainSearchInput');
  if (input) {
    input.value = `/display ${topic}`;
  }
  executeSearch();
}

// ── Domain Helper ───────────────────────────────────────────
function getDomain(urlStr) {
  if (!urlStr) return '';
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return urlStr;
  }
}

// ── Strip Thinking & Reasoning ──────────────────────────────
function stripThinkingProcess(text) {
  if (!text) return '';
  let clean = String(text);
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  clean = clean.replace(/^[\s\S]*?<\/think>/i, '').trim();
  clean = clean.replace(/<think>[\s\S]*$/i, '').trim();
  clean = clean.replace(/^(?:Here's a thinking process|Thinking Process|Thinking|Reasoning)[\s\S]*?(?=\[|\{|\n\n)/i, '').trim();
  clean = clean.replace(/^(?:Okay|Sure|Here is|Here are|Certainly|Below is)[\s\S]*?:\s*\n+/i, '').trim();
  clean = clean.replace(/^(?:Here's a list|I've extracted|Based on the webpage|According to the content)[\s\S]*?:\s*\n+/i, '').trim();
  return clean;
}

// ── Content HTML Builder (Shared across Main Search & Follow-Up Threads) ──
function buildContentHtml(result) {
  const sources = Array.isArray(result.sources) ? result.sources : [];
  let data = result.data !== undefined ? result.data : result.rawOutput;

  // Sanitize out any residual thinking tokens & extract JSON (with auto-repair)
  if (typeof data === 'string') {
    data = stripThinkingProcess(data);
    const arrayMatch = data.match(/\[\s*\{/);
    if (arrayMatch) {
      const sub = data.substring(arrayMatch.index);
      const lastBracket = sub.lastIndexOf(']');
      if (lastBracket !== -1) {
        try { data = JSON.parse(sub.substring(0, lastBracket + 1)); } catch {}
      }
      if (typeof data === 'string') {
        const lastBrace = sub.lastIndexOf('}');
        if (lastBrace !== -1) {
          try { data = JSON.parse(sub.substring(0, lastBrace + 1) + ']'); } catch {}
        }
      }
    }
    if (typeof data === 'string') {
      const objMatch = data.match(/\{\s*"[a-zA-Z0-9_]+"\s*:/);
      if (objMatch) {
        const sub = data.substring(objMatch.index);
        const lastBrace = sub.lastIndexOf('}');
        if (lastBrace !== -1) {
          try { data = JSON.parse(sub.substring(0, lastBrace + 1)); } catch {}
        }
      }
    }
  }

  let html = '';

  // ── Render Top "Prompt Analysis & Intent" Banner ──
  if (result.analysis) {
    const intentLabel = result.analysis.intentLabel || 'Technical Deep Dive';
    const tech = result.analysis.detectedTech && result.analysis.detectedTech.length > 0
      ? result.analysis.detectedTech.join(' · ')
      : 'Comprehensive Web Sources';

    html += `
      <div class="analysis-pill-banner">
        <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-orange);">psychology</span>
        <span class="analysis-pill-tag">${escapeHtml(intentLabel)}</span>
        <span class="analysis-pill-focus">Target Focus: <strong>${escapeHtml(tech)}</strong></span>
      </div>
    `;
  }

  // ── Render Top "Available Sources & Links" Section ──
  if (sources.length > 0) {
    html += `
      <div class="sources-reference-card">
        <div class="sources-reference-header">
          <div class="sources-header-left">
            <span class="material-symbols-outlined" style="color:var(--color-orange);font-size:18px;">link</span>
            <span class="sources-header-title">Available Sources & Reference Links</span>
            <span class="sources-count-badge">${sources.length} sources found</span>
          </div>
          <span style="font-size:0.75rem;color:var(--color-slate-400);">Verified reference links</span>
        </div>
        <div class="sources-grid">
          ${sources.map(s => {
            const domain = getDomain(s.url);
            const title = s.title || domain;
            return `
              <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="source-pill-link" title="${escapeHtml(title)}">
                <span class="material-symbols-outlined source-pill-icon">language</span>
                <div class="source-pill-body">
                  <div class="source-pill-title">${escapeHtml(title)}</div>
                  <div class="source-pill-domain">${escapeHtml(domain)}</div>
                </div>
                <span class="material-symbols-outlined source-pill-external">open_in_new</span>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Case 1: Array of Distinct Items (Solutions, Q&A, or Sections)
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const sourceUrl = item.source_url || item.url || item.link || (sources[index % sources.length]?.url || '');
        let sourceRowHtml = '';
        if (sourceUrl) {
          const domain = getDomain(sourceUrl);
          sourceRowHtml = `
            <div class="qa-source-row">
              <span class="material-symbols-outlined" style="font-size:15px;color:var(--color-orange);">link</span>
              <span class="qa-source-label">Source Link:</span>
              <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="qa-source-anchor">
                <span>${escapeHtml(domain ? domain : sourceUrl)}</span>
                <span class="material-symbols-outlined" style="font-size:12px;">open_in_new</span>
              </a>
            </div>
          `;
        }

        // Sub-Type A: Concrete Problem & Solution Card
        if (item.issue || item.root_cause || item.solution_steps) {
          const issueTitle = item.issue || item.problem || `Solution ${index + 1}`;
          const rootCause = item.root_cause || item.cause || '';
          const steps = Array.isArray(item.solution_steps) ? item.solution_steps : (item.solution_steps ? [item.solution_steps] : []);
          const codeFix = item.code_fix || item.code || '';
          const bestPractices = item.best_practices || item.edge_cases || '';

          html += `
            <div class="solution-card-block">
              <div class="solution-header">
                <div class="solution-title">
                  <span class="material-symbols-outlined" style="color:var(--color-orange);font-size:20px;">build</span>
                  <span>${index + 1}. ${escapeHtml(issueTitle)}</span>
                </div>
                <span class="solution-badge">Verified Solution</span>
              </div>

              ${rootCause ? `
                <div class="root-cause-box">
                  <div class="root-cause-label">
                    <span class="material-symbols-outlined" style="font-size:15px;">report_problem</span>
                    <span>Root Cause & Mechanism</span>
                  </div>
                  <div>${formatMarkdown(rootCause)}</div>
                </div>
              ` : ''}

              ${steps.length > 0 ? `
                <div class="solution-steps-header">Step-by-Step Resolution</div>
                <div class="solution-steps-list">
                  ${steps.map((st, si) => `
                    <div class="solution-step-item">
                      <div class="solution-step-num">${si + 1}</div>
                      <div>${formatMarkdown(String(st))}</div>
                    </div>
                  `).join('')}
                </div>
              ` : (item.solution ? `<div style="margin: 10px 0;">${formatMarkdown(item.solution)}</div>` : '')}

              ${codeFix ? renderCodeSnippet(codeFix) : ''}

              ${bestPractices ? `
                <div class="edge-cases-box">
                  <div class="edge-cases-label">
                    <span class="material-symbols-outlined" style="font-size:15px;color:var(--color-blue);">verified_user</span>
                    <span>Best Practices & Caveats</span>
                  </div>
                  <div>${formatMarkdown(bestPractices)}</div>
                </div>
              ` : ''}

              ${item.evidence_quote ? `
                <div class="evidence-quote-box">
                  <span class="material-symbols-outlined evidence-quote-icon">format_quote</span>
                  <div class="evidence-quote-content">
                    <span class="evidence-quote-label">Verbatim Evidence:</span>
                    <span class="evidence-quote-text">"${escapeHtml(item.evidence_quote)}"</span>
                  </div>
                </div>
              ` : ''}

              ${sourceRowHtml}
            </div>
          `;
        }
        // Sub-Type B: Comparative Evaluation Card
        else if (item.comparison_topic || item.option_a_analysis) {
          const topic = item.comparison_topic || `Comparison ${index + 1}`;
          const optA = item.option_a_analysis || '';
          const optB = item.option_b_analysis || '';
          const verdict = item.verdict || item.recommendation || '';
          const code = item.code || '';

          html += `
            <div class="comparison-card-block">
              <div class="solution-header">
                <div class="solution-title">
                  <span class="material-symbols-outlined" style="color:var(--color-blue);font-size:20px;">balance</span>
                  <span>${index + 1}. ${escapeHtml(topic)}</span>
                </div>
                <span class="solution-badge" style="background:#eff6ff;color:#1d4ed8;border-color:rgba(29,78,216,0.2);">Trade-Off Analysis</span>
              </div>

              ${(optA || optB) ? `
                <div class="comparison-grid">
                  <div class="comparison-column">
                    <div class="comparison-col-header">
                      <span class="material-symbols-outlined" style="font-size:16px;color:var(--color-orange);">arrow_right_alt</span>
                      <span>Option A Assessment</span>
                    </div>
                    <div class="comparison-col-text">${formatMarkdown(optA)}</div>
                  </div>
                  <div class="comparison-column">
                    <div class="comparison-col-header">
                      <span class="material-symbols-outlined" style="font-size:16px;color:var(--color-blue);">arrow_right_alt</span>
                      <span>Option B Assessment</span>
                    </div>
                    <div class="comparison-col-text">${formatMarkdown(optB)}</div>
                  </div>
                </div>
              ` : ''}

              ${verdict ? `
                <div class="verdict-box">
                  <div class="verdict-label">
                    <span class="material-symbols-outlined" style="font-size:16px;">gavel</span>
                    <span>Recommendation & Verdict</span>
                  </div>
                  <div>${formatMarkdown(verdict)}</div>
                </div>
              ` : ''}

              ${code ? renderCodeSnippet(code) : ''}

              ${item.evidence_quote ? `
                <div class="evidence-quote-box">
                  <span class="material-symbols-outlined evidence-quote-icon">format_quote</span>
                  <div class="evidence-quote-content">
                    <span class="evidence-quote-label">Verbatim Evidence:</span>
                    <span class="evidence-quote-text">"${escapeHtml(item.evidence_quote)}"</span>
                  </div>
                </div>
              ` : ''}

              ${sourceRowHtml}
            </div>
          `;
        }
        // Sub-Type C: In-depth Technical Section / Guide Card
        else if (item.section_title) {
          const secTitle = item.section_title;
          const summary = item.summary || '';
          const explanation = item.detailed_explanation || item.explanation || '';
          const code = item.code || '';

          html += `
            <div class="solution-card-block">
              <div class="solution-header">
                <div class="solution-title">
                  <span class="material-symbols-outlined" style="color:var(--color-orange);font-size:20px;">layers</span>
                  <span>${index + 1}. ${escapeHtml(secTitle)}</span>
                </div>
              </div>
              ${summary ? `<p style="font-weight:600;color:var(--color-slate-900);margin-bottom:8px;">${escapeHtml(summary)}</p>` : ''}
              ${explanation ? `<div class="qa-answer-text">${formatMarkdown(explanation)}</div>` : ''}
              ${code ? renderCodeSnippet(code) : ''}

              ${item.evidence_quote ? `
                <div class="evidence-quote-box">
                  <span class="material-symbols-outlined evidence-quote-icon">format_quote</span>
                  <div class="evidence-quote-content">
                    <span class="evidence-quote-label">Verbatim Evidence:</span>
                    <span class="evidence-quote-text">"${escapeHtml(item.evidence_quote)}"</span>
                  </div>
                </div>
              ` : ''}

              ${sourceRowHtml}
            </div>
          `;
        }
        // Sub-Type D: Standard Interview Q&A Card
        else {
          let question = item.question || item.title || item.topic || item.name || `Question ${index + 1}`;
          question = stripThinkingProcess(question).replace(/^[\d\.\-\s]+/, '').trim();
          if (!question.endsWith('?') && !question.endsWith('.')) {
            question += '?';
          }
          
          let answer = stripThinkingProcess(item.answer || item.solution || item.explanation || item.description || '');
          const category = item.category || item.topic || '';
          const difficulty = (item.difficulty || '').toLowerCase();
          const code = item.code || item.syntax || item.example || '';

          let badgeClass = 'badge-medium';
          if (difficulty.includes('easy')) badgeClass = 'badge-easy';
          else if (difficulty.includes('hard') || difficulty.includes('senior')) badgeClass = 'badge-hard';

          html += `
            <div class="qa-card-block">
              <div class="qa-card-header">
                <div class="qa-question-title">Question ${index + 1}: ${escapeHtml(question)}</div>
                ${difficulty ? `<span class="qa-tag-badge ${badgeClass}">${escapeHtml(difficulty)}</span>` : ''}
              </div>
              ${category ? `<div class="qa-category-meta">Category: ${escapeHtml(category)}</div>` : ''}
              <div class="qa-answer-text">${formatMarkdown(answer)}</div>
              ${code ? renderCodeSnippet(code) : ''}

              ${item.evidence_quote ? `
                <div class="evidence-quote-box">
                  <span class="material-symbols-outlined evidence-quote-icon">format_quote</span>
                  <div class="evidence-quote-content">
                    <span class="evidence-quote-label">Verbatim Evidence:</span>
                    <span class="evidence-quote-text">"${escapeHtml(item.evidence_quote)}"</span>
                  </div>
                </div>
              ` : ''}

              ${sourceRowHtml}
            </div>
          `;
        }
      } else {
        html += `<div class="qa-card-block"><div class="qa-answer-text">${formatMarkdown(String(item))}</div></div>`;
      }
    });
  }
  // Case 2: Structured Object
  else if (typeof data === 'object' && data !== null) {
    for (const [key, val] of Object.entries(data)) {
      const title = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
      const capTitle = title.charAt(0).toUpperCase() + title.slice(1);

      if (typeof val === 'string' || typeof val === 'number') {
        html += `
          <div class="qa-card-block">
            <div class="qa-question-title" style="color:var(--color-orange);margin-bottom:6px;">${escapeHtml(capTitle)}</div>
            <div class="qa-answer-text">${formatMarkdown(String(val))}</div>
          </div>
        `;
      } else if (Array.isArray(val)) {
        html += `
          <div class="qa-card-block">
            <div class="qa-question-title" style="margin-bottom:8px;">${escapeHtml(capTitle)}</div>
            <ul style="padding-left:18px;color:var(--color-slate-800);">
              ${val.map(it => `<li>${typeof it === 'object' ? formatObject(it) : escapeHtml(String(it))}</li>`).join('')}
            </ul>
          </div>
        `;
      } else if (typeof val === 'object' && val !== null) {
        html += `
          <div class="qa-card-block">
            <div class="qa-question-title" style="margin-bottom:8px;">${escapeHtml(capTitle)}</div>
            <div class="qa-answer-text">${formatObject(val)}</div>
          </div>
        `;
      }
    }
  }
  // Case 3: Free-form Text / Markdown
  else {
    const cleanText = stripThinkingProcess(data);
    html += `<div class="qa-card-block"><div class="qa-answer-text">${formatMarkdown(cleanText)}</div></div>`;
  }

  return html;
}

// ── Clean Results Renderer (Initial Search) ─────────────────
function renderCleanResults(result) {
  const container = document.getElementById('humanResultArea');
  const statsMeta = document.getElementById('resultStatsMeta');
  if (!container) return;

  const sources = Array.isArray(result.sources) ? result.sources : [];

  if (statsMeta) {
    const elapsed = result.duration ? `${(result.duration / 1000).toFixed(1)}s` : '';
    statsMeta.textContent = elapsed ? `${elapsed} • ${sources.length} sources` : 'Ready';
  }

  container.innerHTML = buildContentHtml(result);
}

// ── Append Follow-Up Thread Result ──────────────────────────
function appendFollowupResult(result, followupQuestion) {
  const container = document.getElementById('humanResultArea');
  if (!container) return;

  const threadSection = document.createElement('div');
  threadSection.className = 'followup-thread-section';

  const sources = Array.isArray(result.sources) ? result.sources : [];
  const parentQuery = result.parentQuery || activeResultData?.prompt || '';

  let sourcesRowHtml = '';
  if (sources.length > 0) {
    sourcesRowHtml = `
      <div class="followup-compact-sources">
        <span class="material-symbols-outlined" style="font-size:15px;color:var(--color-orange);">travel_explore</span>
        <span class="followup-sources-label">Follow-Up Sources:</span>
        <div class="followup-sources-pills">
          ${sources.map(s => {
            const domain = getDomain(s.url);
            const title = s.title || domain;
            return `
              <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="followup-source-pill" title="${escapeHtml(title)}">
                <span>${escapeHtml(title.length > 35 ? title.substring(0, 35) + '…' : title)}</span>
                <span class="material-symbols-outlined" style="font-size:11px;">open_in_new</span>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  let suggestionsHtml = '';
  if (Array.isArray(result.suggestedFollowups) && result.suggestedFollowups.length > 0) {
    suggestionsHtml = `
      <div class="followup-dynamic-chips">
        <span class="followup-chips-label">Explore Next:</span>
        ${result.suggestedFollowups.map(s => `
          <button type="button" class="followup-chip dynamic-chip" onclick="applyFollowupChip(${JSON.stringify(s)})">
            <span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;color:var(--color-orange);">subdirectory_arrow_right</span>
            <span>${escapeHtml(s)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  threadSection.innerHTML = `
    <div class="followup-thread-divider">
      <div class="followup-thread-line"></div>
      <div class="followup-thread-badge">
        <span class="material-symbols-outlined" style="font-size:16px;">forum</span>
        <span>Follow-Up Investigation: ${escapeHtml(followupQuestion)}</span>
      </div>
      <div class="followup-thread-line"></div>
    </div>
    ${sourcesRowHtml}
    ${buildContentHtml({ ...result, sources: [] })}
    ${suggestionsHtml}
  `;

  container.appendChild(threadSection);
  threadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── /display Mode Renderer (Images & Social Media Discussions) ──
function renderDisplayMode(result) {
  const container = document.getElementById('humanResultArea');
  const statsMeta = document.getElementById('resultStatsMeta');
  if (!container) return;

  const images = Array.isArray(result.images) ? result.images : [];
  const socialPosts = Array.isArray(result.socialPosts) ? result.socialPosts : [];
  const queryTopic = result.query || 'Social Media & Images';
  const isSocialIntent = /social|tweet|reddit|discussion|video|post/i.test(queryTopic);
  const defaultTab = (isSocialIntent || images.length === 0) && socialPosts.length > 0 ? 'social' : 'images';

  if (statsMeta) {
    const elapsed = result.duration ? `${(result.duration / 1000).toFixed(1)}s` : '';
    statsMeta.textContent = `${socialPosts.length} social posts • ${images.length} images${elapsed ? ` • ${elapsed}` : ''}`;
  }

  let html = `
    <div class="display-container">
      ${result.entity_details ? `
        <div class="entity-profile-card">
          ${images.length > 0 ? `
            <div class="entity-avatar-wrap">
              <img src="${escapeHtml(images[0].thumbnail || images[0].image)}" alt="${escapeHtml(result.entity_details.name || queryTopic)}" />
            </div>
          ` : ''}
          <div class="entity-info-block">
            <div class="entity-name-row">
              <span class="entity-name">${escapeHtml(result.entity_details.name || queryTopic)}</span>
              <span class="entity-verified-badge">
                <span class="material-symbols-outlined" style="font-size:14px;">verified</span>
                <span>Verified Entity Profile</span>
              </span>
            </div>
            ${result.entity_details.headline ? `<div class="entity-headline">${escapeHtml(result.entity_details.headline)}</div>` : ''}
            ${result.entity_details.bio ? `<div class="entity-bio">${escapeHtml(result.entity_details.bio)}</div>` : ''}
            
            ${Array.isArray(result.entity_details.key_facts) && result.entity_details.key_facts.length > 0 ? `
              <div class="entity-facts-grid">
                ${result.entity_details.key_facts.map(f => `
                  <div class="entity-fact-pill">
                    <span class="material-symbols-outlined" style="font-size:13px;color:var(--color-orange);">info</span>
                    <span>${escapeHtml(f)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${Array.isArray(result.entity_details.profiles) && result.entity_details.profiles.length > 0 ? `
              <div class="entity-profiles-row">
                ${result.entity_details.profiles.map(p => `
                  <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" class="entity-profile-link">
                    <span class="material-symbols-outlined" style="font-size:14px;color:var(--color-blue);">${escapeHtml(p.icon || 'link')}</span>
                    <span>${escapeHtml(p.name)}</span>
                    <span class="material-symbols-outlined" style="font-size:12px;color:var(--color-slate-400);">open_in_new</span>
                  </a>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <div class="display-header-card">
        <div class="display-header-info">
          <div class="display-cmd-badge">
            <span class="material-symbols-outlined" style="font-size:15px;">forum</span>
            <span>Live Social Scraper</span>
          </div>
          <div class="display-topic-title">Social Content for "${escapeHtml(queryTopic)}"</div>
        </div>
        <div class="display-tabs-group">
          <button type="button" class="display-tab-btn ${defaultTab === 'social' ? 'active' : ''}" id="btnTabSocial" onclick="switchDisplayTab('social')">
            <span class="material-symbols-outlined" style="font-size:16px;">forum</span>
            <span>Social Discussions (${socialPosts.length})</span>
          </button>
          <button type="button" class="display-tab-btn ${defaultTab === 'images' ? 'active' : ''}" id="btnTabImages" onclick="switchDisplayTab('images')">
            <span class="material-symbols-outlined" style="font-size:16px;">image</span>
            <span>Images (${images.length})</span>
          </button>
        </div>
      </div>

      <!-- Tab 1: Visual Images Gallery -->
      <div class="display-images-grid" id="displayImagesGrid" style="display:${defaultTab === 'images' ? 'grid' : 'none'};">
        ${images.length > 0 ? images.map(img => {
          const safeTitle = (img.title || queryTopic).replace(/'/g, "\\'").replace(/"/g, '&quot;');
          const safeImgUrl = img.image || img.imageUrl || img.thumbnail || img.thumbnailUrl || '';
          const safeThumbUrl = img.thumbnail || img.thumbnailUrl || safeImgUrl;
          const safeSourceUrl = img.url || img.sourceUrl || '#';
          const domain = img.sourceDomain || getDomain(safeSourceUrl);

          return `
            <div class="display-image-card" onclick="openLightbox('${escapeHtml(safeImgUrl)}', '${safeTitle}', '${escapeHtml(safeSourceUrl)}')">
              <div class="display-img-wrap">
                <img 
                  src="${escapeHtml(safeThumbUrl)}" 
                  alt="${escapeHtml(img.title || queryTopic)}" 
                  loading="lazy" 
                  onerror="this.closest('.display-image-card').style.display='none'"
                />
                ${domain ? `<span class="display-img-domain-tag">${escapeHtml(domain)}</span>` : ''}
              </div>
              <div class="display-img-meta">
                <div class="display-img-title" title="${escapeHtml(img.title || '')}">${escapeHtml(img.title || queryTopic)}</div>
                <div class="display-img-footer">
                  <span>${img.width && img.height ? `${img.width}×${img.height}` : 'HD'}</span>
                  <a href="${escapeHtml(safeSourceUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--color-blue);text-decoration:none;display:inline-flex;align-items:center;gap:2px;">
                    <span>Source</span>
                    <span class="material-symbols-outlined" style="font-size:12px;">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--color-slate-500);">
            <span class="material-symbols-outlined" style="font-size: 36px; color: var(--color-slate-400); margin-bottom: 8px;">image_not_supported</span>
            <div>No visual images were retrieved for this query. Switch to Discussions tab or try a broader topic.</div>
          </div>
        `}
      </div>

      <!-- Tab 2: Social Media Discussions Feed -->
      <div class="display-social-grid" id="displaySocialGrid" style="display:${defaultTab === 'social' ? 'grid' : 'none'};">
        ${socialPosts.length > 0 ? socialPosts.map(post => {
          const domain = getDomain(post.url);
          return `
            <a href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" class="display-social-card">
              ${post.thumbnail ? `
                <div class="display-social-thumb-wrap">
                  <img src="${escapeHtml(post.thumbnail)}" alt="${escapeHtml(post.title)}" loading="lazy" />
                </div>
              ` : ''}
              <div>
                <div class="display-social-header">
                  <span class="display-social-badge" style="background:${post.platformColor || '#4b5563'};">
                    <span class="material-symbols-outlined" style="font-size:13px;">${post.platformIcon || 'public'}</span>
                    <span>${escapeHtml(post.platform)}</span>
                  </span>
                  <span style="font-size:0.75rem;color:var(--color-slate-400);">${escapeHtml(domain)}</span>
                </div>
                <div class="display-social-title">${escapeHtml(post.title)}</div>
                <div class="display-social-snippet">${escapeHtml(post.snippet)}</div>
              </div>
              <div class="display-social-link-row">
                <span>View on ${escapeHtml(post.platform)}</span>
                <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
              </div>
            </a>
          `;
        }).join('') : `
          <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--color-slate-500);">
            <span class="material-symbols-outlined" style="font-size: 36px; color: var(--color-slate-400); margin-bottom: 8px;">forum</span>
            <div>No social discussions found for this topic. Switch to Images tab to view media.</div>
          </div>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ── Tab Switcher for /display ────────────────────────────────
function switchDisplayTab(tabName) {
  const btnImages = document.getElementById('btnTabImages');
  const btnSocial = document.getElementById('btnTabSocial');
  const gridImages = document.getElementById('displayImagesGrid');
  const gridSocial = document.getElementById('displaySocialGrid');

  if (tabName === 'images') {
    if (btnImages) btnImages.classList.add('active');
    if (btnSocial) btnSocial.classList.remove('active');
    if (gridImages) gridImages.style.display = 'grid';
    if (gridSocial) gridSocial.style.display = 'none';
  } else {
    if (btnImages) btnImages.classList.remove('active');
    if (btnSocial) btnSocial.classList.add('active');
    if (gridImages) gridImages.style.display = 'none';
    if (gridSocial) gridSocial.style.display = 'grid';
  }
}

// ── Lightbox Modal Controls ──────────────────────────────────
function openLightbox(imgSrc, title, sourceUrl) {
  const modal = document.getElementById('imageLightboxModal');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  const link = document.getElementById('lightboxSourceLink');
  if (!modal || !img) return;

  img.src = imgSrc;
  if (cap) cap.textContent = title || 'Image Preview';
  if (link) {
    link.href = sourceUrl || '#';
    link.style.display = sourceUrl ? 'inline-block' : 'none';
  }
  modal.style.display = 'flex';
}

function closeLightbox(e) {
  if (e && e.target && e.target.id !== 'imageLightboxModal' && !e.target.classList.contains('lightbox-close')) {
    return;
  }
  const modal = document.getElementById('imageLightboxModal');
  if (modal) {
    modal.style.display = 'none';
    const img = document.getElementById('lightboxImg');
    if (img) img.src = '';
  }
}

function renderCodeSnippet(code) {
  return `
    <div class="code-block-card">
      <div class="code-block-header">
        <span>Code</span>
      </div>
      <pre><code>${escapeHtml(String(code).trim())}</code></pre>
    </div>
  `;
}

function formatObject(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}`)
    .join(' · ');
}

// ── Markdown Formatter (Headers, Lists, Links, Inline Code) ──
function formatMarkdown(text) {
  if (!text) return '';
  let str = String(text);

  // Preserve fenced code
  str = str.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
    return `<div class="code-block-card"><div class="code-block-header"><span>${lang || 'Code'}</span></div><pre><code>${escapeHtml(code.trim())}</code></pre></div>`;
  });

  // Headers
  str = str.replace(/^### (.*$)/gim, '<h3 style="font-size:1rem;margin:12px 0 6px;font-weight:700;color:var(--color-slate-900);">$1</h3>');
  str = str.replace(/^## (.*$)/gim, '<h2 style="font-size:1.1rem;margin:14px 0 6px;font-weight:700;color:var(--color-slate-900);">$1</h2>');
  str = str.replace(/^# (.*$)/gim, '<h1 style="font-size:1.25rem;margin:16px 0 8px;font-weight:800;color:var(--color-slate-900);">$1</h1>');

  // Bold / Italic
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code
  str = str.replace(/`([^`]+)`/g, '<code style="background:var(--color-slate-100);padding:2px 5px;border-radius:4px;font-size:0.875em;color:#ea580c;font-family:var(--font-mono);">$1</code>');

  // Markdown Links [Text](url)
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (m, txt, url) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="qa-inline-link">${escapeHtml(txt)} <span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;">open_in_new</span></a>`;
  });

  // Convert bullet lists (- or *)
  str = str.replace(/^[•\-\*]\s+(.*)$/gim, '<li class="qa-bullet-item">$1</li>');
  str = str.replace(/(<li class="qa-bullet-item">.*<\/li>\s*)+/g, '<ul class="qa-bullet-list">$&</ul>');

  // Paragraph breaks
  str = str.replace(/\n\n+/g, '</p><p style="margin-bottom:8px;">');
  str = str.replace(/\n/g, '<br>');

  return `<p style="margin-bottom:6px;">${str}</p>`;
}

// ── Copy & Download ─────────────────────────────────────────
function copyCleanResult() {
  const container = document.getElementById('humanResultArea');
  if (!container) return;
  navigator.clipboard.writeText(container.innerText).then(() => {
    showToast('Copied to clipboard', 'info');
  }).catch(() => {
    showToast('Copy failed', 'error');
  });
}

function downloadCleanDocument() {
  const container = document.getElementById('humanResultArea');
  if (!container) return;
  const blob = new Blob([container.innerText], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Scrape4U_Data_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast('File downloaded', 'success');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? 'check' : type === 'error' ? 'close' : 'info';
  toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;color:var(--color-orange);">${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// Keyboard shortcuts: Escape to close modal, Enter to search or follow-up
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    const active = document.activeElement;
    if (active && (active.id === 'mainSearchInput' || active.id === 'siteTargetUrl')) {
      e.preventDefault();
      executeSearch();
    } else if (active && active.id === 'followupInput') {
      e.preventDefault();
      executeFollowup();
    }
  }
});
