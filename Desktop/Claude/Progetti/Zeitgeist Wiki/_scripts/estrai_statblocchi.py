"""
estrai_statblocchi.py — Estrae statblocchi 5e da un PDF-fonte in JSON 5e.tools.
================================================================================
Il JSON prodotto ({"monster": [...]}) si importa in DnDMaster:
    tab Mostri -> Importa (Import5eTools) -> file JSON -> tipo "monster"
I mostri finiscono nei custom (dnd_custom_monsters_v1), con dedup per nome:
reimportare lo stesso file non crea doppioni.

Come funziona (e i suoi limiti):
  1. Estrae il testo del PDF con pymupdf, pagina per pagina.
  2. Riconosce l'inizio di uno statblocco dalla riga taglia/tipo/allineamento
     ("Medium humanoid (human), neutral evil") col nome sulla riga precedente.
  3. Legge i campi standard (AC, HP, Speed, tiri salvezza, ..., Challenge) e poi
     tratti/azioni/reazioni/leggendarie come paragrafi "Nome. testo".
  4. GOTCHA — sbordo narrativo: l'ULTIMO statblocco prima del testo di scena
     tende ad assorbire paragrafi spuri. Euristiche di stop: etichette di scena
     (Social/Action/Exploration...), righe che iniziano da frase ("The party..."),
     nomi non Title-Case. I casi residui si correggono a mano in FIXUPS (drop,
     merge nel precedente, o interi statblocchi ricuciti: vedi Jaime the Weevil,
     spezzato in due da una sidebar del PDF).
  5. Auto-verifica finale: replica le regex di parse5eMonster (App.jsx di
     DnDMaster) e segnala le azioni d'attacco da cui l'app non riuscirebbe a
     estrarre bonus o danno. Le frasi meccaniche DEVONO restare in inglese 5e
     ("+7 to hit", "Hit: 14 (2d8+5) piercing damage"): l'estrazione è via regex.

ATTENZIONE (copyright): come per le immagini, gli statblocchi sono materiale
protetto -> il JSON va tenuto in _fonti/ (git-ignored), non nel vault.

Uso:
    python estrai_statblocchi.py "_fonti/ZG03_Digging_For_Lies.pdf" --pagine 66-90 --out "_fonti/mostri.json"
    python estrai_statblocchi.py "_fonti/ZG04_Always_On_Time.pdf" --out "_fonti/mostri.json" --aggiungi
    python estrai_statblocchi.py "_fonti/ZG05_Caldron_Born.pdf" --dry-run

Argomenti:
    <pdf>          percorso del PDF (relativo alla root del vault o assoluto)
    --pagine A-B   limita alle pagine A..B del PDF (1-based, incluse)
    --out FILE     JSON di destinazione (default: _fonti/statblocchi_<fonte>.json)
    --aggiungi     unisce al file --out esistente invece di sovrascriverlo
                   (dedup per nome: il nuovo NON sostituisce l'esistente)
    --dry-run      elenca cosa estrarrebbe (e gli avvisi) senza scrivere
"""
import argparse
import json
import re
import sys
from pathlib import Path

# la console Windows può essere cp1252: mai far crashare una print
sys.stdout.reconfigure(errors="replace")
sys.stderr.reconfigure(errors="replace")

try:
    import fitz  # pymupdf
except ImportError:
    sys.exit("Serve pymupdf: pip install pymupdf")

ROOT = Path(__file__).resolve().parent.parent

SIZE_MAP = {"Tiny": "T", "Small": "S", "Medium": "M", "Large": "L",
            "Huge": "H", "Gargantuan": "G"}
SIZE_RE = re.compile(
    r"^(Tiny|Small|Medium|Large|Huge|Gargantuan|Male|Female)\s+"
    r"(humanoid|aberration|beast|construct|undead|elemental|monstrosity|fiend|fey|dragon|giant|ooze|plant|celestial)"
    r"\s*(\([^)]*\))?\s*,\s*(.+)$", re.I)
