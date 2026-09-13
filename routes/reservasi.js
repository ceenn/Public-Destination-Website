const express = require('express');
const router  = express.Router();
const db      = require('../db');

function generateCode() {
  const d = new Date();
  const ymd = d.getFullYear().toString().slice(-2)
    + String(d.getMonth()+1).padStart(2,'0')
    + String(d.getDate()).padStart(2,'0');
  const rand = Math.floor(Math.random()*9000+1000);
  return `BDG${ymd}${rand}`;
}

// Public: form
router.get('/', async (req, res) => {
  const [types] = await db.query('SELECT * FROM reservation_types WHERE is_active=1 ORDER BY sort_order');
  const [caps]  = await db.query('SELECT * FROM room_capacities ORDER BY sort_order');
  const h = require('../helpers');
  const pub = await h.getPublicData();
  res.render('reservasi/form', { ...pub, types, caps, selectedType: req.query.type||null, error:null, success:null });
});

// Public: submit
router.post('/submit', async (req, res) => {
  const h = require('../helpers');
  const pub = await h.getPublicData();
  const [types] = await db.query('SELECT * FROM reservation_types WHERE is_active=1 ORDER BY sort_order');
  const [caps]  = await db.query('SELECT * FROM room_capacities ORDER BY sort_order');

  const { type_id, full_name, phone, email, church_org, group_size, room_capacity_id, check_in, check_out, purpose, special_request } = req.body;

  const fail = (msg) => res.render('reservasi/form', { ...pub, types, caps, selectedType: type_id, error: msg, success: null });

  if (!type_id || !full_name || !phone || !check_in) return fail('Nama, nomor telepon, jenis kunjungan, dan tanggal kedatangan wajib diisi.');

  const cin   = new Date(check_in);
  const cout  = check_out ? new Date(check_out) : null;
  const today = new Date(); today.setHours(0,0,0,0);

  if (cin < today) return fail('Tanggal kedatangan tidak boleh di masa lalu.');
  if (cout && cout <= cin) return fail('Tanggal kepulangan harus setelah tanggal kedatangan.');

  const [[resType]] = await db.query('SELECT * FROM reservation_types WHERE id=?', [type_id]);
  if (resType && cout) {
    const days = Math.ceil((cout - cin)/(1000*60*60*24));
    if (resType.min_days && days < resType.min_days) return fail(`Minimal menginap ${resType.min_days} hari untuk jenis kunjungan ini.`);
    if (resType.max_days && days > resType.max_days) return fail(`Maksimal menginap ${resType.max_days} hari untuk jenis kunjungan ini.`);
  }

  let code, exists = true;
  while (exists) {
    code = generateCode();
    const [[row]] = await db.query('SELECT id FROM reservations WHERE reservation_code=?', [code]);
    exists = !!row;
  }

  await db.query(
    `INSERT INTO reservations (reservation_code,type_id,full_name,phone,email,church_org,group_size,room_capacity_id,check_in,check_out,purpose,special_request)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [code, type_id||null, full_name, phone, email||'', church_org||'', parseInt(group_size)||1, room_capacity_id||null, check_in, check_out||null, purpose||'', special_request||'']
  );

  res.render('reservasi/sukses', { ...pub, code, full_name, check_in, check_out, resType });
});

// Public: cek status
router.get('/cek', async (req, res) => {
  const h = require('../helpers');
  const pub = await h.getPublicData();
  const code = req.query.kode ? req.query.kode.trim().toUpperCase() : null;
  let reservation = null;

  if (code) {
    const [[r]] = await db.query(
      `SELECT rv.*, rt.name AS type_name, rc.label AS room_label
       FROM reservations rv
       LEFT JOIN reservation_types rt ON rv.type_id=rt.id
       LEFT JOIN room_capacities rc ON rv.room_capacity_id=rc.id
       WHERE rv.reservation_code=?`, [code]
    );
    reservation = r || null;
  }

  res.render('reservasi/cek', { ...pub, code, reservation, error: code && !reservation ? 'Kode reservasi tidak ditemukan.' : null });
});

module.exports = router;
