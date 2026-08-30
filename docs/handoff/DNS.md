# DNS handoff (Kunal)

Do not half-attach. `markovhq.com` is verified on a Vercel team **other than** `lemmalabs` (`lemmalabs1` / org `team_Akcjyfank7boTtStRnIKUm4S`). `vercel domains add markovhq.com --scope lemmalabs1` returns `domain_not_owned`. Either:

1. Add the apex to the `lemmalabs` team via TXT verification at the registrar (Vercel will show the token when you run `vercel domains add markovhq.com --scope lemmalabs1` from an account that can start verification), **or**
2. Move projects `float-web` and `markov-docs` to the Vercel team that already owns `markovhq.com`.

Until one of those is done, attaching `docs.markovhq.com` / `app.markovhq.com` to `lemmalabs` will fail TLS. `float.markovhq.com` already resolves as a project alias on `float-web` — leave it.

**Deploy from this agent (2026-08-30):** `vercel whoami` is `kunaldrall29`. `GET /v2/teams` returns **zero teams**. `vercel deploy --prod --scope lemmalabs1` → not authorized for `lemmalabs1`. Kunal (who is on `lemmalabs`) must run, from this branch:

```bash
npx vercel@latest deploy --prod --yes --scope lemmalabs1
```

with `.vercel/project.json` pointing at `float-web` (`prj_fzX4OXUHz2XUyPVvzFFVHJmw4sTI`), then swap to `markov-docs` (`prj_U4GoBLAyEwICB3X3vQziz3jLvnLK`) and deploy again. That is what makes `https://float.markovhq.com/receipts` return 200.

Vercel team for these projects: `lemmalabs` (`lemmalabs1`). User: `kunaldrall29`.

Vercel CNAME target for every Vercel hostname below: `cname.vercel-dns.com`  
Vercel apex A (only if you attach an apex on Vercel): `76.76.21.21`

---

## `docs.markovhq.com`

| | |
|---|---|
| Product | Protocol docs (Docusaurus, `apps/site`) |
| Vercel project | `markov-docs` (`prj_U4GoBLAyEwICB3X3vQziz3jLvnLK`) |
| DNS | `CNAME` name `docs` (host `docs.markovhq.com`) value `cname.vercel-dns.com` |
| After DNS | `vercel domains add docs.markovhq.com --scope lemmalabs1` **only after** the apex is on this team (see top). Then `vercel alias` is unnecessary — attach the domain on the project. |
| Live today | `https://markov-docs-black.vercel.app` |

## `app.markovhq.com`

| | |
|---|---|
| Product | 301 → `https://float.markovhq.com/:path*` (`apps/web/vercel.json`) |
| Vercel project | `float-web` (`prj_fzX4OXUHz2XUyPVvzFFVHJmw4sTI`) |
| DNS | `CNAME` name `app` value `cname.vercel-dns.com` |
| After DNS | Attach `app.markovhq.com` to **float-web** on `lemmalabs` (same team-ownership gate as docs). Do not attach it to `markov-docs`. |
| Live today | `https://float.markovhq.com` |

## `api.markovhq.com`

This host is the **data-api**, not Float’s Railway API and not a Vercel project. Do not add it to Vercel.

| | |
|---|---|
| Product | Public receipts JSON (`GET /v1/receipts`, `/v1/receipts/stats`, `/health`) |
| Railway project | `markov` (`9c4577ff-23a5-4ebf-a167-2aa0a10caad7`) |
| Railway service | `data-api` |
| Current origin | `data-api-production-5ac5.up.railway.app` |
| DNS | In Railway: **Settings → Networking → Custom domain → `api.markovhq.com`**. Use the CNAME Railway prints (usually name `api` → `data-api-production-5ac5.up.railway.app`). If Railway shows a verification record, create that first. |
| Do not | Leave a pending domain on Vercel, or CNAME this host to `cname.vercel-dns.com`. |

Float’s mutation API stays `https://api-production-d2e8.up.railway.app` until a **separate** host is chosen. Do not put owner/operator keys on the public data-api.

## `float.markovhq.com`

Already live on `float-web`. Canonical receipts: `https://float.markovhq.com/receipts`. No DNS change.

---

## `markov.fyi` (redirect-only)

SPEC: apex + wildcard 301 to the markovhq.com equivalent. Never a product host.

| Host | Attach to | DNS | After attach |
|---|---|---|---|
| `markov.fyi` (apex) | Keep on the team that already 301s it to `https://markovhq.com/` | Do not recreate | Already 301 → marketing |
| `float.markov.fyi` | Vercel project `float-web` | `CNAME` name `float` (zone `markov.fyi`) value `cname.vercel-dns.com` | Add a 301 to `https://float.markovhq.com/:path*` (same `has: host` pattern as `app.markovhq.com`) |
| `docs.markov.fyi` | Vercel project `markov-docs` | `CNAME` name `docs` value `cname.vercel-dns.com` | 301 → `https://docs.markovhq.com/:path*` once docs TLS exists; until then 301 → `https://markov-docs-black.vercel.app/:path*` |
| `app.markov.fyi` | Vercel project `float-web` | `CNAME` name `app` value `cname.vercel-dns.com` | 301 → `https://float.markovhq.com/:path*` |
| `api.markov.fyi` | **Railway `data-api`**, not Vercel | CNAME `api` → same Railway hostname as `api.markovhq.com` | Optional 301 → `https://api.markovhq.com` once that host has TLS |

Wildcard `*.markov.fyi` currently answers Vercel `DEPLOYMENT_NOT_FOUND`. Replace it with the four names above (or a wildcard on the correct team **after** each name is attached to a project). Do not point a wildcard at Vercel with no project — that is the current 404.

---

## Order of operations

1. Resolve `markovhq.com` team ownership (TXT on `lemmalabs` **or** move the two Vercel projects).
2. Attach `docs.markovhq.com` → `markov-docs`, `app.markovhq.com` → `float-web`.
3. Add `api.markovhq.com` on Railway `data-api` only.
4. Then `markov.fyi` product names, each 301 to the markovhq.com equivalent.
