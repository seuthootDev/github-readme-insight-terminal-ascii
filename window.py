"""Windows PowerShell / Windows Terminal 스타일 디자인."""
import re
from pathlib import Path

from rich.console import Console
from rich.text import Text

# 헤더 아이콘 (헤더 좌측 배치용)
ICON_PATH = Path(__file__).resolve().parent / "resources" / "PowerShell_icon.svg"
HEADER_ICON_SIZE = 24
HEADER_ICON_X = 12
HEADER_ICON_Y = 8


def print_header(console: Console, github_id: str) -> None:
    """Windows PowerShell 스타일 프롬프트와 명령어, 메시지 출력."""
    cwd = f"C:\\GitHub\\{github_id}\\github-grass"
    prompt = Text()
    prompt.append("PS ", style="bright_magenta")
    prompt.append(cwd, style="bright_yellow")
    prompt.append("> ", style="white")

    console.print("\n", prompt, f"github-grass --user {github_id} --theme ocean")
    console.print("[dim]Fetching data from GitHub API...[/]")
    console.print(f"[bold green]✔ Success![/] Generated ASCII art for '{github_id}'.\n")


def print_prompt_only(console: Console, github_id: str) -> None:
    """잔디 아래에 프롬프트만 출력 (다음 명령 대기처럼)."""
    cwd = f"C:\\GitHub\\{github_id}\\github-grass"
    prompt = Text()
    prompt.append("PS ", style="bright_magenta")
    prompt.append(cwd, style="bright_yellow")
    prompt.append("> ", style="white")
    console.print(prompt)


def _load_header_icon_svg() -> str:
    """PowerShell 아이콘 SVG를 헤더 크기에 맞게 인라인 문자열로 반환."""
    if not ICON_PATH.exists():
        return ""
    raw = ICON_PATH.read_text(encoding="utf-8")
    # <svg ...> 와 </svg> 제거 후 내부 path 등만 추출
    inner = re.sub(r"<svg[^>]*>", "", raw, count=1)
    inner = re.sub(r"</svg>\s*$", "", inner)
    scale = HEADER_ICON_SIZE / 256
    return (
        f'<g transform="translate({HEADER_ICON_X},{HEADER_ICON_Y}) scale({scale})">'
        f"{inner}"
        f"</g>"
    )


def export_svg_string(console: Console, github_id: str) -> str:
    """SVG 내보낸 후 Windows Terminal 스타일로 수정한 문자열 반환."""
    svg = console.export_svg(title="Windows PowerShell")

    svg = svg.replace('fill="#292929"', 'fill="#0c0c0c"')

    width_match = re.search(r'viewBox="0 0 (\S+)', svg)
    total_width = float(width_match.group(1)) if width_match else 1116
    win_width = int(total_width - 2)

    icon_group = _load_header_icon_svg()
    header_bar = (
        f'<rect fill="#2c2c2c" x="1" y="1" width="{win_width}" height="40" rx="8"/>'
        f'<rect fill="#2c2c2c" x="1" y="29" width="{win_width}" height="12"/>'
        f"{icon_group}"
    )
    svg = re.sub(r'(<text class="[^"]*-title")', header_bar + r'\1', svg, count=1)

    btn_x = int(total_width) - 20
    win_buttons = (
        f'<g transform="translate({btn_x - 100},22)" font-family="Segoe UI,Arial" font-size="13" fill="#c5c8c6">\n'
        f'    <text x="0" y="5" text-anchor="middle">&#x2500;</text>\n'
        f'    <text x="28" y="5" text-anchor="middle">&#x25A1;</text>\n'
        f'    <text x="56" y="5" text-anchor="middle" fill="#e74856">&#x2715;</text>\n'
        f'    </g>'
    )
    svg = re.sub(
        r'<g transform="translate\(26,22\)">\s*(?:<circle[^>]*/>\s*){3}</g>',
        win_buttons,
        svg
    )
    return svg


def export_svg(console: Console, github_id: str) -> None:
    """SVG 내보낸 후 Windows Terminal 스타일로 수정해 저장."""
    with open("window_style.svg", "w", encoding="utf-8") as f:
        f.write(export_svg_string(console, github_id))
