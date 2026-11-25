/**
 * Aplikasi Standardisasi Antropometri (Presisi & Akurasi) — backend Google Sheet
 * Mengikuti DHS Height Standardization Tool. Lihat README.md untuk cara pasang.
 * Developed by : Manjilala
 */
const S_SESI = 'Sesi_Standardisasi';
const S_DATA = 'Data_Standardisasi';
const H_SESI = ['id', 'nama', 'tanggal', 'lokasi', 'konfigurasi', 'pinHash', 'dibuat', 'diubah'];
const H_DATA = ['sesi', 'putaran', 'pengukurId', 'pengukur', 'anakId', 'anak', 'nilai', 'diperbarui'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  [[S_SESI, H_SESI], [S_DATA, H_DATA]].forEach(([n, h]) => {
    const s = ss.getSheetByName(n) || ss.insertSheet(n);
    s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    s.setFrozenRows(1);
  });
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sh(n) { let s = SpreadsheetApp.getActive().getSheetByName(n); if (!s) { setup(); s = SpreadsheetApp.getActive().getSheetByName(n); } return s; }
function rows(n) { const v = sh(n).getDataRange().getValues(); v.shift(); return v.filter(r => r[0] !== ''); }
function hash(p) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(p)).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }
function now() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function fmtD(d) { return d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(d || ''); }
function sesiObj(r) {
  let cfg = {};
  try { cfg = JSON.parse(r[4] || '{}'); } catch (e) {}
  return { id: String(r[0]), nama: String(r[1]), tanggal: fmtD(r[2]), lokasi: String(r[3] || ''), cfg: cfg, diubah: String(r[7] || '') };
}
function cariSesi(id) {
  const all = rows(S_SESI);
  const i = all.findIndex(r => String(r[0]) === String(id));
  if (i < 0) throw new Error('Sesi tidak ditemukan');
  return { row: all[i], idx: i + 2 };
}
function cekPin(row, pin) { if (!pin || hash(pin) !== row[5]) throw new Error('PIN fasilitator salah'); }
function angka(v) {
  if (v === null || v === undefined || v === '') return '';
  const x = Number(String(v).replace(',', '.'));
  if (!isFinite(x) || x < 30 || x > 140) throw new Error('Nilai di luar rentang wajar (30–140 cm): ' + v);
  return Math.round(x * 10) / 10;
}
function cekCfg(cfg) {
  if (!cfg || !Array.isArray(cfg.anak) || !Array.isArray(cfg.pengukur) || !cfg.expert) throw new Error('Konfigurasi tidak lengkap');
  if (cfg.anak.length > 12 || cfg.pengukur.length > 12) throw new Error('Maksimal 12 anak dan 12 pengukur');
  return cfg;
}
function namaMap(cfg) {
  const p = {}, a = {};
  [cfg.expert].concat(cfg.pengukur).forEach(x => p[x.id] = x.nama);
  cfg.anak.forEach(x => a[x.id] = x.nama);
  return { p: p, a: a };
}
function tulisData(keep) {
  const s = sh(S_DATA), last = s.getLastRow();
  if (last > 1) s.getRange(2, 1, last - 1, H_DATA.length).clearContent();
  if (keep.length) s.getRange(2, 1, keep.length, H_DATA.length).setValues(keep);
}

