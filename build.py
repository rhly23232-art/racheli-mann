#!/usr/bin/env python3
"""Assemble the site from src/.

  python3 build.py            -> index.html + preview.html   (claude.ai artifact version)
  python3 build.py public     -> public/                      (public website, Supabase backend)

The public build reads site.config.json:
  {"siteUrl": "...", "supabaseUrl": "...", "supabaseAnonKey": "..."}
"""
import json
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"

PATTERN_SVG = (
    "<svg xmlns='http://www.w3.org/2000/svg' width='190' height='190' fill='none' stroke='#C7B9AC' "
    "stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'>"
    "<g transform='translate(20 22) rotate(-8 18 18)'><rect width='36' height='36' rx='7'/>"
    "<path d='M9 14h4l1.6-2.4h6.8L23 14h4v12H9z'/><circle cx='18' cy='20' r='3.6'/></g>"
    "<g transform='translate(122 34) rotate(7 18 18)'><rect width='36' height='36' rx='7'/>"
    "<circle cx='13' cy='15' r='1' fill='#C7B9AC'/><circle cx='23' cy='15' r='1' fill='#C7B9AC'/>"
    "<path d='M11.5 21.5c3.5 4 9.5 4 13 0'/></g>"
    "<g transform='translate(36 118) rotate(5 18 18)'><rect width='36' height='36' rx='7'/>"
    "<rect x='9' y='12' width='4.5' height='14' rx='1.2'/><rect x='15.8' y='10' width='4.5' height='16' rx='1.2'/>"
    "<rect x='22.6' y='12' width='4.5' height='14' rx='1.2'/></g>"
    "<g transform='translate(128 124) rotate(-6 18 18)'><rect width='36' height='36' rx='7'/>"
    "<circle cx='18' cy='18' r='5'/><path d='M18 7.5v2.5M18 26v2.5M7.5 18h2.5M26 18h2.5'/></g>"
    "</svg>"
)
PATTERN = "data:image/svg+xml," + urllib.parse.quote(PATTERN_SVG, safe="/:=' ")

FAVICON = (
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
    "<rect width='64' height='64' rx='12' fill='#FAF8F6'/>"
    "<path d='M26.5 9.5 24.6 12H21a2.5 2.5 0 0 0-2.5 2.5v5A2.5 2.5 0 0 0 21 22h22a2.5 2.5 0 0 0 2.5-2.5v-5A2.5 2.5 0 0 0 43 12h-3.6l-1.9-2.5z' fill='#3B332F'/>"
    "<circle cx='32' cy='16.5' r='3.3' fill='#FAF8F6'/>"
    "<rect x='14' y='28' width='10' height='24' rx='2.5' fill='#8E7874'/>"
    "<rect x='27' y='25' width='10' height='27' rx='2.5' fill='#83756C'/>"
    "<rect x='40' y='28' width='10' height='24' rx='2.5' fill='#B6A697'/>"
    "</svg>"
)

LIBS = [
    "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
    "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js",
]
SUPABASE_LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"


def read_all(folder, ext):
    return "\n".join(p.read_text(encoding="utf-8") for p in sorted((SRC / folder).glob("*" + ext)))


def scripts(backend):
    files = sorted((SRC / "js").glob("*.js"))
    parts = []
    for p in files:
        parts.append(p.read_text(encoding="utf-8"))
        if p.name.startswith("01-"):
            parts.append((SRC / "backend" / (backend + ".js")).read_text(encoding="utf-8"))
    return "\n".join(parts)


def body(backend, extra_libs=()):
    css = read_all("css", ".css").replace("__PATTERN__", PATTERN)
    html = read_all("html", ".html")
    libs = "\n".join('<script src="%s"></script>' % u for u in list(LIBS) + list(extra_libs))
    js = scripts(backend)
    return css, html + "\n" + libs + "\n<script>\n(function () {\n'use strict';\n" + js + "\n})();\n</script>\n"


def build_artifact():
    head = (SRC / "head.html").read_text(encoding="utf-8")
    css, rest = body("claude")
    page = head.strip() + "\n<style>\n" + css + "\n</style>\n" + rest
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    (ROOT / "preview.html").write_text(
        "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" "
        "content=\"width=device-width,initial-scale=1,viewport-fit=cover\"></head><body>" + page + "</body></html>",
        encoding="utf-8")
    print("artifact index.html", len(page.encode("utf-8")) // 1024, "KB")


def build_public():
    cfg = json.loads((ROOT / "site.config.json").read_text(encoding="utf-8"))
    site = cfg.get("siteUrl", "").rstrip("/") + "/"
    out = ROOT / "public"
    out.mkdir(exist_ok=True)
    head = (SRC / "head-public.html").read_text(encoding="utf-8").replace("__SITE_URL__", site)
    css, rest = body("supabase", [SUPABASE_LIB])
    rest = rest.replace("'__SB_URL__'", json.dumps(cfg.get("supabaseUrl") or "__SB_URL__")) \
               .replace("'__SB_KEY__'", json.dumps(cfg.get("supabaseAnonKey") or "__SB_KEY__"))
    page = head.strip() + "\n<style>\n" + css + "\n</style>\n</head>\n<body>\n" + rest + "</body>\n</html>\n"
    (out / "index.html").write_text(page, encoding="utf-8")
    (out / "favicon.svg").write_text(FAVICON, encoding="utf-8")
    (out / ".nojekyll").write_text("", encoding="utf-8")
    (out / "robots.txt").write_text("User-agent: *\nAllow: /\nSitemap: " + site + "sitemap.xml\n", encoding="utf-8")
    (out / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        "<url><loc>" + site + "</loc></url></urlset>\n", encoding="utf-8")
    make_images(out)
    print("public/index.html", len(page.encode("utf-8")) // 1024, "KB ->", site)


def make_images(out):
    """Brand images for sharing previews and home-screen icons (logo shapes only)."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return
    cream, ink = (250, 248, 246), (59, 51, 47)
    bars = [(142, 120, 116), (131, 117, 108), (182, 166, 151)]

    def mark(d, cx, base, unit):
        w, gap = unit, unit * 0.32
        heights = [unit * 2.4, unit * 2.75, unit * 2.4]
        x = cx - (3 * w + 2 * gap) / 2
        for i, c in enumerate(bars):
            d.rounded_rectangle([x, base - heights[i], x + w, base], radius=unit * 0.25, fill=c)
            x += w + gap
        top = base - heights[1] - unit * 0.35
        d.rounded_rectangle([cx - unit * 0.9, top - unit * 0.9, cx + unit * 0.9, top], radius=unit * 0.18, fill=ink)
        d.rectangle([cx - unit * 0.35, top - unit * 1.08, cx + unit * 0.35, top - unit * 0.85], fill=ink)
        d.ellipse([cx - unit * 0.32, top - unit * 0.77, cx + unit * 0.32, top - unit * 0.13], fill=cream)

    og = Image.new("RGB", (1200, 630), cream)
    d = ImageDraw.Draw(og)
    d.ellipse([760, -160, 1340, 420], fill=(236, 228, 220))
    mark(d, 600, 430, 70)
    for x in range(420, 780, 26):
        d.rectangle([x, 470, x + 14, 473], fill=(199, 185, 172))
    og.save(out / "og.png", optimize=True)

    ic = Image.new("RGB", (180, 180), cream)
    mark(ImageDraw.Draw(ic), 90, 150, 26)
    ic.save(out / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "public":
        build_public()
    else:
        build_artifact()
