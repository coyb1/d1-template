export interface AIResponse {
	model: string;
	provider: string;
	content: string;
	error?: string;
}

export interface ComparisonResult {
	prompt: string;
	responses: AIResponse[];
	synthesis: string;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<AIResponse> {
	try {
		const res = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: "gpt-4o",
				messages: [{ role: "user", content: prompt }],
				max_tokens: 1500,
			}),
		});
		if (!res.ok) {
			const err = await res.text();
			return { provider: "ChatGPT", model: "gpt-4o", content: "", error: `HTTP ${res.status}: ${err}` };
		}
		const data = await res.json<{ choices: { message: { content: string } }[] }>();
		return {
			provider: "ChatGPT",
			model: "gpt-4o",
			content: data.choices[0]?.message?.content ?? "(no content)",
		};
	} catch (e) {
		return { provider: "ChatGPT", model: "gpt-4o", content: "", error: String(e) };
	}
}

async function callGemini(prompt: string, apiKey: string): Promise<AIResponse> {
	try {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: { maxOutputTokens: 1500 },
			}),
		});
		if (!res.ok) {
			const err = await res.text();
			return { provider: "Gemini", model: "gemini-2.0-flash", content: "", error: `HTTP ${res.status}: ${err}` };
		}
		const data = await res.json<{ candidates: { content: { parts: { text: string }[] } }[] }>();
		const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "(no content)";
		return { provider: "Gemini", model: "gemini-2.0-flash", content: text };
	} catch (e) {
		return { provider: "Gemini", model: "gemini-2.0-flash", content: "", error: String(e) };
	}
}

async function callGrok(prompt: string, apiKey: string): Promise<AIResponse> {
	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: "grok-3",
				messages: [{ role: "user", content: prompt }],
				max_tokens: 1500,
			}),
		});
		if (!res.ok) {
			const err = await res.text();
			return { provider: "Grok", model: "grok-3", content: "", error: `HTTP ${res.status}: ${err}` };
		}
		const data = await res.json<{ choices: { message: { content: string } }[] }>();
		return {
			provider: "Grok",
			model: "grok-3",
			content: data.choices[0]?.message?.content ?? "(no content)",
		};
	} catch (e) {
		return { provider: "Grok", model: "grok-3", content: "", error: String(e) };
	}
}

async function callClaude(prompt: string, apiKey: string): Promise<AIResponse> {
	try {
		const res = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: "claude-sonnet-4-6",
				max_tokens: 1500,
				messages: [{ role: "user", content: prompt }],
			}),
		});
		if (!res.ok) {
			const err = await res.text();
			return { provider: "Claude", model: "claude-sonnet-4-6", content: "", error: `HTTP ${res.status}: ${err}` };
		}
		const data = await res.json<{ content: { type: string; text: string }[] }>();
		const text = data.content?.find((b) => b.type === "text")?.text ?? "(no content)";
		return { provider: "Claude", model: "claude-sonnet-4-6", content: text };
	} catch (e) {
		return { provider: "Claude", model: "claude-sonnet-4-6", content: "", error: String(e) };
	}
}

function buildSynthesisPrompt(prompt: string, responses: AIResponse[]): string {
	const responseBlocks = responses
		.map((r) => {
			const body = r.error ? `[ERROR: ${r.error}]` : r.content;
			return `### ${r.provider} (${r.model})\n${body}`;
		})
		.join("\n\n---\n\n");

	return `You are a critical AI analyst. You have been given a user prompt and the responses from multiple AI systems. Your job is to:

1. **Compare** each response carefully for accuracy, completeness, and quality.
2. **Challenge inconsistencies**: identify where the AIs disagree, where one may be wrong or misleading, and call that out explicitly.
3. **Synthesize** a single definitive answer that is more accurate and complete than any individual response, drawing on the best parts of each while correcting errors.

Use this format in your response:
---
## Comparison & Critique

[For each key point of disagreement or inconsistency, briefly explain which AI got it right and why the others were wrong or incomplete.]

## Synthesized Answer

[Your best, most accurate answer to the original question.]
---

**Original User Prompt:**
${prompt}

**AI Responses:**

${responseBlocks}`;
}

export async function runComparison(prompt: string, env: Env): Promise<ComparisonResult> {
	// Fan out to all 4 AIs in parallel
	const [openai, gemini, grok, claude] = await Promise.all([
		callOpenAI(prompt, env.OPENAI_API_KEY),
		callGemini(prompt, env.GEMINI_API_KEY),
		callGrok(prompt, env.GROK_API_KEY),
		callClaude(prompt, env.ANTHROPIC_API_KEY),
	]);

	const responses: AIResponse[] = [openai, gemini, grok, claude];

	// Have Claude synthesize and critique all responses
	const synthesisPrompt = buildSynthesisPrompt(prompt, responses);
	const synthesisResponse = await callClaude(synthesisPrompt, env.ANTHROPIC_API_KEY);
	const synthesis = synthesisResponse.error
		? `Synthesis failed: ${synthesisResponse.error}`
		: synthesisResponse.content;

	return { prompt, responses, synthesis };
}
