require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs-extra');
const bcrypt  = require('bcryptjs');
const sharp   = require('sharp');
const db      = require('./db');
const h       = require('./helpers');

const app  = express();
const PORT = process.env.PORT || 3000;

fs.ensureDirSync('./uploads');
fs.ensureDirSync('./uploads/temp');

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false, saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));

// Flash & auth locals
app.use(async (req, res, next) => {
  res.locals.flash = req.session.flash || null;
  req.session.flash = null;
  res.locals.admin = req.session.admin || null;
  // Pass site_logo to all views (for admin sidebar etc)
  try {
    const [[logoRow]] = await db.query('SELECT setting_value FROM settings WHERE setting_key=?', ['site_logo']);
    res.locals.siteLogo = (logoRow && logoRow.setting_value) ? logoRow.setting_value : null;
  } catch(e) {
    res.locals.siteLogo = null;
  }
  next();
});

// Multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, './uploads/temp/'),
    filename: (_, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(file.originalname))
  }),
  fileFilter: (_, file, cb) => {
    ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype) ? cb(null,true) : cb(new Error('Hanya gambar'))
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

// Auth guard
const auth = (req, res, next) => {
  if (req.session.admin) return next();
  req.session.flash = { type:'error', msg:'Silahkan login terlebih dahulu.' };
  res.redirect('/admin/login');
};

// ═══════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════

app.get('/', async (req, res) => {
  const [images, pub, history, facilities] = await Promise.all([
    h.getTodayImages(), h.getPublicData(), h.getHistory(), h.getFacilities()
  ]);
  res.render('index', { ...pub, images, history, facilities, page: 'home' });
});

app.get('/sejarah', async (req, res) => {
  const [pub, history] = await Promise.all([h.getPublicData(), h.getHistory()]);
  res.render('sejarah', { ...pub, history, page: 'sejarah' });
});

app.get('/fasilitas', async (req, res) => {
  const [pub, images, facilities] = await Promise.all([h.getPublicData(), h.getAllImages(), h.getFacilities()]);
  res.render('fasilitas', { ...pub, images, facilities, page: 'fasilitas' });
});

app.get('/tentang', async (req, res) => {
  const [pub, facilities] = await Promise.all([h.getPublicData(), h.getFacilities()]);
  res.render('tentang', { ...pub, facilities, page: 'tentang' });
});

app.get('/akses', async (req, res) => {
  const [pub, access] = await Promise.all([h.getPublicData(), h.getAccessInfo()]);
  res.render('akses', { ...pub, access, page: 'akses' });
});

// Reservation routes
const reservasiRouter      = require('./routes/reservasi');
const adminReservasiRouter = require('./routes/admin-reservasi');
app.use('/reservasi', reservasiRouter);
app.use('/admin/reservasi', adminReservasiRouter);

// ═══════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════

app.get('/admin/register', async (req, res) => {
  const [[{ c }]] = await db.query('SELECT COUNT(*) AS c FROM admins');
  const first = c === 0;
  if (!first && !req.session.admin) return res.redirect('/admin/login');
  res.render('admin/register', { first, error: null });
});

app.post('/admin/register', async (req, res) => {
  const [[{ c }]] = await db.query('SELECT COUNT(*) AS c FROM admins');
  const first = c === 0;
  if (!first && !req.session.admin) return res.redirect('/admin/login');
  const { username, email, password, confirm_password } = req.body;
  if (!username||!email||!password||!confirm_password) return res.render('admin/register',{first,error:'Semua field wajib diisi.'});
  if (password.length < 6) return res.render('admin/register',{first,error:'Password minimal 6 karakter.'});
  if (password !== confirm_password) return res.render('admin/register',{first,error:'Konfirmasi password tidak cocok.'});
  const [[ex]] = await db.query('SELECT id FROM admins WHERE username=? OR email=?',[username.toLowerCase(),email.toLowerCase()]);
  if (ex) return res.render('admin/register',{first,error:'Username atau email sudah digunakan.'});
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO admins (username,email,password) VALUES (?,?,?)',[username.toLowerCase(),email.toLowerCase(),hash]);
  if (first) {
    const [[a]] = await db.query('SELECT * FROM admins WHERE username=?',[username.toLowerCase()]);
    req.session.admin = { id:a.id, username:a.username, email:a.email };
  }
  req.session.flash = { type:'success', msg:`Admin "${username}" berhasil didaftarkan!` };
  res.redirect('/admin');
});

