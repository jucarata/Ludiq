"""Clean Ludiq logo: transparent bg, preserve white sticker border, smooth edges."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path(
    r"C:\Users\ASUS\.cursor\projects\c-Users-ASUS-Desktop-TODO-Code-projects-Ludiq\assets\c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_869c99ddf611b7368ab5cd2772bdbaff_images_image-60188fa9-628c-4482-9379-21954898a79f.png"
)
OUT = Path(
    r"C:\Users\ASUS\Desktop\TODO\Code projects\Ludiq\public\images\ludiq-logo-color.png"
)


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    # Flat canvas color from corners
    samples = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    br = sum(c[0] for c in samples) / 4
    bg = sum(c[1] for c in samples) / 4
    bb = sum(c[2] for c in samples) / 4
    print(f"canvas={br:.0f},{bg:.0f},{bb:.0f} size={w}x{h}")

    def near_canvas(c: tuple[int, int, int, int], tol: float) -> bool:
        r, g, b, a = c
        if a == 0:
            return False
        if abs(r - g) > 10 or abs(g - b) > 10 or abs(r - b) > 10:
            return False
        # Pure white is sticker — never treat as canvas
        if min(r, g, b) >= 250:
            return False
        return (
            abs(r - br) <= tol and abs(g - bg) <= tol and abs(b - bb) <= tol
        )

    # 1) Flood-fill flat canvas from edges
    visited = [[False] * h for _ in range(w)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if not visited[x][y] and near_canvas(px[x, y], 14):
            visited[x][y] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    removed = 0
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        removed += 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                if near_canvas(px[nx, ny], 14):
                    visited[nx][ny] = True
                    q.append((nx, ny))

    # 2) Remove soft drop-shadow fringe connected to transparency
    # Shadow is slightly darker neutral gray near the sticker.
    changed = True
    passes = 0
    while changed and passes < 6:
        changed = False
        passes += 1
        to_clear: list[tuple[int, int]] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if min(r, g, b) >= 248:
                    continue  # keep sticker white
                if abs(r - g) > 12 or abs(g - b) > 12:
                    continue
                # Darker-than-canvas neutrals (shadow / anti-alias)
                if not (200 <= r <= 250 and 200 <= g <= 250 and 200 <= b <= 250):
                    continue
                touches_clear = False
                for nx, ny in (
                    (x - 1, y),
                    (x + 1, y),
                    (x, y - 1),
                    (x, y + 1),
                    (x - 1, y - 1),
                    (x + 1, y - 1),
                    (x - 1, y + 1),
                    (x + 1, y + 1),
                ):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        touches_clear = True
                        break
                if touches_clear:
                    to_clear.append((x, y))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
            removed += 1
            changed = True

    # 3) Extract alpha, smooth only the edge, recombine
    alpha = img.getchannel("A")
    # Mild blur then restore solid interiors
    blurred = alpha.filter(ImageFilter.GaussianBlur(radius=0.8))
    a_src = alpha.load()
    a_blur = blurred.load()
    for y in range(h):
        for x in range(w):
            orig = a_src[x, y]
            if orig == 0:
                continue
            # Only soften transitional edge pixels
            blur_v = a_blur[x, y]
            if orig == 255 and blur_v > 200:
                continue  # solid interior
            # Keep white sticker fully opaque
            r, g, b, _ = px[x, y]
            if min(r, g, b) >= 248 and orig > 200:
                a_src[x, y] = 255
                continue
            a_src[x, y] = blur_v

    img.putalpha(alpha)

    # 4) Crop to content
    bbox = img.getbbox()
    if not bbox:
        raise RuntimeError("empty image after processing")
    pad = 10
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(w, bbox[2] + pad)
    bottom = min(h, bbox[3] + pad)
    cropped = img.crop((left, top, right, bottom))
    cropped.save(OUT, "PNG", optimize=True)

    cw, ch = cropped.size
    cpx = cropped.load()
    corners = [
        cpx[0, 0][3],
        cpx[cw - 1, 0][3],
        cpx[0, ch - 1][3],
        cpx[cw - 1, ch - 1][3],
    ]
    # Sample a white sticker pixel near center-top of content
    mid_x = cw // 2
    white_ok = False
    for y in range(ch):
        r, g, b, a = cpx[mid_x, y]
        if a > 200 and min(r, g, b) >= 248:
            white_ok = True
            break

    print(f"removed={removed} crop={cw}x{ch}")
    print(f"corner_alphas={corners}")
    print(f"white_sticker_preserved={white_ok}")
    print(f"saved={OUT}")


if __name__ == "__main__":
    main()
