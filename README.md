# ✝ Bukit Doa Getsemani — Website Full CMS (v3)

Website profile yang **sepenuhnya dinamis** — admin dapat mengedit semua konten tanpa menyentuh kode:
teks, foto, jadwal ibadah, fasilitas, sejarah, info akses, dan menu navigasi.

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 🔐 Registrasi & Login Admin | Username/email + password, bcrypt hash |
| 🖊 Edit Semua Teks | Judul, deskripsi, kontak, jam, aturan, footer — semua via panel admin |
| 📸 Kelola Galeri Foto | Upload, edit caption/kategori, hapus. Otomatis ke WebP |
| 🔄 Rotasi Foto Harian | Carousel beranda berganti urutan otomatis tiap hari |
| 📅 Kelola Jadwal Ibadah | Tambah/edit/hapus jadwal — tampil otomatis di Beranda & Tentang |
| 🏠 Kelola Fasilitas | Tambah/edit/hapus daftar fasilitas |
| 📜 Kelola Timeline Sejarah | Tambah/edit/hapus entri sejarah |
| 🗺 Kelola Info Akses | Tambah/edit/hapus cara menuju lokasi |
| 🧭 Kelola Menu Navigasi | Atur label, URL, target tab, tombol utama navbar |
| 👥 Multi-Admin | Tambah/hapus admin lain |
| 🔘 Tombol Admin di Landing Page | Tombol melingkar di pojok kanan bawah setiap halaman |
| 🎨 Font Plus Jakarta Sans | Modern, bold, sans-serif |
| 💎 Glassmorphism | Desain putih–hitam–emas, responsif mobile & desktop |

---

## 📋 Prasyarat

| Software | Versi minimum |
|---|---|
| Node.js | 18.x |
| MySQL | 8.0 |

```bash
node -v
mysql --version
```

---

## 🚀 Langkah Instalasi

### 1. Ekstrak & masuk folder
```bash
cd bukit-doa-getsemani-v3
```

### 2. Install dependencies
```bash
npm install
```

### 3. Konfigurasi `.env`
Buka file `.env`:
```env
PORT=3000
SESSION_SECRET=ganti-dengan-string-acak

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password_mysql_anda
DB_NAME=bukit_doa_cms
```
Sesuaikan `DB_PASSWORD` dan `DB_USER` dengan MySQL Anda.

### 4. Setup database (otomatis + isi data default)
```bash
npm run setup
```
Perintah ini membuat **8 tabel** (admins, settings, images, schedules, facilities, history, access_info, nav_links) dan mengisi semua teks default dari profil Bukit Doa Getsemani.

### 5. Jalankan server
```bash
npm start
```

### 6. Daftar admin pertama
Buka **http://localhost:3000/admin/register** → isi username, email, password → otomatis login ke panel admin.

---

## 🗂 Struktur Panel Admin

Setelah login, sidebar kiri berisi:

```
📊 Dashboard           — ringkasan statistik
🎨 Teks & Pengaturan    — edit SEMUA teks website (hero, kontak, jam, aturan, footer, dll)
📸 Galeri Foto          — upload/edit/hapus foto, konversi otomatis ke WebP
📅 Jadwal Ibadah        — kelola jadwal kebaktian
🏠 Fasilitas            — kelola daftar fasilitas
📜 Timeline Sejarah     — kelola entri sejarah
🗺 Info Akses & Lokasi  — kelola cara menuju lokasi
🧭 Menu Navigasi        — kelola menu navbar
👥 Kelola Admin         — lihat/hapus admin lain
➕ Tambah Admin         — daftarkan admin baru
```

Setiap halaman publik (Beranda, Sejarah, Fasilitas, Tentang, Akses) memiliki **tombol bulat hitam-emas** di pojok kanan bawah yang langsung membuka `/admin`.

---

## ✏️ Cara Mengedit Konten

### Mengubah teks (judul, deskripsi, kontak, dsb)
1. Login admin → klik **"Teks & Pengaturan"**
2. Cari field yang ingin diubah (dikelompokkan per kategori)
3. Edit langsung di kotak teks
4. Klik **"💾 Simpan Semua Perubahan"** di bagian bawah

### Mengubah foto carousel/fasilitas
1. Klik **"Galeri Foto"**
2. Upload foto baru, atau edit caption/kategori foto yang ada
3. Hapus foto dengan tombol 🗑

### Mengubah jadwal ibadah
1. Klik **"Jadwal Ibadah"**
2. Isi form tambah, atau klik ✏️ pada baris untuk edit inline

### Mengubah menu navbar
1. Klik **"Menu Navigasi"**
2. Tambah/edit label, URL tujuan, target tab (sama/baru), dan apakah tampil sebagai tombol

---

## 📁 Struktur Folder

```
bukit-doa-getsemani-v3/
├── server.js               ← Semua routing (public + admin)
├── db.js                   ← Koneksi MySQL
├── helpers.js               ← Fungsi pengambil data CMS
├── .env
├── scripts/
│   └── setup.js            ← Setup database + data default
├── public/
│   ├── css/style.css       ← Styling lengkap (Plus Jakarta Sans + CMS)
│   └── js/
│       ├── main.js         ← JS halaman publik
│       └── admin.js        ← JS panel admin
├── views/
│   ├── partials/
│   │   ├── header.ejs / footer.ejs        ← Layout publik (dinamis dari DB)
│   │   └── admin-header.ejs / admin-footer.ejs ← Layout admin
│   ├── index.ejs, sejarah.ejs, fasilitas.ejs, tentang.ejs, akses.ejs
│   └── admin/
│       ├── login.ejs, register.ejs
│       ├── dashboard.ejs, settings.ejs, gallery.ejs
│       ├── schedules.ejs, facilities.ejs, history.ejs
│       ├── access.ejs, navigation.ejs, admins.ejs
└── uploads/                ← Foto tersimpan (WebP)
```

---

## 🗄 Struktur Database

| Tabel | Fungsi |
|---|---|
| `admins` | Akun admin (username, email, password hash) |
| `settings` | Semua teks website (key-value) |
| `images` | Galeri foto + kategori + uploader |
| `schedules` | Jadwal ibadah |
| `facilities` | Daftar fasilitas |
| `history` | Timeline sejarah |
| `access_info` | Cara menuju lokasi |
| `nav_links` | Menu navbar |

---

## ⚙️ Mode Development
```bash
npm run dev
```

## 🌐 Deploy ke Internet
1. **Railway.app** — tambahkan plugin MySQL, set environment variables sesuai `.env`
2. **VPS** — install Node.js + MySQL, jalankan `npm install && npm run setup`, gunakan PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name bukitdoa
   pm2 save
   ```

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---|---|
| `ER_ACCESS_DENIED_ERROR` | Periksa `DB_USER`/`DB_PASSWORD` di `.env` |
| `ECONNREFUSED :3306` | MySQL belum berjalan |
| Tombol admin tidak muncul | Pastikan `npm run setup` sudah dijalankan |
| Foto tidak tersimpan | Cek permission folder `uploads/` |

---

*Yesaya 56:7 — "Rumah-Ku akan disebut rumah doa bagi segala bangsa"*
