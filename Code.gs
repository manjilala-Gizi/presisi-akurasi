/**
 * Kalkulator Standardisasi Antropometri (TEM) — backend Google Sheet
 * Cara pakai: lihat README.md. Jalankan fungsi setup() sekali, lalu Deploy sebagai Web app.
 */
const S_SESI = 'Sesi';
const S_DATA = 'Data';
const H_SESI = ['id', 'nama', 'tanggal', 'lokasi', 'jumlahAnak', 'pengaturan', 'pinHash', 'dibuat'];
const H_DATA = ['sesi', 'pengukur', 'peran', 'anak', 'm1', 'm2', 'diperbarui'];
const NAMA_GS = 'Gold standard';

function setup() {
  const ss = SpreadsheetApp.getActive();
  [[S_SESI, H_SESI], [S_DATA, H_DATA]].forEach(([n, h]) => {
    const s = ss.getSheetByName(n) || ss.insertSheet(n);
    s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    s.setFrozenRows(1);
  });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function sh(n) {
  let s = SpreadsheetApp.getActive().getSheetByName(n);
  if (!s) { setup(); s = SpreadsheetApp.getActive().getSheetByName(n); }
  return s;
}
function rows(n) {
  const v = sh(n).getDataRange().getValues();
  v.shift();
  return v.filter(r => r[0] !== '');
}
function hash(p) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(p))
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}
function fmtD(d) {
  if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(d || '');
}
function sesiObj(r) {
  let set = {};
  try { set = JSON.parse(r[5] || '{}'); } catch (e) {}
  return { id: String(r[0]), nama: String(r[1]), tanggal: fmtD(r[2]), lokasi: String(r[3] || ''),
    n: Number(r[4]) || 10, cut: set.cut || null, mAkur: set.mAkur || 'mean' };
}
function cariSesi(id) {
  const all = rows(S_SESI);
  const i = all.findIndex(r => String(r[0]) === String(id));
  if (i < 0) throw new Error('Sesi tidak ditemukan');
  return { row: all[i], idx: i + 2 };
}
function cekPin(sesiRow, pin) {
  if (!pin || hash(pin) !== sesiRow[6]) throw new Error('PIN fasilitator salah');
}
function angka(v) {
  if (v === null || v === undefined || v === '') return '';
  const x = Number(String(v).replace(',', '.'));
  if (!isFinite(x) || x < 30 || x > 140) throw new Error('Nilai di luar rentang wajar (30–140 cm): ' + v);
  return Math.round(x * 10) / 10;
}
function tulisData(keep) {
  const s = sh(S_DATA);
  const last = s.getLastRow();
  if (last > 1) s.getRange(2, 1, last - 1, H_DATA.length).clearContent();
  if (keep.length) s.getRange(2, 1, keep.length, H_DATA.length).setValues(keep);
}

function doGet(e) {
  try {
    const a = (e.parameter.action || '').trim();
    if (a === 'sesi') {
      const list = rows(S_SESI).map(r => Object.assign(sesiObj(r), { dibuat: String(r[7]) }))
        .sort((x, y) => y.dibuat.localeCompare(x.dibuat));
      return out({ ok: true, sesi: list });
    }
    if (a === 'data') {
      const ses = cariSesi(e.parameter.sesi);
      const data = rows(S_DATA).filter(r => String(r[0]) === String(e.parameter.sesi))
        .map(r => [String(r[1]), String(r[2]), Number(r[3]), r[4] === '' ? null : Number(r[4]), r[5] === '' ? null : Number(r[5])]);
      return out({ ok: true, sesi: sesiObj(ses.row), data: data });
    }
    return out({ ok: true, app: 'Kalkulator TEM Antropometri' });
  } catch (err) {
    return out({ ok: false, error: err.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const b = JSON.parse(e.postData.contents);
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    if (b.action === 'buatSesi') {
      const nama = String(b.nama || '').trim();
      if (!nama) throw new Error('Nama sesi wajib diisi');
      if (!b.pin || String(b.pin).length < 4) throw new Error('PIN fasilitator minimal 4 karakter');
      const id = Utilities.getUuid().slice(0, 8);
      const n = Math.max(2, Math.min(40, parseInt(b.n, 10) || 10));
      const set = JSON.stringify({ cut: b.cut || null, mAkur: b.mAkur || 'mean' });
      sh(S_SESI).appendRow([id, nama, "'" + String(b.tanggal || ''), String(b.lokasi || ''), n, set, hash(b.pin), now]);
      return out({ ok: true, sesi: sesiObj([id, nama, String(b.tanggal || ''), b.lokasi, n, set]) });
    }

    const ses = cariSesi(b.sesi);

    if (b.action === 'cekPin') {
      cekPin(ses.row, b.pin);
      return out({ ok: true });
    }

    if (b.action === 'simpan') {
      const nama = String(b.nama || '').trim();
      const lama = String(b.lama || '').trim();
      const peran = b.peran === 'gs' ? 'gs' : 'peserta';
      if (!nama) throw new Error('Nama pengukur wajib diisi');
      if (peran === 'gs') cekPin(ses.row, b.pin);
      if (peran !== 'gs' && nama.toLowerCase() === NAMA_GS.toLowerCase()) throw new Error('Nama itu khusus untuk gold standard');
      const all = rows(S_DATA);
      const milikSesi = r => String(r[0]) === String(b.sesi);
      if (nama !== lama && all.some(r => milikSesi(r) && String(r[1]) === nama)) throw new Error('Nama "' + nama + '" sudah dipakai di sesi ini');
      const keep = all.filter(r => !(milikSesi(r) && (String(r[1]) === nama || (lama && String(r[1]) === lama))));
      const n = Number(ses.row[4]) || 10;
      const m1 = b.m1 || [], m2 = b.m2 || [];
      for (let i = 0; i < n; i++) keep.push([String(b.sesi), nama, peran, i + 1, angka(m1[i]), angka(m2[i]), now]);
      tulisData(keep);
      return out({ ok: true, nama: nama });
    }

    if (b.action === 'hapus') {
      cekPin(ses.row, b.pin);
      const keep = rows(S_DATA).filter(r => !(String(r[0]) === String(b.sesi) && String(r[1]) === String(b.nama)));
      tulisData(keep);
      return out({ ok: true });
    }

    if (b.action === 'atur') {
      cekPin(ses.row, b.pin);
      const n = Math.max(2, Math.min(40, parseInt(b.n, 10) || 10));
      const set = JSON.stringify({ cut: b.cut || null, mAkur: b.mAkur || 'mean' });
      sh(S_SESI).getRange(ses.idx, 5, 1, 2).setValues([[n, set]]);
      return out({ ok: true });
    }

    throw new Error('Aksi tidak dikenal');
  } catch (err) {
    return out({ ok: false, error: err.message });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
