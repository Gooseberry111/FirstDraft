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
