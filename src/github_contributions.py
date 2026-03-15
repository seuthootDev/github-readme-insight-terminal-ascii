"""
GitHub 사용자 기여 캘린더 데이터 조회.
users/{username}/contributions 페이지 HTML에서 data-date + tool-tip 텍스트 파싱.
"""
import re
import urllib.request


def fetch_contributions(username: str) -> dict[str, int]:
    """
    GitHub 기여 캘린더에서 날짜별 기여 수를 가져옴.
    Returns: {"2025-03-15": 12, "2025-03-14": 0, ...}
    """
    url = f"https://github.com/users/{username}/contributions"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    result = {}
    pattern = re.compile(
        r'data-date="([^"]+)"[^>]*>.*?<tool-tip[^>]*>([^<]+)</tool-tip>',
        re.DOTALL,
    )
    for m in pattern.finditer(html):
        date_str = m.group(1)
        tip = m.group(2).strip()
        if "No contributions" in tip:
            count = 0
        else:
            count_m = re.search(r"^(\d+)\s+contribution", tip)
            count = int(count_m.group(1)) if count_m else 0
        result[date_str] = count
    return result


def level_from_count(count: int) -> int:
    """기여 수 → 잔디 색 레벨 0~3 (GitHub 스타일)."""
    if count <= 0:
        return 0
    if count <= 3:
        return 1
    if count <= 6:
        return 2
    return 3
