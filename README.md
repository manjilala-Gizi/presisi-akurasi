# Standardisasi Antropometri — Presisi & Akurasi

Aplikasi web (PWA) pengganti **DHS Height Standardization Tool** (Excel panitia). Aplikasi ini menghitung presisi dan akurasi pengukur panjang/tinggi badan balita, dan hasilnya sama persis dengan sheet *Results* di Excel. Data tersimpan di Google Sheet, sehingga beberapa pencatat bisa mengisi bersamaan dari HP masing-masing.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Aplikasi |
| `config.js` | Tempat menempel URL database (Apps Script) |
| `logo.png`, `icon-192.png`, `icon-512.png` | Logo Kemenkes Poltekkes Makassar dan ikon aplikasi |
| `manifest.json`, `sw.js` | Supaya bisa di-install di HP dan tetap terbuka saat offline |
| `Code.gs` | Kode backend Google Sheet (**tidak** diunggah ke GitHub) |

---

## Langkah 1 — Database Google Sheet

1. Buat **Google Sheet baru**, misalnya dengan nama `Database Standardisasi Antropometri`.
2. Buka **Ekstensi → Apps Script**, hapus isinya, lalu tempel seluruh isi **`Code.gs`**. Klik **Simpan**.
3. Pilih fungsi **`setup`**, lalu klik **Jalankan** dan izinkan akses. Setelah itu muncul sheet `Sesi` dan `Data`.
4. Klik **Terapkan → Deployment baru → Aplikasi web**, dengan setelan:
   - Jalankan sebagai: **Saya**
   - Akses: **Siapa saja**
5. Klik **Terapkan**, lalu salin URL yang berakhiran `/exec`.
6. Cek koneksinya: buka `URL…/exec?action=sesi` di browser. Hasilnya harus `{"ok":true,"sesi":[]}`.

> Kalau `Code.gs` diubah nanti: **Terapkan → Kelola deployment → edit → Versi baru**. Dengan cara ini URL-nya tetap sama.

## Langkah 2 — Tempel URL

Buka `config.js`, lalu isi URL tadi:

```js
window.STD_API = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Kalau dibiarkan kosong, aplikasi berjalan dalam **mode lokal**: data hanya tersimpan di perangkat itu.

## Langkah 3 — GitHub Pages

1. Buat repository baru, misalnya `standardisasi`, dengan setelan **Public**.
2. Klik **Add file → Upload files**, lalu unggah `index.html`, `config.js`, `logo.png`, `icon-192.png`, `icon-512.png`, `manifest.json`, dan `sw.js`.
3. Buka **Settings → Pages → Branch `main` / root → Save**.
4. Aplikasi tayang di `https://<akun>.github.io/standardisasi/`.

---

## Menu

| Menu | Isi |
|---|---|
| **Sesi** | Pilih sesi, atau buat sesi baru (manual atau langsung dari file Excel panitia) |
| **Input Data** | Pilih putaran, pilih pengukur, lalu isi hasil ukur tiap anak. Tersimpan otomatis |
| **Hasil** | Status Lulus/Gagal, TEM presisi, TEM akurasi, bias, kolom alasan, tombol unduh Excel |
| **Presisi** | Grafik TEM per pengukur dan peta selisih putaran 1–2 per anak |
| **Akurasi** | Pilih anak untuk melihat sebaran hasil ukur dibanding nilai expert ± 1 cm |
| **Pengaturan** | (PIN) Daftar anak dan pengukur, batas lulus, impor/unduh Excel, hapus sesi |
| **Panduan** | Cara pakai singkat |

## Rumus (sama dengan DHS tool)

- **Presisi:** TEM = √(Σ(R1−R2)² / 2N)
- **Akurasi:** D = |rerata expert − rerata pengukur| per anak, lalu TEM = √(ΣD² / jumlah pengukuran)
- **Expert** lulus bila presisi < 0,4 cm. Kalau expert gagal, akurasi tidak dihitung.
- **Pengukur** lulus bila presisi < 0,6 cm **dan** akurasi < 0,8 cm.

Hasilnya sudah dicocokkan dengan file `Standardization_Tool_latihan_dummy.xlsx`: ke-11 nama, status, dan rata-ratanya sama persis.

## Catatan

- **PIN fasilitator** dibuat sendiri saat membuat sesi. PIN tidak bisa dilihat kembali, jadi catat baik-baik. Pencatat data tidak perlu PIN.
- **Unduh Excel** menghasilkan sheet `Worksheet` dengan tata letak sama seperti template panitia (putaran 1 mulai sel A7, putaran 2 mulai A23), jadi isinya bisa disalin ke file resmi.
- **Rentang nilai** yang diterima 30–140 cm.
- **Batas jumlah:** maksimal 12 anak dan 12 pengukur per sesi, sama seperti template.

---

Developed by : Manjilala
