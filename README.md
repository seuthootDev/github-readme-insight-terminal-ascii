# GitHub README Insight Terminal ASCII

A tool to generate **terminal-style ASCII SVGs** from your GitHub profile contribution data.  
Like [github-readme-stats](https://github.com/anuraghazra/github-readme-stats), you can embed it in your README or GitHub profile with a single URL.

- **Themes**: macOS Terminal / Windows PowerShell / Ubuntu GNOME styles
- **Types**: contribution graph / stats / top languages / ASCII avatar
- **CLI**: Run locally to print to terminal and save SVG
- **API**: Returns SVG via `GET /svg?user=USER&theme=...` (default graph) or `GET /svg/:type?user=USER&theme=...`
- **Tooltip**: Hover each contribution cell to see date and count

**theme=mac** — macOS Terminal (zsh)

![mac](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=mac&scale=0.4)

**theme=windows** — Windows PowerShell

![windows](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=windows&scale=0.4)

**theme=ubuntu** — Ubuntu GNOME Terminal

![ubuntu](https://github-readme-insight-terminal-asci.vercel.app/svg?user=torvalds&theme=ubuntu&scale=0.4)

**Stats previews (mac / windows / ubuntu)**

![mac stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=mac&scale=0.4)
![windows stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=windows&scale=0.4)
![ubuntu stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=torvalds&theme=ubuntu&scale=0.4)

**top-lang previews (mac / windows / ubuntu)**

![mac top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=mac&top=8&scale=0.4)
![windows top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=windows&top=8&scale=0.4)
![ubuntu top language](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=torvalds&theme=ubuntu&top=8&scale=0.4)

**ascii avatar previews (mono / color)**

![mac ascii mono](https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=torvalds&theme=mac)
![mac ascii color](https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=torvalds&theme=mac&color=1)

---

## Introduction

- Enter a GitHub username to fetch contribution / stats / language data, or render an **ASCII avatar** from the profile photo.
- Renders a terminal-style SVG directly in Node.js (graph cells include hover tooltips with date and count).
- Each theme has a distinct terminal window style (title bar, controls, and background colors).

---

## Local Usage

### CLI (Run without a server)

Prints the contribution graph in your terminal and saves SVG output in the current directory.

```bash
npm install
npm run cli -- --user YOUR_GITHUB_ID --theme mac
```

**Options**

| Option | Required | Description |
|--------|----------|-------------|
| `--user` | ✅ | GitHub User ID |
| `--theme` | ❌ (Default: mac) | `mac` / `windows` / `ubuntu` |
| `--output` | ❌ (Default: `{theme}_style.svg`) | Output file name |

**Examples**

```bash
npm run cli -- --user seuthootdev --theme mac
npm run cli -- --user torvalds --theme ubuntu --output ubuntu_style.svg
```

### API Local Testing

Run the local API server for browser/README URL testing:

```bash
npm install
npm run serve
```

- Browser (graph): `http://127.0.0.1:8000/svg?user=YOUR_GITHUB_ID&theme=mac`
- Browser (typed route): `http://127.0.0.1:8000/svg/graph?user=YOUR_GITHUB_ID&theme=mac`
- Browser (stats): `http://127.0.0.1:8000/svg/stats?user=YOUR_GITHUB_ID&theme=mac`
- Browser (top-lang): `http://127.0.0.1:8000/svg/top-lang?user=YOUR_GITHUB_ID&theme=mac&top=8`
- Browser (ascii mono): `http://127.0.0.1:8000/svg/ascii?user=YOUR_GITHUB_ID&theme=mac`
- Browser (ascii color): `http://127.0.0.1:8000/svg/ascii?user=YOUR_GITHUB_ID&theme=mac&color=1`
- Test with `mac`, `windows`, and `ubuntu` themes.

---

## Embedding in GitHub Profile / README

Use the deployed API URL as your image source.

**URL Format**

```
https://github-readme-insight-terminal-asci.vercel.app/svg?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/graph?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=GITHUB_USERNAME&theme=THEME&top=8
https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=GITHUB_USERNAME&theme=THEME&color=1
```

| Query | Required | Description |
|-------|----------|-------------|
| `user` | ✅ | GitHub Username |
| `theme` | ❌ (Default: mac) | `mac` / `windows` / `ubuntu` |
| `top` | ❌ (top-lang only, Default: 6) | `6` to `12` |
| `color` | ❌ (ascii only, Default: mono) | `1` / `true` / `color` for color ASCII |
| `cols` | ❌ (ascii only, Default: 100) | ASCII width `24` to `140` |
| `scale` | ❌ (Default: `1`, ascii: `0.28`) | Uniform size multiplier (`0.2` to `3`) |


**Markdown Example**

```markdown
![GitHub contribution graph](https://github-readme-insight-terminal-asci.vercel.app/svg?user=YOUR_GITHUB_ID&theme=mac)
![GitHub contribution graph](https://github-readme-insight-terminal-asci.vercel.app/svg/graph?user=YOUR_GITHUB_ID&theme=mac)
![GitHub stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=YOUR_GITHUB_ID&theme=mac)
![GitHub top languages](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=YOUR_GITHUB_ID&theme=mac&top=8)
![GitHub top languages (scaled)](https://github-readme-insight-terminal-asci.vercel.app/svg/top-lang?user=YOUR_GITHUB_ID&theme=mac&top=8&scale=0.8)
![ASCII avatar mono](https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=YOUR_GITHUB_ID&theme=mac)
![ASCII avatar color](https://github-readme-insight-terminal-asci.vercel.app/svg/ascii?user=YOUR_GITHUB_ID&theme=mac&color=1)
```

---

## Deployment

This project is deployed via **Vercel**.

---

## Contributing

Contributions such as bug reports, new themes, and documentation/code improvements are welcome.

1. Fork this repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit and push your changes.
4. Open a Pull Request.
