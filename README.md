# Kalkulator Standardisasi Antropometri (TEM)

Aplikasi web (PWA) untuk uji standardisasi pengukur antropometri gold standard (MPI 2). Aplikasi ini menghitung TEM presisi, TEM akurasi terhadap gold standard, bias, %TEM, dan R, lalu memberi keputusan **Lulus** atau **Re-test**. Data tersimpan di Google Sheet, sehingga peserta bisa mengisi dari HP masing-masing dan fasilitator melihat rekap gabungannya.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Aplikasi |
| `config.js` | Tempat menempel URL database (Apps Script) |
| `Code.gs` | Kode backend untuk Google Sheet (**tidak** perlu diunggah ke GitHub) |
| `manifest.json`, `sw.js`, `icon-*.png` | Supaya bisa di-install di HP dan tetap terbuka saat offline |

---

## Langkah 1 — Siapkan database Google Sheet

1. Buka Google Drive, lalu buat **Google Sheet baru**, misalnya dengan nama `Database TEM Gold Standard`.
2. Buka menu **Ekstensi → Apps Script**.
3. Hapus semua isi `Kode.gs`, lalu tempel seluruh isi file **`Code.gs`**. Klik **Simpan**.
4. Pilih fungsi **`setup`** di toolbar, lalu klik **Jalankan**. Izinkan akses saat diminta (Advanced → Go to … → Allow). Setelah itu muncul dua sheet: `Sesi` dan `Data`.
5. Klik **Terapkan (Deploy) → Deployment baru**:
   - Jenis: **Aplikasi web (Web app)**
   - Jalankan sebagai: **Saya (Me)**
   - Yang memiliki akses: **Siapa saja (Anyone)**
6. Klik **Terapkan**, lalu salin **URL Aplikasi web** (berakhiran `/exec`).

> Kalau nanti `Code.gs` diubah, buka **Deploy → Kelola deployment → edit (ikon pensil) → Versi: Versi baru → Terapkan**. Dengan cara ini URL-nya tetap sama.

## Langkah 2 — URL database

URL Web App sudah tertanam di `index.html` (konstanta `API_DEFAULT`) dan `config.js`. Kalau suatu saat pindah ke Google Sheet lain, cukup ganti URL di `config.js`.

Cek koneksi: buka `URL…/exec?action=sesi` di browser. Hasilnya harus `{"ok":true,"sesi":[...]}`.

## Langkah 3 — Unggah ke GitHub Pages

1. Di GitHub, klik **New repository**, misalnya dengan nama `kalkulator-tem`, lalu pilih **Public**.
2. Klik **Add file → Upload files**. Seret file `index.html`, `config.js`, `manifest.json`, `sw.js`, `icon-192.png`, dan `icon-512.png`. Klik **Commit changes**.
3. Buka **Settings → Pages → Branch: `main` / `(root)` → Save**.
4. Tunggu 1–2 menit. Aplikasi akan tayang di `https://<akun>.github.io/kalkulator-tem/`.

Bagikan link tersebut ke peserta, misalnya lewat QR code atau grup WA. Di HP, peserta bisa memilih **Tambahkan ke layar utama** supaya aplikasi terbuka seperti aplikasi biasa.

---

## Cara pakai saat pelatihan

**Fasilitator**
1. Buka aplikasi, lalu isi form **Buat sesi baru**: nama sesi, tanggal, lokasi, jumlah anak, dan PIN.
2. Isi data **Gold standard** (M1 dan M2) di tab pertama. Hanya fasilitator ber-PIN yang bisa mengisinya.
3. Pantau **Rekap semua pengukur**. Tabel ini diperbarui otomatis tiap 20 detik, atau bisa ditarik manual lewat tombol *Muat ulang data*. Tombol **Salin rekap ke Excel** menyalin tabelnya untuk ditempel di laporan.
4. Ambang TEM dan jumlah anak bisa diubah di *Pengaturan*. Perubahan berlaku untuk semua perangkat.

**Peserta / asisten pencatat**
1. Buka link, lalu pilih sesi.
2. Ketuk **+ Pengukur**, tulis nama, lalu isi M1 dan M2 tiap anak. Data tersimpan otomatis.
3. Hasil dan keputusan langsung tampil di **Papan hasil**.

**Catatan**
- Kalau sinyal hilang, isian tetap tersimpan di HP (status *Offline · n antre*) dan terkirim otomatis begitu tersambung lagi.
- Nama pengukur harus unik dalam satu sesi.
- Menghapus pengukur yang sudah tersimpan hanya bisa dilakukan fasilitator.
- Nilai yang diterima database 30–140 cm, untuk mencegah salah ketik.

## Rumus

- TEM = √(ΣD² / 2N), dengan D = M1 − M2
- %TEM = TEM / rerata seluruh hasil ukur × 100
- R = 1 − TEM² / SD²
- TEM akurasi = √(ΣD² / 2N), dengan D = rerata peserta − rerata gold standard per anak (bisa diganti ke "M1 vs M1" di Pengaturan)
- Bias = rerata (peserta − gold standard), bertanda

Ambang default mengikuti MPI 2 (WHO–UNICEF 2019):
- TEM presisi peserta < 0,6 cm
- TEM akurasi < 0,8 cm
- TEM gold standard < 0,4 cm
- %TEM < 1,5% dan R > 0,95 sebagai acuan tambahan

---

Developed by : Manjilala
