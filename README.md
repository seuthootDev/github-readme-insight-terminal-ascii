# GitHub README Insight Terminal ASCII

A tool to generate **terminal-style ASCII SVGs** from your GitHub profile data.  
Like [github-readme-stats](https://github.com/anuraghazra/github-readme-stats), you can embed it in your README or GitHub profile with a single URL.

- **Themes**: macOS Terminal / Windows PowerShell / Ubuntu GNOME
- **Types**: contribution graph · stats · top languages · GitHub neofetch
- **CLI**: Run locally to print the graph and save SVG
- **API**: `GET /svg?user=USER&theme=...` (default graph) or `GET /svg/:type?user=USER&theme=...`
- **Tooltip**: Hover contribution cells to see date and count

**theme=mac** — macOS Terminal (zsh)

![mac](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=mac&scale=0.4)

**theme=windows** — Windows PowerShell

![windows](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=windows&scale=0.4)

**theme=ubuntu** — Ubuntu GNOME Terminal

![ubuntu](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=ubuntu&scale=0.4)

**Stats**

![mac stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=mac&scale=0.4)
![windows stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=windows&scale=0.4)
![ubuntu stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=ubuntu&scale=0.4)

**Top languages**

![mac top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=mac&top=8&scale=0.4)
![windows top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=windows&top=8&scale=0.4)
![ubuntu top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=ubuntu&top=8&scale=0.4)

**GitHub neofetch** — Octocat ASCII + profile fields (Repos, Stars, Contributions, …)

![mac neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=torvalds&theme=mac&color=1&scale=0.4)
![windows neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=torvalds&theme=windows&color=1&scale=0.4)
![ubuntu neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=torvalds&theme=ubuntu&color=1&scale=0.4)

---

## Introduction

Pass a GitHub username to fetch profile data and render a terminal-style SVG in Node.js.

| Type | What it shows |
|------|----------------|
| `graph` | Contribution calendar (hover tooltips) |
| `stats` | Stars, PRs, issues, yearly contributions |
| `top-lang` | Most used languages |
| `neofetch` | GitHub “neofetch” card — Octocat ASCII + fields like Name, Repos, Followers, Stars, Contributions, Languages |

Themes only change the terminal chrome (title bar, controls, colors).

---

## Local Usage

### CLI

Prints the contribution graph in your terminal and saves an SVG.

```bash
npm install
npm run cli -- --user YOUR_GITHUB_ID --theme mac
```

| Option | Required | Description |
|--------|----------|-------------|
| `--user` | ✅ | GitHub username |
| `--theme` | ❌ (default: `mac`) | `mac` / `windows` / `ubuntu` |
| `--output` | ❌ | Output file (default: `{theme}_style.svg`) |

```bash
npm run cli -- --user seuthootdev --theme mac
npm run cli -- --user torvalds --theme ubuntu --output ubuntu_style.svg
```

### API

```bash
npm install
npm run serve
```

| Type | URL |
|------|-----|
| graph | `http://127.0.0.1:8000/svg?user=YOUR_GITHUB_ID&theme=mac` |
| graph | `http://127.0.0.1:8000/svg/graph?user=YOUR_GITHUB_ID&theme=mac` |
| stats | `http://127.0.0.1:8000/svg/stats?user=YOUR_GITHUB_ID&theme=mac` |
| top-lang | `http://127.0.0.1:8000/svg/top-lang?user=YOUR_GITHUB_ID&theme=mac&top=8` |
| neofetch | `http://127.0.0.1:8000/svg/neofetch?user=YOUR_GITHUB_ID&theme=mac&color=1` |

---

## Embedding in GitHub Profile / README

```
https://github-readme-insight-terminal-asci.vercel.app/svg?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/graph?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=GITHUB_USERNAME&theme=THEME&top=8
https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=GITHUB_USERNAME&theme=THEME&color=1
```

| Query | Required | Description |
|-------|----------|-------------|
| `user` | ✅ | GitHub username |
| `theme` | ❌ (default: `mac`) | `mac` / `windows` / `ubuntu` |
| `top` | ❌ (`top-lang` only, default: `6`) | `6`–`12` |
| `color` | ❌ (`neofetch`, default: mono) | `1` / `true` / `color` |
| `scale` | ❌ (default: `1`) | Size multiplier `0.05`–`3` |

```markdown
![GitHub contribution graph](https://github-readme-insight-terminal-asci.vercel.app/svg?user=YOUR_GITHUB_ID&theme=mac)
![GitHub stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=YOUR_GITHUB_ID&theme=mac)
![GitHub top languages](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=YOUR_GITHUB_ID&theme=mac&top=8)
![GitHub neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=YOUR_GITHUB_ID&theme=mac&color=1)
```

---

## Deployment

Deployed on **Vercel**.

---

## Contributing

Bug reports, new themes, and docs/code improvements are welcome.

1. Fork this repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit and push your changes.
4. Open a Pull Request.
