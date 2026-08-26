# JPForms — Japan Form Automation Platform

Full-stack platform for translating and auto-filling official Japanese administrative forms for foreign residents.

## Tech Stack
- Next.js 14+ (App Router, Server Actions, TypeScript, Tailwind CSS, Shadcn UI)
- Supabase (PostgreSQL + pgvector, Auth with Google OAuth, Storage)
- pdf-lib (+ @pdf-lib/fontkit) for AcroForm filling & Japanese text overlay (Noto Sans JP)
- Google Gemini API (@google/genai) for form schema extraction & embeddings
- Multi-provider LLM switcher: Gemini / GPT-4o-mini / Claude 3.5 Haiku / Custom OpenAI-compatible
- Stripe for one-time and subscription payments (page-based pricing)

## Setup

1. **Install**: `npm install`
2. **Environment**: copy `.env.example` to `.env.local` and fill in values.
3. **Database**: run `supabase/migrations/0001_init.sql`, then `0002_wizard_payments.sql`, then `0003_admin_invites.sql` in the Supabase SQL Editor, in that order.
4. **Storage**: create a private bucket named `pdf-templates` in Supabase Storage.
   - Upload template PDFs via `/admin/forms`
   - Optionally upload `fonts/NotoSansJP-Regular.ttf` to `pdf-templates/fonts/` for Japanese text overlays.
5. **Auth**: enable Google OAuth provider in Supabase Auth; add `https://<domain>/auth/callback` to redirect URLs.
6. **Stripe**:
   - Create a Stripe account, get test/live API keys from https://dashboard.stripe.com/apikeys
   - Set `STRIPE_SECRET_KEY` in Vercel env vars
   - Create a webhook endpoint in the Stripe dashboard pointing at `https://<domain>/api/billing/webhook`, listening for `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` — copy its signing secret into `STRIPE_WEBHOOK_SECRET`
   - Set pricing in `/admin/billing` (defaults: ¥500/page one-time, ¥2500 for 30 pages/week subscription)
7. **Run**: `npm run dev`

## Admin Access
Promote yourself directly via SQL (needed for the very first admin, before `/admin/users` → Add User exists to use):
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```
After that, use `/admin/users` → **Add User** to give anyone else (e.g. your partner scrivener) admin access by email — works whether they've already signed in or not (see Customer Journey below for details on how that resolves).

## Customer Journey
1. User browses `/forms`, picks a form.
2. If signed out, `/forms/[id]` shows a landing page explaining the form and why Google Sign-In is required (progress saving, secure auth, no spam) before redirecting to `/login?next=/forms/[id]`.
3. After Google auth, the user is dropped into `/forms/[id]/wizard` — a one-question-at-a-time wizard with a progress bar. Each answer autosaves (debounced) to the `submissions` table as a `draft`; users can "Save & exit" and resume later from the Dashboard.
4. On the last question, "Finish & Generate PDF" fills the Japanese PDF and marks the submission `completed` — but does NOT yet grant a download.
5. The completion screen (`PaymentPanel`) checks the user's page-credit balance. If sufficient, credits are consumed automatically and the download link appears immediately (no double payment for forms already covered by a subscription/prior purchase). If insufficient, it shows one-time (¥/page × page count) and weekly subscription options, both via Stripe Checkout.
6. After Stripe checkout, the user is redirected back to `/submissions/[id]`, which re-checks entitlement (with a short retry loop to absorb webhook latency) and shows the download link.
7. `/dashboard` lists in-progress drafts (Resume button) and completed submissions (View & Pay / Download PDF), plus the user's current page-credit balance.

## Key Routes
| Route | Description |
|---|---|
| `/forms` | Public form catalog |
| `/forms/[id]` | Form info + Google Sign-In gate (redirects signed-in users straight to the wizard) |
| `/forms/[id]/wizard` | One-question-at-a-time wizard with progress bar, autosave, save/resume |
| `/submissions/[id]` | Post-payment review/download screen (also used as the Stripe checkout return URL) |
| `/dashboard` | Draft resume list, submission history, page-credit balance |
| `/legal-scrivener` | Required Gyoseishoshi partnership disclosure |
| `/admin/forms` | Upload PDFs, Gemini schema analysis, set page count, publish/hide |
| `/admin/knowledge-base` | Add/edit/delete RAG knowledge base documents (company info, form guides, FAQs) |
| `/admin/users` | Manage user roles, view activity, grant/remove page credits |
| `/admin/billing` | Set per-page and subscription pricing; Stripe configuration status |
| `/admin/settings` | Live LLM provider & API key configuration (chat + schema extraction + embeddings) |
| `/admin/content` | Edit homepage, footer, and legal scrivener notice text |
| `/about`, `/terms`, `/privacy`, `/tokushoho` | Legal compliance pages |

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forms` | List active public forms |
| GET | `/api/forms/[id]` | Form details & language schema |
| POST | `/api/forms/parse-pdf` | Gemini/Custom PDF→JSON schema extraction (Admin) |
| POST | `/api/submissions/start` | Get-or-create a draft submission for a form (User) |
| GET/PATCH | `/api/submissions/[id]` | Read/autosave a draft submission (owner only) |
| GET | `/api/submissions/[id]/download` | Payment-gated signed download URL; 402 if unpaid (owner only) |
| POST | `/api/submit` | Fill PDF, mark submission completed (does not grant download) (User) |
| POST | `/api/billing/checkout` | Create a Stripe Checkout session (one-time or subscription) (User) |
| POST | `/api/billing/webhook` | Stripe webhook — grants page credits on payment (Stripe only, signature-verified) |
| GET | `/api/user/submissions` | Submission history (User) |
| POST | `/api/chat` | RAG chatbot streaming endpoint |
| GET/POST | `/api/admin/config` | Read/update LLM config (Admin) |
| GET/POST | `/api/admin/billing` | Read/update pricing config (Admin) |
| GET | `/api/admin/billing/status` | Whether Stripe env vars are configured (Admin) |
| GET/POST | `/api/admin/knowledge-base` | List/add RAG documents (Admin) |
| PUT/DELETE | `/api/admin/knowledge-base/[id]` | Edit/delete a RAG document (Admin) |
| POST | `/api/admin/knowledge-base/extract` | Extract text from an uploaded PDF/DOCX/TXT/image for the KB form (Admin) |
| GET/POST/PATCH | `/api/admin/forms` | List/create/update forms including page_count (Admin) |
| GET/PATCH | `/api/admin/users` | List users with activity/balance; update role or grant/remove page credits (Admin) |
| GET/POST/DELETE | `/api/admin/invites` | Pre-authorize an email's role for their first sign-in, or cancel a pending invite (Admin) |
| GET/POST | `/api/admin/content` | Read/update site content (Admin) |