app.get('/admin/login', async (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  const [[{ c }]] = await db.query('SELECT COUNT(*) AS c FROM admins');
  res.render('admin/login', { error: null, noAdmin: c === 0 });
});

app.post('/admin/login', async (req, res) => {
  const { identifier, password } = req.body;
  const [[{ c }]] = await db.query('SELECT COUNT(*) AS c FROM admins');
  const noAdmin = c === 0;
  const [[a]] = await db.query('SELECT * FROM admins WHERE username=? OR email=?',[identifier?.toLowerCase(),identifier?.toLowerCase()]);
  if (!a) return res.render('admin/login',{error:'Username/email tidak ditemukan.', noAdmin});
  if (!await bcrypt.compare(password, a.password)) return res.render('admin/login',{error:'Password salah.', noAdmin});
  req.session.admin = { id:a.id, username:a.username, email:a.email };
  req.session.flash = { type:'success', msg:`Selamat datang, ${a.username}!` };
  res.redirect('/admin');
});

app.get('/admin/logout', (req, res) => { req.session.destroy(() => res.redirect('/')); });

// ═══════════════════════════════════════
// ADMIN PANEL — DASHBOARD
// ═══════════════════════════════════════

app.get('/admin', auth, async (req, res) => {
  const [[{ imgs }]] = await db.query('SELECT COUNT(*) AS imgs FROM images');
  const [[{ adms }]] = await db.query('SELECT COUNT(*) AS adms FROM admins');
  const [[{ schs }]] = await db.query('SELECT COUNT(*) AS schs FROM schedules');
  const [[{ facs }]] = await db.query('SELECT COUNT(*) AS facs FROM facilities');
  res.render('admin/dashboard', { stats: { imgs, adms, schs, facs } });
});

// ═══════════════════════════════════════
// ADMIN — SETTINGS (site content CMS)
// ═══════════════════════════════════════

app.get('/admin/settings', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM settings ORDER BY setting_group, id');
  const groups = {};
  rows.forEach(r => { if (!groups[r.setting_group]) groups[r.setting_group] = []; groups[r.setting_group].push(r); });
  res.render('admin/settings', { groups });
});

app.post('/admin/settings', auth, async (req, res) => {
  const body = req.body;
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith('_')) continue;
    await db.query('UPDATE settings SET setting_value=? WHERE setting_key=?', [value, key]);
  }
  req.session.flash = { type:'success', msg:'Pengaturan berhasil disimpan!' };
  res.redirect('/admin/settings');
});

