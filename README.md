# Lifeline — Competition Build

A polished blood-donation finder prototype using plain HTML/CSS/JS + Supabase.

## Files
- `index.html` — complete UI
- `styles.css` — responsive visual system
- `app.js` — Supabase Auth + donor/request functionality
- `supabase.sql` — database tables, indexes, RLS policies and grants

## 1. Set up Supabase
1. Open your Supabase project.
2. Open **SQL Editor**.
3. Paste and run `supabase.sql`.
4. In **Authentication → Providers**, make sure Email is enabled.
5. In your project's API/Data API settings, make sure the public tables used by the app are exposed if your project requires explicit exposure.

The app is already configured with the project URL and publishable key supplied for this project.

## 2. Run the website
Because this is a browser app, run it from a local web server rather than double-clicking the HTML file.

Easy options:
- VS Code → install Live Server → right-click `index.html` → Open with Live Server
- Or use Python: `python -m http.server 5500`

Then open the local address shown by the server.

## 3. Competition demo flow
For the strongest live demo:
1. Create account A.
2. Register as an O+ / B+ / A+ donor.
3. Turn availability on.
4. Open an incognito/private window or second browser profile.
5. Create account B.
6. Search for the donor by blood group + district.
7. Open the donor card and show protected contact access.
8. Publish a critical blood request.
9. Show the live statistics changing.

## 4. Important security note
The `sb_publishable_...` key is intended for browser applications. It is okay for it to be present in frontend code, but **Row Level Security is mandatory**. Never put a Supabase secret/service-role key into this frontend.

## 5. What makes this competition-ready
- Responsive premium UI
- Supabase authentication
- Consent-first donor profiles
- Blood-group + district search
- Availability status
- Protected donor contact details
- Structured emergency request form
- Live database statistics
- RLS policies
- Mobile-friendly navigation
- Strong visual hierarchy and micro-interactions

## 6. Before public launch
- Add a real donor verification workflow.
- Add an admin moderation dashboard.
- Add rate limits / abuse protection.
- Add a proper emergency contact / hospital workflow.
- Add privacy policy and terms.
- Do not present the site as a medical authority.
- Do not upload donor data without explicit consent.
