/* Ifenzi Beauty Salon — site script */
(function(){ document.documentElement.setAttribute("data-theme", localStorage.getItem("ifenzi-theme") || "light"); })();
function toggleTheme(){
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next); localStorage.setItem("ifenzi-theme", next);
}
function toggleMobileNav(){
  const nav = document.getElementById("mobileNav"), btn = document.getElementById("menuToggle");
  if (!nav) return; nav.classList.toggle("open");
  btn.innerHTML = nav.classList.contains("open")
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
}
window.addEventListener("scroll", () => { const b = document.getElementById("backToTop"); if (b) b.classList.toggle("show", window.scrollY > 500); });
function scrollTop(){ window.scrollTo({ top: 0, behavior: "smooth" }); }

async function getJSON(u){ const r = await fetch(u); if (!r.ok) throw new Error("Request failed"); return r.json(); }
async function postJSON(u, body){
  const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Request failed"); return d;
}
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const money = n => "\u20A6" + Number(n).toLocaleString();

/* ---------- images: real photo when available, tidy tile otherwise ---------- */
const TILE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3l2.2 5.3 5.8.5-4.4 3.8 1.4 5.6L12 15l-5 3.2 1.4-5.6L4 8.8l5.8-.5L12 3z"/></svg>';
function tile(){ return `<div class="tile">${TILE_ICON}</div>`; }
function imgFallback(el){ const p = el.parentElement; if (p) p.innerHTML = tile(); }
function media(url, alt, cls){
  const inner = url ? `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" onerror="imgFallback(this)">` : tile();
  return `<div class="media ${cls || ""}">${inner}</div>`;
}
const HEART = f => `<svg viewBox="0 0 24 24" fill="${f ? "var(--gold)" : "none"}" stroke="var(--gold-deep)" stroke-width="1.6"><path d="M12 21s-7-4.5-9.3-9C1.2 8.8 2.8 5 6.5 5c2 0 3.4 1.1 4 2.2C11.1 6.1 12.5 5 14.5 5 18.2 5 19.8 8.8 18.3 12 16 16.5 12 21 12 21Z"/></svg>`;
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>';
const MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14"/></svg>';
const STAR = f => `<svg viewBox="0 0 24 24" fill="${f}" stroke="var(--gold)" stroke-width="1"><path d="m12 2 2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7L12 2Z"/></svg>`;
const stars = n => '<div class="stars">' + [0,1,2,3,4].map(i => STAR(i < n ? "var(--gold)" : "none")).join("") + "</div>";
const priceText = s => /^\d/.test(s.price_label) ? "\u20A6" + s.price_label : s.price_label;

/* ---------- settings ---------- */
async function loadSettings(){
  try {
    const s = await getJSON("/api/settings");
    document.querySelectorAll("[data-setting]").forEach(el => { const v = s[el.getAttribute("data-setting")]; if (v) el.textContent = v; });
    const frame = document.getElementById("mapFrame");
    if (frame && s.map_query) frame.src = "https://maps.google.com/maps?q=" + encodeURIComponent(s.map_query) + "&output=embed&z=17";
    const dir = document.getElementById("directionsBtn");
    if (dir && s.map_query) dir.href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(s.map_query);
    const ml = document.getElementById("mapLinkBtn");
    if (ml && s.map_link) ml.href = s.map_link;
  } catch(e){}
}

/* ---------- cart ---------- */
const getCart = () => JSON.parse(localStorage.getItem("ifenzi-cart") || "{}");
function setCart(c){ localStorage.setItem("ifenzi-cart", JSON.stringify(c)); updateCartBadge(); }
function addToCart(id){ const c = getCart(); c[id] = (c[id] || 0) + 1; setCart(c); renderShop(); }
function changeQty(id, d){ const c = getCart(); c[id] = (c[id] || 0) + d; if (c[id] <= 0) delete c[id]; setCart(c); renderShop(); renderCartDrawer(); }
function updateCartBadge(){
  const n = Object.values(getCart()).reduce((a, b) => a + b, 0);
  document.querySelectorAll(".cart-count").forEach(el => { el.textContent = n; el.style.display = n > 0 ? "flex" : "none"; });
}
const getWish = () => JSON.parse(localStorage.getItem("ifenzi-wishlist") || "{}");
function toggleWish(id){ const w = getWish(); w[id] = !w[id]; localStorage.setItem("ifenzi-wishlist", JSON.stringify(w)); renderShop(); }