NOISE_RE = re.compile(
    r"^(EN5ider Presents|Act (One|Two|Three|Four)[:.]|\d+\s*\|\s|\|\s*\d+\s*$|\d{1,3}$)")
FIELD_RE = re.compile(
    r"^(Armor Class|Hit Points|Speed|Saving Throws|Skills|Damage Resistances|Damage Immunities|"
    r"Damage Vulnerabilities|Condition Immunities|Senses|Languages|Challenge)\s*(.*)$")
TRAIT_NAME_RE = re.compile(r"^([A-Z][\w'’ \-,:()/&#]{0,60}?[a-z0-9)])\.\s+(\S.*)$")
SECTION_RE = re.compile(r"^(Actions|Reactions|Legendary Actions|Villain Actions)\s*\.?$", re.I)
ABILITY_RE = re.compile(r"(\d+)\s*\(([+\-–−]\s*\d+)\)")
SCENE_LABEL = re.compile(
    r"^(Social|Action|Exploration|Development|Combat|Real-Time|Gear)(/[A-Za-z-]+)?\s*\.?\s*$"
    r"|^(Social|Action|Exploration|Development|Real-Time)[./]")
SENTENCE_START = re.compile(
    r"^(The|She|He|They|This|There|That|These|A|An|It|If|When|While|As|But|And|Round|Choose|Time|"
    r"Almost|Every|Finally|Other|PCs|You|Your|Each|Once|Now|Here|In|On|At|For|With|After|Before|"
    r"Most|Some|All|No|Both)\s")

# ---------------------------------------------------------------------------
# FIXUP manuali per statblocchi che le euristiche non sistemano da sole.
# Chiave = (nome mostro, nome voce). Documentare il perché quando si aggiunge.
# ---------------------------------------------------------------------------
DROP_FROM = {   # da questa voce in poi è narrativa: butta lei e le successive
    ("Worm Maw", "Lady Inspectress Margaret Saxby"),
    ("Flying Thing", "Lorcan Kell"),
}
MERGE_PREV = {  # artefatto di a-capo: va riattaccato alla voce precedente
    ("Thing from Beyond", "DC 18)"),
    ("Flying Thing", "DC 13 Wisdom saving throw"),
}
EXTRA = {       # statblocchi spezzati da sidebar del PDF: pezzi ricuciti a mano
    "Jaime the Weevil": {  # ZG04 pp. 53-54: sidebar "Von Whatlinghausen?" in mezzo
        "trait": [
            {"name": "Spellcasting", "entries": [
                "Jaime is a 6th-level spellcaster. His spellcasting ability is Wisdom "
                "(spell save DC 13, +5 to hit with spell attacks). Prepared druid spells - "
                "Cantrips (at will): chill touch, druidcraft, guidance, produce flame. "
                "1st (4 slots): cure wounds, detect poison and disease, entangle, faerie fire, "
                "purify food and drink. 2nd (4 slots): barkskin, flaming sphere, heat metal, "
                "spike growth. 3rd (3 slots): conjure animals, plant growth."]},
            {"name": "Wild Shape (2/long rest)", "entries": [
                "Jaime can use his action to magically assume the shape of a beast he has seen "
                "(CR 1/2 or less, no flying speed) for up to 2 hours; standard druid Wild Shape rules apply."]},
        ],
        "action": [
            {"name": "Magic Spear", "entries": [
                "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6+2) magical "
                "piercing damage or if wielded in two hands 6 (1d8+2)."]},
            {"name": "Thrown Magic Spear", "entries": [
                "Ranged Weapon Attack: +7 to hit, range 20/60 ft., one target. "
                "Hit: 7 (1d6+4) magical piercing damage."]},
        ],
    },
}
CR_OVERRIDE = {"Damata Griento": "1/4"}  # nel PDF: "Challenge — (100 XP)"


def clean(s):
    s = (s.replace("’", "'").replace("‘", "'").replace("“", '"')
          .replace("”", '"').replace("–", "-").replace("−", "-")
          .replace("ﬁ", "fi").replace("ﬂ", "fl").replace("­", ""))
    return re.sub(r"[  -​  ]", " ", s).strip()


