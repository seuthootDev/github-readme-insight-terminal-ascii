# GitHub README Insight Terminal ASCII

[![npm version](https://terminal-shields.vercel.app/npm/v/github-readme-insight-terminal-ascii?theme=cyan)](https://www.npmjs.com/package/github-readme-insight-terminal-ascii)
[![Stars](https://terminal-shields.vercel.app/github/stars/seuthootDev/github-readme-insight-terminal-ascii?theme=amber&blink=1)](https://github.com/seuthootDev/github-readme-insight-terminal-ascii/stargazers)
[![License](https://terminal-shields.vercel.app/github/license/seuthootDev/github-readme-insight-terminal-ascii?theme=green)](LICENSE)
[![Live demo](https://terminal-shields.vercel.app/website?url=https://github-readme-insight-terminal-asci.vercel.app&theme=cyan)](https://github-readme-insight-terminal-asci.vercel.app)
[![Last commit](https://terminal-shields.vercel.app/github/last-commit/seuthootDev/github-readme-insight-terminal-ascii?theme=green)](https://github.com/seuthootDev/github-readme-insight-terminal-ascii/commits/main)

A tool to generate **terminal-style ASCII SVGs** from your GitHub profile data.  
Like [github-readme-stats](https://github.com/anuraghazra/github-readme-stats), you can embed it in your README or GitHub profile with a single URL.

- **Themes**: macOS Terminal / Windows PowerShell / Ubuntu GNOME
- **Types**: contribution graph · stats · top languages · streak · git log · PRs & issues · repo · language history · ASCII avatar · GitHub neofetch · dashboard
- **CLI**: Run locally to print the graph and save SVG
- **API**: `GET /svg?user=USER&theme=...` (default graph) or `GET /svg/:type?user=USER&theme=...`
- **Tooltip**: Hover contribution cells to see date and count

**theme=mac** — macOS Terminal (zsh)

![mac](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=mac&scale=0.6)

**theme=windows** — Windows PowerShell

![windows](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=windows&scale=0.6)

**theme=ubuntu** — Ubuntu GNOME Terminal

![ubuntu](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=ubuntu&scale=0.6)

**Dashboard** — tmux-style split panes: profile, stats, streak, 26-week graph and languages in one window

![mac dashboard](https://github-readme-insight-terminal-asci.vercel.app/svg/dashboard?user=torvalds&theme=mac&scale=0.6)
![windows dashboard](https://github-readme-insight-terminal-asci.vercel.app/svg/dashboard?user=torvalds&theme=windows&scale=0.6)
![ubuntu dashboard](https://github-readme-insight-terminal-asci.vercel.app/svg/dashboard?user=torvalds&theme=ubuntu&scale=0.6)

**Git log** — recent commits as `git log --oneline --graph`

![mac git log](https://github-readme-insight-terminal-asci.vercel.app/svg/git-log?user=sindresorhus&theme=mac&scale=0.6)
![windows git log](https://github-readme-insight-terminal-asci.vercel.app/svg/git-log?user=sindresorhus&theme=windows&scale=0.6)
![ubuntu git log](https://github-readme-insight-terminal-asci.vercel.app/svg/git-log?user=sindresorhus&theme=ubuntu&scale=0.6)

**ASCII avatar** (mono / color)

![mac ascii mono](https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=torvalds&theme=mac&scale=0.15)
![mac ascii color](https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=torvalds&theme=mac&color=1&scale=0.15)

**GitHub neofetch** — Octocat ASCII + profile fields (Repos, Stars, Contributions, …)

![mac neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=torvalds&theme=mac&color=1&scale=0.6)
![windows neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=torvalds&theme=windows&color=1&scale=0.6)
![ubuntu neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=torvalds&theme=ubuntu&color=1&scale=0.6)

**PRs & issues** — recent pull requests and issues as `gh search issues --include-prs`

![mac pr-issue](https://github-readme-insight-terminal-asci.vercel.app/svg/pr-issue?user=sindresorhus&theme=mac&scale=0.6)
![windows pr-issue](https://github-readme-insight-terminal-asci.vercel.app/svg/pr-issue?user=sindresorhus&theme=windows&scale=0.6)
![ubuntu pr-issue](https://github-readme-insight-terminal-asci.vercel.app/svg/pr-issue?user=sindresorhus&theme=ubuntu&scale=0.6)

**Repo** — a single repository as `gh repo view`: stars, forks, language, license, latest release, topics and 52-week commit activity

![mac repo](https://github-readme-insight-terminal-asci.vercel.app/svg/repo?repo=sindresorhus/got&theme=mac&scale=0.6)
![windows repo](https://github-readme-insight-terminal-asci.vercel.app/svg/repo?repo=sindresorhus/got&theme=windows&scale=0.6)
![ubuntu repo](https://github-readme-insight-terminal-asci.vercel.app/svg/repo?repo=sindresorhus/got&theme=ubuntu&scale=0.6)

**Language history** — share of commits by language, year by year

![mac lang-history](https://github-readme-insight-terminal-asci.vercel.app/svg/lang-history?user=mitchellh&theme=mac&scale=0.6)
![windows lang-history](https://github-readme-insight-terminal-asci.vercel.app/svg/lang-history?user=mitchellh&theme=windows&scale=0.6)
![ubuntu lang-history](https://github-readme-insight-terminal-asci.vercel.app/svg/lang-history?user=mitchellh&theme=ubuntu&scale=0.6)

**Stats**

![mac stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=mac&scale=0.6)
![windows stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=windows&scale=0.6)
![ubuntu stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=ubuntu&scale=0.6)

**Streak** — current / longest contribution streak

![mac streak](https://github-readme-insight-terminal-asci.vercel.app/svg/streak?user=torvalds&theme=mac&scale=0.6)
![windows streak](https://github-readme-insight-terminal-asci.vercel.app/svg/streak?user=torvalds&theme=windows&scale=0.6)
![ubuntu streak](https://github-readme-insight-terminal-asci.vercel.app/svg/streak?user=torvalds&theme=ubuntu&scale=0.6)

**Top languages**

![mac top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=mac&top=8&scale=0.6)
![windows top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=windows&top=8&scale=0.6)
![ubuntu top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=ubuntu&top=8&scale=0.6)

---

## Introduction

Pass a GitHub username to fetch profile data and render a terminal-style SVG in Node.js.

| Type | What it shows |
|------|----------------|
| `graph` | Contribution calendar (hover tooltips) |
| `stats` | Stars, PRs, issues, yearly contributions |
| `top-lang` | Most used languages |
| `streak` | Current streak, longest streak, and total contributions |
| `git-log` | Recent commits (hash, repo, message, relative time) in `git log --oneline` style |
| `pr-issue` | Recent public PRs and issues (state, repo, number, title, last update) in `gh search issues` style |
| `repo` | One repository in `gh repo view` style: stars, forks, watchers, language, license, branch, latest release, topics and 52-week commit activity |
| `lang-history` | Share of commits by language for each of the last N years, with the top two languages and the biggest shift (needs `GITHUB_TOKEN`) |
| `dashboard` | tmux-style split screen with profile, stats, streak, a 26-week contribution graph and languages, drawn on a character grid with ASCII-art icons |
| `ascii` | Profile photo as ASCII art |
| `neofetch` | GitHub “neofetch” card — Octocat ASCII + fields like Name, Repos, Followers, Stars, Contributions, Languages |

A **streak** is how many days in a row you've had at least one contribution — like a Duolingo streak, but for commits. `streak` shows your current streak (counting from today, or yesterday if today has no contributions yet), your longest streak ever, and total contributions, all computed from the last year of contribution data.

Each theme has its own color palette shared by every card: `mac` = One Dark with GitHub green, `windows` = PowerShell Campbell with blue, `ubuntu` = Tango with Ubuntu orange/aubergine. The contribution graph, PR/issue states, git log, and accent strips all follow it.

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
| streak | `http://127.0.0.1:8000/svg/streak?user=YOUR_GITHUB_ID&theme=mac` |
| git-log | `http://127.0.0.1:8000/svg/git-log?user=YOUR_GITHUB_ID&theme=mac&lines=8` |
| pr-issue | `http://127.0.0.1:8000/svg/pr-issue?user=YOUR_GITHUB_ID&theme=mac&lines=8` |
| dashboard | `http://127.0.0.1:8000/svg/dashboard?user=YOUR_GITHUB_ID&theme=mac` |
| repo | `http://127.0.0.1:8000/svg/repo?repo=OWNER/REPO&theme=mac` |
| lang-history | `http://127.0.0.1:8000/svg/lang-history?user=YOUR_GITHUB_ID&theme=mac&years=6` |
| ascii | `http://127.0.0.1:8000/svg/ascii?user=YOUR_GITHUB_ID&theme=mac` |
| ascii (color) | `http://127.0.0.1:8000/svg/ascii?user=YOUR_GITHUB_ID&theme=mac&color=1` |
| neofetch | `http://127.0.0.1:8000/svg/neofetch?user=YOUR_GITHUB_ID&theme=mac&color=1` |

---

## Embedding in GitHub Profile / README

```
https://github-readme-insight-terminal-asci.vercel.app/svg?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/graph?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=GITHUB_USERNAME&theme=THEME&top=8
https://github-readme-insight-terminal-asci.vercel.app/svg/streak?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/git-log?user=GITHUB_USERNAME&theme=THEME&lines=8
https://github-readme-insight-terminal-asci.vercel.app/svg/pr-issue?user=GITHUB_USERNAME&theme=THEME&lines=8
https://github-readme-insight-terminal-asci.vercel.app/svg/dashboard?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/repo?repo=OWNER/REPO&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/lang-history?user=GITHUB_USERNAME&theme=THEME&years=6
https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=GITHUB_USERNAME&theme=THEME&color=1
https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=GITHUB_USERNAME&theme=THEME&color=1
```

| Query | Required | Description |
|-------|----------|-------------|
| `user` | ✅ (optional for `repo` when `repo=owner/name`) | GitHub username |
| `theme` | ❌ (default: `mac`) | `mac` / `windows` / `ubuntu` |
| `top` | ❌ (`top-lang` only, default: `6`) | `6`–`12` |
| `color` | ❌ (`ascii` / `neofetch`, default: mono) | `1` / `true` / `color` (alias: `mode`) |
| `lines` | ❌ (`git-log` / `pr-issue`, default: `8`) | Number of rows `3`–`15` |
| `repo` | ✅ for `repo` | `owner/name`, or just `name` together with `user=owner` |
| `years` | ❌ (`lang-history` only, default: `6`) | Number of years `3`–`10` |
| `cols` | ❌ (`ascii` only, default: `50`) | ASCII width `24`–`140` (alias: `size`) |
| `scale` | ❌ (default: `1`, ascii: `0.28`) | Size multiplier `0.05`–`3` |

```markdown
![GitHub contribution graph](https://github-readme-insight-terminal-asci.vercel.app/svg?user=YOUR_GITHUB_ID&theme=mac)
![GitHub stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=YOUR_GITHUB_ID&theme=mac)
![GitHub top languages](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=YOUR_GITHUB_ID&theme=mac&top=8)
![GitHub streak](https://github-readme-insight-terminal-asci.vercel.app/svg/streak?user=YOUR_GITHUB_ID&theme=mac)
![GitHub git log](https://github-readme-insight-terminal-asci.vercel.app/svg/git-log?user=YOUR_GITHUB_ID&theme=mac)
![GitHub PRs and issues](https://github-readme-insight-terminal-asci.vercel.app/svg/pr-issue?user=YOUR_GITHUB_ID&theme=mac)
![GitHub dashboard](https://github-readme-insight-terminal-asci.vercel.app/svg/dashboard?user=YOUR_GITHUB_ID&theme=mac&scale=0.7)
![GitHub repo](https://github-readme-insight-terminal-asci.vercel.app/svg/repo?repo=YOUR_GITHUB_ID/YOUR_REPO&theme=mac)
![GitHub language history](https://github-readme-insight-terminal-asci.vercel.app/svg/lang-history?user=YOUR_GITHUB_ID&theme=mac)
![ASCII avatar](https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=YOUR_GITHUB_ID&theme=mac&color=1)
![GitHub neofetch](https://github-readme-insight-terminal-asci.vercel.app/svg/neofetch?user=YOUR_GITHUB_ID&theme=mac&color=1)
```

---

## Deployment

The public instance runs on **Vercel**. `src/server.js` exports the Express app, which Vercel picks up as a serverless function. Outside Vercel it listens on `PORT`.

To host your own instance:

1. Fork this repository and import it into Vercel (or run `npm run serve` on any Node.js 18+ host).
2. Set the environment variables below. For local runs you can put them in a `.env` file at the repo root, which `src/server.js` loads automatically.

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` (or `GH_TOKEN`) | Recommended | GitHub personal access token used for GitHub API calls (`stats`, `top-lang`, `streak`, `git-log`, `pr-issue`, `repo`, `lang-history`, `ascii`, `neofetch`, `dashboard`). It needs no scopes, since only public data is read. Without it, requests share the 60 req/hour unauthenticated rate limit and cards will start failing quickly. `lang-history` uses the GraphQL API and always requires a token. |
| `PORT` | ❌ (default: `8000`) | Port for the local server |
| `LOG_GITHUB_TOKEN_USAGE` | ❌ | Set to `1` to log whether a token was used for each `stats` API call |

The `graph` card reads the public contribution calendar and does not need a token.

### Caching

Successful responses are sent with `Cache-Control: public, max-age=1800`, so cards may take up to **30 minutes** to reflect new activity. GitHub's image proxy (camo) can cache them for a while on top of that. Error cards are sent with `no-store`, so they are never cached.

---

## Contributing

Bug reports, new themes, and docs/code improvements are welcome.

1. Fork this repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit and push your changes.
4. Open a Pull Request.

---

## More from the same author

Like terminal ASCII cards? These sister projects turn GitHub activity into **zodiac profile cards** — embed as SVG in your README, or pin a Gist (productive-box style).

### [github-readme-zodiac](https://github.com/seuthootDev/github-readme-zodiac)

Western zodiac cards from your GitHub stats — constellation art, traits like Consistency / Builder, SVG or pinned Gist.

![Developer Zodiac](https://github-readme-zodiac.vercel.app/api/card?username=torvalds)

```md
![Developer Zodiac](https://github-readme-zodiac.vercel.app/api/card?username=YOUR_USERNAME)
```

### [github-readme-chinese-zodiac](https://github.com/seuthootDev/github-readme-chinese-zodiac)

Asian zodiac (生肖) cards — the 12 animals, SVG or pinned Gist, same GitHub signals with Asian-flavored trait names.

![Asian Zodiac](https://github-readme-chinese-zodiac.vercel.app/api/card?username=torvalds&glow=1)

```md
![Asian Zodiac](https://github-readme-chinese-zodiac.vercel.app/api/card?username=YOUR_USERNAME&glow=1)
```
