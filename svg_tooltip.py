"""
SVG 잔디 그리드에 날짜 툴팁 추가.
Rich가 내보낸 SVG의 각 ■ 셀에 <title>을 넣어 브라우저에서 호버 시 날짜가 보이게 함.
"""
import re
from datetime import timedelta
from pathlib import Path


# Rich 터미널 SVG 레이아웃 (mac_style 등과 동일한 스케일)
# 잔디 첫 행(Sun)의 y = 166.4, 행 간격 = 24.4 (line-height)
FIRST_GRASS_Y = 166.4
CELL_WIDTH = 24.4
LABEL_X_OFFSET = 48.8
ROW_STEP = 24.4  # 한 요일 행당 높이 (Rich line-height)
COLS_FIRST_LINE = 38  # 줄바꿈 시 둘째 줄 col 오프셋


def _xy_to_col_row(x: float, y: float) -> tuple[int, int] | None:
    """SVG 내 (x, y) → 잔디 그리드 (col, row). 범위 밖이면 None."""
    y_offset = y - FIRST_GRASS_Y
    if y_offset < 0:
        return None
    row = int(y_offset / ROW_STEP)
    if row < 0 or row > 6:
        return None
    remainder = y_offset % ROW_STEP
    # 한 행이 한 줄이면 remainder < 절반일 때만 첫 줄(좌측 38칸) 영역
    in_first_line = remainder < (ROW_STEP / 2 - 0.01)
    if in_first_line and x >= LABEL_X_OFFSET:
        col = int(round((x - LABEL_X_OFFSET) / CELL_WIDTH))
    else:
        col = COLS_FIRST_LINE + int(round(x / CELL_WIDTH))
    if col < 0 or col >= 52:
        return None
    return col, row


def add_grass_tooltips(
    svg_path: str | Path,
    first_sunday,
    contributions: dict[str, int] | None = None,
) -> None:
    """
    SVG 파일을 읽어, 잔디 셀(■)마다 날짜(및 기여 수) <title>을 넣고 다시 저장.
    contributions가 있으면 툴팁에 "N contributions" 표시.
    """
    path = Path(svg_path)
    svg = path.read_text(encoding="utf-8")
    contributions = contributions or {}

    # ■ 하나씩이 <text ...>■</text> 형태. x/y 추출 후 날짜 계산해 <title> 삽입
    block = "■"

    # 셀 하나 높이(한 줄). Rich는 line-height 24.4
    CELL_HEIGHT = 24.4

    def repl(m: re.Match) -> str:
        attrs = m.group(1)
        x_m = re.search(r'\bx="([^"]+)"', attrs)
        y_m = re.search(r'\by="([^"]+)"', attrs)
        if not x_m or not y_m:
            return m.group(0)
        x = float(x_m.group(1))
        y = float(y_m.group(1))
        cr = _xy_to_col_row(x, y)
        if cr is None:
            return m.group(0)
        col, row = cr
        cell_date = first_sunday + timedelta(weeks=col, days=row)
        day_name = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][row]
        count = contributions.get(cell_date.isoformat(), 0)
        if count:
            title = f"{cell_date.isoformat()} ({day_name}) — {count} contribution{'s' if count != 1 else ''}"
        else:
            title = f"{cell_date.isoformat()} ({day_name}) — No contributions"
        # 셀 전체(■+공백)를 덮는 투명 rect → 호버 영역이 넓어져 툴팁이 잘 나옴 (y는 텍스트 기준선)
        rect_y = y - CELL_HEIGHT + 2
        rect = f'<rect x="{x:.1f}" y="{rect_y:.1f}" width="{CELL_WIDTH:.1f}" height="{CELL_HEIGHT:.1f}" fill="transparent"/>'
        return f'<g><title>{title}</title>{rect}<text{attrs}>{block}</text></g>'

    # 이미 <title>이 들어간 SVG도 처리 (재실행 시), 최종은 항상 <g>+rect+text
    pattern = re.compile(
        r'<text([^>]*)\s*>(?:<title>[^<]*</title>)?' + re.escape(block) + r'</text>',
        re.DOTALL,
    )
    new_svg = pattern.sub(repl, svg)
    path.write_text(new_svg, encoding="utf-8")


def add_grass_tooltips_to_string(
    svg: str,
    first_sunday,
    contributions: dict[str, int] | None = None,
) -> str:
    """
    SVG 문자열에 잔디 셀마다 날짜(및 기여 수) <title>을 넣어 반환.
    API 등에서 파일 없이 SVG 문자열을 다룰 때 사용.
    """
    contributions = contributions or {}
    block = "■"
    CELL_HEIGHT = 24.4

    def repl(m: re.Match) -> str:
        attrs = m.group(1)
        x_m = re.search(r'\bx="([^"]+)"', attrs)
        y_m = re.search(r'\by="([^"]+)"', attrs)
        if not x_m or not y_m:
            return m.group(0)
        x = float(x_m.group(1))
        y = float(y_m.group(1))
        cr = _xy_to_col_row(x, y)
        if cr is None:
            return m.group(0)
        col, row = cr
        cell_date = first_sunday + timedelta(weeks=col, days=row)
        day_name = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][row]
        count = contributions.get(cell_date.isoformat(), 0)
        if count:
            title = f"{cell_date.isoformat()} ({day_name}) — {count} contribution{'s' if count != 1 else ''}"
        else:
            title = f"{cell_date.isoformat()} ({day_name}) — No contributions"
        rect_y = y - CELL_HEIGHT + 2
        rect = f'<rect x="{x:.1f}" y="{rect_y:.1f}" width="{CELL_WIDTH:.1f}" height="{CELL_HEIGHT:.1f}" fill="transparent"/>'
        return f'<g><title>{title}</title>{rect}<text{attrs}>{block}</text></g>'

    pattern = re.compile(
        r'<text([^>]*)\s*>(?:<title>[^<]*</title>)?' + re.escape(block) + r'</text>',
        re.DOTALL,
    )
    return pattern.sub(repl, svg)
