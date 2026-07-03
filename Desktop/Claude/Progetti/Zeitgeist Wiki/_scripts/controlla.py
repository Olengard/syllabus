"""
controlla.py — Lint del vault Master: rete di sicurezza anti-spoiler e coerenza.
================================================================================
Verifica le convenzioni da cui dipende `export_players.py`. Il rischio tipico:
un segreto spostato per sbaglio fuori dal callout durante una rifinitura a mano
finirebbe dritto nel vault dei giocatori — questo script lo intercetta.

Controlli:
  ERRORI (potenziale leak o pagina rotta):
    E1  frontmatter assente o senza `player_safe: true|false`
    E2  heading "segreto" (## Verità nascoste (DM), ...) NON seguito da un
        callout [!segreto-dm], in una pagina player_safe: true
    E3  pipe non escapato dentro un [[link]] in una riga di tabella
        (spezza la tabella in Obsidian e il parsing dei link negli script)
  AVVISI (da sapere, non bloccanti):
    W1  come E2 ma in pagina player_safe: false (leak solo se diventa true)
    W2  embed ![[...]] verso un allegato che non esiste in Master/_allegati/
    W3  campo-frontmatter segreto con valore multilinea (l'export lo gestisce,
        ma è fragile: meglio valori su una riga)

Uso:
    python controlla.py            # exit code 1 se ci sono ERRORI
    python controlla.py --verbose  # elenca anche le pagine pulite
"""
import re, sys
from pathlib import Path

VAULT = Path(__file__).resolve().parent.parent / "Master"
VERBOSE = "--verbose" in sys.argv

SKIP_DIRS = {"_template", "_stub", "_scripts", "_fonti", ".obsidian", "_allegati"}
# Tenere allineati a export_players.py
SECRET_FM_KEYS = {"obiettivo_reale", "verita", "segreti", "livello_spoiler", "player_safe"}
SECRET_HEADINGS = {"## verità nascoste (dm)", "## verità nascoste",
                   "## cosa è vero (dm)", "## verità (dm)"}
ATTACH_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp",
               ".pdf", ".mp3", ".m4a", ".wav", ".ogg", ".mp4", ".webm"}

LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
# pipe interno a [[...]] non preceduto da backslash
UNESCAPED_PIPE_RE = re.compile(r"\[\[[^\]\|]*(?<!\\)\|[^\]]*\]\]")


def split_frontmatter(text):
    if text.startswith("---"):
        m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.DOTALL)
        if m:
            return m.group(1), m.group(2)
    return None, text


def check_file(path, allegati_index):
    """Ritorna (errori, avvisi): liste di stringhe già formattate."""
    errs, warns = [], []
    text = path.read_text(encoding="utf-8", errors="replace")
    fm, body = split_frontmatter(text)

    # E1 — player_safe presente e valido
    safe = None
    if fm is None:
        errs.append("E1  frontmatter assente")
    else:
        m = re.search(r"^player_safe\s*:\s*(.+)$", fm, re.MULTILINE)
        if not m or m.group(1).strip().lower() not in ("true", "false"):
            errs.append("E1  manca `player_safe: true|false` nel frontmatter")
        else:
            safe = m.group(1).strip().lower() == "true"

    # W3 — campi segreti con valore multilinea
    if fm is not None:
        for key in SECRET_FM_KEYS - {"player_safe", "livello_spoiler"}:
            m = re.search(rf"^{key}\s*:\s*(.*)$", fm, re.MULTILINE)
            if m and m.group(1).strip() in ("", "|", ">", "|-", ">-"):
                warns.append(f"W3  `{key}:` ha valore multilinea nel frontmatter")

    # E2/W1 — heading segreto senza callout subito sotto
    lines = body.splitlines()
    for i, line in enumerate(lines):
        if line.strip().lower() in SECRET_HEADINGS:
            j = i + 1
            while j < len(lines) and lines[j].strip() == "":
                j += 1
            covered = j < len(lines) and re.match(r"^>\s*\[!segreto-dm\]",
                                                  lines[j], re.IGNORECASE)
            if not covered:
                msg = f'heading segreto "{line.strip()}" (riga {i+1}) senza callout [!segreto-dm] sotto'
                if safe:
                    errs.append("E2  " + msg + " — FINIREBBE NEL VAULT GIOCATORI")
                else:
                    warns.append("W1  " + msg)

    # E3 — pipe non escapato in [[link]] dentro riga di tabella
    for i, line in enumerate(body.splitlines()):
        if line.lstrip().startswith("|") and UNESCAPED_PIPE_RE.search(line):
            errs.append(f"E3  pipe non escapato in un [[link]] in tabella (riga {i+1}): usa [[Pagina\\|alias]]")

    # W2 — embed verso allegato inesistente
    for raw in LINK_RE.findall(body):
        target = raw.replace("\\|", "|").split("|")[0].split("#")[0].rstrip("\\").strip()
        p = Path(target)
        if p.suffix.lower() in ATTACH_EXTS and p.name not in allegati_index:
            warns.append(f"W2  allegato referenziato ma non trovato in _allegati/: {target}")

    return errs, warns


def main():
    md_files = sorted(p for p in VAULT.rglob("*.md")
                      if not (SKIP_DIRS & set(p.relative_to(VAULT).parts)))
    allegati_dir = VAULT / "_allegati"
    allegati_index = {f.name for f in allegati_dir.rglob("*") if f.is_file()} \
        if allegati_dir.exists() else set()

    tot_err = tot_warn = 0
    for p in md_files:
        errs, warns = check_file(p, allegati_index)
        rel = p.relative_to(VAULT)
        if errs or warns:
            print(f"\n{rel}")
            for e in errs:
                print(f"  ERRORE  {e}")
            for w in warns:
                print(f"  avviso  {w}")
        elif VERBOSE:
            print(f"ok  {rel}")
        tot_err += len(errs)
        tot_warn += len(warns)

    print(f"\n{len(md_files)} pagine controllate: {tot_err} errori, {tot_warn} avvisi.")
    if tot_err:
        sys.exit(1)


if __name__ == "__main__":
    main()
