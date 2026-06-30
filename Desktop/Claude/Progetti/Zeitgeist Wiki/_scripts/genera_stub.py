"""
genera_stub.py — Crea pagine-segnaposto per ogni [[wikilink]] non ancora risolto.
=================================================================================
Scansiona il vault Master, raccoglie tutti i collegamenti interni [[...]] e crea
un file stub per ogni pagina ancora mancante, così il grafo di Obsidian resta
connesso e hai una "lista della spesa" di cosa scrivere.

Uso:
    python genera_stub.py            # crea gli stub mancanti
    python genera_stub.py --dry-run  # mostra soltanto cosa creerebbe

Gli stub finiscono nella cartella di tipo giusto quando il nome è noto
(vedi CLASSIFICA), altrimenti in "_stub/". Hanno tag [stub] per ritrovarli.
"""
import re, sys
from pathlib import Path

VAULT = Path(__file__).resolve().parent.parent / "Master"
DRY = "--dry-run" in sys.argv

# Cartelle di servizio da NON scansionare (i template contengono link-placeholder)
SKIP_DIRS = {"_template", "_stub", "_scripts", "_fonti", ".obsidian", "_allegati"}

# Mappa nome-pagina -> (sottocartella, tipo). Aggiungi/sposta liberamente.
CLASSIFICA = {
    # Personaggi
    **{n: ("02 Personaggi", "png") for n in [
        "Han Jierre", "Luc Jierre", "Leone Quital", "Tinker Oddcog", "Margaret Saxby",
        "Voice of Rot", "Nevard Sechim", "Stover Delft", "Harkover Lee", "Duchess Ethelyn",
        "Ekossigan", "Vicemi Terio", "Morgan Cippiano", "Lorcan Kell", "Kaja Stewart",
        "Cillian Creed", "Wolfgang von Recklinghausen", "Caius Bergeron", "Ashima-Shimtu",
        "Xambria Meredith", "Ottavia Sacredote", "Tyler Starke", "Vlendam Heid",
        "Grandis Komanov", "William Miller", "Quentin Augst", "Nigel Price-Hill",
    ]},
    # Fazioni
    **{n: ("03 Fazioni", "fazione") for n in ["House Jierre"]},
    # Luoghi
    **{n: ("04 Luoghi", "luogo") for n in [
        "Crisillyir", "Drakr", "Elfaivar", "Yerasol Archipelago",
    ]},
    # Concetti (gruppi di Prestigio)
    **{n: ("07 Concetti e Regole", "concetto") for n in [
        "Flint (Prestigio)", "Risur (Prestigio)",
    ]},
}

LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")

def page_targets(text):
    for raw in LINK_RE.findall(text):
        raw = raw.replace("\\|", "|")                 # pipe escapato nelle tabelle
        target = raw.split("|")[0].split("#")[0].rstrip("\\").strip()
        if target:
            yield target

def main():
    md_files = [p for p in VAULT.rglob("*.md")
                if not (SKIP_DIRS & set(p.relative_to(VAULT).parts))]
    existing = {p.stem for p in md_files}
    wanted = set()
    for p in md_files:
        wanted.update(page_targets(p.read_text(encoding="utf-8", errors="replace")))

    missing = sorted(t for t in wanted if t not in existing)
    if not missing:
        print("Nessuno stub da creare: tutti i link sono risolti."); return

    print(f"{len(missing)} pagine mancanti.")
    for name in missing:
        folder_name, tipo = CLASSIFICA.get(name, ("_stub", "nota"))
        folder = VAULT / folder_name
        # nome file sicuro per Windows
        safe = re.sub(r'[\\/:*?"<>|]', "", name).strip()
        dest = folder / f"{safe}.md"
        if dest.exists():
            continue
        print(f"  + {folder_name}/{safe}.md   [{tipo}]")
        if DRY:
            continue
        folder.mkdir(parents=True, exist_ok=True)
        body = (
            f"---\n"
            f"tipo: {tipo}\n"
            f"nome: \"{name}\"\n"
            f"player_safe: false\n"
            f"tags: [{tipo}, stub]\n"
            f"---\n\n"
            f"# {name}\n\n"
            f"> ⚠️ Stub generato automaticamente — da completare (vedi `_template/template_{tipo}`).\n\n"
            f"## Cronologia delle apparizioni\n- \n\n"
            f"## Fonti\n- \n"
        )
        dest.write_text(body, encoding="utf-8")

    print("\nFatto." if not DRY else "\n(dry-run: nessun file scritto.)")

if __name__ == "__main__":
    main()
