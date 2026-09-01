# ISHARE website

Static multi-page marketing/fundraising site (HTML/CSS/vanilla JS, no framework, no backend in this repo).

## Deploy

Hosted on **Cloudflare Pages**, connected directly to this repo's `main` branch.
Push to `main` → Cloudflare builds and deploys automatically. No build command,
no manual deploy step, no GitHub Pages (that was retired when this moved to
Cloudflare). Live at `ishare.ca`.

## Large media (videos/images)

Cloudflare Pages rejects any single file over **25 MiB**. Do not commit large
video files to this repo — upload them to the `ishare-website-assets` R2
bucket instead and reference the public `r2.dev` URL from the HTML, the same
way the existing videos do. Check any `<video>`/`<source>` tag pointing at an
`r2.dev` URL for the pattern to copy.

## Known issues

- `culture/holodomor.html` references `../img/hrec.mp4`, which does not exist
  in this repo. Pre-existing, not caused by the Cloudflare migration — left
  as-is pending a real fix (either restore the file or update the reference).

## AI coding assistants

Instructions for GitHub Copilot and Cursor are kept in sync with this file —
see `.github/copilot-instructions.md` and `.cursor/rules/deploy-and-assets.mdc`.
