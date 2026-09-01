# ISHARE website

Static multi-page marketing/fundraising site (HTML/CSS/vanilla JS, no framework, no backend in this repo).

## Deploy

Hosted on **Cloudflare Pages**, connected directly to this repo's `main` branch.
Push to `main` → Cloudflare builds and deploys automatically. No manual deploy
step, no GitHub Pages (that was retired when this moved to Cloudflare). Live
at `ishare.ca`.

## Large media (videos/images)

Cloudflare Pages rejects any single file over **25 MiB** — but you don't need
to think about that. Just add the file at its normal local path (e.g.
`img/culture/foo/bar.mp4`), reference it normally in HTML
(`<video src="img/culture/foo/bar.mp4">`), and commit/push like anything else.

`scripts/cf-pages-deploy.mjs` runs as the Cloudflare Pages build step and
handles the rest automatically: any file over 25 MiB gets uploaded to the
`ishare-website-assets` R2 bucket, removed from the deployed output, and a
redirect from its original path to the R2 URL gets added to `_redirects`. The
page keeps working exactly as written — no R2 dashboard, no manual URL
substitution.

## Known issues

- `culture/holodomor.html` references `../img/hrec.mp4`, which does not exist
  in this repo. Pre-existing, not caused by the Cloudflare migration — left
  as-is pending a real fix (either restore the file or update the reference).

## AI coding assistants

Instructions for GitHub Copilot and Cursor are kept in sync with this file —
see `.github/copilot-instructions.md` and `.cursor/rules/deploy-and-assets.mdc`.
