# FairShare

Roommate utility splitter built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase.

## Setup

1. Install dependencies: `npm install`
2. Copy env vars are already in `.env.local` (do not commit this file).
3. In the [Supabase Auth email templates](https://supabase.com/dashboard/project/wdixtzxgynjetruckfus/auth/templates), update the **Magic Link** template to include the OTP code:

```html
<h2>Your FairShare login code</h2>
<p>Enter this code: {{ .Token }}</p>
```

4. Set Site URL to `http://localhost:3000` under Authentication → URL Configuration.
5. Run the app: `npm run dev`

## Features

- Email OTP authentication
- Create / join households via invite code
- Add expenses with custom percentage shares (must total 100%)
- Monthly balance matrix (who owes whom)
- Mark shares as paid
- Organizer-managed default share presets
