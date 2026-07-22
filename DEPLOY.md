# Deploy

Configs are ready; you need GitHub auth once, then Vercel or Netlify.

## 1. Create the GitHub repo

```bash
cd /Users/saralinnea/Desktop/Projects/duck-curve
git init
git add -A
git commit -m "Ship Phase E/F: per-car costs, off-peak mode, deploy configs"
gh repo create duck-curve --public --source=. --remote=origin --push
```

If `gh` is missing: `brew install gh` then `gh auth login`.

## 2a. Vercel

1. Import the GitHub repo at https://vercel.com/new
2. Root Directory: leave blank (uses root `vercel.json`) **or** set to `frontend`
3. Deploy

CLI alternative (after `npm i -g vercel`):

```bash
cd frontend && vercel --prod
```

## 2b. Netlify

1. Import the repo at https://app.netlify.com/start
2. Build settings come from root `netlify.toml` (`base = frontend`)
3. Deploy

## Local preview of production build

```bash
cd frontend && npm run build && npm run preview
```
