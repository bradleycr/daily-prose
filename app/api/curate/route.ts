import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
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
      status: z.enum(["liked", "disliked", "neutral"]),
      notes: z.string().optional(),
    }),
  ),
  tasteProfile: z.string().optional(),
});

const OutputSchema = z.object({
  selectedId: z.string().min(1),
  rationale: z.string().min(1),
  tasteUpdate: z.string().min(1),
});

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    return NextResponse.json({ error: "missing_huggingface_api_key" }, { status: 500 });
  }

  const body = BodySchema.parse(await req.json());
  const model = process.env.HUGGINGFACE_MODEL ?? "meta-llama/Llama-3.1-8B-Instruct";

  const prompt = buildPrompt(body);

  const result = await hf.textGeneration({
    model,
    inputs: prompt,
    parameters: {
      max_new_tokens: 320,
      temperature: 0.7,
      return_full_text: false,
    },
  });

  const raw = (result.generated_text ?? "").trim();
  const parsed = safeParseJson(raw);
  const output = OutputSchema.parse(parsed);

  // Hard guarantee: selectedId must be one of candidates.
  const candidateIds = new Set(body.candidates.map((c) => c.id));
  if (!candidateIds.has(output.selectedId)) {
    return NextResponse.json({ error: "invalid_selection" }, { status: 502 });
  }

  return NextResponse.json(output);
}

function buildPrompt(input: z.infer<typeof BodySchema>): string {
  const lines: string[] = [];

  lines.push(
    "You are a highly perceptive literary curator and taste model.",
    "You do NOT write poetry. You SELECT one poem that best fits the user today.",
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

function safeParseJson(text: string): unknown {
  // Many models will still wrap JSON in stray prose. Extract the last object.
  const match = text.match(/\{[\s\S]*\}$/);
  const raw = match?.[0] ?? text;
  return JSON.parse(raw);
}

