// db.js — SQLite database: schema creation + first-run seed data.
// Uses Node's BUILT-IN node:sqlite module (available since Node 22.5+,
// no flag needed since Node 22.13+ / 23.4+). No npm package, no native
// compiler, no Visual Studio / build tools required — it ships inside
// Node.js itself.
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "data", "ifenzi.db");
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  price_label TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 20,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  staff TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  items_json TEXT NOT NULL,
  total INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

function seedIfEmpty() {
  const serviceCount = db.prepare("SELECT COUNT(*) c FROM services").get().c;
  if (serviceCount === 0) {
    const insert = db.prepare(`INSERT INTO services (category,name,price,price_label,duration,description) VALUES (?,?,?,?,?,?)`);
    const seed = [
      ["Hair", "Hair Styling", 8000, "8,000+", "45 min", "Blow-dry, curls or sleek finishes tailored to your hair type."],
      ["Hair", "Hair Braiding", 12000, "12,000+", "2-4 hrs", "Classic and modern braid styles, from cornrows to knotless."],
      ["Hair", "Hair Colouring", 15000, "15,000+", "2 hrs", "Full colour, highlights or balayage with nourishing treatments."],
      ["Hair", "Hair Treatment", 10000, "10,000+", "1 hr", "Deep conditioning and scalp therapy to restore strength & shine."],
      ["Wigs", "Wig Installation", 10000, "10,000+", "1.5 hrs", "Natural-looking installs with secure, comfortable finishing."],
      ["Wigs", "Wig Revamping", 7000, "7,000+", "1 hr", "Wash, restyle and restore your wig's shine and shape."],
      ["Makeup", "Makeup (Everyday/Glam)", 12000, "12,000+", "1 hr", "Soft glam to full glam looks for any occasion."],
      ["Makeup", "Bridal Makeup", 45000, "45,000+", "2 hrs", "Trial + wedding-day application, built to last all day."],
      ["Nails", "Manicure", 6000, "6,000+", "45 min", "Shape, cuticle care and polish or gel finish."],
      ["Nails", "Pedicure", 7000, "7,000+", "1 hr", "Relaxing foot soak, exfoliation and polish."],
      ["Nails", "Nail Extensions", 9000, "9,000+", "1.5 hrs", "Acrylic or gel extensions in any shape and length."],
      ["Skin", "Facials", 10000, "10,000+", "1 hr", "Cleansing, exfoliation and hydration for glowing skin."],
      ["Skin", "Spa Treatments", 18000, "18,000+", "1.5 hrs", "Full-body relaxation treatments in a calm, private space."],
      ["Consult", "Beauty Consultation", 3000, "3,000", "30 min", "One-on-one guidance on styles, colour and skincare routines."],
    ];
    for (const r of seed) insert.run(...r);
  }

  const productCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  if (productCount === 0) {
    const insert = db.prepare(`INSERT INTO products (category,name,price,stock) VALUES (?,?,?,?)`);
    const seed = [
      ["Hair Care", "Nourish Shampoo", 6500, 25],
      ["Hair Care", "Silk Conditioner", 6800, 25],
      ["Hair Care", "Repair Hair Oil", 5200, 30],
      ["Wigs", "16\" Bob Wig", 38000, 10],
      ["Wigs", "Body Wave Extensions", 42000, 8],
      ["Makeup", "Matte Foundation", 9800, 20],
      ["Makeup", "Signature Lip Set", 7200, 20],
      ["Skincare", "Glow Facial Serum", 11500, 15],
      ["Accessories", "Satin Bonnet", 3200, 40],
    ];
    for (const r of seed) insert.run(...r);
  }

  const reviewCount = db.prepare("SELECT COUNT(*) c FROM reviews").get().c;
  if (reviewCount === 0) {
    const insert = db.prepare(`INSERT INTO reviews (name,rating,text,approved) VALUES (?,?,?,1)`);
    insert.run("A. Nwosu", 5, "My braids lasted for weeks and looked neat the whole time. Placeholder review pending real Google data.");
    insert.run("C. Eze", 5, "Bridal makeup was flawless and photographed beautifully. Placeholder review text.");
    insert.run("F. Okoro", 4, "Lovely, warm atmosphere and friendly staff. Placeholder review pending real profile data.");
  }

  const settingsCount = db.prepare("SELECT COUNT(*) c FROM settings").get().c;
  if (settingsCount === 0) {
    const insert = db.prepare(`INSERT INTO settings (key,value) VALUES (?,?)`);
    const defaults = {
      business_name: "Ifenzi Beauty Salon",
      address: "Shop 18/19, MOK Plaza 2, Emole Street, GRA, Trans-Ekulu, Enugu 400102, Enugu State, Nigeria",
      phone: "+234 707 355 1432",
      instagram: "@ifenzi_beautysalon",
      facebook: "Ifenzi Beauty Salon",
      hours: "Mon-Sat 9:00 AM - 7:00 PM, Sun closed (placeholder - update with real hours)",
    };
    for (const [k, v] of Object.entries(defaults)) insert.run(k, v);
  }

  const adminCount = db.prepare("SELECT COUNT(*) c FROM admin_users").get().c;
  if (adminCount === 0) {
    const defaultUser = process.env.ADMIN_USER || "admin";
    const defaultPass = process.env.ADMIN_PASS || "ifenzi2026";
    const hash = bcrypt.hashSync(defaultPass, 10);
    db.prepare(`INSERT INTO admin_users (username,password_hash) VALUES (?,?)`).run(defaultUser, hash);
    console.log(`\nFirst run: created admin login -> username: "${defaultUser}"  password: "${defaultPass}"`);
    console.log(`Change this password immediately from Admin > Settings after logging in.\n`);
  }
}
seedIfEmpty();

module.exports = db;
