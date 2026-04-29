# Daily Prose

Daily Prose is a tiny personal poetry reader: one quiet poem at a time, a private local ledger, and a recommendation loop that slowly learns from what is kept or dismissed. It mixes canonical public-domain poems from PoetryDB with the current Poem-a-Day from poets.org, using a server route for contemporary parsing and browser `localStorage` for all private state.

## Local Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No API keys, login, database, cookies, or paid services are required.

## Deploy

Push the repository to GitHub, then import it into Vercel. The default build command is `pnpm build`; icon generation runs automatically before the build.

GitHub Pages is not used because the poets.org pipe needs a server-side route. A fully static export would lose the contemporary poem source.

## Optional: Hugging Face curator (taste model)

If you want the app to choose from a small candidate pool using a taste-model agent, set:

- `HUGGINGFACE_API_KEY` (required)
- `HUGGINGFACE_MODEL` (optional; defaults are in `app/api/curate/route.ts`, tuned for small/free-tier-friendly models)

See `.env.example`. Keys are server-only and never exposed to the client.

## Taste anchors sync (communal)

To make “things i like” persistent across devices (and shareable), add an Upstash Redis integration in Vercel, then set:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Once configured, the app uses a shared **library id** (shown in “things i like”) so multiple devices can contribute.

## Notes

PoetryDB does not preserve special visual layouts for every canonical poem, so highly spatial works may not be perfectly faithful. Contemporary poem text is not stored long-term in localStorage; the ledger stores metadata and links back to poets.org.

## Stretch Goals

- hand-format special poems such as George Herbert's shaped verse
- add optional short reflections behind a user-provided free-tier Groq key
- add a small static set of short prose pieces
- add optional cross-device sync with Vercel KV
