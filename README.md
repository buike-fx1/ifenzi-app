# Ifenzi Beauty Salon — Website + Backend + Admin Dashboard

This is the full working project: the public website, a real backend
(Node.js + Express + a built-in SQLite database), and an admin dashboard
to manage prices, products, appointments, orders, messages and reviews.

It is one project you run with **one command**. The site and the admin
dashboard are both served by the same server, on the same address.

```
ifenzi-app/
├── server.js          <- the whole backend (routes, auth, API) in one file
├── db.js              <- database setup + starter data
├── package.json
├── .env                <- your local settings (already created for you)
├── public/             <- the customer-facing website
├── admin/              <- the admin dashboard
└── data/                <- created automatically; this is your database file
```

---

## 1. One-time setup

You need **Node.js** installed on your computer (version 22.13 or newer —
the free installer from nodejs.org always gives you a recent enough one).
No other tools, compilers, or "build tools" are required — the database
is built directly into Node.js itself.

1. Check if you already have it — open a terminal and run:
   ```
   node -v
   ```
   If you see a version number (e.g. `v20.11.0`), skip to step 2.
   If not, download and install it from **https://nodejs.org** (choose the
   "LTS" version), then reopen your terminal.

2. Unzip this project folder, open a terminal, and move into it:
   ```
   cd path/to/ifenzi-app
   ```

3. Install the project's dependencies (only needed once, or whenever you
   move the project to a new computer):
   ```
   npm install
   ```
   This creates a `node_modules` folder — that's normal, leave it alone.

That's it — setup is done.

---

## 2. Start the site

Every time you want to run the site:

```
npm start
```

You'll see something like:

```
Ifenzi Beauty Salon server running:
  Website:  http://localhost:3000
  Admin:    http://localhost:3000/admin
  (Press Ctrl+C to stop)
```

Now open your browser to:
- **Website:** http://localhost:3000
- **Admin dashboard:** http://localhost:3000/admin

To stop the server, go back to the terminal and press `Ctrl + C`.

---

## 3. Log in to the admin dashboard

The **first time** you ever run `npm start`, the server creates your
database and prints a starter admin login right there in the terminal:

```
First run: created admin login -> username: "admin"  password: "ifenzi2026"
```

Use that to log in at **http://localhost:3000/admin**, then immediately go to
**Settings → Change Admin Password** and set your own password.
(If you ever forget your password, delete the `data` folder and restart —
this wipes ALL data and recreates a fresh starter login, so only do this if
you're OK losing existing bookings/orders, or ask a developer to reset just
the admin password instead.)

From the dashboard you can:
- **Overview** — pending appointments, pending orders, revenue, unread messages
- **Services** — add/edit/delete services and prices (shown live on the website)
- **Products** — add/edit/delete shop products, prices and stock
- **Appointments** — approve, cancel or delete bookings customers submit
- **Orders** — see what customers ordered and update order status
- **Messages** — read messages sent through the Contact page
- **Reviews** — approve or hide guest-submitted reviews before they go public
- **Settings** — edit address, phone, hours, social handles, and your password

Any change you make (e.g. editing a service price) appears on the public
website immediately — no need to restart the server.

---

## 4. Keeping it running

Running `npm start` only keeps the site live while that terminal window
stays open and your computer is on. Closing the terminal, sleeping, or
shutting down stops the site. Pick based on what you need:

### Option A — Just testing on your own computer
Nothing extra to do. Run `npm start` whenever you want to look at or demo
the site, `Ctrl + C` when you're done.

### Option B — Keep it running in the background on your computer
Install a small helper called **pm2** that restarts the server automatically
if it crashes and keeps it running after you close the terminal (but your
computer still needs to stay on):
```
npm install -g pm2
pm2 start server.js --name ifenzi-salon
pm2 save
pm2 startup
```
Useful pm2 commands: `pm2 status`, `pm2 logs ifenzi-salon`, `pm2 stop ifenzi-salon`.

### Option C — Put it online so it's live 24/7 (recommended for a real business)
Your computer being on isn't a real hosting solution long-term. For a site
that's always reachable at a real web address, deploy it to a small hosting
service. A simple, inexpensive path:

1. Create a free account at **https://render.com** (or Railway, Fly.io — any
   host that runs a persistent Node.js app; avoid purely "static site" hosts
   since this project needs a live server, not just files).
2. Push this project to a GitHub repository (or upload it directly if the
   host allows).
3. Create a new "Web Service", point it at the repo, and set:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: copy the values from `.env` (especially
     `SESSION_SECRET` — set it to a new random string, and `ADMIN_USER` /
     `ADMIN_PASS` for your first login).
4. **Important:** the SQLite database (`data/ifenzi.db`) lives on disk. Most
   free hosting tiers wipe the disk on redeploys — ask the host how to add
   a small "persistent disk" or "volume" mounted at `/data`, or the salon's
   services/orders will disappear after every update. This is the one piece
   worth getting a developer's help with if you're not comfortable doing it
   yourself.
5. Once deployed, you'll get a real URL (e.g. `https://ifenzi-salon.onrender.com`)
   you can share, and `https://your-url/admin` for the dashboard.

---

## 5. What's real vs. what's still placeholder

**Real / working:**
- Business name, address, phone, Instagram, Facebook (editable in Settings)
- Services, products, prices — fully editable, stored in a real database
- Appointment booking — saved to the database, manageable in Admin
- Shop cart & checkout — creates a real order in the database
- Contact form — saved as a message you can read in Admin
- Reviews — guests can submit, you approve before they go public
- Admin login with your own password

**Still placeholder / not connected (would need further work):**
- Real photos — the site uses labeled placeholder blocks; drop real images
  into `public/images/` and swap the `<div class="ph">…</div>` blocks for
  `<img>` tags once you have them
- Online payment (Paystack/Flutterwave) — orders are saved but payment is
  still collected in person or via bank transfer
- Automated email/SMS confirmations — bookings and orders are saved, but no
  email or SMS is sent automatically yet
- Blog — currently sample post titles only, no full articles/editor
- Multiple staff logins/roles — there's a single admin login for now

---

## 6. If something goes wrong

- **"command not found: node" or "npm"** → Node.js isn't installed — see step 1.
- **Port already in use** → another program is using port 3000. Either stop
  it, or run on a different port: `PORT=3001 npm start`, then visit
  `http://localhost:3001`.
- **Changes to services/products aren't showing** → make sure you're editing
  them from the **Admin dashboard**, not the old static HTML — this version
  reads live from the database.
- **Forgot the admin password** → see the note in step 3.
