"""
estrai_immagini.py — Estrae mappe/immagini da un PDF-fonte in Master/_allegati/.
=================================================================================
Usa pymupdf (fitz). Ogni immagine incorporata nel PDF viene salvata come PNG in
una sottocartella di _allegati, pronta da incorporare in una pagina con:

    ![[avv02_p041_1.png]]            (a piena larghezza)
    ![[avv02_p041_1.png|500]]        (largo 500px)

ATTENZIONE (copyright): le immagini estratte dai PDF sono materiale protetto.
_allegati/ è in .gitignore apposta: restano in locale, NON vanno pushate sul
repo pubblico. L'export ai giocatori copia solo gli allegati referenziati fuori
dai callout [!segreto-dm] (vedi export_players.py).

Uso:
    python estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02
    python estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02 --min 150
    python estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02 --pagine 40-60
    python estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02 --dry-run

Argomenti:
    <pdf>            percorso del PDF (relativo alla root del vault o assoluto)
    <sottocartella>  nome cartella di destinazione dentro _allegati (es. avv02)
    --min N          scarta immagini con lato minore < N px (default 200: taglia
                     icone/fregi decorativi). Metti 0 per estrarre tutto.
    --pagine A-B     limita alle pagine A..B (1-based, incluse)
    --dry-run        elenca cosa estrarrebbe senza scrivere file
"""
import sys
from pathlib import Path

try:
    import fitz  # pymupdf
except ImportError:
    sys.exit("Manca pymupdf. Installa con:  pip install pymupdf")

ROOT     = Path(__file__).resolve().parent.parent
ALLEGATI = ROOT / "Master" / "_allegati"


def parse_args(argv):
    pos, min_side, pagine, dry = [], 200, None, False
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--dry-run":
            dry = True
        elif a == "--min":
            i += 1; min_side = int(argv[i])
        elif a == "--pagine":
            i += 1
            lo, hi = argv[i].split("-")
            pagine = (int(lo), int(hi))
        else:
            pos.append(a)
        i += 1
    if len(pos) < 2:
        sys.exit(__doc__)
    return pos[0], pos[1], min_side, pagine, dry


def resolve_pdf(p):
    path = Path(p)
    if not path.is_absolute():
        path = (ROOT / p).resolve()
    if not path.exists():
        sys.exit(f"PDF non trovato: {path}")
    return path


def main():
    pdf_arg, sub, min_side, pagine, dry = parse_args(sys.argv[1:])
    pdf_path = resolve_pdf(pdf_arg)
    out_dir  = ALLEGATI / sub
    prefix   = sub

    doc = fitz.open(pdf_path)
    n_pages = doc.page_count
    lo, hi = (pagine if pagine else (1, n_pages))
    lo, hi = max(1, lo), min(n_pages, hi)

    if not dry:
        out_dir.mkdir(parents=True, exist_ok=True)

    seen = set()          # xref già estratti (immagini ripetute su più pagine)
    saved = skipped = 0
    for pno in range(lo - 1, hi):
        page = doc[pno]
        for idx, info in enumerate(page.get_images(full=True), start=1):
            xref = info[0]
            if xref in seen:
                continue
            seen.add(xref)
            try:
                pix = fitz.Pixmap(doc, xref)
            except Exception as e:
                print(f"  ! p{pno+1} xref{xref}: {e}")
                continue
            w, h = pix.width, pix.height
            if min(w, h) < min_side:
                skipped += 1
                pix = None
                continue
            # normalizza a RGB (gestisce CMYK e canale alfa)
            if pix.n >= 5 or pix.colorspace and pix.colorspace.name not in ("DeviceRGB", "DeviceGray"):
                pix = fitz.Pixmap(fitz.csRGB, pix)
            name = f"{prefix}_p{pno+1:03d}_{idx}.png"
            if dry:
                print(f"  [dry] {name}  ({w}x{h})")
            else:
                (out_dir / name).write_bytes(pix.tobytes("png"))
                print(f"  {name}  ({w}x{h})")
            pix = None
            saved += 1

    doc.close()
    print(f"\nPagine {lo}-{hi}/{n_pages}. Estratte: {saved}, scartate (<{min_side}px): {skipped}.")
    if dry:
        print("(dry-run: nessun file scritto.)")
    else:
        print(f"Destinazione: {out_dir}")
        print(f"Incorpora con:  ![[{prefix}_pNNN_1.png]]")


if __name__ == "__main__":
    main()
