#!/usr/bin/env python3
"""Rebuild a project folder from a *_serialized.txt export (MANIFEST + FILE blocks)."""
import json, re, sys, base64
from pathlib import Path

src = Path(sys.argv[1]).read_text(encoding="utf-8")
out = Path(sys.argv[2] if len(sys.argv) > 2 else ".")

m = re.search(r"<<< MANIFEST_START >>>\n(.*?)\n<<< MANIFEST_END >>>", src, re.S)
manifest = json.loads(m.group(1))
enc = {e["path"]: e.get("encoding", "text") for e in manifest["structure"]}
body = src[m.end():]

sep = "=" * 80 + "\nFILE: "
blocks = body.split(sep)[1:]
written = 0
for b in blocks:
    header, _, content = b.partition("\n------\n")
    path = header.strip()
    content = re.sub(r"\n+=+\s*$", "", content)       # trailing separator
    content = content.rstrip("\n") + "\n"
    rel = Path(path)
    parts = rel.parts[1:] if len(rel.parts) > 1 else rel.parts  # drop zip's top folder
    dest = out.joinpath(*parts)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if enc.get(path) == "base64":
        dest.write_bytes(base64.b64decode(content))
    else:
        dest.write_text(content, encoding="utf-8")
    written += 1

print(f"manifest count={manifest['count']} written={written}")
