# THRIFTEMIST

A production-oriented Next.js + Supabase + Razorpay architecture for the THRIFTEMIST vintage store.

## Stack
- Next.js / React / TypeScript
- Tailwind CSS
- Supabase PostgreSQL + Auth + Storage
- Razorpay
- Vercel-ready

## Setup
1. `npm install`
2. Create a Supabase project.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Create an admin user in Supabase Auth.
5. Put that user's email in `ADMIN_EMAILS`.
6. Copy `.env.example` to `.env.local` and fill credentials.
7. `npm run dev`

## Important
The code includes the store/admin architecture, server-side inventory checks and Razorpay signature verification. Before going live, add a real Razorpay checkout UI/webhook, email notifications, shipping rules, tax/GST handling, rate limiting, CAPTCHA/abuse protection, image upload validation, admin CRUD for every resource, and final legal/policy content appropriate to the business.

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` to the browser.