def extract_rows(pdf_path, page_min, page_max):
    """Testo del PDF come lista (pagina, riga), senza righe-rumore."""
    doc = fitz.open(pdf_path)
    rows = []
    for i, page in enumerate(doc):
        pg = i + 1
        if not (page_min <= pg <= page_max):
            continue
        for line in page.get_text().splitlines():
            rows.append((pg, line))
    return rows


def find_blocks(rows):
    """Trova (nome, pagina, corpo) di ogni statblocco."""
    starts = []
    for i, (pg, l) in enumerate(rows):
        if SIZE_RE.match(l.strip()):
            j = i - 1
            while j >= 0 and (not rows[j][1].strip() or NOISE_RE.match(rows[j][1].strip())):
                j -= 1
            if j >= 0:
                name = clean(rows[j][1])
                if 2 < len(name) <= 60 and not name.endswith((".", ":", ",")) and "  " not in name:
                    starts.append((j, i, pg, name))
    blocks = []
    for k, (jn, i, pg, name) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(rows)
        body = [clean(r[1]) for r in rows[i:end] if r[1].strip() and not NOISE_RE.match(r[1].strip())]
        blocks.append((name, pg, body))
    return blocks


def good_name(n):
    """Nomi di tratto plausibili: Title-Case-ish, non frasi."""
    words = [w for w in re.split(r"\s+", n) if w]
    if len(words) > 7:
        return False
    caps = sum(1 for w in words if w[0].isupper() or w[0].isdigit() or w[0] == "(")
    return caps * 2 >= len(words)