// Logo upload
app.post('/admin/settings/logo', auth, upload.single('logo'), async (req, res) => {
  if (!req.file) { req.session.flash = { type:'error', msg:'Pilih file logo.' }; return res.redirect('/admin/settings'); }
  try {
    // Delete old logo file if exists
    const [[old]] = await db.query('SELECT setting_value FROM settings WHERE setting_key=?', ['site_logo']);
    if (old && old.setting_value) {
      const oldPath = `./uploads/${old.setting_value}`;
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const webpName = 'logo-' + Date.now() + '.webp';
    await sharp(`./uploads/temp/${req.file.filename}`)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(`./uploads/${webpName}`);
    fs.unlinkSync(`./uploads/temp/${req.file.filename}`);
    await db.query('UPDATE settings SET setting_value=? WHERE setting_key=?', [webpName, 'site_logo']);
    req.session.flash = { type:'success', msg:'Logo berhasil diupload!' };
  } catch(e) {
    req.session.flash = { type:'error', msg:'Gagal upload logo: ' + e.message };
  }
  res.redirect('/admin/settings');
});

// Logo delete
app.post('/admin/settings/logo/delete', auth, async (req, res) => {
  const [[row]] = await db.query('SELECT setting_value FROM settings WHERE setting_key=?', ['site_logo']);
  if (row && row.setting_value) {
    const p = `./uploads/${row.setting_value}`;
    if (fs.existsSync(p)) fs.unlinkSync(p);
    await db.query('UPDATE settings SET setting_value=? WHERE setting_key=?', ['', 'site_logo']);
  }
  req.session.flash = { type:'success', msg:'Logo dihapus.' };
  res.redirect('/admin/settings');
});

// Settings image upload
app.post('/admin/settings/image', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.redirect('/admin/settings');
  const webpName = Date.now() + '.webp';
  await sharp(`./uploads/temp/${req.file.filename}`).webp({quality:85}).toFile(`./uploads/${webpName}`);
  fs.unlinkSync(`./uploads/temp/${req.file.filename}`);
  await db.query('UPDATE settings SET setting_value=? WHERE setting_key=?', [webpName, req.body.key]);
  req.session.flash = { type:'success', msg:'Gambar berhasil diupdate!' };
  res.redirect('/admin/settings');
});

// ═══════════════════════════════════════
// ADMIN — GALLERY
// ═══════════════════════════════════════

app.get('/admin/gallery', auth, async (req, res) => {
  const images = await h.getAllImages();
  res.render('admin/gallery', { images });
});

app.post('/admin/gallery/upload', auth, upload.single('image'), async (req, res) => {
  if (!req.file) { req.session.flash={type:'error',msg:'Pilih file gambar.'}; return res.redirect('/admin/gallery'); }
  try {
    const webp = req.file.filename.replace(/\.[^.]+$/,'') + '.webp';
    await sharp(`./uploads/temp/${req.file.filename}`).webp({quality:85}).toFile(`./uploads/${webp}`);
    fs.unlinkSync(`./uploads/temp/${req.file.filename}`);
    const [all] = await db.query('SELECT MAX(sort_order) AS m FROM images');
    const nextOrder = (all[0].m || 0) + 1;
    await db.query('INSERT INTO images (filename,caption,category,sort_order,uploaded_by) VALUES (?,?,?,?,?)',
      [webp, req.body.caption||'', req.body.category||'Fasilitas', nextOrder, req.session.admin.id]);
    req.session.flash = { type:'success', msg:'Foto berhasil diupload & dikonversi ke WebP!' };
  } catch(e) { req.session.flash = { type:'error', msg:'Gagal upload: '+e.message }; }
  res.redirect('/admin/gallery');
});

app.post('/admin/gallery/update/:id', auth, async (req, res) => {
  await db.query('UPDATE images SET caption=?, category=? WHERE id=?', [req.body.caption, req.body.category, req.params.id]);
  req.session.flash = { type:'success', msg:'Foto diperbarui.' };
  res.redirect('/admin/gallery');
});

app.post('/admin/gallery/delete/:id', auth, async (req, res) => {
  const [[img]] = await db.query('SELECT * FROM images WHERE id=?', [req.params.id]);
  if (img) { fs.existsSync(`./uploads/${img.filename}`) && fs.unlinkSync(`./uploads/${img.filename}`); await db.query('DELETE FROM images WHERE id=?',[req.params.id]); }
  req.session.flash = { type:'success', msg:'Foto dihapus.' };
  res.redirect('/admin/gallery');
});

app.post('/admin/gallery/reorder', auth, async (req, res) => {
  const { order } = req.body; // array of ids
  if (Array.isArray(order)) {
    for (let i = 0; i < order.length; i++) await db.query('UPDATE images SET sort_order=? WHERE id=?',[i+1, order[i]]);
  }
  res.json({ ok: true });
});

// ═══════════════════════════════════════
// ADMIN — SCHEDULES
// ═══════════════════════════════════════

