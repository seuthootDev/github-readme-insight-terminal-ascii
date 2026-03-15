"""Command-line entrypoint for the GitHub grass SVG generator."""
import argparse

from src.generator import THEMES, run


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