def parse_block(name, pg, body, source):
    m = SIZE_RE.match(body[0])
    size_w, type_w, _subtype, align = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
    if size_w in ("Male", "Female"):
        size_w = "Medium"
    mon = {"name": name, "source": source, "page": pg,
           "size": SIZE_MAP[size_w], "type": {"type": type_w},
           "alignment": clean(align)}
    text = "\n".join(body[1:])

    def grab(field):
        mm = re.search(r"^" + field + r"\s+(.*)$", text, re.M)
        return clean(mm.group(1)) if mm else None

    ac = grab("Armor Class")
    if ac:
        mm = re.match(r"(\d+)", ac)
        mon["ac"] = ([{"ac": int(mm.group(1)),
                       "from": [ac[mm.end():].strip(" ()")] if ac[mm.end():].strip() else []}]
                     if mm else 10)
    hp = grab("Hit Points")
    if hp:
        mm = re.match(r"(\d+)\s*\(([^)]*)\)", hp)
        if mm:
            mon["hp"] = {"average": int(mm.group(1)), "formula": mm.group(2).replace(" ", "")}
        else:
            mm2 = re.match(r"\d+", hp)
            mon["hp"] = {"average": int(mm2.group(0)) if mm2 else 1, "formula": ""}
    sp = grab("Speed")
    if sp:
        speed = {}
        for mm in re.finditer(r"(?:(walk|fly|swim|climb|burrow)\s+)?(\d+)\s*ft", sp, re.I):
            speed[(mm.group(1) or "walk").lower()] = int(mm.group(2))
        mon["speed"] = speed or {"walk": 30}
    tail = text[text.find("Speed"):] if "Speed" in text else text
    abil = ABILITY_RE.findall(tail)[:6]
    if len(abil) == 6:
        for key, (score, _) in zip(["str", "dex", "con", "int", "wis", "cha"], abil):
            mon[key] = int(score)
    st = grab("Saving Throws")
    if st:
        mon["save"] = {p.split()[0].lower()[:3]: p.split()[1]
                       for p in st.split(",") if len(p.split()) >= 2}
    sk = grab("Skills")
    if sk:
        d = {}
        for p in sk.split(","):
            mm = re.match(r"\s*([A-Za-z' ]+?)\s*([+\-]\d+)", p)
            if mm:
                d[mm.group(1).strip().lower()] = mm.group(2)
        mon["skill"] = d
    for fld, key in [("Damage Resistances", "resist"), ("Damage Vulnerabilities", "vulnerable")]:
        v = grab(fld)
        if v:
            mon[key] = [clean(x) for x in re.split(r"[;,]", v) if clean(x)]
    imm = []
    v = grab("Damage Immunities")
    if v:
        imm += [clean(x) for x in re.split(r"[;,]", v) if clean(x)]
    v = grab("Condition Immunities")
    if v:
        imm += [clean(x) + " (condizione)" for x in re.split(r"[;,]", v) if clean(x)]
    if imm:
        mon["immune"] = imm
    sn = grab("Senses")
    if sn:
        mm = re.search(r"passive Perception (\d+)", sn, re.I)
        if mm:
            mon["passive"] = int(mm.group(1))
        mon["senses"] = [clean(x) for x in sn.split(",")
                         if "passive" not in x.lower() and clean(x)]
    lg = grab("Languages")
    if lg and lg not in ("-", "—"):
        mon["languages"] = [clean(x) for x in lg.split(",") if clean(x)]
    ch = grab("Challenge")
    if ch:
        mm = re.match(r"([\d/]+)", ch)
        if mm:
            mon["cr"] = mm.group(1)

    # tratti / azioni / leggendarie: dal dopo-Challenge in poi
    mm = re.search(r"^Challenge.*$", text, re.M)
    rest = text[mm.end():].strip() if mm else ""
    section = "trait"
    buckets = {"trait": [], "action": [], "legendary": [], "reaction": []}
    cur = None
    for line in rest.splitlines():
        ls = line.strip()
        if not ls:
            continue
        if SCENE_LABEL.match(ls):      # riprende il testo di scena: finito
            break
        sec = SECTION_RE.match(ls)
        if sec:
            w = sec.group(1).lower()
            section = ("action" if w == "actions" else
                       "legendary" if "legendary" in w or "villain" in w else "reaction")
            cur = None
            continue
        if FIELD_RE.match(ls):         # residuo di layout (tabella ripetuta)
            continue
        tm = TRAIT_NAME_RE.match(ls)
        if tm and len(tm.group(1)) <= 55 and good_name(tm.group(1)) and not SENTENCE_START.match(ls):
            cur = {"name": tm.group(1), "entries": [tm.group(2)]}
            buckets[section].append(cur)
        elif tm and SENTENCE_START.match(ls) and not re.search(r"\d+d\d+|to hit|DC \d+|saving throw|Recharge", ls):
            break                      # frase narrativa: statblocco finito
        elif cur:
            cur["entries"][0] += " " + ls
    if buckets["trait"]:
        mon["trait"] = buckets["trait"]
    if buckets["action"]:
        mon["action"] = buckets["action"]
    if buckets["legendary"]:
        mon["legendary"] = buckets["legendary"]
    if buckets["reaction"]:
        mon.setdefault("trait", []).extend(
            {"name": "Reazione: " + r["name"], "entries": r["entries"]}
            for r in buckets["reaction"])
    return mon


def apply_fixups(mon):
    for key in ("trait", "action", "legendary"):
        for e in mon.get(key, []):
            e["entries"][0] = re.split(r"\s+Aftermath\.", e["entries"][0])[0].strip()
    for key in ("action", "trait"):
        lst = mon.get(key, [])
        cleaned, dropping = [], False
        for e in lst:
            tag = (mon["name"], e["name"])
            if dropping or tag in DROP_FROM:
                dropping = True
                continue
            if tag in MERGE_PREV and cleaned:
                cleaned[-1]["entries"][0] += " " + e["name"] + ". " + e["entries"][0]
                continue
            cleaned.append(e)
        if lst:
            mon[key] = cleaned
    if mon["name"] in CR_OVERRIDE and "cr" not in mon:
        mon["cr"] = CR_OVERRIDE[mon["name"]]
    extra = EXTRA.get(mon["name"])
    if extra:
        if "trait" in extra:
            mon.setdefault("trait", []).extend(extra["trait"])
        if "action" in extra:
            mon["action"] = extra["action"]
    return mon