/* ---------- shop ---------- */
let PRODUCTS = [], shopCat = "All";
function filterShop(cat, btn){
  shopCat = cat;
  document.querySelectorAll("#shopFilters .pill").forEach(p => p.classList.remove("active")); btn.classList.add("active");
  const n = document.getElementById("shopNotice");
  if (n){
    if (cat === "Skincare"){ n.style.display = "block"; n.textContent = "Skincare products can be bought individually. You don't have to buy them as a set."; }
    else n.style.display = "none";
  }
  renderShop();
}
async function initShop(){
  const grid = document.getElementById("shopGrid"); if (!grid) return;
  try {
    PRODUCTS = await getJSON("/api/products");
    const cats = ["All", ...new Set(PRODUCTS.map(p => p.category))];
    document.getElementById("shopFilters").innerHTML = cats.map(c => `<button class="pill${c === "All" ? " active" : ""}" onclick="filterShop('${esc(c)}', this)">${esc(c)}</button>`).join("");
    renderShop();
  } catch(e){ grid.innerHTML = `<div class="skeleton">Products are unavailable right now. Please try again shortly.</div>`; }
}
function renderShop(){
  const grid = document.getElementById("shopGrid"); if (!grid) return;
  const cart = getCart(), wish = getWish();
  const list = shopCat === "All" ? PRODUCTS : PRODUCTS.filter(p => p.category === shopCat);
  grid.innerHTML = list.map(p => `
    <div class="card product-card">
      <div class="product-photo-wrap">${media(p.image_url, p.name, "sq")}
        <button class="wish-btn" onclick="toggleWish(${p.id})" aria-label="Save to wishlist">${HEART(!!wish[p.id])}</button></div>
      <div class="cat" style="margin-top:12px">${esc(p.category)}</div>
      <div style="font-weight:600">${esc(p.name)}</div>
      ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
      <div class="price-row"><span style="font-weight:500">${money(p.price)}</span>
        ${cart[p.id]
          ? `<div class="qty-row"><button class="qty-btn" onclick="changeQty(${p.id},-1)" aria-label="Less">${MINUS}</button><span>${cart[p.id]}</span><button class="qty-btn" onclick="changeQty(${p.id},1)" aria-label="More">${PLUS}</button></div>`
          : `<button class="btn btn-primary" style="padding:6px 14px;font-size:.8rem" onclick="addToCart(${p.id})">Add</button>`}
      </div></div>`).join("") || `<div class="skeleton">No products in this category yet.</div>`;
  updateCartBadge();
}
function openCart(){ document.getElementById("cartOverlay").classList.add("open"); document.getElementById("cartDrawer").classList.add("open"); renderCartDrawer(); }
function closeCart(){ document.getElementById("cartOverlay").classList.remove("open"); document.getElementById("cartDrawer").classList.remove("open"); }
async function renderCartDrawer(){
  const body = document.getElementById("cartDrawerBody"); if (!body) return;
  if (!PRODUCTS.length){ try { PRODUCTS = await getJSON("/api/products"); } catch(e){} }
  const entries = Object.entries(getCart());
  if (!entries.length){ body.innerHTML = `<p style="color:var(--ink-soft);font-size:.9rem">Your cart is empty.</p>`; return; }
  let total = 0;
  const lines = entries.map(([id, q]) => { const p = PRODUCTS.find(x => x.id === +id); if (!p) return ""; total += p.price * q;
    return `<div class="cart-line"><span>${esc(p.name)} &times; ${q}</span><span>${money(p.price * q)}</span></div>`; }).join("");
  body.innerHTML = `${lines}<hr class="hairline" style="margin:16px 0"><div class="cart-total-row"><span>Total</span><span>${money(total)}</span></div>
    <form class="stacked" onsubmit="return submitOrder(event)">
      <input required class="field" id="orderName" placeholder="Full name" autocomplete="name">
      <input required class="field" id="orderPhone" placeholder="Phone number" autocomplete="tel" inputmode="tel">
      <input class="field" id="orderEmail" type="email" placeholder="Email (optional)" autocomplete="email">
      <input class="field" id="orderAddress" placeholder="Delivery address (optional)" autocomplete="street-address">
      <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Place Order</button>
      <p style="font-size:.74rem;color:var(--ink-soft)">We'll contact you to confirm your order, payment and delivery.</p></form>`;
}
async function submitOrder(e){
  e.preventDefault();
  const items = Object.entries(getCart()).map(([id, qty]) => ({ id: +id, qty }));
  try {
    await postJSON("/api/orders", { items, customer_name: orderName.value, phone: orderPhone.value, email: orderEmail.value, address: orderAddress.value });
    localStorage.removeItem("ifenzi-cart"); updateCartBadge();
    document.getElementById("cartDrawerBody").innerHTML = `<div style="text-align:center;padding:30px 0"><div style="font-weight:600">Order placed &mdash; thank you!</div>
      <p style="font-size:.85rem;color:var(--ink-soft);margin-top:8px">We'll reach out shortly to confirm payment and delivery.</p>
      <button class="btn btn-outline" style="margin-top:16px" onclick="closeCart()">Close</button></div>`;
    renderShop();
  } catch(err){ alert("We couldn't place your order. Please try again."); }
  return false;
}