function doGet(e) {
  try {
    const a = (e.parameter.action || '').trim();
    if (a === 'sesi') {
      const list = rows(S_SESI).map(r => {
        const s = sesiObj(r);
        return { id: s.id, nama: s.nama, tanggal: s.tanggal, lokasi: s.lokasi, nAnak: (s.cfg.anak || []).length, nPengukur: (s.cfg.pengukur || []).length, dibuat: String(r[6]) };
      }).sort((x, y) => y.dibuat.localeCompare(x.dibuat));
      return out({ ok: true, sesi: list });
    }
    if (a === 'data') {
      const ses = cariSesi(e.parameter.sesi);
      const data = rows(S_DATA).filter(r => String(r[0]) === String(e.parameter.sesi) && r[6] !== '')
        .map(r => [Number(r[1]), String(r[2]), String(r[4]), Number(r[6])]);
      return out({ ok: true, sesi: sesiObj(ses.row), data: data });
    }
    return out({ ok: true, app: 'Standardisasi Antropometri' });
  } catch (err) { return out({ ok: false, error: err.message }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const b = JSON.parse(e.postData.contents);

    if (b.action === 'buatSesi') {
      const nama = String(b.nama || '').trim();
      if (!nama) throw new Error('Nama sesi wajib diisi');
      if (!b.pin || String(b.pin).length < 4) throw new Error('PIN fasilitator minimal 4 karakter');
      const cfg = cekCfg(b.cfg);
      const id = Utilities.getUuid().slice(0, 8), t = now();
      sh(S_SESI).appendRow([id, nama, "'" + String(b.tanggal || ''), String(b.lokasi || ''), JSON.stringify(cfg), hash(b.pin), t, t]);
      return out({ ok: true, sesi: { id: id, nama: nama, tanggal: String(b.tanggal || ''), lokasi: String(b.lokasi || ''), cfg: cfg } });
    }

    const ses = cariSesi(b.sesi);
    const sObj = sesiObj(ses.row);

    if (b.action === 'cekPin') { cekPin(ses.row, b.pin); return out({ ok: true }); }

    if (b.action === 'simpan') {
      const put = Number(b.putaran);
      if (put !== 1 && put !== 2) throw new Error('Putaran harus 1 atau 2');
      const nm = namaMap(sObj.cfg);
      if (!(b.pengukur in nm.p)) throw new Error('Pengukur tidak terdaftar di sesi ini');
      const t = now();
      const keep = rows(S_DATA).filter(r => !(String(r[0]) === sObj.id && Number(r[1]) === put && String(r[2]) === String(b.pengukur)));
      Object.keys(b.nilai || {}).forEach(aid => {
        if (!(aid in nm.a)) return;
        const v = angka(b.nilai[aid]);
        if (v === '') return;
        keep.push([sObj.id, put, String(b.pengukur), nm.p[b.pengukur], aid, nm.a[aid], v, t]);
      });
      tulisData(keep);
      return out({ ok: true });
    }

    if (b.action === 'atur') {
      cekPin(ses.row, b.pin);
      const cfg = cekCfg(b.cfg);
      const nama = String(b.nama || sObj.nama).trim();
      sh(S_SESI).getRange(ses.idx, 2, 1, 4).setValues([[nama, "'" + String(b.tanggal || ''), String(b.lokasi || ''), JSON.stringify(cfg)]]);
      sh(S_SESI).getRange(ses.idx, 8).setValue(now());
      // perbarui nama di sheet Data agar mudah dibaca
      const nm = namaMap(cfg);
      const all = rows(S_DATA).map(r => {
        if (String(r[0]) === sObj.id) { if (r[2] in nm.p) r[3] = nm.p[r[2]]; if (r[4] in nm.a) r[5] = nm.a[r[4]]; }
        return r;
      });
      tulisData(all);
      return out({ ok: true });
    }

    if (b.action === 'impor') {
      cekPin(ses.row, b.pin);
      const cfg = cekCfg(b.cfg);
      sh(S_SESI).getRange(ses.idx, 5).setValue(JSON.stringify(cfg));
      sh(S_SESI).getRange(ses.idx, 8).setValue(now());
      const nm = namaMap(cfg), t = now();
      const keep = rows(S_DATA).filter(r => String(r[0]) !== sObj.id);
      (b.data || []).forEach(d => {
        const put = Number(d[0]), pid = String(d[1]), aid = String(d[2]), v = angka(d[3]);
        if ((put === 1 || put === 2) && (pid in nm.p) && (aid in nm.a) && v !== '') keep.push([sObj.id, put, pid, nm.p[pid], aid, nm.a[aid], v, t]);
      });
      tulisData(keep);
      return out({ ok: true });
    }

    if (b.action === 'hapusSesi') {
      cekPin(ses.row, b.pin);
      tulisData(rows(S_DATA).filter(r => String(r[0]) !== sObj.id));
      sh(S_SESI).deleteRow(ses.idx);
      return out({ ok: true });
    }

    throw new Error('Aksi tidak dikenal');
  } catch (err) {
    return out({ ok: false, error: err.message });
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
