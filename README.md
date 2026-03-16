# GitHub README Insight Terminal ASCII

A tool to generate **terminal-style ASCII SVGs** from your GitHub profile contribution data.  
Like [github-readme-stats](https://github.com/anuraghazra/github-readme-stats), you can embed it in your README or GitHub profile with a single URL.

- **Themes**: macOS Terminal / Windows PowerShell / Ubuntu GNOME styles
- **CLI**: Run locally to print to terminal and save SVG
- **API**: Returns SVG via `GET /svg?user=USER&theme=...` (default grass) or `GET /svg/:type?user=USER&theme=...`
- **Tooltip**: Hover each cell to see date and contribution count

**theme=mac** — macOS Terminal (zsh)

![mac](images/mac_style.svg)

**theme=window** — Windows PowerShell

![window](images/window_style.svg)

**theme=ubuntu** — Ubuntu GNOME Terminal

![ubuntu](images/ubuntu_style.svg)

**Stats previews (mac / window / ubuntu)**

![mac stats](images/mac_stats.svg)
![window stats](images/window_stats.svg)
![ubuntu stats](images/ubuntu_stats.svg)

**Top-language previews (mac / window / ubuntu)**

![mac top language](images/mac_top_language.svg)
![window top language](images/window_top_language.svg)
![ubuntu top language](images/ubuntu_top_language.svg)

---

## Introduction

- Enter a GitHub username to fetch the **last year's contribution data** and render a contribution grid.
- Renders a terminal-style SVG directly in Node.js, including hover tooltips with **date and contribution count**.
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
| `--theme` | ❌ (Default: mac) | `mac` / `window` / `ubuntu` |
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

- Browser (grass): `http://127.0.0.1:8000/svg?user=YOUR_GITHUB_ID&theme=mac`
- Browser (typed route): `http://127.0.0.1:8000/svg/grass?user=YOUR_GITHUB_ID&theme=mac`
- Browser (stats): `http://127.0.0.1:8000/svg/stats?user=YOUR_GITHUB_ID&theme=mac`
- Browser (top-language): `http://127.0.0.1:8000/svg/top-language?user=YOUR_GITHUB_ID&theme=mac&top=8`
- Test with `mac`, `window`, and `ubuntu` themes.

---

## Embedding in GitHub Profile / README

Use the deployed API URL as your image source.

**URL Format**

```
https://github-readme-insight-terminal-asci.vercel.app/svg?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/grass?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/top-language?user=GITHUB_USERNAME&theme=THEME&top=8
```

| Query | Required | Description |
|-------|----------|-------------|
| `user` | ✅ | GitHub Username |
| `theme` | ❌ (Default: mac) | `mac` / `window` / `ubuntu` |
| `top` | ❌ (top-language only, Default: 6) | `6` to `12` |
| `scale` | ❌ (Default: 1) | Uniform size multiplier (`0.2` to `3`) |


**Markdown Example**

```markdown
![GitHub contribution grass](https://github-readme-insight-terminal-asci.vercel.app/svg?user=YOUR_GITHUB_ID&theme=mac)
![GitHub contribution grass](https://github-readme-insight-terminal-asci.vercel.app/svg/grass?user=YOUR_GITHUB_ID&theme=mac)
![GitHub stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=YOUR_GITHUB_ID&theme=mac)
![GitHub top languages](https://github-readme-insight-terminal-asci.vercel.app/svg/top-language?user=YOUR_GITHUB_ID&theme=mac&top=8)
![GitHub top languages (scaled)](https://github-readme-insight-terminal-asci.vercel.app/svg/top-language?user=YOUR_GITHUB_ID&theme=mac&top=8&scale=0.8)
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

---

# GitHub Insight Terminal ASCII

GitHub 프로필 기여 데이터를 **터미널 스타일 ASCII SVG**로 만들어 주는 도구입니다.  
[github-readme-stats](https://github.com/anuraghazra/github-readme-stats)처럼 URL 하나로 README나 GitHub 프로필에 이미지를 넣을 수 있습니다.

- **테마**: macOS 터미널 / Windows PowerShell / Ubuntu GNOME 스타일
- **CLI**: 서버 없이 로컬에서 바로 실행해 터미널 출력 + SVG 파일 저장
- **API**: `GET /svg?user=USER&theme=...` 로 SVG 반환 → README 이미지로 사용
- **툴팁**: 셀 hover 시 날짜·기여 수 표시

**theme=mac** — macOS 터미널(zsh)

![mac](images/mac_style.svg)

**theme=window** — Windows PowerShell

![window](images/window_style.svg)

**theme=ubuntu** — Ubuntu GNOME 터미널

![ubuntu](images/ubuntu_style.svg)

**Stats 미리보기 (mac / window / ubuntu)**

![mac stats](images/mac_stats.svg)
![window stats](images/window_stats.svg)
![ubuntu stats](images/ubuntu_stats.svg)

**Top-language 미리보기 (mac / window / ubuntu)**

![mac top language](images/mac_top_language.svg)
![window top language](images/window_top_language.svg)
![ubuntu top language](images/ubuntu_top_language.svg)

---

## 프로젝트 소개

- GitHub 사용자명을 넣으면 **최근 1년 기여 데이터**를 가져와 잔디 그리드를 그립니다.
- Node.js로 터미널 스타일 SVG를 생성하며, 셀에 마우스를 올리면 **날짜·기여 수** 툴팁이 표시됩니다.
- 테마별로 창 디자인(제목창, 버튼, 배경색)이 달라 취향에 맞게 사용할 수 있습니다.

---

## 로컬에서 사용하기

### CLI (서버 없이 실행)

터미널에 잔디를 출력하고, 현재 디렉터리에 SVG 파일로 저장됩니다.

```bash
npm install
npm run cli -- --user YOUR_GITHUB_ID --theme mac
```

**옵션**

| 옵션 | 필수 | 설명 |
|------|------|------|
| `--user` | ✅ | GitHub 사용자 ID |
| `--theme` | ❌ (기본: mac) | `mac` / `window` / `ubuntu` |
| `--output` | ❌ (기본: `{theme}_style.svg`) | 출력 파일명 |

**예시**

```bash
npm run cli -- --user seuthootdev --theme mac
npm run cli -- --user torvalds --theme ubuntu --output ubuntu_style.svg
```

### API 로컬 테스트

브라우저나 README 이미지용 URL을 로컬에서 확인할 때:

```bash
npm install
npm run serve
```

- 브라우저: `http://127.0.0.1:8000/svg?user=YOUR_GITHUB_ID&theme=mac`
- 브라우저(stats): `http://127.0.0.1:8000/svg/stats?user=YOUR_GITHUB_ID&theme=mac`
- 브라우저(top-language): `http://127.0.0.1:8000/svg/top-language?user=YOUR_GITHUB_ID&theme=mac&top=8`
- `mac`, `window`, `ubuntu` 테마를 바꿔가며 확인하면 됩니다.

---

## GitHub 프로필 / README에 이미지 넣기

배포된 API URL을 이미지 주소로 사용하면 됩니다.

**URL 형식**

```
https://github-readme-insight-terminal-asci.vercel.app/svg?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=GITHUB_USERNAME&theme=THEME
https://github-readme-insight-terminal-asci.vercel.app/svg/top-language?user=GITHUB_USERNAME&theme=THEME&top=8
```

| 쿼리 | 필수 | 설명 |
|------|------|------|
| `user` | ✅ | GitHub 사용자명 |
| `theme` | ❌ (기본: mac) | `mac` / `window` / `ubuntu` |
| `top` | ❌ (top-language 전용, 기본: 6) | `6` ~ `12` |
| `scale` | ❌ (기본: 1) | 전체 크기 배율 (`0.2` ~ `3`) |


**마크다운 예시**

```markdown
![GitHub contribution grass](https://github-readme-insight-terminal-asci.vercel.app/svg?user=YOUR_GITHUB_ID&theme=mac)
![GitHub stats](https://github-readme-insight-terminal-asci.vercel.app/svg/stats?user=YOUR_GITHUB_ID&theme=mac)
![GitHub top languages](https://github-readme-insight-terminal-asci.vercel.app/svg/top-language?user=YOUR_GITHUB_ID&theme=mac&top=8)
![GitHub top languages (scaled)](https://github-readme-insight-terminal-asci.vercel.app/svg/top-language?user=YOUR_GITHUB_ID&theme=mac&top=8&scale=0.8)
```

---

## 배포

이 프로젝트는 **Vercel**을 통해 배포 중입니다.

---

## 기여

버그 제보, 테마 추가, 문서/코드 개선 등 기여를 환영합니다.

1. 이 저장소를 Fork 한 뒤
2. 브랜치를 만들고 (`git checkout -b feature/your-feature`)
3. 변경 사항을 커밋·푸시한 후
4. Pull Request를 보내 주세요.