/* ---------- services ---------- */
let SERVICES = [];
function serviceCard(s, full){
  return `<div class="card service-card">${media(s.image_url, s.name)}
    <div style="font-weight:600;margin-top:14px">${esc(s.name)}</div>
    ${full ? `<p class="desc">${esc(s.description)}</p>` : ""}
    <div class="service-meta" style="${full ? "" : "margin-top:6px"}"><span style="font-weight:500">${esc(priceText(s))}</span>
      <span class="dur">${esc(s.duration)}</span></div>
    ${full ? `<a class="btn btn-primary" style="justify-content:center" href="book.html?service=${encodeURIComponent(s.name)}">Book Now</a>` : ""}</div>`;
}
async function initServices(){
  const grid = document.getElementById("servicesGrid");
  const feat = document.getElementById("featuredServices");
  if (!grid && !feat) return;
  try { SERVICES = await getJSON("/api/services"); } catch(e){ return; }
  if (feat) feat.innerHTML = SERVICES.slice(0, 4).map(s => serviceCard(s, false)).join("");
  if (grid){
    const cats = ["All", ...new Set(SERVICES.map(s => s.category))];
    document.getElementById("serviceFilters").innerHTML = cats.map(c => `<button class="pill${c === "All" ? " active" : ""}" onclick="filterServices('${esc(c)}', this)">${esc(c)}</button>`).join("");
    grid.innerHTML = SERVICES.map(s => serviceCard(s, true)).join("");
  }
}
function filterServices(cat, btn){
  document.querySelectorAll("#serviceFilters .pill").forEach(p => p.classList.remove("active")); btn.classList.add("active");
  document.getElementById("servicesGrid").innerHTML = (cat === "All" ? SERVICES : SERVICES.filter(s => s.category === cat)).map(s => serviceCard(s, true)).join("");
}

/* ---------- gallery (with before/after sliders and lightbox) ---------- */
let GALLERY = [];
function galleryItem(g){
  if (g.before_url){
    return `<div class="gallery-item"><div class="media ba"><img class="after" src="${esc(g.image_url)}" alt="After" onerror="imgFallback(this)"><img class="before" src="${esc(g.before_url)}" alt="Before">
      <span class="tag b">Before</span><span class="tag a">After</span>
      <input type="range" min="0" max="100" value="50" aria-label="Compare before and after" oninput="this.parentElement.querySelector('.before').style.clipPath='inset(0 '+(100-this.value)+'% 0 0)'"></div>
      ${g.caption ? `<div class="cap">${esc(g.caption)}</div>` : ""}</div>`;
  }
  return `<div class="gallery-item" style="cursor:zoom-in" onclick="openLightbox('${esc(g.image_url)}')">${media(g.image_url, g.caption || g.category, "tall")}
    ${g.caption ? `<div class="cap">${esc(g.caption)}</div>` : ""}</div>`;
}
function openLightbox(u){ document.getElementById("lightboxImg").src = u; document.getElementById("lightbox").classList.add("open"); }
async function initGallery(){
  const grid = document.getElementById("galleryGrid"); if (!grid) return;
  try { GALLERY = await getJSON("/api/gallery"); } catch(e){ return; }
  const cats = ["All", ...new Set(GALLERY.map(g => g.category))];
  document.getElementById("galleryFilters").innerHTML = cats.map(c => `<button class="pill${c === "All" ? " active" : ""}" onclick="filterGallery('${esc(c)}', this)">${esc(c)}</button>`).join("");
  grid.innerHTML = GALLERY.map(galleryItem).join("");
}
function filterGallery(cat, btn){
  document.querySelectorAll("#galleryFilters .pill").forEach(p => p.classList.remove("active")); btn.classList.add("active");
  document.getElementById("galleryGrid").innerHTML = (cat === "All" ? GALLERY : GALLERY.filter(g => g.category === cat)).map(galleryItem).join("");
}

/* ---------- reviews ---------- */
const reviewCard = t => `<div class="card quote-card"><p>${esc(t.text)}</p><div class="quote-row"><span style="font-weight:500">${esc(t.name)}</span>${stars(t.rating)}</div></div>`;
async function initReviews(){
  const home = document.getElementById("homeTestimonials"), full = document.getElementById("testimonialsGrid");
  if (!home && !full) return;
  try {
    const r = await getJSON("/api/reviews");
    if (home) home.innerHTML = r.slice(0, 3).map(reviewCard).join("");
    if (full) full.innerHTML = r.map(reviewCard).join("");
  } catch(e){}
}
async function submitReview(e){
  e.preventDefault();
  try {
    await postJSON("/api/reviews", { name: revName.value, rating: revRating.value, text: revText.value });
    document.getElementById("reviewFormBox").innerHTML = `<p style="font-size:.9rem;color:var(--ink-soft)">Thank you! Your review will appear once it has been approved.</p>`;
  } catch(err){ alert("We couldn't submit your review. Please try again."); }
  return false;
}

