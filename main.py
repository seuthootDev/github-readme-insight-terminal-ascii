"""
GitHub 잔디 ASCII 아트 생성기
- 잔디 생성 로직은 공통 사용 (GitHub 기여 데이터 연동)
- OS별 디자인(mac / window / ubuntu)은 해당 모듈을 호출해 적용
"""
import argparse
from datetime import datetime, timedelta

from rich.console import Console

# OS별 디자인 모듈
import mac
import window
import ubuntu
from github_contributions import fetch_contributions, level_from_count
from pathlib import Path

from svg_tooltip import add_grass_tooltips_to_string

CONSOLE_WIDTH = 120
THEMES = {"mac": mac, "window": window, "ubuntu": ubuntu}

NUM_WEEKS = 52
DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
# GitHub 스타일 색상: 없음 / 낮음 / 중간 / 높음
COLORS = ["#161b22", "#0e4429", "#26a641", "#39d353"]


def _get_grass_range():
    """오늘 기준 마지막 52주(약 1년)의 일요일 시작/종료."""
    today = datetime.now().date()
    # 현재 주의 일요일 (Python: Mon=0 .. Sun=6 → 일요일 오프셋)
    last_sunday = today - timedelta(days=(today.weekday() + 1) % 7)
    first_sunday = last_sunday - timedelta(weeks=NUM_WEEKS - 1)
    return first_sunday, last_sunday, today


def _level_for_date(date, today, contributions: dict[str, int]) -> int:
    """날짜별 잔디 레벨(0~3). GitHub 기여 수 기반."""
    if date > today:
        return 0
    key = date.isoformat()
    count = contributions.get(key, 0)
    return level_from_count(count)


# 잔디 행: 한 주당 "■ " 2칸이므로 월 행도 주당 2칸으로 맞춤
CHARS_PER_WEEK = 2
# 잔디 한 줄 너비 (요일 4칸 + 52주*2칸) → 여기 끝에 contributions / Less·More 정렬
GRASS_LINE_WIDTH = 4 + NUM_WEEKS * CHARS_PER_WEEK


def _build_month_line(first_sunday, last_sunday) -> str:
    """
    GitHub 방식: 각 월의 1일이 속한 주(열) 위에 해당 월 라벨을 둠.
    - 범위 안에 해당 월의 1일이 없으면 라벨을 넣지 않음 (예: 작년 3월이 중간부터면 Mar 생략).
    - 열 = 주(week). 잔디는 한 주당 2칸("■ ")이므로 월 행도 2칸/주로 동일하게.
    """
    length = NUM_WEEKS * CHARS_PER_WEEK
    month_line = [" "] * length
    last_day = last_sunday + timedelta(days=6)
    current = first_sunday.replace(day=1)
    # 1일이 범위(first_sunday~last_day) 안에 들어오는 월부터만 표시
    while current < first_sunday and current <= last_day:
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    last_end = -2  # 이전 월이 끝난 위치
    while current <= last_day:
        c = (current - first_sunday).days // 7
        c = max(0, min(c, NUM_WEEKS - 1))
        start = c * CHARS_PER_WEEK
        # 이전 월과 겹치면 한 칸 띄워서 이어서 씀 (4월 등이 빠지지 않도록)
        if start <= last_end:
            start = last_end + 1
        abbr = current.strftime("%b")
        if start + len(abbr) <= length:
            for i, ch in enumerate(abbr):
                month_line[start + i] = ch
            last_end = start + len(abbr) - 1
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return "".join(month_line)


def render_grass(console: Console, contributions: dict[str, int]) -> None:
    """공통 잔디 그리드: 현재 기준 -1년, GitHub 기여 데이터로 색상 표시."""
    first_sunday, last_sunday, today = _get_grass_range()

    # 1) 월 라벨: 해당 월 1일이 속한 주(열)에 맞춤 (GitHub 로직)
    month_str = _build_month_line(first_sunday, last_sunday)
    console.print(f"[bold white]    {month_str}[/]")

    # 2) 요일별 행 (Sun ~ Sat), 각 셀 = 해당 주·요일의 날짜
    for row, day_name in enumerate(DAY_LABELS):
        cells = []
        for c in range(NUM_WEEKS):
            cell_date = first_sunday + timedelta(weeks=c, days=row)
            level = _level_for_date(cell_date, today, contributions)
            color = COLORS[level]
            cells.append(f"[{color}]■[/]")
        row_content = f"[bold white]{day_name:<3}[/] " + "".join(c + " " for c in cells)
        console.print(row_content)

    # 3) 날짜 있는 한 줄에 기간(왼쪽) + 기여 수 + Less/More(잔디 끝 정렬)
    start_str = first_sunday.strftime("%Y-%m-%d")
    end_str = today.strftime("%Y-%m-%d")
    date_part = f"  {start_str} ~ {end_str}"
    total = sum(contributions.values())
    contrib_text = f"{total} contribution{'s' if total != 1 else ''} in the last year"
    less_more = (
        "Less  "
        + f"[{COLORS[0]}]■[/] "
        + f"[{COLORS[1]}]■[/] "
        + f"[{COLORS[2]}]■[/] "
        + f"[{COLORS[3]}]■[/] "
        + "  More"
    )
    # 한 줄 길이 = GRASS_LINE_WIDTH 되도록 가운데 패딩
    right_part_len = len(contrib_text) + 2 + 20  # "  " + Less~More 20글자
    pad = max(0, GRASS_LINE_WIDTH - len(date_part) - right_part_len)
    console.print(
        f"[dim]{date_part}[/]"
        + " " * pad
        + f"[dim]{contrib_text}[/]  "
        + less_more
        + "\n"
    )


# 테마별 SVG 저장 파일명
THEME_SVG_PATH = {"mac": "mac_style.svg", "window": "window_style.svg", "ubuntu": "ubuntu_style.svg"}


def generate_svg(theme: str, github_id: str) -> str:
    """지정한 테마로 SVG 문자열 생성(툴팁 포함). API·배포용."""
    if theme not in THEMES:
        raise ValueError(f"지원 테마: {list(THEMES.keys())}, 입력: {theme}")

    console = Console(record=True, width=CONSOLE_WIDTH)
    module = THEMES[theme]

    module.print_header(console, github_id)
    contributions = fetch_contributions(github_id)
    first_sunday, last_sunday, today = _get_grass_range()

    render_grass(console, contributions)
    module.print_prompt_only(console, github_id)
    svg = module.export_svg_string(console, github_id)
    return add_grass_tooltips_to_string(svg, first_sunday, contributions)


def run(theme: str, github_id: str) -> None:
    """지정한 테마로 프롬프트 + 잔디 + 하단 프롬프트 + SVG 파일 저장."""
    svg = generate_svg(theme, github_id)
    Path(THEME_SVG_PATH[theme]).write_text(svg, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="GitHub 잔디 ASCII 아트 생성 (mac/window/ubuntu). 서버 없이 로컬에서 바로 실행 가능.",
    )
    parser.add_argument("--user", required=True, help="GitHub 사용자 ID")
    parser.add_argument("--theme", choices=list(THEMES.keys()), default="mac", help="터미널 테마 (기본: mac)")
    args = parser.parse_args()

    run(args.theme, args.user)


if __name__ == "__main__":
    main()
