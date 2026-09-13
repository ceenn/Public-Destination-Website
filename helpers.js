const db = require('./db');

// Load all settings as a plain object: { key: value }
async function getSettings() {
  const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
  const obj = {};
  rows.forEach(r => obj[r.setting_key] = r.setting_value);
  return obj;
}

// Load today's carousel images (rotates daily)
async function getTodayImages() {
  const [rows] = await db.query('SELECT * FROM images ORDER BY sort_order ASC, id ASC');
  if (!rows.length) return [];
  const now = new Date();
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  const off = day % rows.length;
  return [...rows.slice(off), ...rows.slice(0, off)].slice(0, 8);
}

// Load all images
async function getAllImages() {
  const [rows] = await db.query(
    `SELECT i.*, a.username AS uploader FROM images i
     LEFT JOIN admins a ON i.uploaded_by = a.id
     ORDER BY i.sort_order ASC, i.id DESC`
  );
  return rows;
}

async function getSchedules() {
  const [rows] = await db.query('SELECT * FROM schedules WHERE is_active=1 ORDER BY sort_order ASC');
  return rows;
}

async function getFacilities() {
  const [rows] = await db.query('SELECT * FROM facilities WHERE is_active=1 ORDER BY sort_order ASC');
  return rows;
}

async function getHistory() {
  const [rows] = await db.query('SELECT * FROM history ORDER BY sort_order ASC');
  return rows;
}

async function getAccessInfo() {
  const [rows] = await db.query('SELECT * FROM access_info WHERE is_active=1 ORDER BY sort_order ASC');
  return rows;
}

async function getNavLinks() {
  const [rows] = await db.query('SELECT * FROM nav_links WHERE is_active=1 ORDER BY sort_order ASC');
  return rows;
}

// Bundle all public data needed for any page
async function getPublicData() {
  const [s, nav, schedules] = await Promise.all([getSettings(), getNavLinks(), getSchedules()]);
  return { s, nav, schedules };
}

module.exports = { getSettings, getTodayImages, getAllImages, getSchedules, getFacilities, getHistory, getAccessInfo, getNavLinks, getPublicData };
