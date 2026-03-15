"""Rich SVG에 터미널 시퀀스 애니메이션(타이핑/순차 출력/커서)을 주입."""
import re


def _selector_for_lines(prefix: str, lines: list[int]) -> str:
    return ",\n".join(f'[clip-path="url(#{prefix}-line-{line})"]' for line in lines)


def add_terminal_animation_to_string(svg: str) -> str:
    """터미널 SVG에 라인별 애니메이션을 추가한 문자열 반환."""
    prefix_match = re.search(r'class="(terminal-\d+)-matrix"', svg)
    if not prefix_match:
        return svg
    prefix = prefix_match.group(1)

    line_nums = [int(n) for n in re.findall(rf'id="{re.escape(prefix)}-line-(\d+)"', svg)]
    line_nums += [
        int(n)
        for n in re.findall(rf'clip-path="url\(#{re.escape(prefix)}-line-(\d+)\)"', svg)
    ]
    if not line_nums:
        return svg

    max_line = max(line_nums)
    grass_lines = [line for line in range(5, max_line)]

    typing_duration = 1.6
    fetch_delay = 1.7
    success_delay = 2.3
    grass_delay = 2.9
    prompt_delay = 3.8

    line2_selector = _selector_for_lines(prefix, [2])
    line3_selector = _selector_for_lines(prefix, [3])
    grass_selector = _selector_for_lines(prefix, grass_lines)
    prompt_selector = _selector_for_lines(prefix, [max_line])

    animation_css = f"""
    {line2_selector} {{
        opacity: 0;
        animation: {prefix}-show-fetch 0.01s linear {fetch_delay}s forwards;
    }}

    {line3_selector} {{
        opacity: 0;
        animation: {prefix}-show-success 0.01s linear {success_delay}s forwards;
    }}

    {grass_selector} {{
        opacity: 0;
        animation: {prefix}-show-grass 0.01s linear {grass_delay}s forwards;
    }}

    {prompt_selector} {{
        opacity: 0;
        animation: {prefix}-show-prompt 0.01s linear {prompt_delay}s forwards;
    }}

    .{prefix}-cursor {{
        opacity: 0;
        fill: #c5c8c6;
        animation:
            {prefix}-show-cursor 0.01s linear {prompt_delay}s forwards,
            {prefix}-blink-cursor 1s steps(1, end) {prompt_delay}s infinite;
    }}

    .{prefix}-input-cursor {{
        fill: #c5c8c6;
    }}

    @keyframes {prefix}-show-fetch {{ to {{ opacity: 1; }} }}
    @keyframes {prefix}-show-success {{ to {{ opacity: 1; }} }}
    @keyframes {prefix}-show-grass {{ to {{ opacity: 1; }} }}
    @keyframes {prefix}-show-prompt {{ to {{ opacity: 1; }} }}
    @keyframes {prefix}-show-cursor {{ to {{ opacity: 1; }} }}
    @keyframes {prefix}-blink-cursor {{
        0%, 49% {{ opacity: 1; }}
        50%, 100% {{ opacity: 0; }}
    }}
    """

    svg = re.sub(r"</style>", animation_css + "\n</style>", svg, count=1)

    line1_text_pattern = re.compile(
        rf'<text([^>]*)\bclip-path="url\(#{re.escape(prefix)}-line-1\)"([^>]*)>(.*?)</text>',
        re.DOTALL,
    )

    command_clip_id = f"{prefix}-command-clip"
    command_height = 24.4
    clip_top_padding = 3.0
    clip_bottom_padding = 5.0

    line1_segments: list[dict] = []
    for m in line1_text_pattern.finditer(svg):
        attrs = f"{m.group(1)} {m.group(2)}"
        content = m.group(3)
        x_m = re.search(r'\bx="([^"]+)"', attrs)
        y_m = re.search(r'\by="([^"]+)"', attrs)
        w_m = re.search(r'\btextLength="([^"]+)"', attrs)
        if not x_m or not y_m or not w_m:
            continue
        x = float(x_m.group(1))
        y = float(y_m.group(1))
        width = float(w_m.group(1))
        line1_segments.append(
            {
                "content": content,
                "x": x,
                "y": y,
                "width": width,
                "end": x + width,
            }
        )

    prompt_end = None
    prompt_markers = ["$", "%", ">", "&gt;"]
    for seg in line1_segments:
        content = seg["content"]
        if any(marker in content for marker in prompt_markers) and seg["width"] <= 80:
            prompt_end = seg["end"] if prompt_end is None else max(prompt_end, seg["end"])

    command_x = None
    command_y = None
    command_end = None
    if prompt_end is not None:
        for seg in line1_segments:
            content = str(seg["content"]).strip()
            if not content:
                continue
            if seg["x"] > 1400 and seg["width"] <= 20:
                continue
            if seg["x"] + 0.1 < prompt_end:
                continue
            command_x = seg["x"] if command_x is None else min(command_x, seg["x"])
            command_y = seg["y"] if command_y is None else command_y
            command_end = seg["end"] if command_end is None else max(command_end, seg["end"])

    if command_x is not None and command_y is not None and command_end is not None and command_end > command_x:
        command_width = command_end - command_x
        clip_y = command_y - command_height - clip_top_padding
        clip_height = command_height + clip_top_padding + clip_bottom_padding
        command_clip = (
            f'<clipPath id="{command_clip_id}">'
            f'<rect x="{command_x:.1f}" y="{clip_y:.1f}" width="0" height="{clip_height:.1f}">'
            f'<animate attributeName="width" from="0" to="{command_width:.1f}" '
            f'dur="{typing_duration}s" begin="0s" fill="freeze" />'
            f'</rect>'
            f'</clipPath>'
        )
        svg = re.sub(r"</defs>", command_clip + "\n</defs>", svg, count=1)

        input_cursor = (
            f'<text class="{prefix}-input-cursor" x="{command_x:.1f}" y="{command_y:.1f}">█'
            f'<animate attributeName="x" from="{command_x:.1f}" to="{command_end + 3.0:.1f}" '
            f'dur="{typing_duration}s" begin="0s" fill="freeze" />'
            f'<animate attributeName="opacity" from="1" to="0" '
            f'dur="0.01s" begin="{typing_duration}s" fill="freeze" />'
            f'</text>'
        )
        svg = re.sub(
            rf'(<g class="{re.escape(prefix)}-matrix">)',
            rf'\1{input_cursor}',
            svg,
            count=1,
        )

        def _command_text_repl(m: re.Match) -> str:
            attrs = f"{m.group(1)} {m.group(2)}"
            content = m.group(3)
            x_m = re.search(r'\bx="([^"]+)"', attrs)
            w_m = re.search(r'\btextLength="([^"]+)"', attrs)
            if not x_m or not w_m:
                return m.group(0)
            x = float(x_m.group(1))
            width = float(w_m.group(1))
            end = x + width
            if str(content).strip() == "":
                return m.group(0)
            if x > 1400 and width <= 20:
                return m.group(0)
            if x + 0.1 < command_x or end - 0.1 > command_end:
                return m.group(0)

            attrs = attrs.strip()
            if 'class="' in attrs:
                attrs = re.sub(r'class="([^"]+)"', rf'class="\1 {prefix}-typing-command"', attrs, count=1)
            else:
                attrs += f' class="{prefix}-typing-command"'
            attrs += f' clip-path="url(#{command_clip_id})"'
            return f"<text {attrs}>{content}</text>"

        svg = line1_text_pattern.sub(_command_text_repl, svg)

    prompt_text_pattern = re.compile(
        rf'<text([^>]*)\bclip-path="url\(#{re.escape(prefix)}-line-{max_line}\)"([^>]*)>(.*?)</text>',
        re.DOTALL,
    )

    prompt_y = None
    max_x_end = None
    for m in prompt_text_pattern.finditer(svg):
        attrs = f"{m.group(1)} {m.group(2)}"
        content = m.group(3)
        x_match = re.search(r'\bx="([^"]+)"', attrs)
        y_match = re.search(r'\by="([^"]+)"', attrs)
        len_match = re.search(r'\btextLength="([^"]+)"', attrs)
        if not x_match or not y_match:
            continue
        x = float(x_match.group(1))
        y = float(y_match.group(1))
        text_len = float(len_match.group(1)) if len_match else 0.0

        if str(content).strip() == "":
            continue
        if x > 1400 and text_len <= 20:
            continue

        end_x = x + text_len
        prompt_y = y if prompt_y is None else prompt_y
        max_x_end = end_x if max_x_end is None else max(max_x_end, end_x)

    if prompt_y is not None and max_x_end is not None:
        cursor_x = max_x_end + 4.0
        cursor_text = f'<text class="{prefix}-cursor" x="{cursor_x:.1f}" y="{prompt_y:.1f}">█</text>'
        svg = re.sub(
            rf'(<g class="{re.escape(prefix)}-matrix">)',
            rf'\1{cursor_text}',
            svg,
            count=1,
        )

    return svg
