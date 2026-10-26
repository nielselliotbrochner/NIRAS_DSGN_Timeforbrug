"""Bygger index.html ud fra src/template.html, src/core.js og SheetJS (xlsx.mini.min.js).

Kør fra projektets rod:
  npm install xlsx@0.18.5 --no-save
  python3 src/build.py
"""
from pathlib import Path

rod = Path(__file__).resolve().parent.parent
skabelon = (rod / "src/template.html").read_text(encoding="utf-8")
core = (rod / "src/core.js").read_text(encoding="utf-8").replace(
    "if (typeof module !== 'undefined') module.exports = NR;\n", "")
xlsx = (rod / "node_modules/xlsx/dist/xlsx.mini.min.js").read_text(encoding="utf-8")
ud = skabelon.replace("/*__XLSX__*/", xlsx).replace("/*__CORE__*/", core)
(rod / "index.html").write_text(ud, encoding="utf-8")
print(f"index.html: {len(ud.encode()):,} bytes")