/* ---------- booking ---------- */
let bookState = { service:"", date:"", time:"", name:"", phone:"", email:"" };
function bookGoStep(n){
  document.querySelectorAll(".book-step").forEach(s => s.classList.remove("active"));
  document.getElementById("bookStep" + n).classList.add("active");
  document.querySelectorAll(".step-dot").forEach((d, i) => d.classList.toggle("active", i < n));
}
async function initBooking(){
  const sel = document.getElementById("bookServiceSelect"); if (!sel) return;
  const d = document.getElementById("bookDate"); if (d) d.min = new Date().toISOString().split("T")[0];
  try {
    const list = await getJSON("/api/services");
    sel.innerHTML = `<option value="">Select a service&hellip;</option>` + list.map(s => `<option value="${esc(s.name)}">${esc(s.name)} — ${esc(priceText(s))}</option>`).join("");
    const svc = new URLSearchParams(location.search).get("service");
    if (svc){ sel.value = svc; bookState.service = svc; document.getElementById("continueStep1").disabled = !sel.value; }
  } catch(e){}
}
function selectTime(el, t){
  document.querySelectorAll(".time-slot").forEach(s => s.classList.remove("selected")); el.classList.add("selected"); bookState.time = t;
  document.getElementById("continueStep2").disabled = !(bookState.date && bookState.time);
}
function onDateChange(el){ bookState.date = el.value; document.getElementById("continueStep2").disabled = !(bookState.date && bookState.time); }
function onServiceChange(el){ bookState.service = el.value; document.getElementById("continueStep1").disabled = !bookState.service; }
function checkStep3(){
  bookState.name = bookName.value; bookState.phone = bookPhone.value; bookState.email = bookEmail.value;
  document.getElementById("confirmBookingBtn").disabled = !(bookState.name && bookState.phone);
}
async function confirmBooking(){
  const btn = document.getElementById("confirmBookingBtn"); btn.disabled = true; btn.textContent = "Booking\u2026";
  try {
    await postJSON("/api/appointments", { service: bookState.service, date: bookState.date, time: bookState.time, customer_name: bookState.name, phone: bookState.phone, email: bookState.email });
    document.querySelectorAll(".book-step").forEach(s => s.classList.remove("active"));
    document.getElementById("bookConfirm").classList.add("active");
    document.getElementById("bookSummary").textContent = `We'll confirm your ${bookState.service} on ${bookState.date} at ${bookState.time} by phone or WhatsApp shortly.`;
  } catch(err){ alert("We couldn't submit your booking. Please try again or message us on WhatsApp."); btn.disabled = false; btn.textContent = "Confirm Booking"; }
}
function restartBooking(){
  bookState = { service:"", date:"", time:"", name:"", phone:"", email:"" };
  document.getElementById("bookForm").reset();
  document.querySelectorAll(".time-slot").forEach(s => s.classList.remove("selected"));
  const b = document.getElementById("confirmBookingBtn"); b.disabled = true; b.textContent = "Confirm Booking";
  document.getElementById("continueStep1").disabled = true; document.getElementById("continueStep2").disabled = true;
  document.getElementById("bookConfirm").classList.remove("active"); bookGoStep(1);
}

/* ---------- faq + contact ---------- */
function toggleFaq(el){
  const item = el.closest(".faq-item"), was = item.classList.contains("open");
  document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open")); if (!was) item.classList.add("open");
}
async function submitContact(e){
  e.preventDefault();
  const f = document.getElementById("contactForm");
  try {
    await postJSON("/api/messages", { name: f.name.value, email: f.email.value, phone: f.phone.value, message: f.message.value });
    f.style.display = "none"; document.getElementById("contactSuccess").style.display = "block";
  } catch(err){ alert("We couldn't send your message. Please try again or call us."); }
  return false;
}
function resetContact(){ const f = document.getElementById("contactForm"); f.style.display = "flex"; document.getElementById("contactSuccess").style.display = "none"; f.reset(); }

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge(); loadSettings(); initShop(); initServices(); initGallery(); initReviews(); initBooking();
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.main-nav a, .mobile-nav a").forEach(a => { if (a.getAttribute("href") === path) a.classList.add("active"); });
});
