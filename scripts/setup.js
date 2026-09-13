require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setup() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    const db = process.env.DB_NAME || 'bukit_doa_cms';
    console.log('⏳ Membuat database...');
    // `execute` uses prepared statement protocol which doesn't support
    // certain commands like CREATE DATABASE / USE. Use `query` here.
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${db}\``);

    console.log('⏳ Membuat tabel-tabel...');

    // Admins
    await conn.execute(`CREATE TABLE IF NOT EXISTS admins (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Site settings (key-value CMS)
    await conn.execute(`CREATE TABLE IF NOT EXISTS settings (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value LONGTEXT,
      setting_group VARCHAR(50) DEFAULT 'general',
      label VARCHAR(150),
      type ENUM('text','textarea','richtext','image','color') DEFAULT 'text',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Images/gallery
    await conn.execute(`CREATE TABLE IF NOT EXISTS images (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      caption VARCHAR(255) DEFAULT '',
      category VARCHAR(100) DEFAULT 'Fasilitas',
      sort_order INT DEFAULT 0,
      uploaded_by INT UNSIGNED,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Schedules
    await conn.execute(`CREATE TABLE IF NOT EXISTS schedules (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      day_info VARCHAR(100) NOT NULL,
      time_info VARCHAR(80) NOT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Facilities
    await conn.execute(`CREATE TABLE IF NOT EXISTS facilities (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      icon_svg TEXT,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // History timeline
    await conn.execute(`CREATE TABLE IF NOT EXISTS history (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      year_label VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      content TEXT NOT NULL,
      sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Access/transport info
    await conn.execute(`CREATE TABLE IF NOT EXISTS access_info (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      transport_type VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      icon_name VARCHAR(50) DEFAULT 'bus',
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Nav links
    await conn.execute(`CREATE TABLE IF NOT EXISTS nav_links (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      label VARCHAR(80) NOT NULL,
      url VARCHAR(255) NOT NULL,
      target VARCHAR(20) DEFAULT '_self',
      is_button TINYINT(1) DEFAULT 0,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log('⏳ Mengisi data default...');

    // Default settings
    const defaultSettings = [
      // General
      ['site_logo', '', 'general', 'Logo Website (upload via panel admin)', 'image'],
      ['site_name', 'Bukit Doa Getsemani', 'general', 'Nama Website', 'text'],
      ['site_tagline', 'Ungaran', 'general', 'Tagline / Kota', 'text'],
      ['site_description', 'Rumah doa bagi segala bangsa. Tempat untuk bersekutu, berdoa, dan memuliakan Tuhan di Ungaran, Jawa Tengah.', 'general', 'Deskripsi Website', 'textarea'],
      // Hero
      ['hero_title', 'Bukit Doa\nGetsemani', 'hero', 'Judul Hero', 'text'],
      ['hero_subtitle', 'Rumah doa bagi segala bangsa', 'hero', 'Sub-judul Hero', 'text'],
      ['hero_location', 'Ungaran, Jawa Tengah', 'hero', 'Label Lokasi di Hero', 'text'],
      ['hero_hint', 'Klik untuk lihat fasilitas lengkap', 'hero', 'Teks Hint Klik Foto', 'text'],
      // Pesan utama
      ['pesan_quote', '"Rumah-Ku akan disebut rumah doa bagi segala bangsa"', 'pesan', 'Kutipan Utama', 'text'],
      ['pesan_source', 'Yesaya 56:7', 'pesan', 'Sumber Kutipan', 'text'],
      // Contact
      ['contact_whatsapp', '628112736100', 'contact', 'Nomor WhatsApp (tanpa +)', 'text'],
      ['contact_instagram', 'bukitdoagetsemani', 'contact', 'Username Instagram', 'text'],
      ['contact_youtube', 'https://www.youtube.com/@BukitDoaGetsemaniUngaran', 'contact', 'Link YouTube', 'text'],
      ['contact_address', 'Jl. Sindoro 1, Bandarjo\nUngaran, Kabupaten Semarang\nJawa Tengah', 'contact', 'Alamat Lengkap', 'textarea'],
      ['contact_maps_embed', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.0847539424!2d110.39!3d-7.17!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e708ca06b6bdb33%3A0x8cb2a6db09ab1f72!2sBukit%20Doa%20Getsemani%20Ungaran!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid', 'contact', 'URL Embed Google Maps', 'text'],
      ['contact_maps_link', 'https://maps.google.com/?q=Bukit+Doa+Getsemani+Ungaran', 'contact', 'Link Google Maps (buka baru)', 'text'],
      // Operating hours
      ['hours_open', '05.00', 'hours', 'Jam Buka', 'text'],
      ['hours_close', '22.00', 'hours', 'Jam Tutup', 'text'],
      ['hours_note', 'Buka setiap hari termasuk hari libur nasional', 'hours', 'Catatan Jam Operasional', 'text'],
      // Rules
      ['rules_overnight_min', '2 hari (2×24 jam)', 'rules', 'Minimal Menginap', 'text'],
      ['rules_overnight_max', '3 hari (3×24 jam)', 'rules', 'Maksimal Menginap', 'text'],
      ['rules_overnight_note', 'Wajib menyerahkan KTP/SIM yang masih berlaku. Tidak diperkenankan meninggalkan lokasi selama masa menginap.', 'rules', 'Catatan Aturan Menginap', 'textarea'],
      ['rules_group_notice', 'Minimal 2 minggu sebelumnya', 'rules', 'Konfirmasi Pinjam Ruangan', 'text'],
      ['rules_donation', 'Tidak ada biaya masuk maupun parkir. Persembahan sukarela melalui kotak persembahan yang tersedia.', 'rules', 'Info Donasi/Biaya', 'textarea'],
      // Footer
      ['footer_tagline', 'Yesaya 56:7 — Rumah doa bagi segala bangsa', 'footer', 'Tagline Footer', 'text'],
      ['footer_copyright', 'Bukit Doa Getsemani Ungaran', 'footer', 'Teks Copyright', 'text'],
      // About section
      ['about_title', 'Tentang Kami', 'about', 'Judul Halaman Tentang', 'text'],
      ['about_intro', 'Bukit Doa Getsemani Ungaran adalah tempat doa yang terbuka untuk semua umat Kristiani dari berbagai latar belakang gereja dan daerah.', 'about', 'Paragraf Intro Tentang', 'textarea'],
      // Sejarah
      ['sejarah_intro', 'Sejak tahun 1978, timbul di dalam hati kami suatu kerinduan untuk memiliki suatu tempat doa untuk umat Kristiani serta tempat untuk retreat dan kegiatan-kegiatan Kristiani lainnya. Salah satu pendiri Bukit Doa ini adalah Samuel Elkana.', 'sejarah', 'Paragraf Sejarah', 'textarea'],
      ['sejarah_vision_quote', '"Rumah-Ku akan disebut rumah doa bagi segala bangsa"', 'sejarah', 'Kutipan Visi di Sejarah', 'text'],
      ['sejarah_vision_source', 'Yesaya 56:7', 'sejarah', 'Sumber Visi', 'text'],
      ['sejarah_vision_desc', 'Visi inilah yang menjadi landasan pelayanan Bukit Doa Getsemani — terbuka untuk semua orang yang rindu bersekutu dan berjumpa dengan Tuhan.', 'sejarah', 'Deskripsi Visi', 'textarea'],
      // Kegiatan button
      ['kegiatan_url', 'https://www.instagram.com/bukitdoagetsemani', 'general', 'Link Tombol Kegiatan', 'text'],
    ];

    for (const [key, value, group, label, type] of defaultSettings) {
      await conn.execute(
        `INSERT INTO settings (setting_key, setting_value, setting_group, label, type) VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
        [key, value, group, label, type]
      );
    }

    // Default schedules
    const schedules = [
      ['Renungan & Doa', 'Senin – Jumat', 'Pk. 08.30 – 09.30', 1],
      ['Worship Night', 'Senin – Kamis', 'Pk. 18.30', 2],
      ['Word and Worship', 'Setiap Jumat', 'Pk. 18.30', 3],
      ['Ibadah Raya 1', 'Setiap Sabtu', 'Pk. 10.00', 4],
      ['Ibadah Raya 2', 'Setiap Minggu', 'Pk. 17.00', 5],
    ];
    for (const [name, day, time, order] of schedules) {
      await conn.execute(
        `INSERT INTO schedules (name, day_info, time_info, sort_order) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE name=name`,
        [name, day, time, order]
      );
    }

    // Default facilities
    const facilities = [
      ['Goa-Goa Doa', 'Tersedia goa-goa doa untuk berdoa, membaca Alkitab, dan merenungkan Firman Tuhan secara pribadi.', 1],
      ['Gedung Pujian & Penyembahan', 'Gedung yang digunakan untuk memuji dan menyembah Tuhan bersama dalam satu hati.', 2],
      ['Ruangan Persekutuan', 'Ruangan yang dipinjamkan untuk bersekutu dan berdoa bersama secara berkelompok (10–80 orang).', 3],
      ['Penginapan (Rumah Elim)', 'Tersedia untuk tamu yang ingin berdoa dan bermalam. Minimal 2 hari, maksimal 3 hari.', 4],
      ['Gedung Ibadah Utama', 'Gedung utama untuk ibadah raya setiap Sabtu dan Minggu.', 5],
      ['Toko Buku & Perpustakaan', 'Tersedia toko buku rohani dan perpustakaan referensi teologi dan iman.', 6],
    ];
    for (const [title, desc, order] of facilities) {
      await conn.execute(
        `INSERT INTO facilities (title, description, sort_order) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE title=title`,
        [title, desc, order]
      );
    }

    // Default history
    const history = [
      ['1978', 'Kerinduan Pertama', 'Timbul kerinduan di hati para pendiri untuk memiliki tempat doa bagi umat Kristiani — tempat retreat dan kegiatan rohani yang dapat melayani banyak jiwa.', 1],
      ['Februari 1980', 'Tanah Ditawarkan', 'Ditawarkan tanah milik Gereja Kristen Jawa Tengah Utara di daerah Bandarjo, Ungaran. Sebuah awal yang penuh doa dan pengharapan.', 2],
      ['Peneguhan', 'Kehendak Tuhan Dikonfirmasi', 'Setelah banyak doa dan pergumulan bersama saudara seiman, diperoleh peneguhan bahwa Tuhan menghendaki tanah tersebut untuk kemuliaan Nama-Nya.', 3],
      ['Hingga Kini', 'Melayani Ribuan Jiwa', 'Bukit Doa Getsemani kini dikunjungi umat dari berbagai latar belakang, melayani dari siswa SMP hingga lansia dan hamba-hamba Tuhan.', 4],
    ];
    for (const [year, title, content, order] of history) {
      await conn.execute(
        `INSERT INTO history (year_label, title, content, sort_order) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE year_label=year_label`,
        [year, title, content, order]
      );
    }

    // Default access info
    const access = [
      ['Bus Antar Kota', 'Dari Semarang ke arah Solo/Jogja melewati Ungaran, turun di depan gang Jl. Sindoro 1 (depan Polres Semarang).', 'bus', 1],
      ['Travel', 'Tamu yang menggunakan jasa travel dapat langsung meminta diantar ke alamat Bukit Doa Getsemani.', 'car', 2],
      ['Pesawat / Kereta Api', 'Dari Bandara Ahmad Yani atau Stasiun Tawang/Poncol, gunakan Taxi, GoCar, atau GrabCar ke Bukit Doa Getsemani Ungaran.', 'plane', 3],
      ['Kendaraan Pribadi', 'Lewati jalur utama Semarang – Solo/Jogja. Masuk Kota Ungaran, cari Jl. Sindoro 1 di depan Polres Semarang. Parkir gratis.', 'car', 4],
    ];
    for (const [type, desc, icon, order] of access) {
      await conn.execute(
        `INSERT INTO access_info (transport_type, description, icon_name, sort_order) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE transport_type=transport_type`,
        [type, desc, icon, order]
      );
    }

    // Default nav links
    const navLinks = [
      ['Sejarah', '/sejarah', '_self', 0, 1],
      ['Tentang Kami', '/tentang', '_self', 0, 2],
      ['Fasilitas', '/fasilitas', '_self', 0, 3],
      ['Kontak', '#kontak', '_self', 0, 4],
      ['Kegiatan', 'https://www.instagram.com/bukitdoagetsemani', '_blank', 1, 5],
    ];
    for (const [label, url, target, isBtn, order] of navLinks) {
      await conn.execute(
        `INSERT INTO nav_links (label, url, target, is_button, sort_order) VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE label=label`,
        [label, url, target, isBtn, order]
      );
    }

    console.log('\n✅ Setup selesai!');
    console.log('   Database :', db);
    console.log('   Tabel    : admins, settings, images, schedules, facilities, history, access_info, nav_links');
    console.log('\n👉 Sekarang jalankan: npm start');
    console.log('   Buka: http://localhost:3000/admin/register untuk daftar admin pertama.\n');
  } catch (err) {
    console.error('\n❌ Setup gagal:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}
setup();

// ===== RESERVASI TABLES =====
async function addReservationTables() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST||'localhost', port: process.env.DB_PORT||3306,
      user: process.env.DB_USER||'root', password: process.env.DB_PASSWORD||'',
      database: process.env.DB_NAME||'bukit_doa_cms'
    });

    // Reservation types
    await conn.execute(`CREATE TABLE IF NOT EXISTS reservation_types (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      price_info VARCHAR(255) DEFAULT 'Sukarela / Hubungi Kami',
      max_days INT DEFAULT NULL,
      min_days INT DEFAULT 1,
      requires_id TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Room capacity options
    await conn.execute(`CREATE TABLE IF NOT EXISTS room_capacities (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      label VARCHAR(80) NOT NULL,
      value INT NOT NULL,
      sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Reservations
    await conn.execute(`CREATE TABLE IF NOT EXISTS reservations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reservation_code VARCHAR(20) NOT NULL UNIQUE,
      type_id INT UNSIGNED,
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(100) DEFAULT '',
      church_org VARCHAR(150) DEFAULT '',
      group_size INT DEFAULT 1,
      room_capacity_id INT UNSIGNED DEFAULT NULL,
      check_in DATE NOT NULL,
      check_out DATE DEFAULT NULL,
      purpose TEXT,
      special_request TEXT,
      status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES reservation_types(id) ON DELETE SET NULL,
      FOREIGN KEY (room_capacity_id) REFERENCES room_capacities(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Default reservation types
    const types = [
      ['Menginap (Berdoa & Bermalam)', 'Tamu yang ingin berdoa dan bermalam di Bukit Doa Getsemani. Minimal 2 hari, maksimal 3 hari.', 'Sukarela (Kotak Persembahan)', 3, 2, 1, 1],
      ['Pinjam Ruangan Persekutuan', 'Rombongan gereja atau persekutuan doa yang ingin meminjam ruangan untuk kegiatan bersama.', 'Sukarela (Kotak Persembahan)', null, 1, 0, 2],
      ['Kunjungan & Doa di Goa', 'Tamu yang datang untuk berdoa di goa-goa doa, tidak bermalam.', 'Gratis', null, 1, 0, 3],
    ];
    for (const [name, desc, price, maxD, minD, reqId, ord] of types) {
      await conn.execute(
        `INSERT INTO reservation_types (name,description,price_info,max_days,min_days,requires_id,sort_order)
         VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=name`,
        [name, desc, price, maxD, minD, reqId, ord]
      );
    }

    // Default room capacities
    const caps = [[10,1],[15,2],[20,3],[25,4],[40,5],[80,6]];
    for (const [val, ord] of caps) {
      await conn.execute(
        `INSERT INTO room_capacities (label,value,sort_order) VALUES (?,?,?) ON DUPLICATE KEY UPDATE label=label`,
        [val + ' orang', val, ord]
      );
    }

    console.log('✅ Tabel reservasi berhasil dibuat!');
  } catch(e) {
    console.error('❌ Tabel reservasi gagal:', e.message);
  } finally {
    if (conn) await conn.end();
  }
}

addReservationTables();
