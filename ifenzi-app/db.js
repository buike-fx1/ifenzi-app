// db.js — built-in node:sqlite database (no native build tools needed)
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "ifenzi.db"));
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL, price_label TEXT NOT NULL, duration TEXT NOT NULL, description TEXT NOT NULL, image_url TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 20, description TEXT, image_url TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS gallery (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, caption TEXT, image_url TEXT NOT NULL, before_url TEXT, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, service TEXT NOT NULL, staff TEXT, date TEXT NOT NULL, time TEXT NOT NULL, customer_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, items_json TEXT NOT NULL, total INTEGER NOT NULL, customer_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, address TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rating INTEGER NOT NULL, text TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

// migrate older databases that predate the image columns
function addCol(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
addCol("services", "image_url", "TEXT");
addCol("products", "image_url", "TEXT");
addCol("products", "description", "TEXT");

const S = "https://www.ifenzisalon.com/images/";
const PX = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;

function seed() {
  if (count("services") === 0) {
    const ins = db.prepare("INSERT INTO services (category,name,price,price_label,duration,description,image_url) VALUES (?,?,?,?,?,?,?)");
    [
      ["Hair","Hair Styling",8000,"8,000+","45 min","Blow-dry, curls or sleek finishes tailored to your hair type.",""],
      ["Hair","Braids",10000,"10,000+","2–4 hrs","Knotless, box braids, tribal styles and more, crafted with care and precision.",S+"braids.jpg"],
      ["Hair","Hair Colouring",15000,"15,000+","2 hrs","Full colour, highlights or balayage with nourishing treatments.",""],
      ["Hair","Hair Treatment",10000,"10,000+","1–2 hrs","Deep conditioning, protein treatments and scalp care for healthy, lustrous hair.",S+"hairtreatment.jpg"],
      ["Wigs","Wig Installation",15000,"15,000+","1–2 hrs","Quality wig installation, customisation and styling for a seamless finish.",S+"gel.jpg"],
      ["Wigs","Wig Revamping",7000,"7,000+","1 hr","Wash, restyle and restore your wig's shine and shape.",""],
      ["Makeup","Makeup (Everyday/Glam)",12000,"12,000+","1 hr","Soft glam to full glam looks for any occasion.",PX(5149734)],
      ["Makeup","Bridal Makeup",45000,"45,000+","2 hrs","Trial and wedding-day application, built to last all day.",PX(35538643)],
      ["Nails","Manicure",8000,"8,000+","1–2 hrs","Gel, acrylic and nail art finishes to complete your look.",S+"nails.jpg"],
      ["Nails","Pedicure",8000,"8,000+","1 hr","Relaxing foot soak, exfoliation and polish.",S+"nails.jpg"],
      ["Nails","Nail Extensions",10000,"10,000+","1.5–2 hrs","Acrylic or gel extensions in any shape and length.",S+"nails.jpg"],
      ["Skin","Facials",10000,"10,000+","1 hr","Cleansing, exfoliation and hydration for glowing skin.",""],
      ["Skin","Spa Treatments",18000,"18,000+","1.5 hrs","Full-body relaxation treatments in a calm, private space.",""],
      ["Massage","Electric Body Massage",0,"Ask in salon","30–60 min","Relax with our electric massage chairs and body massage.",""],
      ["Massage","Head Massage",0,"Ask in salon","20–30 min","A soothing head and scalp massage to melt away tension.",""],
      ["Consult","Beauty Consultation",3000,"3,000","30 min","One-on-one guidance on styles, colour and skincare routines.",""],
    ].forEach(r => ins.run(...r));
  }
  if (count("products") === 0) {
    const ins = db.prepare("INSERT INTO products (category,name,price,stock,description,image_url) VALUES (?,?,?,?,?,?)");
    [
      ["Hair Care","Shea Butter Hair Cream",4500,30,"Rich moisture for dry, natural hair.",""],
      ["Hair Care","Castor Oil Hair Growth Oil",5200,30,"Popular oil for strong, healthy-looking hair.",""],
      ["Hair Care","Edge Control Gel",3500,40,"Firm, flake-free hold for neat edges.",""],
      ["Hair Care","Moisturising Shampoo",6500,25,"Gentle cleansing for braids, natural hair and wigs.",""],
      ["Hair Care","Deep Conditioner",6800,25,"Weekly deep-conditioning treatment.",""],
      ["Wigs","Bone Straight Wig",65000,8,"Silky straight human-hair style wig.",""],
      ["Wigs","Body Wave Wig",58000,8,"Soft, bouncy waves.",""],
      ["Wigs","Satin Bonnet",3200,40,"Protects your hair and wig overnight.",""],
      ["Skincare","Skincare Set (Cleanser, Toner, Serum & Moisturiser)",28000,12,"A complete routine in one set. Every item can also be bought individually.",""],
      ["Skincare","Vitamin C Serum",11500,20,"Brightening serum for a fresh glow.",""],
      ["Skincare","Shea Butter (Raw)",3000,40,"Pure, unrefined shea butter for body and skin.",""],
      ["Skincare","African Black Soap",2500,40,"Traditional black soap for face and body.",""],
      ["Feminine Care","Gentle Intimate Wash",6000,25,"Mild daily intimate wash.",""],
      ["Feminine Care","Feminine Wipes",3500,30,"Soft, convenient wipes for on-the-go freshness.",""],
      ["Feminine Care","Intimate Care Set",14500,15,"Wash, wipes and care essentials together.",""],
    ].forEach(r => ins.run(...r));
  }
  if (count("gallery") === 0) {
    const ins = db.prepare("INSERT INTO gallery (category,caption,image_url,sort) VALUES (?,?,?,?)");
    ins.run("Salon","Inside Ifenzi Beauty Salon","images/interior.jpg",1);
    ins.run("Hair","Braids by our stylists","images/hero.jpg",2);
    for (let i = 1; i <= 14; i++) ins.run("Hair","Ifenzi hairstyle "+i, S+"Hair"+i+(i===8?".PNG":".jpg"), 10+i);
    ins.run("Nails","Nails & pedicure",S+"nails.jpg",30);
  }
  if (count("reviews") === 0) {
    const ins = db.prepare("INSERT INTO reviews (name,rating,text,approved) VALUES (?,?,?,1)");
    ins.run("Agu Favor",5,"Lovely salon, clean space and friendly stylists. My hair came out exactly how I wanted.");
    ins.run("Nweke Oluomachi",5,"Neat braids, great service and a very relaxing environment. I will be back.");
    ins.run("Ituma Benedicta",5,"Professional and welcoming. I enjoyed every minute of my appointment.");
  }
  if (count("settings") === 0) {
    const ins = db.prepare("INSERT INTO settings (key,value) VALUES (?,?)");
    Object.entries({
      business_name: "Ifenzi Beauty Salon",
      address: "Shop 18/19, MOK Plaza 2, Emole Street, GRA, Trans-Ekulu, Enugu 400102, Enugu State, Nigeria",
      phone: "+234 707 355 1432",
      instagram: "@ifenzi_beautysalon",
      facebook: "Ifenzi Beauty Salon",
      hours_weekday: "Monday – Saturday: 9:00 AM – 7:00 PM",
      hours_sunday: "Sunday: 11:00 AM – 6:00 PM",
      map_query: "MOK Plaza, 2 Emole Street, GRA, Enugu, Nigeria",
      map_link: "https://maps.google.com/maps/place//data=!4m2!3m1!1s0x1044a32d7e33cfed:0x6c738608b19d043",
    }).forEach(([k, v]) => ins.run(k, v));
  }
  if (count("admin_users") === 0) {
    const u = process.env.ADMIN_USER || "admin", p = process.env.ADMIN_PASS || "ifenzi2026";
    db.prepare("INSERT INTO admin_users (username,password_hash) VALUES (?,?)").run(u, bcrypt.hashSync(p, 10));
    console.log(`First run: admin login created -> username "${u}"`);
  }
}
seed();
module.exports = db;
