# JPForms — Japan Form Automation Platform

Full-stack platform for translating and auto-filling official Japanese administrative forms for foreign residents.

## Tech Stack
- Next.js 14+ (App Router, Server Actions, TypeScript, Tailwind CSS, Shadcn UI)
- Supabase (PostgreSQL + pgvector, Auth with Google OAuth, Storage)
- pdf-lib (+ @pdf-lib/fontkit) for AcroForm filling & Japanese text overlay (Noto Sans JP)
- Google Gemini API (@google/genai) for form schema extraction & embeddings
- Multi-provider LLM switcher: Gemini 2.0 Flash / GPT-4o-mini / Claude 3.5 Haiku

## Setup

1. **Install**: `npm install`
2. **Environment**: copy `.env.example` to `.env.local` and fill in values.
3. **Database**: run `supabase/migrations/0001_init.sql` in the Supabase SQL Editor.
4. **Storage**: create a private bucket named `pdf-templates` in Supabase Storage.
   - Upload template PDFs via `/admin/forms`
   - Optionally upload `fonts/NotoSansJP-Regular.ttf` to `pdf-templates/fonts/` for Japanese text overlays.
5. **Auth**: enable Google OAuth provider in Supabase Auth; add `https://<domain>/auth/callback` to redirect URLs.
6. **Run**: `npm run dev`

## Admin Access
Set your profile row's `role` column to `'admin'`:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

## Key Routes
| Route | Description |
|---|---|
| `/forms` | Public form catalog |
| `/forms/[id]` | Dynamic translated questionnaire → PDF generation |
| `/dashboard` | User submission history + PDF downloads |
| `/legal-scrivener` | Required Gyoseishoshi partnership disclosure |
| `/admin/forms` | Upload PDFs, Gemini schema analysis, publish/hide |
| `/admin/settings` | Live LLM provider & API key configuration |
| `/admin/content` | Edit homepage, footer, and legal scrivener notice text |
| `/about`, `/terms`, `/privacy`, `/tokushoho` | Legal compliance pages |

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forms` | List active public forms |
| GET | `/api/forms/[id]` | Form details & language schema |
| POST | `/api/forms/parse-pdf` | Gemini PDF→JSON schema extraction (Admin) |
| POST | `/api/submit` | Fill PDF, save submission, return signed URL (User) |
| GET | `/api/user/submissions` | Submission history (User) |
| POST | `/api/chat` | RAG chatbot streaming endpoint |
| GET/POST | `/api/admin/config` | Read/update LLM config (Admin) |

## RAG Chatbot
Knowledge base documents are stored in `knowledge_base` with 1536-dim Gemini embeddings (embedding model configurable in `/admin/settings`, default `gemini-embedding-001`). Retrieval uses the pgvector RPC `match_documents` (cosine distance). Responses stream from whichever LLM is active in `/admin/settings`.

## PDF Schema Extraction (Analyze button)
Configured independently from the chatbot in `/admin/settings` → PDF Schema Extraction Model. Two provider options:
- **Gemini** — free-text model id field (Google periodically retires model ids, so this isn't a hardcoded dropdown), using the native `@google/genai` SDK.
- **Custom (OpenAI-compatible vision)** — any endpoint that accepts an inline base64 PDF as a `file` content part in chat completions, e.g. Qwen3.7-Flash / Qwen-VL-Max via QwenCloud/DashScope (`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`), OpenAI GPT-4o-mini, or OpenRouter vision models. Useful for comparing cost/accuracy/translation quality against Gemini on the same form.

## A note on Gemini model lifecycle
Google retires Gemini model ids without much notice — `gemini-2.0-flash` and `text-embedding-004` were both shut down in early 2026. All Gemini model ids (chat, schema extraction, embeddings) are stored as free-text fields in `/admin/settings`, not fixed dropdowns, specifically so a sudden 404 "model not found" from Google can be fixed by typing the new model id in the admin UI — no code change or redeploy needed. If you see an error like `"This model models/X is no longer available"`, that error message itself usually tells you the replacement id to use.