app.get('/admin/schedules', auth, async (req, res) => {
  const schedules = await h.getSchedules();
  const [all] = await db.query('SELECT * FROM schedules ORDER BY sort_order');
  res.render('admin/schedules', { schedules: all });
});

app.post('/admin/schedules/add', auth, async (req, res) => {
  const { name, day_info, time_info } = req.body;
  const [[{ m }]] = await db.query('SELECT MAX(sort_order) AS m FROM schedules');
  await db.query('INSERT INTO schedules (name,day_info,time_info,sort_order) VALUES (?,?,?,?)',[name,day_info,time_info,(m||0)+1]);
  req.session.flash = { type:'success', msg:'Jadwal ditambahkan.' };
  res.redirect('/admin/schedules');
});

app.post('/admin/schedules/update/:id', auth, async (req, res) => {
  const { name, day_info, time_info, is_active } = req.body;
  await db.query('UPDATE schedules SET name=?,day_info=?,time_info=?,is_active=? WHERE id=?',[name,day_info,time_info,is_active?1:0,req.params.id]);
  req.session.flash = { type:'success', msg:'Jadwal diperbarui.' };
  res.redirect('/admin/schedules');
});

app.post('/admin/schedules/delete/:id', auth, async (req, res) => {
  await db.query('DELETE FROM schedules WHERE id=?',[req.params.id]);
  req.session.flash = { type:'success', msg:'Jadwal dihapus.' };
  res.redirect('/admin/schedules');
});

// ═══════════════════════════════════════
// ADMIN — FACILITIES
// ═══════════════════════════════════════

app.get('/admin/facilities', auth, async (req, res) => {
  const [facs] = await db.query('SELECT * FROM facilities ORDER BY sort_order');
  res.render('admin/facilities', { facilities: facs });
});

app.post('/admin/facilities/add', auth, async (req, res) => {
  const { title, description } = req.body;
  const [[{ m }]] = await db.query('SELECT MAX(sort_order) AS m FROM facilities');
  await db.query('INSERT INTO facilities (title,description,sort_order) VALUES (?,?,?)',[title,description,(m||0)+1]);
  req.session.flash = { type:'success', msg:'Fasilitas ditambahkan.' };
  res.redirect('/admin/facilities');
});

app.post('/admin/facilities/update/:id', auth, async (req, res) => {
  const { title, description, is_active } = req.body;
  await db.query('UPDATE facilities SET title=?,description=?,is_active=? WHERE id=?',[title,description,is_active?1:0,req.params.id]);
  req.session.flash = { type:'success', msg:'Fasilitas diperbarui.' };
  res.redirect('/admin/facilities');
});

app.post('/admin/facilities/delete/:id', auth, async (req, res) => {
  await db.query('DELETE FROM facilities WHERE id=?',[req.params.id]);
  req.session.flash = { type:'success', msg:'Fasilitas dihapus.' };
  res.redirect('/admin/facilities');
});

// ═══════════════════════════════════════
// ADMIN — HISTORY
// ═══════════════════════════════════════

app.get('/admin/history', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM history ORDER BY sort_order');
  res.render('admin/history', { history: rows });
});

app.post('/admin/history/add', auth, async (req, res) => {
  const { year_label, title, content } = req.body;
  const [[{ m }]] = await db.query('SELECT MAX(sort_order) AS m FROM history');
  await db.query('INSERT INTO history (year_label,title,content,sort_order) VALUES (?,?,?,?)',[year_label,title,content,(m||0)+1]);
  req.session.flash = { type:'success', msg:'Sejarah ditambahkan.' };
  res.redirect('/admin/history');
});

app.post('/admin/history/update/:id', auth, async (req, res) => {
  const { year_label, title, content } = req.body;
  await db.query('UPDATE history SET year_label=?,title=?,content=? WHERE id=?',[year_label,title,content,req.params.id]);
  req.session.flash = { type:'success', msg:'Sejarah diperbarui.' };
  res.redirect('/admin/history');
});

