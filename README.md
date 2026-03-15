# GitHub Grass ASCII

A tool to generate **terminal-style ASCII art SVGs** of your GitHub contribution graph (grass).  
Like [github-readme-stats](https://github.com/anuraghazra/github-readme-stats), you can embed it into your README or GitHub profile with a single URL.

- **Themes**: macOS Terminal / Windows PowerShell / Ubuntu GNOME styles.
- **CLI**: Run locally to print to terminal and save as an SVG without a server.
- **API**: Returns SVG via `GET /svg?user=USER&theme=...` for use in README `<img>` tags.

---

## Introduction

- Enter a GitHub username to fetch the **last year's contribution data** and render a contribution grid.
- Exports terminal output rendered with [Rich](https://github.com/Textualize/rich) to an SVG. When viewed in a browser, tooltips showing the **date and contribution count** are displayed on hover.
- Each theme features a unique window design (title bar, buttons, background colors) to suit your preference.

---

## Local Usage

### CLI (Run without a server)

Outputs the contribution graph to your terminal and saves it as `mac_style.svg` (or your chosen theme name) in the same directory.

```bash
pip install -r requirements.txt
python main.py --user YOUR_GITHUB_ID [--theme mac]
```

**Options**

| Option | Required | Description |
|--------|----------|-------------|
| `--user` | ✅ | GitHub User ID |
| `--theme` | ❌ (Default: mac) | `mac` / `window` / `ubuntu` |

**Examples**

```bash
python main.py --user seuthootdev --theme mac
python main.py --user torvalds --theme ubuntu
```

### API Local Testing

To verify the URL for browser or README use locally:

```bash
pip install -r requirements.txt
uvicorn api:app --reload
```

- Browser: `http://127.0.0.1:8000/svg?user=YOUR_GITHUB_ID&theme=mac`
- Test by switching themes between `mac`, `window`, and `ubuntu`.

### Run with Docker

```bash
docker build -t github-grass-ascii .
docker run -p 8000:8000 github-grass-ascii
```

Access via `http://127.0.0.1:8000/svg?user=...&theme=...`.

---

## Embedding in GitHub Profile / README

Use the deployed API URL as an image source.

**URL Format**

```
https://YOUR_DEPLOY_URL/svg?user=GITHUB_USERNAME&theme=THEME
```

| Query | Required | Description |
|-------|----------|-------------|
| `user` | ✅ | GitHub Username |
| `theme` | ❌ (Default: mac) | `mac` / `window` / `ubuntu` |

**Markdown Example**

```markdown
![GitHub contribution grass](https://YOUR_DEPLOY_URL/svg?user=YOUR_GITHUB_ID&theme=mac)
```

**Theme Previews**

**theme=mac** — macOS Terminal (zsh)

![mac](images/mac_style.svg)

**theme=window** — Windows PowerShell

![window](images/window_style.svg)

**theme=ubuntu** — Ubuntu GNOME Terminal

![ubuntu](images/ubuntu_style.svg)

Simply add the markdown line above to your Profile README or any repository README to display the contribution SVG.

---

## Deployment

This project is deployed on **Render** using a **Docker Hub image**.  
(e.g., Deploying `seuthootdev/github-grass-ascii:latest` as a Render Web Service via "Deploy an existing image")

### CI/CD (GitHub Actions → Docker Hub → Render)

On push to `main` or `master`, GitHub Actions builds the Docker image and pushes it to Docker Hub. If Render is set to **auto-deploy** from that image, it will redeploy automatically.

---

## Contributing

Contributions such as bug reports, new themes, and documentation/code improvements are welcome.

1. Fork this repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit and push your changes.
4. Open a Pull Request to this repository.

You can also share ideas or report bugs through Issues.

---

# GitHub Grass ASCII

GitHub 기여 그래프(잔디)를 **터미널 스타일 ASCII 아트 SVG**로 만들어 주는 도구입니다.  
[github-readme-stats](https://github.com/anuraghazra/github-readme-stats)처럼 URL 하나로 README나 GitHub 프로필에 이미지를 넣을 수 있습니다.

- **테마**: macOS 터미널 / Windows PowerShell / Ubuntu GNOME 스타일
- **CLI**: 서버 없이 로컬에서 바로 실행해 터미널 출력 + SVG 파일 저장
- **API**: `GET /svg?user=USER&theme=...` 로 SVG 반환 → README `<img>` 로 사용

---

## 프로젝트 소개

- GitHub 사용자명을 넣으면 **최근 1년 기여 데이터**를 가져와 잔디 그리드를 그립니다.
- Rich로 그린 터미널 출력을 SVG로 내보내며, 셀에 마우스를 올리면 **날짜·기여 수** 툴팁이 표시됩니다.
- 테마별로 창 디자인(제목창, 버튼, 배경색)이 달라서 취향에 맞는 스타일을 고를 수 있습니다.

---

## 로컬에서 사용하기

### CLI (서버 없이 실행)

터미널에 잔디를 출력하고, 같은 디렉터리에 `mac_style.svg`(또는 선택한 테마명) 파일로 저장됩니다.

```bash
pip install -r requirements.txt
python main.py --user YOUR_GITHUB_ID [--theme mac]
```

**옵션**

| 옵션 | 필수 | 설명 |
|------|------|------|
| `--user` | ✅ | GitHub 사용자 ID |
| `--theme` | ❌ (기본: mac) | `mac` / `window` / `ubuntu` |

**예시**

```bash
python main.py --user seuthootdev --theme mac
python main.py --user torvalds --theme ubuntu
```

### API 로컬 테스트

브라우저나 README 이미지용 URL을 로컬에서 확인할 때:

```bash
pip install -r requirements.txt
uvicorn api:app --reload
```

- 브라우저: `http://127.0.0.1:8000/svg?user=YOUR_GITHUB_ID&theme=mac`
- 테마만 바꿔가며 `mac`, `window`, `ubuntu` 로 테스트하면 됩니다.

### Docker로 로컬 실행

```bash
docker build -t github-grass-ascii .
docker run -p 8000:8000 github-grass-ascii
```

이후 `http://127.0.0.1:8000/svg?user=...&theme=...` 로 접속하면 됩니다.

---

## GitHub 프로필 / README에 이미지 넣기

배포된 API URL을 **이미지 주소**로 쓰면 됩니다.

**URL 형식**

```
https://YOUR_DEPLOY_URL/svg?user=GITHUB_USERNAME&theme=THEME
```

| 쿼리 | 필수 | 설명 |
|------|------|------|
| `user` | ✅ | GitHub 사용자명 |
| `theme` | ❌ (기본: mac) | `mac` / `window` / `ubuntu` |

**마크다운 예시**

```markdown
![GitHub contribution grass](https://YOUR_DEPLOY_URL/svg?user=YOUR_GITHUB_ID&theme=mac)
```

**테마별 미리보기**

**theme=mac** — macOS 터미널(zsh)

![mac](images/mac_style.svg)

**theme=window** — Windows PowerShell

![window](images/window_style.svg)

**theme=ubuntu** — Ubuntu GNOME 터미널

![ubuntu](images/ubuntu_style.svg)

프로필 README나 일반 README의 **이미지 한 줄**을 위 마크다운으로 넣으면, 해당 사용자의 잔디 SVG가 표시됩니다.

---

## 배포

이 프로젝트는 **Render**에서 **Docker Hub에 올린 이미지**를 그대로 배포하는 방식으로 서비스됩니다.  
(예: `seuthootdev/github-grass-ascii:latest` 이미지를 Render Web Service로 Deploy an existing image)

### CI/CD (GitHub Actions → Docker Hub → Render)

`main` 또는 `master`에 푸시하면 GitHub Actions가 Docker 이미지를 빌드해 Docker Hub에 푸시합니다. Render에서 해당 이미지 **자동 배포**가 켜져 있으면 새 이미지가 올라올 때마다 자동으로 재배포됩니다.

---

## 기여

버그 제보, 테마 추가, 문서/코드 개선 등 기여를 환영합니다.

1. 이 저장소를 Fork 한 뒤
2. 브랜치를 만들고 (`git checkout -b feature/원하는기능`)
3. 변경 사항을 커밋·푸시한 후
4. 본 저장소로 Pull Request를 보내 주세요.

이슈로 아이디어나 버그를 알려 주셔도 됩니다.
