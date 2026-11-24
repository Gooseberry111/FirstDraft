# FirstDraft

FirstDraft builds resumes, CVs, cover letters and essays through conversation. You chat with the assistant, and a live preview of the document fills in as you answer. Finished documents export to PDF or Word.

Built with Vue 3, Vite, Tailwind CSS, Pinia and Supabase (auth, database and an Edge Function that calls Gemini).

## Setup

### 1. Frontend

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL and anon key
npm run dev
```

### 2. AI Edge Function

The Gemini API key must stay on the server. Never put it in a `VITE_` variable, because anything prefixed `VITE_` is bundled into the public JavaScript.

```bash
npm i -g supabase            # or use npx supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=<your-gemini-key>
supabase functions deploy firstdraft-ai
```

To use a different model, run `supabase secrets set GEMINI_MODEL=<model-id>`.

#### Keeping within the free Gemini quota

- Each chat message makes **one** Gemini request. It returns the reply, the document update and the quick-reply suggestions together.
- Only the current document and the last 10 messages are sent, so requests stay small however long the chat gets.
- Choosing a document type and editing the document by hand never call the AI.
- Every user has a daily message limit, stored in the `ai_usage` table (migration in `supabase/migrations`). You can adjust the limits with secrets:

| Secret | Default | Meaning |
| --- | --- | --- |
| `AI_USER_DAILY_LIMIT` | `60` | Messages per user per day (`0` = unlimited) |
| `AI_GLOBAL_DAILY_LIMIT` | `0` | Messages per day across the whole app (`0` = unlimited) |
| `GEMINI_FALLBACK_MODEL` | none | A second model to try when the main one is rate-limited. Each model has its own free quota. |

#### Document quality

- **AI coaching:** the assistant writes to professional standards for each document type (action verbs, measurable results, ATS keywords, cover-letter structure, essay storytelling). It never invents numbers or achievements; it asks for them instead.
- **Strength score:** an instant, rule-based check (`src/services/quality.js`, no AI request) scores every document out of 100. Each issue has a "Fix with AI" button.
- **Expert review:** an on-demand AI review (one request) with category scores, strengths, concrete rewrites, and job-posting match with missing keywords.

#### More features

- **Import:** upload a PDF, Word or text CV. The text is extracted in the browser and the AI rebuilds it faithfully (one request).
- **Tailor to a job:** creates a tailored copy plus a matching cover letter as new drafts (one request). It never adds skills that aren't in the original.
- **Version history:** snapshots are saved automatically, at most every 3 minutes, to `draft_versions`. The newest 30 per draft are kept.
- **Share link:** `/s/<share_id>` is a read-only public page. It is only available while `drafts.share_id` is set.
- **Password reset:** `/forgot-password` sends an email that links to `/reset-password`.

> In Supabase → Authentication → URL Configuration, set the **Site URL** to your live site (e.g. `https://first-draftt.netlify.app`) and add `https://first-draftt.netlify.app/reset-password` to **Redirect URLs**. Otherwise confirmation and reset emails will point to the wrong address.

#### Billing (Paystack)

Each person's first document is free, then a 30-day Pro pass is ₦3,000. It's a single payment that doesn't renew. Billing is **off** until the admin turns it on in **Plan & billing**. While it's off, everything stays free.

- The free allowance is enforced in the database (`enforce_document_allowance` trigger), so it can't be bypassed from the browser. Deleting a document doesn't give the allowance back.
- The admin account (`profiles.is_admin`) is never charged and has no AI limit. Pro users get `AI_PRO_DAILY_LIMIT` messages a day (default 200).
- Payments: the `payments` function creates a Paystack checkout and verifies it. The `paystack-webhook` function confirms payments using Paystack's signed callback. Both use `fulfill_payment()`, so a payment is only ever counted once.

Setup:
1. Create a Paystack account and copy the **secret key** (test keys work immediately).
2. `supabase secrets set PAYSTACK_SECRET_KEY=sk_test_...`
3. In Paystack → Settings → API Keys & Webhooks, set the webhook URL to `https://<project-ref>.supabase.co/functions/v1/paystack-webhook`.
4. Optional: `PRICE_NGN` (default 3000), `PRICE_USD` (default 5), and `PAYSTACK_CURRENCIES=NGN,USD` once Paystack has enabled USD for your account.
5. Turn charging on in the app: **Plan & billing → Admin**.

#### Voice typing

The mic button in the chat uses the browser's built-in speech recognition (Chrome, Edge, Safari). It's free and doesn't use the AI quota.

### 3. Database

The app expects two tables, both with Row Level Security enabled so each user can only see their own data:

- `drafts`: `id uuid`, `user_id uuid`, `title text`, `document_data jsonb`, `template text`, `created_at`, `updated_at`
- `messages`: `id`, `draft_id uuid` (references `drafts.id` with `on delete cascade`), `role text`, `content text`, `created_at`

Example policies:

```sql
alter table drafts enable row level security;
alter table messages enable row level security;

create policy "own drafts" on drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own messages" on messages
  for all using (exists (select 1 from drafts d where d.id = draft_id and d.user_id = auth.uid()))
  with check (exists (select 1 from drafts d where d.id = draft_id and d.user_id = auth.uid()));
```

## Deploying

`npm run build` writes the site to `dist/`. Routing uses HTML5 history, so the host must serve `index.html` for every path. `vercel.json` handles this on Vercel and `public/_redirects` handles it on Netlify.

## Exporting

- **PDF** opens the browser's print dialog with only the document on the page. Choose "Save as PDF". The text stays real and selectable, so applicant tracking systems can read it.
- **Word** downloads an editable `.docx` file.