app.post('/admin/history/delete/:id', auth, async (req, res) => {
  await db.query('DELETE FROM history WHERE id=?',[req.params.id]);
  req.session.flash = { type:'success', msg:'Entri sejarah dihapus.' };
  res.redirect('/admin/history');
});

// ═══════════════════════════════════════
// ADMIN — ACCESS INFO
// ═══════════════════════════════════════

app.get('/admin/access', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM access_info ORDER BY sort_order');
  res.render('admin/access', { access: rows });
});

app.post('/admin/access/add', auth, async (req, res) => {
  const { transport_type, description } = req.body;
  const [[{ m }]] = await db.query('SELECT MAX(sort_order) AS m FROM access_info');
  await db.query('INSERT INTO access_info (transport_type,description,sort_order) VALUES (?,?,?)',[transport_type,description,(m||0)+1]);
  req.session.flash = { type:'success', msg:'Info akses ditambahkan.' };
  res.redirect('/admin/access');
});

app.post('/admin/access/update/:id', auth, async (req, res) => {
  const { transport_type, description, is_active } = req.body;
  await db.query('UPDATE access_info SET transport_type=?,description=?,is_active=? WHERE id=?',[transport_type,description,is_active?1:0,req.params.id]);
  req.session.flash = { type:'success', msg:'Info akses diperbarui.' };
  res.redirect('/admin/access');
});

app.post('/admin/access/delete/:id', auth, async (req, res) => {
  await db.query('DELETE FROM access_info WHERE id=?',[req.params.id]);
  req.session.flash = { type:'success', msg:'Info akses dihapus.' };
  res.redirect('/admin/access');
});

// ═══════════════════════════════════════
// ADMIN — NAVIGATION
// ═══════════════════════════════════════

app.get('/admin/navigation', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM nav_links ORDER BY sort_order');
  res.render('admin/navigation', { navLinks: rows });
});

app.post('/admin/navigation/add', auth, async (req, res) => {
  const { label, url, target, is_button } = req.body;
  const [[{ m }]] = await db.query('SELECT MAX(sort_order) AS m FROM nav_links');
  await db.query('INSERT INTO nav_links (label,url,target,is_button,sort_order) VALUES (?,?,?,?,?)',[label,url,target||'_self',is_button?1:0,(m||0)+1]);
  req.session.flash = { type:'success', msg:'Menu ditambahkan.' };
  res.redirect('/admin/navigation');
});

app.post('/admin/navigation/update/:id', auth, async (req, res) => {
  const { label, url, target, is_button, is_active } = req.body;
  await db.query('UPDATE nav_links SET label=?,url=?,target=?,is_button=?,is_active=? WHERE id=?',[label,url,target||'_self',is_button?1:0,is_active?1:0,req.params.id]);
  req.session.flash = { type:'success', msg:'Menu diperbarui.' };
  res.redirect('/admin/navigation');
});

app.post('/admin/navigation/delete/:id', auth, async (req, res) => {
  await db.query('DELETE FROM nav_links WHERE id=?',[req.params.id]);
  req.session.flash = { type:'success', msg:'Menu dihapus.' };
  res.redirect('/admin/navigation');
});

// ═══════════════════════════════════════
// ADMIN — ADMINS MANAGEMENT
// ═══════════════════════════════════════

app.get('/admin/admins', auth, async (req, res) => {
  const [admins] = await db.query('SELECT id,username,email,created_at FROM admins ORDER BY id');
  res.render('admin/admins', { admins });
});

app.post('/admin/admins/delete/:id', auth, async (req, res) => {
  if (parseInt(req.params.id) === req.session.admin.id) {
    req.session.flash = { type:'error', msg:'Tidak dapat menghapus akun sendiri.' };
    return res.redirect('/admin/admins');
  }
  await db.query('DELETE FROM admins WHERE id=?',[req.params.id]);
  req.session.flash = { type:'success', msg:'Admin dihapus.' };
  res.redirect('/admin/admins');
});

app.listen(PORT, () => {
  console.log(`\n✝  Bukit Doa Getsemani — Full CMS v3`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin\n`);
});