def verify(monsters):
    """Replica i check di parse5eMonster (DnDMaster): avvisa se un'azione
    d'attacco non ha bonus/danno estraibili via regex."""
    warns = []
    for m in monsters:
        for a in m.get("action", []):
            desc = " ".join(a["entries"])
            if re.search(r"Weapon Attack", desc, re.I):
                if not (re.search(r"[+\-]\d+\s+to\s+hit", desc, re.I)
                        or re.search(r"to\s+hit[:\s]+[+\-]\d+", desc, re.I)):
                    warns.append(f"{m['name']} / {a['name']}: bonus 'to hit' non estraibile")
                if not re.search(r"Hit[:\s]+[^.]*?\d+d\d+", desc, re.I):
                    warns.append(f"{m['name']} / {a['name']}: danno 'Hit: N (XdY)' non estraibile")
        if "cr" not in m:
            warns.append(f"{m['name']}: Challenge non trovato")
        if "hp" not in m:
            warns.append(f"{m['name']}: Hit Points non trovati")
    return warns


def main():
    ap = argparse.ArgumentParser(description="Estrae statblocchi 5e da un PDF in JSON 5e.tools (per DnDMaster).")
    ap.add_argument("pdf")
    ap.add_argument("--pagine", help="A-B (1-based, incluse)")
    ap.add_argument("--out", help="file JSON di destinazione")
    ap.add_argument("--aggiungi", action="store_true", help="unisci al file esistente (dedup per nome)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pdf = Path(args.pdf)
    if not pdf.is_absolute():
        pdf = ROOT / pdf
    if not pdf.exists():
        sys.exit(f"PDF non trovato: {pdf}")
    source = pdf.stem.split("_")[0].upper()  # ZG03_Digging_For_Lies -> ZG03
    pmin, pmax = 1, 10 ** 6
    if args.pagine:
        pmin, pmax = (int(x) for x in args.pagine.split("-"))
    out = Path(args.out) if args.out else ROOT / "_fonti" / f"statblocchi_{source.lower()}.json"
    if not out.is_absolute():
        out = ROOT / out

    rows = extract_rows(pdf, pmin, pmax)
    monsters, seen = [], set()
    for name, pg, body in find_blocks(rows):
        if name.lower() in seen:    # i PDF ristampano gli statblocchi per atto
            continue
        seen.add(name.lower())
        try:
            monsters.append(apply_fixups(parse_block(name, pg, body, source)))
        except Exception as e:
            print(f"!! {name} (p.{pg}) saltato: {e}", file=sys.stderr)

    for m in monsters:
        acts = ", ".join(a["name"] for a in m.get("action", [])) or "-"
        ac = m.get("ac")
        ac = ac[0]["ac"] if isinstance(ac, list) else ac
        print(f"[{source} p.{m['page']}] {m['name']}  CR {m.get('cr', '?')}  AC {ac}  "
              f"HP {m.get('hp', {}).get('average', '?')}  | tratti {len(m.get('trait', []))} | azioni: {acts}")

    warns = verify(monsters)
    if warns:
        print("\nAVVISI (controllare a mano: alcuni sono legittimi, es. attacchi senza danno):")
        for w in warns:
            print("  ! " + w)

    if args.dry_run:
        print(f"\n(dry-run) {len(monsters)} statblocchi, nessun file scritto.")
        return

    if args.aggiungi and out.exists():
        old = json.load(open(out, encoding="utf-8"))["monster"]
        have = {m["name"].lower() for m in old}
        merged = old + [m for m in monsters if m["name"].lower() not in have]
        skipped = len(monsters) - (len(merged) - len(old))
        monsters = merged
        if skipped:
            print(f"({skipped} già presenti nel file, saltati)")
    out.parent.mkdir(parents=True, exist_ok=True)
    json.dump({"monster": monsters}, open(out, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\n{len(monsters)} statblocchi -> {out}")


if __name__ == "__main__":
    main()
