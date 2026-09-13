require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST||'localhost', port: process.env.DB_PORT||3306,
      user: process.env.DB_USER||'root', password: process.env.DB_PASSWORD||'',
      database: process.env.DB_NAME||'bukit_doa_cms'
    });
    console.log('Membuat tabel reservasi...');

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

    await conn.execute(`CREATE TABLE IF NOT EXISTS room_capacities (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      label VARCHAR(80) NOT NULL,
      value INT NOT NULL,
      sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

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

    const types = [
      ['Menginap (Berdoa & Bermalam)', 'Tamu yang ingin berdoa dan bermalam. Minimal 2 hari, maksimal 3 hari.', 'Sukarela (Kotak Persembahan)', 3, 2, 1, 1],
      ['Pinjam Ruangan Persekutuan', 'Rombongan yang ingin meminjam ruangan untuk kegiatan bersama (10–80 orang). Konfirmasi min. 2 minggu sebelumnya.', 'Sukarela (Kotak Persembahan)', null, 1, 0, 2],
      ['Kunjungan & Doa di Goa', 'Datang untuk berdoa di goa-goa doa, tidak bermalam. Langsung datang, buka 05.00–22.00 WIB.', 'Gratis', null, 1, 0, 3],
    ];
    for (const [name,desc,price,maxD,minD,reqId,ord] of types) {
      await conn.execute(
        `INSERT INTO reservation_types (name,description,price_info,max_days,min_days,requires_id,sort_order)
         VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=name`,
        [name,desc,price,maxD,minD,reqId,ord]
      );
    }

    const caps = [[10,1],[15,2],[20,3],[25,4],[40,5],[80,6]];
    for (const [val,ord] of caps) {
      await conn.execute(
        `INSERT INTO room_capacities (label,value,sort_order) VALUES (?,?,?) ON DUPLICATE KEY UPDATE label=label`,
        [val+' orang',val,ord]
      );
    }

    console.log('\n✅ Tabel reservasi berhasil!');
    console.log('   Tabel: reservation_types, room_capacities, reservations');
    console.log('\n👉 Jalankan: npm start\n');
  } catch(e) {
    console.error('❌ Gagal:', e.message);
    process.exit(1);
  } finally {
    if(conn) await conn.end();
  }
}
run();
