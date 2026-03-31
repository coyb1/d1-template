import type { AIResponse } from "./aiClients";

const PROVIDER_COLORS: Record<string, string> = {
	ChatGPT: "#10a37f",
	Gemini: "#4285f4",
	Grok: "#000000",
	Claude: "#d97706",
};

export function renderCompareHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Multi-AI Comparison Tool</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    header h1 {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #10a37f, #4285f4, #d97706);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    header p {
      color: #94a3b8;
      margin-top: 0.5rem;
      font-size: 1rem;
    }
    .prompt-box {
      background: #1e2433;
      border: 1px solid #2d3748;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .prompt-box label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: #cbd5e1;
    }
    textarea {
      width: 100%;
      background: #0f1117;
      border: 1px solid #374151;
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 1rem;
      padding: 0.875rem 1rem;
      resize: vertical;
      min-height: 100px;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    textarea:focus { outline: none; border-color: #4f7ef8; }
    .submit-btn {
      display: block;
      width: 100%;
      margin-top: 1rem;
      padding: 0.875rem;
      background: linear-gradient(135deg, #4f7ef8, #7c4dff);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
    }
    .submit-btn:hover { opacity: 0.9; }
    .submit-btn:active { transform: scale(0.99); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .status-bar {
      display: none;
      text-align: center;
      color: #94a3b8;
      margin: 1rem 0;
      font-size: 0.9rem;
    }
    .spinner {
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid #4f7ef8;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Response grid */
    .responses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .response-card {
      background: #1e2433;
      border: 1px solid #2d3748;
      border-radius: 12px;
      overflow: hidden;
    }
    .response-card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #2d3748;
    }
    .provider-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .response-card-header .provider-name {
      font-weight: 700;
      font-size: 0.95rem;
    }
    .response-card-header .model-name {
      font-size: 0.75rem;
      color: #64748b;
      margin-left: auto;
    }
    .response-body {
      padding: 1rem;
      font-size: 0.9rem;
      line-height: 1.65;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 400px;
      overflow-y: auto;
    }
    .response-body.error { color: #f87171; }

    /* Synthesis section */
    .synthesis-section {
      background: #1e2433;
      border: 1px solid #4f7ef8;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .synthesis-header {
      background: linear-gradient(135deg, #1a2a5c, #2d1a4a);
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .synthesis-header h2 {
      font-size: 1.1rem;
      font-weight: 700;
    }
    .synthesis-icon { font-size: 1.3rem; }
    .synthesis-body {
      padding: 1.25rem;
      font-size: 0.9rem;
      line-height: 1.75;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Markdown-like heading in synthesis */
    .synthesis-body h2 { color: #93c5fd; font-size: 1rem; margin: 1rem 0 0.5rem; }
    .synthesis-body strong { color: #e2e8f0; }

    #results { display: none; }

    /* scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1e2433; }
    ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Multi-AI Comparison Tool</h1>
      <p>Ask one question — get answers from ChatGPT, Gemini, Grok &amp; Claude, then let Claude synthesize the truth.</p>
    </header>

    <div class="prompt-box">
      <label for="promptInput">Your Prompt</label>
      <textarea id="promptInput" placeholder="Ask anything…"></textarea>
      <button class="submit-btn" id="submitBtn" onclick="runComparison()">
        Ask All AIs
      </button>
    </div>

    <div class="status-bar" id="statusBar">
      <span class="spinner"></span>
      <span id="statusText">Querying ChatGPT, Gemini, Grok, and Claude in parallel…</span>
    </div>

    <div id="results">
      <div class="responses-grid" id="responsesGrid"></div>
      <div class="synthesis-section" id="synthesisSection">
        <div class="synthesis-header">
          <span class="synthesis-icon">🔬</span>
          <h2>Claude's Analysis &amp; Synthesis</h2>
        </div>
        <div class="synthesis-body" id="synthesisBody"></div>
      </div>
    </div>
  </div>

  <script>
    const PROVIDER_COLORS = {
      "ChatGPT": "#10a37f",
      "Gemini": "#4285f4",
      "Grok": "#9ca3af",
      "Claude": "#d97706",
    };

    async function runComparison() {
      const prompt = document.getElementById("promptInput").value.trim();
      if (!prompt) { alert("Please enter a prompt."); return; }

      const btn = document.getElementById("submitBtn");
      const statusBar = document.getElementById("statusBar");
      const results = document.getElementById("results");

      btn.disabled = true;
      statusBar.style.display = "block";
      results.style.display = "none";

      try {
        const res = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error("Server error: " + res.status);
        const data = await res.json();

        renderResponses(data.responses);
        renderSynthesis(data.synthesis);
        results.style.display = "block";
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        btn.disabled = false;
        statusBar.style.display = "none";
      }
    }

    function renderResponses(responses) {
      const grid = document.getElementById("responsesGrid");
      grid.innerHTML = "";
      for (const r of responses) {
        const color = PROVIDER_COLORS[r.provider] || "#64748b";
        const isError = !!r.error;
        const body = isError ? "Error: " + r.error : r.content;
        grid.innerHTML += \`
          <div class="response-card">
            <div class="response-card-header">
              <div class="provider-dot" style="background:\${color}"></div>
              <span class="provider-name">\${escHtml(r.provider)}</span>
              <span class="model-name">\${escHtml(r.model)}</span>
            </div>
            <div class="response-body\${isError ? " error" : ""}">\${escHtml(body)}</div>
          </div>\`;
      }
    }

    function renderSynthesis(text) {
      // Light markdown: ## headings and **bold**
      const html = escHtml(text)
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>")
        .replace(/^---$/gm, "<hr style='border-color:#2d3748;margin:1rem 0'>");
      document.getElementById("synthesisBody").innerHTML = html;
    }

    function escHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // Allow Ctrl+Enter to submit
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runComparison();
    });
  </script>
</body>
</html>`;
}

export function renderErrorHtml(message: string): string {
	return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f1117;color:#f87171;padding:2rem">
<h2>Configuration Error</h2><p>${message}</p></body></html>`;
}
