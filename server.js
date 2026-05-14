require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const initSqlJs  = require('sql.js');
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');

const app      = express();
const PORT     = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DB_PATH  = path.join(__dirname, 'users.db');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── Database ──────────────────────────────────────────────────────────────────
let db;

async function initDb() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      email              TEXT UNIQUE NOT NULL,
      password_hash      TEXT NOT NULL,
      verified           INTEGER DEFAULT 0,
      verification_token TEXT,
      created_at         TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add columns to existing databases that predate this schema
  try { db.run('ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE users ADD COLUMN verification_token TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE users ADD COLUMN reset_token TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE users ADD COLUMN reset_token_expires TEXT'); } catch (_) {}

  saveDb();
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ── Email ─────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function emailConfigured() {
  return process.env.GMAIL_USER &&
    process.env.GMAIL_USER !== 'your-gmail@gmail.com' &&
    process.env.GMAIL_APP_PASSWORD &&
    process.env.GMAIL_APP_PASSWORD !== 'xxxx xxxx xxxx xxxx';
}

// ── POST /api/signup ──────────────────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const check = db.prepare('SELECT id FROM users WHERE email = ?');
  check.bind([normalizedEmail]);
  const exists = check.step();
  check.free();
  if (exists) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const needsVerify  = emailConfigured();
    const token        = needsVerify ? crypto.randomBytes(32).toString('hex') : null;
    const verified     = needsVerify ? 0 : 1;

    db.run(
      'INSERT INTO users (email, password_hash, verified, verification_token) VALUES (?, ?, ?, ?)',
      [normalizedEmail, passwordHash, verified, token]
    );
    saveDb();

    if (needsVerify) {
      const link = `${BASE_URL}/api/verify?token=${token}`;
      transporter.sendMail({
        from:    process.env.GMAIL_USER,
        to:      normalizedEmail,
        subject: 'Verify it\'s you — Entheos Veteran Project',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;">
            <h2 style="color:#1c1e1a;margin-bottom:8px;">Entheos Veteran Project</h2>
            <p style="font-size:1rem;color:#333;">We just need to confirm it's really you. Click the button below to verify your email address and activate your account.</p>
            <a href="${link}" style="display:inline-block;background:#1a6fd4;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:1rem;margin:24px 0;">Verify It's Me</a>
            <p style="color:#999;font-size:0.82em;">If you didn't create an account with Entheos you can safely ignore this email.</p>
          </div>
        `,
      }).catch(err => console.error('Verification email failed:', err.message));

      transporter.sendMail({
        from:    process.env.GMAIL_USER,
        to:      process.env.NOTIFY_EMAIL,
        subject: 'New Account — Entheos Veteran Project',
        text:    `New account registered.\n\nEmail: ${normalizedEmail}\nTime:  ${new Date().toLocaleString()}`,
      }).catch(err => console.error('Admin notification failed:', err.message));

      return res.status(201).json({ message: 'Account created! Check your email for a verification link before logging in.' });
    }

    res.status(201).json({ message: 'Account created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /api/verify ───────────────────────────────────────────────────────────
app.get('/api/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/account.html?verified=error');

  const stmt = db.prepare('SELECT id FROM users WHERE verification_token = ?');
  stmt.bind([token]);
  const found = stmt.step();
  const row   = found ? stmt.getAsObject() : null;
  stmt.free();

  if (!row) return res.redirect('/account.html?verified=error');

  db.run('UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?', [row.id]);
  saveDb();

  res.redirect('/account.html?verified=1');
});

// ── POST /api/signin ──────────────────────────────────────────────────────────
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const stmt = db.prepare('SELECT password_hash, verified FROM users WHERE email = ?');
  stmt.bind([normalizedEmail]);
  const found = stmt.step();
  const row   = found ? stmt.getAsObject() : null;
  stmt.free();

  if (!row) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  try {
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (!row.verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox.' });
    }
    res.json({ email: normalizedEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/forgot-password ─────────────────────────────────────────────────
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const normalizedEmail = email.toLowerCase().trim();
  const stmt = db.prepare('SELECT id FROM users WHERE email = ?');
  stmt.bind([normalizedEmail]);
  const found = stmt.step();
  const row   = found ? stmt.getAsObject() : null;
  stmt.free();

  // Always return success so we don't reveal whether an email is registered
  if (!row) return res.json({ message: 'If that email has an account, a reset link has been sent.' });

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, row.id]);
  saveDb();

  const link = `${BASE_URL}/reset-password.html?token=${token}`;
  transporter.sendMail({
    from:    process.env.GMAIL_USER,
    to:      normalizedEmail,
    subject: 'Reset your Entheos password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;">
        <h2 style="color:#1c1e1a;">Entheos Veteran Project</h2>
        <p style="color:#333;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:#1a6fd4;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:1rem;margin:24px 0;">Reset My Password</a>
        <p style="color:#999;font-size:0.82em;">If you didn't request a password reset you can safely ignore this email.</p>
      </div>
    `,
  }).catch(err => console.error('Reset email failed:', err.message));

  res.json({ message: 'If that email has an account, a reset link has been sent.' });
});

// ── POST /api/reset-password ──────────────────────────────────────────────────
app.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const stmt = db.prepare('SELECT id, reset_token_expires FROM users WHERE reset_token = ?');
  stmt.bind([token]);
  const found = stmt.step();
  const row   = found ? stmt.getAsObject() : null;
  stmt.free();

  if (!row) return res.status(400).json({ error: 'Reset link is invalid or has already been used.' });
  if (new Date(row.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [passwordHash, row.id]);
    saveDb();
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /api/is-verified ─────────────────────────────────────────────────────
app.get('/api/is-verified', (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email required.' });

  const stmt = db.prepare('SELECT verified FROM users WHERE email = ?');
  stmt.bind([email]);
  const found = stmt.step();
  const row   = found ? stmt.getAsObject() : null;
  stmt.free();

  if (!row) return res.status(404).json({ error: 'Account not found.' });
  res.json({ verified: !!row.verified });
});

// ── POST /api/delete-account ─────────────────────────────────────────────────
app.post('/api/delete-account', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const normalizedEmail = email.toLowerCase().trim();
  const stmt = db.prepare('SELECT id, password_hash FROM users WHERE email = ?');
  stmt.bind([normalizedEmail]);
  const found = stmt.step();
  const row   = found ? stmt.getAsObject() : null;
  stmt.free();

  if (!row) return res.status(404).json({ error: 'Account not found.' });

  try {
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password.' });

    db.run('DELETE FROM users WHERE id = ?', [row.id]);
    saveDb();
    res.json({ message: 'Account deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
app.get('/api/admin/users', (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const stmt = db.prepare('SELECT id, email, verified, created_at FROM users ORDER BY created_at DESC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  res.json(rows);
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on ${BASE_URL}`));
});
