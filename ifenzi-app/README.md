# Ifenzi Beauty Salon — website, backend and admin dashboard

## Run it
1. Install Node.js 22.13 or newer from https://nodejs.org
2. In this folder: `npm install` then `npm start`
3. Website: http://localhost:3000  ·  Admin: http://localhost:3000/admin

First-run admin login comes from `.env` (`ADMIN_USER` / `ADMIN_PASS`, default `admin` / `ifenzi2026`).
Change the password in Admin → Settings straight away.

## What the admin can manage (no coding)
Services · Products (add, edit, delete, image link, stock) · Gallery (photos and before/after pairs) ·
Appointments · Orders · Messages · Reviews (add, edit, approve, hide) · Settings (address, phone, hours, map).

## Adding pictures
Services, products and gallery items take an **image link**. Right-click a photo online → "Copy image address" →
paste it into the Image link box in the admin. Only use photos you own or have permission to use.
Items without a picture show a neat tile until one is added.

## Going live
Deploy to a Node host such as Render (build `npm install`, start `npm start`) and set the environment variables in `.env.example`.
The database is a file (`data/ifenzi.db`); on hosts with temporary storage, attach a persistent disk
(or set `DATA_DIR` to it) so bookings, orders and edits are kept between restarts.
