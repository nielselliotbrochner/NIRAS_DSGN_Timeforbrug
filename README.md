# NIRAS DSGN · Ikke-fakturerbar tid

**Åbn dashboardet:** https://nielselliotbrochner.github.io/NIRAS_DSGN_Timeforbrug/

Dashboard i NIRAS CVI, der viser hvordan afdelingerne i DSGN bruger ikke-fakturerbar tid, opdelt på opgave (Task Description), medarbejder, uge og medarbejdernes egne beskrivelser.

## Brug

1. Åbn `index.html` i browseren (direkte fra disken eller via GitHub Pages).
2. Træk en eller flere Maconomy-eksporter ind, én pr. afdeling (arket `Export`).
3. Skift mellem afdelinger med fanerne. Med flere afdelinger vises de også side om side.
4. Klik på en opgave for at filtrere resten af siden. »Gem som PDF« giver en printvenlig version.

Afdelingen læses fra kolonnen `Proj. Dept`, perioden fra `GL Entry Date`. En ny fil for samme afdeling og måned erstatter den gamle.

## Data

- Excel-filerne læses kun i browseren og gemmes lokalt (IndexedDB) på den computer, der bruges. Intet sendes videre.
- Repoet indeholder ingen data. `.gitignore` udelukker Excel-, CSV- og JSON-filer.
- »Ryd alle data« fjerner de indlæste filer fra browseren.

## Regler i beregningen

- Ikke-fakturerbar tid = opgavekoder 80xxxx (DEP-, EDU- og SAL-sager).
- Opgavegrupper: Drift og ledelse (805000, 809000), Salg og marked (806000, 807000), Kompetenceudvikling (802000, 802010).
- Timer er netto efter projektflytninger (negative linjer trækkes fra).
- »Skal flyttes til projekt« findes ved tekstsøgning i Daily Description efter fx »flyttes«, »fordeles«, »sagsnummer« og »oprettes«.

## Udvikling

`index.html` er bygget og selvstændig (SheetJS er indlejret, så siden virker uden internet). Rediger i `src/` og byg igen:

```
npm install xlsx@0.18.5 --no-save
python3 src/build.py
```
