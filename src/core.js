/* Indlæsning og omsætning af Maconomy-eksporter. Ren logik, ingen DOM. */
const NR = (() => {
  const KORT = { '805000': 'Administration', '809000': 'Ledelse', '806000': 'Markedsføring', '807000': 'Tilbud og salg', '802000': 'Modtage uddannelse', '802010': 'Give uddannelse' };
  const GRUPPE = { '805000': 'Drift og ledelse', '809000': 'Drift og ledelse', '806000': 'Salg og marked', '807000': 'Salg og marked', '802000': 'Kompetenceudvikling', '802010': 'Kompetenceudvikling' };
  const TYPE = { DEP: 'Afdeling/administration', EDU: 'Uddannelse', SAL: 'Salg' };
  const FLYT = /flytt|overflyt|fordele|sagsnum|projektnum|andet sag|når jeg (?:får|har)|oprettes/i;
  const KRAEVET = ['Activity Type', 'Proj. Dept', 'Task', 'Task Description', 'Hours/QTY', 'Emp. Initials', 'Emp. Name', 'Entry Date'];
  const MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

  const pad = (n) => String(n).padStart(2, '0');
  function tilDato(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && isFinite(v)) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return null;
  }
  function isoUge(ymd) {
    const d = new Date(ymd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
    const aar = d.getUTCFullYear();
    const jan4 = new Date(Date.UTC(aar, 0, 4));
    jan4.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + 3);
    return `${aar}-U${pad(1 + Math.round((d - jan4) / (7 * 864e5)))}`;
  }
  const periodeNavn = (p) => (p && /^\d{4}-\d{2}$/.test(p) ? `${MDR[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}` : p || 'Ukendt periode');
  const afdKort = (a) => String(a).split(' - ')[0].trim();
  const tal = (v) => { if (typeof v === 'number') return v; const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : NaN; };

  /* raw: rækker fra sheet_to_json (objekter nøglet på kolonneoverskrift) */
  function omsaet(raw, filnavn) {
    if (!raw.length) throw new Error('Arket er tomt.');
    const mangler = KRAEVET.filter((k) => !(k in raw[0]) && !raw.some((r) => k in r));
    if (mangler.length) throw new Error('Mangler kolonner: ' + mangler.join(', '));
    const ud = [];
    raw.forEach((r, i) => {
      if (String(r['Activity Type'] ?? '').trim() !== 'Time') return;
      const timer = tal(r['Hours/QTY']);
      if (!isFinite(timer)) return;
      const dato = tilDato(r['Entry Date']);
      if (!dato) return;
      const gl = tilDato(r['GL Entry Date']) || dato;
      const kodeTal = tal(r['Task']);
      const kode = isFinite(kodeTal) ? String(Math.round(kodeTal)) : '';
      const intern = kode.startsWith('80');
      const projekt = String(r['Project No.'] ?? '');
      const beskrivelse = String(r['Daily Description'] ?? '').trim();
      const kost = tal(r['Cost Reg.']);
      ud.push({
        id: `${filnavn}#${i}`,
        afdeling: String(r['Proj. Dept'] ?? 'Ukendt afdeling').trim(),
        periode: gl.slice(0, 7),
        dato, uge: isoUge(dato),
        projekt, projektnavn: String(r['Sub Project Name'] ?? ''),
        projekttype: TYPE[projekt.slice(0, 3)] || 'Kundeprojekt',
        opgavekode: kode,
        opgave: String(r['Task Description'] ?? '(uden opgave)'),
        opgave_kort: KORT[kode] || String(r['Task Description'] ?? kode),
        gruppe: intern ? (GRUPPE[kode] || 'Øvrigt internt') : 'Fakturerbart',
        fakturerbar: !intern,
        initialer: String(r['Emp. Initials'] ?? '?'),
        medarbejder: String(r['Emp. Name'] ?? ''),
        timer,
        kostpris: isFinite(kost) ? kost : 0,
        beskrivelse,
        skal_flyttes: FLYT.test(beskrivelse),
        transaktion: String(r['Trans. Type'] ?? ''),
      });
    });
    if (!ud.length) throw new Error('Fandt ingen timeregistreringer (Activity Type = Time).');
    return ud;
  }

  /* Del rækker op i datasæt pr. afdeling og periode */
  function grupper(rows, filnavn) {
    const m = new Map();
    for (const r of rows) {
      const k = r.afdeling + '|' + r.periode;
      if (!m.has(k)) m.set(k, { noegle: k, afdeling: r.afdeling, periode: r.periode, fil: filnavn, indlaest: new Date().toISOString(), rows: [] });
      m.get(k).rows.push(r);
    }
    return [...m.values()];
  }

  const sum = (a, f) => a.reduce((s, r) => s + f(r), 0);
  function sumBy(rows, keyFn, init) {
    const m = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      let o = m.get(k);
      if (!o) { o = { ...init(r), timer: 0, kostpris: 0, antal: 0, folk: new Set() }; m.set(k, o); }
      o.timer += r.timer; o.kostpris += r.kostpris; o.antal += 1; o.folk.add(r.initialer);
    }
    return [...m.values()];
  }

  function noegletal(rows) {
    const timer = sum(rows, (r) => r.timer);
    const folk = new Set(rows.map((r) => r.initialer)).size;
    const admin = sum(rows.filter((r) => r.opgavekode === '805000'), (r) => r.timer);
    return {
      timer, kostpris: sum(rows, (r) => r.kostpris), medarbejdere: folk,
      pr_medarbejder: folk ? timer / folk : 0, admin_andel: timer ? admin / timer : 0,
      flyt_timer: sum(rows.filter((r) => r.skal_flyttes), (r) => r.timer),
    };
  }

  return { omsaet, grupper, sumBy, noegletal, sum, periodeNavn, afdKort, KORT };
})();
if (typeof module !== 'undefined') module.exports = NR;
