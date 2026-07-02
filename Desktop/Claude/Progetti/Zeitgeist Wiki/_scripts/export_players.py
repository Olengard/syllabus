"""
export_players.py — Genera il vault per i GIOCATORI dal vault Master.
=====================================================================
Regole di sicurezza spoiler:
  1. Copia SOLO le pagine con `player_safe: true` nel frontmatter.
  2. Rimuove i blocchi callout  > [!segreto-dm] ... (e l'eventuale heading dedicato).
  3. Rimuove dal frontmatter i campi segreti (obiettivo_reale, verita, livello_spoiler...).
  4. "Slinka" i [[collegamenti]] verso pagine NON esportate: diventano testo semplice,
     così non resta traccia (né link rotti) di pagine segrete.
  5. Copia il tema Obsidian e gli allegati referenziati.

Uso:
    python export_players.py
    python export_players.py --dry-run

Output: ../Players/  (rigenerato da zero a ogni esecuzione)
"""
import re, sys, shutil
from pathlib import Path

ROOT    = Path(__file__).resolve().parent.parent
MASTER  = ROOT / "Master"
PLAYERS = ROOT / "Players"
DRY     = "--dry-run" in sys.argv

SKIP_DIRS = {"_template", "_stub", "_scripts", "_fonti", ".obsidian", "_allegati"}
SECRET_FM_KEYS = {"obiettivo_reale", "verita", "segreti", "livello_spoiler", "player_safe"}
SECRET_HEADINGS = {"## verità nascoste (dm)", "## verità nascoste",
                   "## cosa è vero (dm)", "## verità (dm)"}
LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
# Estensioni trattate come allegati (mappe/immagini/media), non come pagine.
ATTACH_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp",
               ".pdf", ".mp3", ".m4a", ".wav", ".ogg", ".mp4", ".webm"}


def split_frontmatter(text):
    if text.startswith("---"):
        m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.DOTALL)
        if m:
            return m.group(1), m.group(2)
    return None, text


def frontmatter_value(fm, key):
    if fm is None:
        return None
    m = re.search(rf"^{re.escape(key)}\s*:\s*(.+)$", fm, re.MULTILINE)
    return m.group(1).strip() if m else None


def is_player_safe(text):
    fm, _ = split_frontmatter(text)
    val = frontmatter_value(fm, "player_safe")
    return (val or "").lower() == "true"


def filter_frontmatter(fm):
    out = []
    for line in fm.splitlines():
        key = line.split(":", 1)[0].strip().lower() if ":" in line else ""
        if key in SECRET_FM_KEYS:
            continue
        out.append(line)
    return "\n".join(out)


def strip_secret_callouts(body):
    lines = body.splitlines()
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        if re.match(r"^>\s*\[!segreto-dm\]", line, re.IGNORECASE):
            # salta l'intero blocco citazione
            i += 1
            while i < len(lines) and lines[i].lstrip().startswith(">"):
                i += 1
            # rimuovi una eventuale riga vuota lasciata dal blocco
            if i < len(lines) and lines[i].strip() == "":
                i += 1
            # rimuovi l'heading dedicato appena sopra, se c'era
            if out and out[-1].strip().lower() in SECRET_HEADINGS:
                out.pop()
                while out and out[-1].strip() == "":
                    out.pop()
            continue
        out.append(line)
        i += 1
    return "\n".join(out)


def resolve_links(text, exported_stems, collected_attachments):
    """Risolve i [[link]] e raccoglie gli allegati referenziati.

    Gira sul body GIÀ ripulito dai callout [!segreto-dm]: quindi ogni embed
    `![[mappa.png]]` ancora presente è, per costruzione, player-safe."""
    def repl(m):
        raw = m.group(1).replace("\\|", "|")          # pipe escapato nelle tabelle
        parts = raw.split("|")
        target = parts[0].split("#")[0].rstrip("\\").strip()
        if Path(target).suffix.lower() in ATTACH_EXTS:
            collected_attachments.add(target)         # allegato: da copiare
            return m.group(0)                          # embed lasciato intatto
        alias = parts[1].strip() if len(parts) > 1 else target
        if target in exported_stems:
            return m.group(0)          # link valido: lascialo invariato
        return alias                    # pagina segreta/assente: testo semplice
    return LINK_RE.sub(repl, text)


def copy_attachments(refs):
    """Copia in Players/_allegati solo gli allegati referenziati (per basename)."""
    src_root = MASTER / "_allegati"
    if not src_root.exists() or not refs:
        return
    index = {}
    for f in src_root.rglob("*"):
        if f.is_file():
            index.setdefault(f.name, f)   # basename -> path (prima occorrenza)
    copied, missing = 0, []
    for ref in refs:
        name = Path(ref.split("#")[0]).name
        src = index.get(name)
        if not src:
            missing.append(ref)
            continue
        dest = PLAYERS / src.relative_to(MASTER)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        copied += 1
    print(f"Allegati player-safe copiati: {copied}")
    if missing:
        print("  ! referenziati ma non trovati in _allegati:", ", ".join(sorted(missing)))


def main():
    md_files = [p for p in MASTER.rglob("*.md")
                if not (SKIP_DIRS & set(p.relative_to(MASTER).parts))]

    # Pass 1: insieme delle pagine esportate (per la risoluzione link)
    safe_files = [p for p in md_files if is_player_safe(p.read_text(encoding="utf-8", errors="replace"))]
    exported_stems = {p.stem for p in safe_files}
    print(f"Pagine player-safe: {len(exported_stems)} / {len(md_files)} totali.")

    if DRY:
        for p in safe_files:
            print("  ->", p.relative_to(MASTER))
        print("(dry-run: nessun file scritto.)")
        return

    # Rigenera Players/ da zero
    if PLAYERS.exists():
        shutil.rmtree(PLAYERS)
    PLAYERS.mkdir(parents=True)

    attachments = set()          # allegati referenziati da pagine esportate
    for p in safe_files:
        text = p.read_text(encoding="utf-8", errors="replace")
        fm, body = split_frontmatter(text)
        body = strip_secret_callouts(body)
        body = re.sub(r"\n(?!\n)(#{1,6}\s)", r"\n\n\1", body)   # riga vuota prima dei titoli
        body = re.sub(r"\n{3,}", "\n\n", body)                  # niente buchi eccessivi
        if fm is not None:
            fm = filter_frontmatter(fm)
            text = f"---\n{fm}\n---\n{body}"
        else:
            text = body
        text = resolve_links(text, exported_stems, attachments)

        rel = p.relative_to(MASTER)
        dest = PLAYERS / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding="utf-8")

    # Allegati: solo quelli referenziati FUORI dai callout segreti (già rimossi sopra)
    copy_attachments(attachments)

    # Tema Obsidian (lettura comoda anche per i giocatori)
    theme_src = MASTER / ".obsidian"
    if theme_src.exists():
        shutil.copytree(theme_src, PLAYERS / ".obsidian", dirs_exist_ok=True)

    print(f"\nVault giocatori generato in: {PLAYERS}")
    print("Ricordati di NON versionare Players/ (è già in .gitignore) e di non condividere il vault Master.")


if __name__ == "__main__":
    main()
