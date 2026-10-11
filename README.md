# PrintLagbe

Motion-enhanced printing storefront for Bangladesh.

## Stack

- React + TypeScript + Vite
- Framer Motion
- Supabase Auth, Postgres, and private Storage

## Current scope

Working customer quote-request MVP.

**Includes:**
- Responsive storefront
- CSS-perspective 3D illustration
- Reduced-motion support
- Product catalog
- Email magic-link authentication
- Private artwork upload
- Server-side quote-request creation
- Customer request history
- Row-level access controls

**Does not include:**
- Payments
- Production commitments
- Proof versioning and approval
- Admin application
- Courier integrations
- Malware scanning
- Automated print preflight
- Bengali localization
- Legal policy pages
- Installable/offline PWA
- Automated test suite

Sample prices are demo data, not supplier quotes.

## Local setup

Use Node.js 22 LTS.

```bash
npm install
cp .env.example .env
npm run dev
```

Add your Supabase project URL and public anon key to `.env`.

Never add a Supabase service-role key to frontend code.

## Database setup

Run `supabase/migrations/001_initial.sql` against a fresh Supabase project using its SQL editor or your Supabase migration workflow.

## Authentication

Enable email authentication in Supabase.

Configure the Site URL to your deployed site.

Add allowed redirect URLs:
- `http://localhost:5173`
- Your exact deployed application origin

Configure a production email provider before public launch. Review authentication email rate limits and abuse protections.

## Build

```bash
npm run build
npm run preview
```

Build output: `dist/`

## Hosting

This is a standard Vite static frontend. Configure hosting with:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables from `.env.example`

Environment variables are embedded during build. Rebuild after changing them.

## Security checks (manual)

Using two different customer accounts:

1. Confirm each account sees only its own orders.
2. Confirm cross-account storage access is denied.
3. Confirm direct order inserts and updates are denied.
4. Confirm changing frontend prices does not affect server prices.
5. Confirm an artwork path owned by another user is rejected.
6. Confirm unsupported product and zone IDs are rejected.
7. Confirm signed-out users cannot submit requests.

## Known limitations

- Request submission is not idempotent. A lost response followed by a retry can produce duplicate requests.
- Uploaded files can remain orphaned if request submission fails.
- Mobile numbers are format-validated, not ownership-verified.
- The selected delivery area is not geocoded against the address.
- File size and MIME restrictions do not establish file safety.
- The UI is currently English-only.
- There is no guaranteed fulfillment SLA.
- The repository has not been executed or security-audited.

## Before public launch

- Replace demo products and prices.
- Confirm actual service areas.
- Add customer support contact information.
- Add reviewed privacy, terms, and refund policies.
- Implement file quarantine and malware scanning.
- Implement upload abuse limits and abandoned-file cleanup.
- Define artwork retention and deletion processes.
- Add error monitoring without leaking personal information.
- Configure database backups and test restoration.
- Add automated security and workflow tests.
- Audit dependencies.
- Test keyboard and mobile accessibility.

## Manual operations during pilot

Use the Supabase dashboard only for trusted internal operators:
- Review incoming requests.
- Verify specifications manually.
- Confirm price and availability with customers.
- Do not collect payment through this application.

Do not give print vendors Supabase dashboard access.

---

**Pilot application — quote requests only. Not a paid printing service.**
