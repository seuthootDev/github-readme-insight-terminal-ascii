"""Ubuntu GNOME Terminal / Yaru-dark 스타일 디자인."""
import re

from rich.console import Console
from rich.text import Text


def print_header(console: Console, github_id: str) -> None:
    """Ubuntu 스타일 프롬프트와 명령어, 메시지 출력."""
    prompt = Text()
    prompt.append(f"{github_id}@ubuntu", style="bold green")
    prompt.append(":", style="white")
    prompt.append(f"~/github/{github_id}", style="bold blue")
    prompt.append("$ ", style="white")

    console.print("\n", prompt, f"./render_grass --target={github_id}")
    console.print("[dim]Fetching data from GitHub API...[/]")
    console.print(f"[bold green]✔ Success![/] Generated ASCII art for '{github_id}'.\n")


def print_prompt_only(console: Console, github_id: str) -> None:
    """잔디 아래에 프롬프트만 출력 (다음 명령 대기처럼)."""
    prompt = Text()
    prompt.append(f"{github_id}@ubuntu", style="bold green")
    prompt.append(":", style="white")
    prompt.append(f"~/github/{github_id}", style="bold blue")
    prompt.append("$ ", style="white")
    console.print(prompt)


def export_svg_string(console: Console, github_id: str) -> str:
    """SVG 내보낸 후 Ubuntu GNOME Terminal 스타일로 수정한 문자열 반환."""
    svg = console.export_svg(title=f"bash — {github_id}@ubuntu: ~")

    svg = svg.replace('fill="#292929"', 'fill="#1e1e1e"')

    width_match = re.search(r'viewBox="0 0 (\S+)', svg)
    total_width = float(width_match.group(1)) if width_match else 1116
    win_width = int(total_width - 2)

    header_bar = (
        f'<rect fill="#2d2d2d" x="1" y="1" width="{win_width}" height="40" rx="8"/>'
        f'<rect fill="#2d2d2d" x="1" y="29" width="{win_width}" height="12"/>'
    )
    svg = re.sub(r'(<text class="[^"]*-title")', header_bar + r'\1', svg, count=1)

    btn_x = int(total_width) - 28
    ubuntu_buttons = (
        f'<g transform="translate({btn_x},22)">\n'
        f'    <circle cx="0" cy="0" r="7" fill="#e95420"/>\n'
        f'    <circle cx="-22" cy="0" r="7" fill="#5a5a5a"/>\n'
        f'    <circle cx="-44" cy="0" r="7" fill="#5a5a5a"/>\n'
        f'    </g>'
    )
    svg = re.sub(
        r'<g transform="translate\(26,22\)">\s*(?:<circle[^>]*/>\s*){3}</g>',
        ubuntu_buttons,
        svg,
    )
    return svg