## RAG Chatbot & Knowledge Base
Manage documents at `/admin/knowledge-base` — this is required for the chatbot to answer well. Without any documents, the bot has nothing grounded to work from. Add:
- **Company info**: who you are, your partner Gyoseishoshi (referenced by name in the system prompt so the bot recommends *your* in-house scrivener instead of a generic "find a lawyer" answer), pricing, refund policy.
- **Form guides**: procedures/forms you do *not* auto-fill but customers ask about (e.g. sole proprietorship registration) — write a short guide explaining where/how to actually file it, or that your partner scrivener can help.
- **FAQs**: your most common customer questions.

Each document has a Title, Category, and Content field you can type directly, or fill via file upload — PDF, Word (.docx), plain text (.txt/.md), or images (JPG/PNG/WebP), e.g. the instruction sheet that comes with an official government form. Uploading extracts text into the Content box for review/editing before saving:
- **Text-layer PDFs / DOCX / TXT**: extracted directly (`pdf-parse` / `mammoth`), no AI cost.
- **Scanned PDFs and images**: automatically OCR'd via the Gemini vision model configured as the schema extraction model in `/admin/settings` (falls back to this when a PDF has no usable text layer).
- Multiple files can be uploaded in sequence into the same document — each appends to the Content box rather than replacing it.

Documents are embedded (1536-dim, model configurable in `/admin/settings`) and retrieved via the pgvector RPC `match_documents` (cosine distance) at chat time. The system prompt is built dynamically from `/admin/content`'s scrivener fields — fill those in for the bot to reference your actual partner by name.

## PDF Schema Extraction (Analyze button)
Configured independently from the chatbot in `/admin/settings` → PDF Schema Extraction Model. Two provider options:
- **Gemini** — free-text model id field (Google periodically retires model ids, so this isn't a hardcoded dropdown), using the native `@google/genai` SDK.
- **Custom (OpenAI-compatible vision)** — any endpoint that accepts an inline base64 PDF as a `file` content part in chat completions, e.g. Qwen3.7-Flash / Qwen-VL-Max via QwenCloud/DashScope (`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`), OpenAI GPT-4o-mini, or OpenRouter vision models. Useful for comparing cost/accuracy/translation quality against Gemini on the same form.

## Payments
Page-based pricing via Stripe: ¥/page one-time purchase, or a weekly subscription granting N pages that expire after the period (configurable in `/admin/billing`, defaults ¥500/page and ¥2500 for 30 pages/week). Page credits live in a ledger table (`page_credits`) — purchases add, downloads subtract, subscription grants expire after the period. The Stripe webhook is the only writer to this ledger in production (aside from admin manual grants), verified via signature so it can't be spoofed by a client-side call.

Each form has a `page_count` (set in `/admin/forms`) representing printed A4 pages — this determines the one-time price and how many subscription-pool pages a download consumes.

## A note on Gemini model lifecycle
Google retires Gemini model ids without much notice — `gemini-2.0-flash` and `text-embedding-004` were both shut down in early 2026. All Gemini model ids (chat, schema extraction, embeddings) are stored as free-text fields in `/admin/settings`, not fixed dropdowns, specifically so a sudden 404 "model not found" from Google can be fixed by typing the new model id in the admin UI — no code change or redeploy needed. If you see an error like `"This model models/X is no longer available"`, that error message itself usually tells you the replacement id to use.
