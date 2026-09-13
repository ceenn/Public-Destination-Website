const express = require('express');
const router  = express.Router();
const db      = require('../db');

const auth = (req, res, next) => {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
};

// List reservations
router.get('/', auth, async (req, res) => {
  const status = req.query.status || '';
  const search = req.query.q || '';
  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND rv.status=?'; params.push(status); }
  if (search) { where += ' AND (rv.reservation_code LIKE ? OR rv.full_name LIKE ? OR rv.phone LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }

  const [reservations] = await db.query(
    `SELECT rv.*, rt.name AS type_name
     FROM reservations rv
     LEFT JOIN reservation_types rt ON rv.type_id=rt.id
     ${where} ORDER BY rv.created_at DESC`, params
  );

  const [[{ total }]]    = await db.query('SELECT COUNT(*) AS total FROM reservations');
  const [[{ pending }]]  = await db.query("SELECT COUNT(*) AS pending FROM reservations WHERE status='pending'");
  const [[{ confirmed }]]= await db.query("SELECT COUNT(*) AS confirmed FROM reservations WHERE status='confirmed'");

  res.render('admin/reservasi/list', { reservations, total, pending, confirmed, status, search });
});

// Detail
router.get('/:id', auth, async (req, res) => {
  const [[rv]] = await db.query(
    `SELECT rv.*, rt.name AS type_name, rt.description AS type_desc,
            rc.label AS room_label
     FROM reservations rv
     LEFT JOIN reservation_types rt ON rv.type_id=rt.id
     LEFT JOIN room_capacities rc ON rv.room_capacity_id=rc.id
     WHERE rv.id=?`, [req.params.id]
  );
  if (!rv) { req.session.flash={type:'error',msg:'Reservasi tidak ditemukan.'}; return res.redirect('/admin/reservasi'); }
  res.render('admin/reservasi/detail', { rv });
});

// Update status
router.post('/:id/status', auth, async (req, res) => {
  const { status, admin_notes } = req.body;
  const allowed = ['pending','confirmed','cancelled','completed'];
  if (!allowed.includes(status)) { req.session.flash={type:'error',msg:'Status tidak valid.'}; return res.redirect('/admin/reservasi'); }
  await db.query('UPDATE reservations SET status=?, admin_notes=? WHERE id=?', [status, admin_notes||'', req.params.id]);
  req.session.flash = { type:'success', msg:'Status reservasi diperbarui.' };
  res.redirect('/admin/reservasi/'+req.params.id);
});

// Delete
router.post('/:id/delete', auth, async (req, res) => {
  await db.query('DELETE FROM reservations WHERE id=?', [req.params.id]);
  req.session.flash = { type:'success', msg:'Reservasi dihapus.' };
  res.redirect('/admin/reservasi');
});

// Reservation types management
router.get('/settings/types', auth, async (req, res) => {
  const [types] = await db.query('SELECT * FROM reservation_types ORDER BY sort_order');
  const [caps]  = await db.query('SELECT * FROM room_capacities ORDER BY sort_order');
  res.render('admin/reservasi/types', { types, caps });
});

router.post('/settings/types/add', auth, async (req, res) => {
  const { name, description, price_info, min_days, max_days, requires_id } = req.body;
  const [[{m}]] = await db.query('SELECT MAX(sort_order) AS m FROM reservation_types');
  await db.query('INSERT INTO reservation_types (name,description,price_info,min_days,max_days,requires_id,sort_order) VALUES (?,?,?,?,?,?,?)',
    [name, description||'', price_info||'Sukarela', parseInt(min_days)||1, max_days?parseInt(max_days):null, requires_id?1:0, (m||0)+1]);
  req.session.flash={type:'success',msg:'Jenis reservasi ditambahkan.'};
  res.redirect('/admin/reservasi/settings/types');
});

router.post('/settings/types/update/:id', auth, async (req, res) => {
  const { name, description, price_info, min_days, max_days, requires_id, is_active } = req.body;
  await db.query('UPDATE reservation_types SET name=?,description=?,price_info=?,min_days=?,max_days=?,requires_id=?,is_active=? WHERE id=?',
    [name, description||'', price_info||'', parseInt(min_days)||1, max_days?parseInt(max_days):null, requires_id?1:0, is_active?1:0, req.params.id]);
  req.session.flash={type:'success',msg:'Jenis reservasi diperbarui.'};
  res.redirect('/admin/reservasi/settings/types');
});

router.post('/settings/types/delete/:id', auth, async (req, res) => {
  await db.query('DELETE FROM reservation_types WHERE id=?', [req.params.id]);
  req.session.flash={type:'success',msg:'Jenis reservasi dihapus.'};
  res.redirect('/admin/reservasi/settings/types');
});

module.exports = router;
