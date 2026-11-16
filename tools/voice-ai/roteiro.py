"""Lê docs/audio/ROTEIRO_RASCUNHO.md e devolve as falas a gerar.

Cada fala: (falante, arquivo, texto, tom). Os nomes seguem o roteiro:
comandante/<id>-<n>, soldado/<id>-ack-<n>, soldado/<id>-<n>,
xingamento/<facção>/<nº>-<n>, inimigo/<id>-<n>.
Ficam de fora os xingamentos cuja fonte diz "falta a página" ou
"a confirmar" e os gritos sem palavras (4b).
"""
import re
from pathlib import Path
from typing import NamedTuple


class Line(NamedTuple):
    speaker: str
    name: str
    text: str
    tone: str


def _rows(block: str) -> list[list[str]]:
    rows = []
    for raw in block.splitlines():
        if not raw.startswith("|") or raw.startswith("|---"):
            continue
        cells = [c.strip() for c in raw.strip().strip("|").split("|")]
        if cells and cells[0] in ("id", "nº"):
            continue
        rows.append(cells)
    return rows


def _texts(cell: str) -> list[str]:
    cell = re.sub(r"\([^)]*\)", "", cell)  # "(sussurrado)" é direção, não fala
    return [t.strip().strip('"').strip() for t in cell.split("·") if t.strip().strip('"').strip()]


def _sections(md: str) -> dict[str, str]:
    parts = re.split(r"^(##+ \d[a-z]?\.)", md, flags=re.M)
    return {parts[i].split()[1].rstrip("."): parts[i + 1] for i in range(1, len(parts) - 1, 2)}


FACTIONS = {"3a": "column", "3b": "legalist", "3c": "cangaceiro"}
NOT_YET = ("falta a página", "a confirmar")


def load(path: Path) -> tuple[list[Line], list[str]]:
    sec = _sections(path.read_text(encoding="utf-8"))
    lines: list[Line] = []
    skipped: list[str] = []

    for key in ("1", "1b"):
        for _id, _order, tone, cmd, ack in _rows(sec.get(key, "")):
            for n, t in enumerate(_texts(cmd), 1):
                lines.append(Line("comandante", f"{_id}-{n}", t, tone))
            ack_tone = "sussurrado" if "sussurrad" in ack else tone
            for n, t in enumerate(_texts(ack), 1):
                lines.append(Line("soldado", f"{_id}-ack-{n}", t, ack_tone))

    for _id, _what, tone, texts in _rows(sec["2"]):
        for n, t in enumerate(_texts(texts), 1):
            lines.append(Line("soldado", f"{_id}-{n}", t, tone))

    for key, faction in FACTIONS.items():
        for num, tone, texts, source in _rows(sec[key]):
            for n, t in enumerate(_texts(texts), 1):
                line = Line(f"xingamento/{faction}", f"{num}-{n}", t, tone)
                if any(k in source for k in NOT_YET):
                    skipped.append(f"{line.speaker}/{line.name} \"{t}\"")
                else:
                    lines.append(line)

    for _id, _sit, tone, texts in _rows(sec["4a"]):
        for n, t in enumerate(_texts(texts), 1):
            lines.append(Line("inimigo", f"{_id}-{n}", t, tone))

    skipped.append("inimigo/shout-1..5 (gritos sem palavras)")
    return lines, skipped


if __name__ == "__main__":
    import sys

    ls, sk = load(Path(sys.argv[1]))
    for l in ls:
        print(f"{l.speaker}/{l.name}\t{l.tone}\t{l.text}")
    print(f"\n{len(ls)} falas; fora: {len(sk)}")
    for s in sk:
        print("  -", s)
