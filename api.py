"""
GitHub 잔디 SVG API (github-readme-stats 스타일)
GET /svg?user=USER&theme=mac|window|ubuntu → image/svg+xml
"""
from fastapi import FastAPI, Query
from fastapi.responses import Response

from main import THEMES, generate_svg

app = FastAPI(
    title="GitCon SVG API",
    description="GitHub contribution grass as terminal-style SVG",
)


@app.get("/")
@app.get("/svg")
def get_svg(
    user: str = Query(description="GitHub username"),
    theme: str = Query(default="mac", description="Terminal theme: mac, window, ubuntu"),
) -> Response:
    """Return terminal-style contribution grass SVG for README etc."""
    if not user or not user.strip():
        return Response(content="Query parameter 'user' is required.", status_code=400)
    if theme not in THEMES:
        return Response(
            content=f"Unknown theme: {theme}. Use one of: {list(THEMES.keys())}",
            status_code=400,
        )
    try:
        svg = generate_svg(theme, user)
    except Exception as e:
        return Response(
            content=str(e),
            status_code=502,
        )
    return Response(content=svg, media_type="image/svg+xml")
