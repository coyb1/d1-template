import { runComparison } from "./aiClients";
import { renderCompareHtml, renderErrorHtml } from "./compareHtml";

function missingKeys(env: Env): string[] {
	const required: (keyof Env)[] = ["OPENAI_API_KEY", "GEMINI_API_KEY", "GROK_API_KEY", "ANTHROPIC_API_KEY"];
	return required.filter((k) => !env[k]);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Serve the UI
		if (request.method === "GET" && url.pathname === "/") {
			return new Response(renderCompareHtml(), {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}

		// Comparison API endpoint
		if (request.method === "POST" && url.pathname === "/api/compare") {
			const missing = missingKeys(env);
			if (missing.length > 0) {
				return new Response(
					JSON.stringify({ error: `Missing API keys: ${missing.join(", ")}` }),
					{ status: 500, headers: { "content-type": "application/json" } }
				);
			}

			let prompt: string;
			try {
				const body = await request.json<{ prompt?: string }>();
				prompt = (body.prompt ?? "").trim();
			} catch {
				return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
					status: 400,
					headers: { "content-type": "application/json" },
				});
			}

			if (!prompt) {
				return new Response(JSON.stringify({ error: "prompt is required" }), {
					status: 400,
					headers: { "content-type": "application/json" },
				});
			}

			const result = await runComparison(prompt, env);
			return new Response(JSON.stringify(result), {
				headers: {
					"content-type": "application/json",
					"access-control-allow-origin": "*",
				},
			});
		}

		// CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"access-control-allow-origin": "*",
					"access-control-allow-methods": "GET, POST, OPTIONS",
					"access-control-allow-headers": "Content-Type",
				},
			});
		}

		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
