"""Generate the StickPad icon (256x256 PNG) with the standard library only."""
import struct, sys, zlib

N, SS = 256, 3  # size and supersampling factor


def rrect(x, y, x0, y0, x1, y1, r):
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r and x0 <= x <= x1 and y0 <= y <= y1


def pixel(x, y):
    if not rrect(x, y, 6, 6, 250, 250, 56):
        return (0, 0, 0, 0)
    col = (37, 99, 235)  # accent blue
    # sticky note with a folded corner (bottom-right)
    if rrect(x, y, 58, 50, 198, 206, 12):
        fold = (x - 198) + (y - 206) > -42
        col = (207, 224, 255) if fold and (x + y) > 0 and (198 - x) + (206 - y) < 42 else (255, 255, 255)
        if fold and (x - 198) + (y - 206) > -42 and not ((198 - x) + (206 - y) < 42 and (x - 198) + (y - 206) <= 0):
            col = (37, 99, 235)  # the cut-away corner shows the background
        for ly in (92, 120, 148):  # text lines
            if ly <= y <= ly + 9 and 80 <= x <= (176 if ly != 148 else 140):
                col = (37, 99, 235)
    # pin
    if (x - 128) ** 2 + (y - 50) ** 2 <= 17 ** 2:
        col = (245, 158, 11)
    return col + (255,)


rows = []
for j in range(N):
    row = bytearray([0])
    for i in range(N):
        acc = [0, 0, 0, 0]
        for sj in range(SS):
            for si in range(SS):
                r, g, b, a = pixel(i + (si + .5) / SS, j + (sj + .5) / SS)
                acc[0] += r * a; acc[1] += g * a; acc[2] += b * a; acc[3] += a
        a = acc[3]
        row += bytes([acc[0] // a, acc[1] // a, acc[2] // a, a // (SS * SS)]) if a else bytes(4)
    rows.append(bytes(row))


def chunk(t, d):
    c = struct.pack(">I", len(d)) + t + d
    return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)


png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))
for out in sys.argv[1:]:
    open(out, "wb").write(png)
print("wrote", len(png), "bytes")
