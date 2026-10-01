# Launch checklist: cybernettraining.com

Manual steps to do in dashboards. Do them in this order. Nothing here needs a code change.
**Never paste an API key, secret or password into chat, a commit or a file in this repo.** Enter
them only in the dashboards named below.

## 1. Domain in Vercel (DNS stays with Vercel)

1. Vercel → your project → **Settings → Domains → Add**: `cybernettraining.com`.
2. Add `www.cybernettraining.com` too, and set it to **Redirect to `cybernettraining.com`** (308,
   permanent). The root is the real address; `www` only redirects.
3. Because the domain's DNS is on Vercel, the records are created for you. Wait until both show
   **Valid Configuration** and an SSL certificate.
4. Optional: in **Settings → Environment Variables**, add `NEXT_PUBLIC_SITE_URL` =
   `https://cybernettraining.com` for **Production** (the code already defaults to this; set it
   only if the domain ever changes). Redeploy after changing env vars.
5. Check: <https://cybernettraining.com/robots.txt> lists the sitemap, and
   <https://cybernettraining.com/sitemap.xml> lists every lesson.

## 2. Supabase: site URL and redirect URLs

Supabase → your project → **Authentication → URL Configuration**:

1. **Site URL**: `https://cybernettraining.com`
2. **Redirect URLs** (keep the existing ones, add the new ones):
   - `https://cybernettraining.com/auth/callback` (new)
   - `http://localhost:3000/auth/callback` (keep, for development)
   - `https://cyber-net-training.vercel.app/auth/callback` (keep until you're sure nothing uses it)
   - `https://*-sidsapkotas-projects.vercel.app/**` (optional: lets sign-in work on preview
     deployments)
3. Save.

## 3. Google sign-in (Google Cloud console)

Google Cloud console → **Google Auth Platform**:

1. **Clients → your web client → Authorised JavaScript origins**: add
   `https://cybernettraining.com` (keep `http://localhost:3000`).
2. **Authorised redirect URIs**: leave as the Supabase callback
   (`https://<your-project-ref>.supabase.co/auth/v1/callback`). It doesn't change.
3. **Branding** (the consent screen):
   - App name: CyberNet Training. Support email: `hello@cybernettraining.com` (once step 5 works).
   - **Application home page**: `https://cybernettraining.com`
   - **Privacy policy link**: `https://cybernettraining.com/privacy`
   - **Terms of service link**: `https://cybernettraining.com/terms`
   - **Authorised domains**: add `cybernettraining.com` (keep `supabase.co` if it's there).
4. Before publishing the app out of **Testing**: the privacy and terms drafts must be reviewed (their
   repo banners list what to check). The "Continue with Google" button already follows Google's
   branding guidelines (official "G", Google's colours, font and padding; see CLAUDE.md → Auth).
5. **Audience → Publish app**. With only basic scopes (email, profile, openid) Google usually
   doesn't need a full verification review, but it may check the branding (name, logo, home page,
   privacy link and authorised domain), which can take a few days. Keep the app name matching the
   site.

## 4. Email through Resend (sign-in emails from noreply@cybernettraining.com)

### 4a. Verify the domain in Resend
1. Resend → **Domains → Add domain**: `cybernettraining.com`. Choose the region closest to your
   users (for Australia, pick the Asia-Pacific option if Resend offers one).
2. Resend shows a **Records** tab. Add **exactly those records** in Vercel → **Domains →
   cybernettraining.com → DNS Records** (copy names and values from Resend; don't retype them).
   They are normally:
   - an **MX** record on the `send` subdomain,
   - a **TXT (SPF)** record on the `send` subdomain,
   - a **TXT (DKIM)** record on `resend._domainkey`.
   **Check the names in Resend's Records tab say `send` and `resend._domainkey`.** If Resend ever
   asks for an MX or SPF record on the root (`@`), stop: it would clash with ImprovMX (step 5).
3. Add a **DMARC** record (recommended), once, in Vercel DNS:
   - Type `TXT`, name `_dmarc`, value `v=DMARC1; p=none; rua=mailto:hello@cybernettraining.com`
   - Start with `p=none` (monitor only). Tighten to `p=quarantine` later, once reports look clean.
4. Wait for Resend to show the domain as **Verified**.

### 4b. Create an API key (you enter it; never share it)
1. Resend → **API Keys → Create**: name `supabase-smtp`, permission **Sending access**, domain
   `cybernettraining.com`.
2. Copy it straight into Supabase in the next step. Don't save it anywhere else.

### 4c. Supabase custom SMTP
Supabase → **Authentication → Emails → SMTP Settings** → turn on **custom SMTP**:

| Field | Value |
|---|---|
| Sender email | `noreply@cybernettraining.com` |
| Sender name | `CyberNet Training` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key (paste it here, in the Supabase dashboard only) |

Save. Then **Authentication → Rate Limits**: raise the email rate limit from the built-in default,
which is very low, to something that fits your traffic (Resend's plan limits apply too).

### 4d. Branded templates
Supabase → **Authentication → Emails → Templates**. For each template, set the subject, switch the
message body to its HTML source, and paste the whole file from `docs/email/`:

| Supabase template | Subject | Paste this file |
|---|---|---|
| **Magic Link** | `Your CyberNet Training sign-in code` | `docs/email/magic-link.html` |
| **Confirm signup** | `Your CyberNet Training code` | `docs/email/confirm-signup.html` |
| **Change Email Address** | `Confirm your new email for CyberNet Training` | `docs/email/change-email.html` |

- "Confirm signup" is included because Supabase can send it for someone's very first sign-in.
- The templates use Supabase's `{{ .ConfirmationURL }}`, `{{ .Token }}` (the 6-digit code),
  `{{ .Email }}` and `{{ .NewEmail }}`. Keep them exactly as written.
- **The code** is typed into the sign-in page, so it works in any browser, including the ones
  inside Instagram and TikTok (where Google sign-in is blocked, and a link opens in a different
  browser). Check **Authentication → Providers → Email → Email OTP Length** is **6**: the page and
  the emails say "6-digit". (The page accepts up to 8, just in case.)
- They say the link "expires in an hour", which matches Supabase's default email OTP expiry
  (3,600 seconds, under Authentication → Providers → Email). If you change the expiry, change
  that sentence too.
- **Plain-text fallback:** Supabase sends HTML emails. Neither Supabase's nor Resend's docs say
  a separate plain-text part is added, so each template shows the full link as text under the
  button. That's the fallback for clients that don't show buttons.
- The logo is `https://cybernettraining.com/brand/email-logo.png` (generated by the site), so it
  appears once the domain is live (step 1).

### 4e. Test
1. Sign in with a magic link on the live site. Check the email looks right in Gmail (phone and
   web, light and dark mode) and one other client (e.g. Outlook or Apple Mail).
2. In Gmail, **Show original**: SPF, DKIM and DMARC should all say **PASS**.

## 5. hello@cybernettraining.com via ImprovMX (forwarding to your Gmail)

1. ImprovMX → add domain `cybernettraining.com` → create alias `hello` forwarding to your Gmail
   address.
2. In Vercel → **Domains → cybernettraining.com → DNS Records**, add ImprovMX's records. Vercel's
   **Add DNS Preset → ImprovMX** adds them for you, or add them by hand as ImprovMX shows:
   - **MX** on the root (`@`): `mx1.improvmx.com` and `mx2.improvmx.com` (use the priorities
     ImprovMX shows)
   - **TXT (SPF)** on the root (`@`): the value ImprovMX shows (it includes `spf.improvmx.com`)
3. **No conflict with Resend**, because they live on different names:
   - ImprovMX: MX and SPF on the root, `cybernettraining.com` (receiving mail).
   - Resend: MX and SPF on `send.cybernettraining.com`, DKIM on `resend._domainkey` (sending).
   - Rules: only **one** SPF (TXT starting `v=spf1`) per name, so never add a second SPF on the
     root; and don't delete Resend's `send` records when ImprovMX says "remove other MX records".
     That advice is about MX records on the root only.
4. Send a test email to `hello@cybernettraining.com` and check it arrives in Gmail.
5. Optional: to *reply* as hello@, set up Gmail's "Send mail as" with an SMTP service (Resend
   works: host `smtp.resend.com`, port 465, username `resend`, a separate API key).

## 6. Analytics

Vercel Web Analytics is already enabled for the project. After the first visits:

1. Vercel → project → **Analytics**. See CLAUDE.md → **Analytics** for how to read it and how to
   tag video links.
2. On Hobby you'll see page views (including `/from/tiktok` etc.) and referrers. Custom events
   (`landing_cta`, `lesson_start`, …) appear only on Pro; the code already sends them.

## 7. Before announcing

- [ ] Privacy policy and terms reviewed (see the banner at the top of `content/legal/*.md`).
- [ ] Magic link and Google sign-in both work on `cybernettraining.com`.
- [ ] `hello@cybernettraining.com` receives mail.
- [ ] Share `https://cybernettraining.com` in a private message on each platform and check the
      link preview (image, title, description) appears.
- [ ] Send a test feedback message, then read it in Supabase → Table editor → `feedback`
      (only you can see it, with the dashboard's service role).
