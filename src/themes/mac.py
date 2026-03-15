"""macOS 터미널 스타일 디자인 (zsh, 좌측 빨강/노랑/초록 버튼)."""
from rich.console import Console
from rich.text import Text


def print_header(console: Console, github_id: str) -> None:
    """macOS 스타일 프롬프트와 명령어, 메시지 출력."""
    prompt = Text()
    prompt.append(f"{github_id}@MacBook-Pro", style="bold green")
    prompt.append(" ", style="white")
    prompt.append("github-grass", style="bold blue")
    prompt.append(" % ", style="white")

    console.print("\n", prompt, f"github-grass --user {github_id} --theme ocean")
    console.print("[dim]Fetching data from GitHub API...[/]")
    console.print(f"[bold green]✔ Success![/] Generated ASCII art for '{github_id}'.\n")


def print_prompt_only(console: Console, github_id: str) -> None:
    """잔디 아래에 프롬프트만 출력 (다음 명령 대기처럼)."""
    prompt = Text()
    prompt.append(f"{github_id}@MacBook-Pro", style="bold green")
    prompt.append(" ", style="white")
    prompt.append("github-grass", style="bold blue")
    prompt.append(" % ", style="white")
    console.print(prompt)


def export_svg_string(console: Console, github_id: str) -> str:
    """Rich 기본(macOS 스타일) SVG 문자열 반환."""
    return console.export_svg(title=f"{github_id} — zsh — 90×24")
