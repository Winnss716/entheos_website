require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const initSqlJs  = require('sql.js');
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');
const rateLimit  = require('express-rate-limit');

const app      = express();
const PORT     = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DB_PATH  = path.join(__dirname, 'users.db');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true, legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many accounts created from this device. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many email requests. Please wait an hour before trying again.' },
  standardHeaders: true, legacyHeaders: false,
});

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
app.post('/api/signup', signupLimiter, async (req, res) => {
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
app.post('/api/signin', loginLimiter, async (req, res) => {
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

// ── POST /api/resend-verification ────────────────────────────────────────────
app.post('/api/resend-verification', emailLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const normalizedEmail = email.toLowerCase().trim();
  const stmt = db.prepare('SELECT id, verified, verification_token FROM users WHERE email = ?');
  stmt.bind([normalizedEmail]);
  const found = stmt.step();
  const row   = found ? stmt.getAsObject() : null;
  stmt.free();

  if (!row) return res.json({ message: 'If that email has an account, a verification link has been sent.' });
  if (row.verified) return res.json({ message: 'This account is already verified. You can log in.' });

  const token = crypto.randomBytes(32).toString('hex');
  db.run('UPDATE users SET verification_token = ? WHERE id = ?', [token, row.id]);
  saveDb();

  const link = `${BASE_URL}/api/verify?token=${token}`;
  transporter.sendMail({
    from:    process.env.GMAIL_USER,
    to:      normalizedEmail,
    subject: 'Verify it\'s you — Entheos Veteran Project',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;">
        <h2 style="color:#1c1e1a;">Entheos Veteran Project</h2>
        <p style="color:#333;">Here's a new verification link for your account.</p>
        <a href="${link}" style="display:inline-block;background:#1a6fd4;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:1rem;margin:24px 0;">Verify It's Me</a>
        <p style="color:#999;font-size:0.82em;">If you didn't create an account with Entheos you can safely ignore this email.</p>
      </div>
    `,
  }).catch(err => console.error('Resend verification failed:', err.message));

  res.json({ message: 'Verification email sent. Check your inbox.' });
});

// ── POST /api/confirm-application ────────────────────────────────────────────
app.post('/api/confirm-application', (req, res) => {
  const { email, firstName, refCode } = req.body;
  if (!email || !firstName || !refCode) return res.status(400).json({ error: 'Missing fields.' });

  transporter.sendMail({
    from:    process.env.GMAIL_USER,
    to:      email,
    subject: 'Your Application Has Been Received — Entheos Veteran Project',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px 24px;background:#f9f9f9;">
        <div style="background:#1c1e1a;padding:24px 28px;border-radius:6px 6px 0 0;text-align:center;">
          <div style="font-family:Georgia,serif;font-size:1.8rem;letter-spacing:0.1em;color:#c8aa5a;font-weight:bold;">ENTHEOS</div>
          <div style="color:rgba(245,240,232,0.5);font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;">Veteran Project</div>
        </div>
        <div style="background:#fff;padding:32px 28px;border-radius:0 0 6px 6px;border:1px solid #e0e0e0;border-top:none;">
          <h2 style="color:#1c1e1a;margin-bottom:8px;">Application Received, ${firstName}</h2>
          <p style="color:#444;line-height:1.7;">Thank you for submitting your application. Our team will review it within <strong>7–10 business days</strong> and will contact you at this email address.</p>
          <div style="background:#f5f0e8;border:1px solid #c8aa5a;border-radius:4px;padding:16px 20px;margin:24px 0;text-align:center;">
            <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#888;margin-bottom:6px;">Your Reference Code</div>
            <div style="font-size:1.4rem;font-weight:700;letter-spacing:0.12em;color:#c8aa5a;">${refCode}</div>
            <div style="font-size:0.78rem;color:#888;margin-top:6px;">Save this code to check your status at any time</div>
          </div>
          <p style="color:#444;line-height:1.7;"><strong>What happens next:</strong><br/>
          1. Our team reviews your submission and verifies your service history.<br/>
          2. We may reach out with follow-up questions — check your email and phone.<br/>
          3. You'll receive an approval decision within 7–10 business days.<br/>
          4. If approved, funds go directly to your provider, school, or program.</p>
          <div style="margin-top:24px;text-align:center;">
            <a href="${BASE_URL}/status.html" style="display:inline-block;background:#c8aa5a;color:#1c1e1a;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:0.9rem;">Check Application Status</a>
          </div>
          <p style="color:#888;font-size:0.82em;margin-top:24px;">Questions? Email us at <a href="mailto:Entheosveteranproject@gmail.com" style="color:#c8aa5a;">Entheosveteranproject@gmail.com</a></p>
        </div>
      </div>
    `,
  }).catch(err => console.error('Confirmation email failed:', err.message));

  res.json({ message: 'Confirmation sent.' });
});

// ── POST /api/forgot-password ─────────────────────────────────────────────────
app.post('/api/forgot-password', emailLimiter, async (req, res) => {
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
