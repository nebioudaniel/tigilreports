# Tigil Reports

**Business reports that write themselves.** Enter your data, and AI turns it into a clear, professional report. Built for Ethiopian businesses.

[Live app](https://[your-url]) · [Screenshots](#screenshots)

<img width="1698" height="1096" alt="Screenshot 2026-11-12 at 10 41 04 AM" src="https://github.com/user-attachments/assets/4507ab7f-a39e-46ac-bca5-b16dd9bdaf42" />


## Why I built it

- I built Tigil Reports to make business reporting easier, faster, and more accessible for Ethiopian businesses.

- Many businesses spend valuable time collecting data, analyzing numbers, and manually preparing professional reports. I wanted to simplify that process using AI.

- The idea was simple: instead of spending hours creating reports, businesses could upload their data and let AI turn it into structured, professional reports in seconds.
- I also wanted to build more than just a report generator. That's why I included features for team collaboration, report sharing, data insights, and integrations.
- Ultimately, I wanted to create a practical tool that helps businesses spend less time preparing reports and more time making informed decisions.
  
## What it does

- AI report generation. Turn raw business data into structured, professional reports in seconds using AI powered by DeepSeek.

- Custom forms and data collection. Create forms to collect business data and organize information for reporting.

- Team collaboration. Share reports with team members, exchange comments, and work together on report improvements.

- Dashboard and analytics. Track generated reports, active users, reporting performance, and key business insights.

- Data import and integrations. Import data from CSV and Excel files and connect existing business tools

- Accounts and payments. Secure authentication with Supabase and subscription payments through Chapa in Ethiopian birr (ETB).

- Subscription management. Free, Professional, and Enterprise plans with different reporting limits and team features.

## How it works

1. **Sign in.** Supabase handles auth, and `middleware.ts` protects the dashboard routes.
2. **Enter data.** [CSV import, forms, or both?]
3. **Generate.** The app sends the data to DeepSeek through an internal API route, with a prompt that [describes what you ask it to produce].
4. **Review and share.** [Edit, export as PDF, share a link: say what's real today.]

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui |
| Auth and database | Supabase (PostgreSQL) |
| AI | DeepSeek API, called from an internal API route |
| Payments | Chapa |
| Deployment | [Vercel] |

## Technical decisions

- **Supabase for auth and database.** [Why: e.g. auth, database and row-level security in one place]
- **AI calls go through a server route.** The API key never reaches the browser.
- **DeepSeek.** [Why: cost, quality, ...]
- **Chapa.** It supports local payment methods that international processors don't. [Confirm this is your reason.]
- **`schema.sql`.** [What tables you designed, e.g. organizations, staff, reports, forms]

## Known limitations

- Input data quality. AI-generated report accuracy and usefulness depend on the completeness, accuracy, and structure of the uploaded data.

- Integrations. Some integrations and automation features advertised on the landing page may not yet be fully implemented.

- Future improvements. Improve AI-generated insights, expand integrations with third-party business tools, and enhance report customization and collaboration features.

## Getting started

**Requirements:** Node.js 20+, a Supabase project, Chapa test keys, a DeepSeek API key.

```bash
git clone https://github.com/nebioudaniel/tigilreports.git
cd tigilreports
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
[SUPABASE_SERVICE_ROLE_KEY=]
[CHAPA_SECRET_KEY=]
[DEEPSEEK_API_KEY=]
```

Create the database by running `schema.sql` in the Supabase SQL editor, then:

```bash
npm run dev
```

Open http://localhost:3000.

## Project structure

```
app/          routes, dashboard and API routes
components/   UI components
lib/          shared helpers (Supabase, AI, payments)
schema.sql    database schema
middleware.ts auth protection for routes
```

## Author

Built by [Nebiyou Daniel](https://github.com/nebioudaniel), founder of Mesob AI.
