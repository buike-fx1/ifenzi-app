// server.js — Ifenzi Beauty Salon backend
// One command to run: npm start
// Serves the public website, the admin dashboard, and the JSON API
// that both talk to. Data lives in data/ifenzi.db (SQLite file).

require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "ifenzi-dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hour login session
}));

/* ---------------- static frontend + admin ---------------- */
app.use(express.static(path.join(__dirname, "public")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

/* ---------------- auth middleware ---------------- */
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

/* =========================================================
   PUBLIC API — used by the customer-facing website
   ========================================================= */

app.get("/api/services", (req, res) => {
  const rows = db.prepare("SELECT * FROM services WHERE active = 1 ORDER BY category, id").all();
  res.json(rows);
});

app.get("/api/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY category, id").all();
  res.json(rows);
});

app.get("/api/reviews", (req, res) => {
  const rows = db.prepare("SELECT id,name,rating,text,created_at FROM reviews WHERE approved = 1 ORDER BY created_at DESC").all();
  res.json(rows);
});

app.get("/api/settings", (req, res) => {
  const rows = db.prepare("SELECT key,value FROM settings").all();
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

app.post("/api/appointments", (req, res) => {
  const { service, staff, date, time, customer_name, phone, email } = req.body || {};
  if (!service || !date || !time || !customer_name || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const info = db.prepare(`
    INSERT INTO appointments (service, staff, date, time, customer_name, phone, email)
    VALUES (?,?,?,?,?,?,?)
  `).run(service, staff || null, date, time, customer_name, phone, email || null);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.post("/api/orders", (req, res) => {
  const { items, customer_name, phone, email, address } = req.body || {};
  if (!items || !Array.isArray(items) || items.length === 0 || !customer_name || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const products = db.prepare("SELECT id,name,price FROM products").all();
  let total = 0;
  const lineItems = items.map(it => {
    const p = products.find(pr => pr.id === it.id);
    if (!p) return null;
    total += p.price * it.qty;
    return { id: p.id, name: p.name, price: p.price, qty: it.qty };
  }).filter(Boolean);
  if (lineItems.length === 0) return res.status(400).json({ error: "No valid items" });

  const info = db.prepare(`
    INSERT INTO orders (items_json, total, customer_name, phone, email, address)
    VALUES (?,?,?,?,?,?)
  `).run(JSON.stringify(lineItems), total, customer_name, phone, email || null, address || null);
  res.json({ ok: true, id: info.lastInsertRowid, total });
});

app.post("/api/messages", (req, res) => {
  const { name, email, phone, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: "Missing required fields" });
  const info = db.prepare(`INSERT INTO messages (name,email,phone,message) VALUES (?,?,?,?)`)
    .run(name, email, phone || null, message);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.post("/api/reviews", (req, res) => {
  // guest-submitted reviews go in unapproved until the owner approves them in Admin
  const { name, rating, text } = req.body || {};
  if (!name || !rating || !text) return res.status(400).json({ error: "Missing required fields" });
  const info = db.prepare(`INSERT INTO reviews (name,rating,text,approved) VALUES (?,?,?,0)`)
    .run(name, Math.max(1, Math.min(5, +rating)), text);
  res.json({ ok: true, id: info.lastInsertRowid });
});

/* =========================================================
   ADMIN AUTH
   ========================================================= */

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username || "");
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  req.session.isAdmin = true;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/me", (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.isAdmin), username: req.session?.username || null });
});

app.post("/api/admin/change-password", requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(req.session.username);
  if (!user || !bcrypt.compareSync(currentPassword || "", user.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  res.json({ ok: true });
});

/* =========================================================
   ADMIN — DASHBOARD OVERVIEW
   ========================================================= */

app.get("/api/admin/overview", requireAdmin, (req, res) => {
  const apptCount = db.prepare("SELECT COUNT(*) c FROM appointments WHERE status = 'pending'").get().c;
  const orderCount = db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'pending'").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status IN ('paid','completed')").get().s;
  const messageCount = db.prepare("SELECT COUNT(*) c FROM messages WHERE is_read = 0").get().c;
  const recentAppts = db.prepare("SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5").all();
  const recentOrders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5").all();
  res.json({
    pendingAppointments: apptCount,
    pendingOrders: orderCount,
    revenue,
    unreadMessages: messageCount,
    recentAppts,
    recentOrders,
  });
});

/* =========================================================
   ADMIN — SERVICES (CRUD)
   ========================================================= */

app.get("/api/admin/services", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM services ORDER BY category, id").all());
});
app.post("/api/admin/services", requireAdmin, (req, res) => {
  const { category, name, price, price_label, duration, description } = req.body || {};
  if (!category || !name || !price || !duration) return res.status(400).json({ error: "Missing fields" });
  const info = db.prepare(`INSERT INTO services (category,name,price,price_label,duration,description) VALUES (?,?,?,?,?,?)`)
    .run(category, name, price, price_label || `${price}`, duration, description || "");
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put("/api/admin/services/:id", requireAdmin, (req, res) => {
  const { category, name, price, price_label, duration, description, active } = req.body || {};
  db.prepare(`UPDATE services SET category=?,name=?,price=?,price_label=?,duration=?,description=?,active=? WHERE id=?`)
    .run(category, name, price, price_label, duration, description, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
app.delete("/api/admin/services/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* =========================================================
   ADMIN — PRODUCTS (CRUD)
   ========================================================= */

app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM products ORDER BY category, id").all());
});
app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { category, name, price, stock } = req.body || {};
  if (!category || !name || !price) return res.status(400).json({ error: "Missing fields" });
  const info = db.prepare(`INSERT INTO products (category,name,price,stock) VALUES (?,?,?,?)`)
    .run(category, name, price, stock ?? 20);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const { category, name, price, stock, active } = req.body || {};
  db.prepare(`UPDATE products SET category=?,name=?,price=?,stock=?,active=? WHERE id=?`)
    .run(category, name, price, stock, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* =========================================================
   ADMIN — APPOINTMENTS
   ========================================================= */

app.get("/api/admin/appointments", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM appointments ORDER BY created_at DESC").all());
});
app.put("/api/admin/appointments/:id", requireAdmin, (req, res) => {
  const { status, date, time, staff } = req.body || {};
  const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare(`UPDATE appointments SET status=?, date=?, time=?, staff=? WHERE id=?`).run(
    status || existing.status, date || existing.date, time || existing.time, staff ?? existing.staff, req.params.id
  );
  res.json({ ok: true });
});
app.delete("/api/admin/appointments/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM appointments WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* =========================================================
   ADMIN — ORDERS
   ========================================================= */

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items_json) })));
});
app.put("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const { status } = req.body || {};
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

/* =========================================================
   ADMIN — MESSAGES
   ========================================================= */

app.get("/api/admin/messages", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM messages ORDER BY created_at DESC").all());
});
app.put("/api/admin/messages/:id/read", requireAdmin, (req, res) => {
  db.prepare("UPDATE messages SET is_read = 1 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
app.delete("/api/admin/messages/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM messages WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* =========================================================
   ADMIN — REVIEWS
   ========================================================= */

app.get("/api/admin/reviews", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM reviews ORDER BY created_at DESC").all());
});
app.put("/api/admin/reviews/:id", requireAdmin, (req, res) => {
  const { approved } = req.body || {};
  db.prepare("UPDATE reviews SET approved = ? WHERE id = ?").run(approved ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
app.delete("/api/admin/reviews/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM reviews WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* =========================================================
   ADMIN — SETTINGS
   ========================================================= */

app.get("/api/admin/settings", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT key,value FROM settings").all();
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});
app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const upsert = db.prepare(`INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  const tx = db.transaction((entries) => { for (const [k, v] of entries) upsert.run(k, String(v)); });
  tx(Object.entries(req.body || {}));
  res.json({ ok: true });
});

/* ---------------- start server ---------------- */
app.listen(PORT, () => {
  console.log(`\nIfenzi Beauty Salon server running:`);
  console.log(`  Website:  http://localhost:${PORT}`);
  console.log(`  Admin:    http://localhost:${PORT}/admin`);
  console.log(`  (Press Ctrl+C to stop)\n`);
});
