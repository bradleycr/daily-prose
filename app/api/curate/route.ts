import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  candidates: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        author: z.string().min(1),
        text: z.string().min(1),
        source: z.string().optional(),
      }),
    )
    .min(2),
  history: z.array(
    z.object({
      id: z.string().min(1),
      status: z.enum(["liked", "neutral"]),
      notes: z.string().optional(),
    }),
  ),
  tasteProfile: z.string().optional(),
  tasteAnchors: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        author: z.string().optional(),
        text: z.string(),
      }),
    )
    .optional(),
});

const OutputSchema = z.object({
  selectedId: z.string().min(1),
  rationale: z.string().min(1),
  tasteUpdate: z.string().min(1),
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    return NextResponse.json({ error: "missing_huggingface_api_key" }, { status: 500 });
  }

  const body = BodySchema.parse(await req.json());
  const preferred = process.env.HUGGINGFACE_MODEL?.trim();
  const models = preferred
    ? [preferred]
    : [
        // Hugging Face moved serverless LLM access behind the unified router.
        // `katanemo/Arch-Router-1.5B` is commonly available on the free tier via `/v1/chat/completions`.
        "katanemo/Arch-Router-1.5B",
        "HuggingFaceTB/SmolLM2-360M-Instruct",
        "microsoft/Phi-3-mini-4k-instruct",
      ];

  const prompt = buildPrompt(body);

  const result = await runCurator(models, prompt, process.env.HUGGINGFACE_API_KEY);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "curator_unavailable",
        detail: result.detail,
      },
      { status: 503 },
    );
  }

  const raw = (result.value.content ?? "").trim();
  const parsed = parseCuratorJson(raw);
  const output = OutputSchema.parse(parsed);

  // Hard guarantee: selectedId must be one of candidates.
  const candidateIds = new Set(body.candidates.map((c) => c.id));
  if (!candidateIds.has(output.selectedId)) {
    return NextResponse.json({ error: "invalid_selection" }, { status: 502 });
  }

  return NextResponse.json(output);
}

async function runCurator(
  models: string[],
  prompt: string,
  apiKey: string | undefined,
): Promise<
  | { ok: true; value: { content: string } }
  | { ok: false; detail: { tried: string[]; errors: Record<string, string> } }
> {
  let lastError: unknown = null;
  const key = apiKey?.trim();
  if (!key) return { ok: false, detail: { tried: [], errors: { missing_api_key: "missing_api_key" } } };

  const tried: string[] = [];
  const errors: Record<string, string> = {};
  for (const model of models) {
    try {
      tried.push(model);
      const value = await hfRouterChatCompletion({
        apiKey: key,
        model,
        prompt,
      });
      return { ok: true, value };
    } catch (error) {
      lastError = error;
      errors[model] =
        error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_error";
      continue;
    }
  }

  // Preserve evidence for server logs without exposing internals to client.
  console.error("HF curator failed for all models", { tried, lastError });
  return {
    ok: false,
    detail: {
      tried,
      errors,
    },
  };
}

async function hfRouterChatCompletion(input: { apiKey: string; model: string; prompt: string }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const baseBody = {
      model: input.model,
      messages: [
        {
          role: "system",
          content:
            "You are a literary curator. Return ONLY valid JSON with double-quoted keys/strings. No markdown.",
        },
        { role: "user", content: input.prompt },
      ],
      temperature: 0.55,
      max_tokens: 420,
    } as const;

    const attempt = async (body: Record<string, unknown>) => {
      const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`hf_router_${response.status}: ${text.slice(0, 260)}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("hf_router_unexpected_response");
      }

      return { content };
    };

    try {
      return await attempt({ ...baseBody, response_format: { type: "json_object" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("response_format") || message.includes("json_object")) {
        return await attempt({ ...baseBody });
      }
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(input: z.infer<typeof BodySchema>): string {
  const lines: string[] = [];

  lines.push(
    "You are a highly perceptive literary curator and taste model.",
    "You do NOT write poetry. You SELECT one poem that best fits the user today.",
    "",
    "CONTEXT:",
    "- Candidates may mix contemporary web poems (often from Poem-a-Day / poets.org) with a few short canon excerpts.",
    "- Treat this like a daily editorial choice: one poem the reader should actually sit with today.",
    "",
    "CRITICAL RULES:",
    "- Select exactly ONE candidate.",
    "- Do not repeat any poem from history.",
    "- Prefer emotional precision over popularity.",
    "- Output STRICT JSON ONLY (no markdown, no commentary).",
    "",
    "OUTPUT JSON SHAPE:",
    '{ "selectedId": "...", "rationale": "...", "tasteUpdate": "..." }',
    "",
  );

  if (input.tasteProfile) {
    lines.push("INFERRED TASTE PROFILE:", input.tasteProfile.trim(), "");
  }

  if (input.tasteAnchors && input.tasteAnchors.length > 0) {
    lines.push("USER-LOVED EXAMPLES (anchors):");
    for (const a of input.tasteAnchors.slice(0, 10)) {
      lines.push(
        `- ${a.title ?? "untitled"}${a.author ? ` · ${a.author}` : ""}`,
        truncate(a.text.trim(), 900),
        "",
      );
    }
  }

  lines.push("HISTORY (id -> status):");
  for (const h of input.history.slice(-60)) {
    lines.push(`- ${h.id}: ${h.status}${h.notes ? ` (${h.notes})` : ""}`);
  }
  lines.push("");

  lines.push("CANDIDATES:");
  for (const c of input.candidates) {
    lines.push(
      `- id: ${c.id}`,
      `  title: ${c.title}`,
      `  author: ${c.author}`,
      `  source: ${c.source ?? "unknown"}`,
      "  text:",
      truncate(c.text.trim(), 2400),
      "",
    );
  }

  return lines.join("\n");
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function parseCuratorJson(text: string): unknown {
  const trimmed = text.trim();

  // Prefer strict JSON.
  try {
    const match = trimmed.match(/\{[\s\S]*\}$/);
    const raw = match?.[0] ?? trimmed;
    return JSON.parse(raw);
  } catch {
    // Some small models return python-ish dicts with single quotes.
    const selectedId = extractQuotedField(trimmed, "selectedId");
    const rationale = extractQuotedField(trimmed, "rationale");
    const tasteUpdate = extractQuotedField(trimmed, "tasteUpdate");
    if (selectedId && rationale && tasteUpdate) {
      return { selectedId, rationale, tasteUpdate };
    }

    throw new Error("curator_json_parse_failed");
  }
}

function extractQuotedField(text: string, field: string): string | null {
  const double = text.match(new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"`, "m"));
  if (double?.[1]) return double[1];

  const single = text.match(new RegExp(`'${field}'\\s*:\\s*'([\\s\\S]*?)'`, "m"));
  if (single?.[1]) return single[1];

  return null;
}

