/* =========================================================
   IFENZI BEAUTY SALON — public site script
   Talks to the backend API (server.js) for real data:
   services, products, reviews, settings, and submits real
   appointments / orders / messages instead of storing them
   only in the browser.
   ========================================================= */

/* ---------------- theme ---------------- */
(function initTheme(){
  const saved = localStorage.getItem("ifenzi-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();
function toggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ifenzi-theme", next);
}

/* ---------------- mobile nav ---------------- */
function toggleMobileNav(){
  const nav = document.getElementById("mobileNav");
  const btn = document.getElementById("menuToggle");
  if (!nav) return;
  nav.classList.toggle("open");
  btn.innerHTML = nav.classList.contains("open")
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
}

/* ---------------- back to top ---------------- */
window.addEventListener("scroll", () => {
  const btn = document.getElementById("backToTop");
  if (!btn) return;
  btn.classList.toggle("show", window.scrollY > 500);
});
function scrollTop(){ window.scrollTo({ top: 0, behavior: "smooth" }); }

/* ---------------- tiny fetch helpers ---------------- */
async function getJSON(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error("Request failed");
  return r.json();
}
async function postJSON(url, body){
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ---------------- icons ---------------- */
const PH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-4 4-3-3-6 6"/></svg>';
const HEART_ICON = (filled) => `<svg viewBox="0 0 24 24" fill="${filled ? "var(--gold)" : "none"}" stroke="var(--gold-deep)" stroke-width="1.6"><path d="M12 21s-7-4.5-9.3-9C1.2 8.8 2.8 5 6.5 5c2 0 3.4 1.1 4 2.2C11.1 6.1 12.5 5 14.5 5 18.2 5 19.8 8.8 18.3 12 16 16.5 12 21 12 21Z"/></svg>`;
const PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>';
const MINUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14"/></svg>';
const STAR_ICON = (fill) => `<svg viewBox="0 0 24 24" fill="${fill}" stroke="var(--gold)" stroke-width="1"><path d="m12 2 2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7L12 2Z"/></svg>`;
function stars(n){ return '<div class="stars">' + Array.from({length:5}).map((_,i)=>STAR_ICON(i<n?"var(--gold)":"none")).join("") + '</div>'; }
function ph(label, tall){ return `<div class="ph${tall?" tall":""}">${PH_ICON}<span>${label}</span></div>`; }

/* ---------------- settings (address/phone/hours in footer etc.) ---------------- */
async function loadSettings(){
  try {
    const s = await getJSON("/api/settings");
    document.querySelectorAll("[data-setting]").forEach(el => {
      const key = el.getAttribute("data-setting");
      if (s[key]) el.textContent = s[key];
    });
  } catch(e) { /* keep static fallback text already in the HTML */ }
}

/* ---------------- cart (localStorage, guest-side only until checkout) ---------------- */
function getCart(){ return JSON.parse(localStorage.getItem("ifenzi-cart") || "{}"); }
function setCart(cart){ localStorage.setItem("ifenzi-cart", JSON.stringify(cart)); updateCartBadge(); }
function addToCart(id){ const c = getCart(); c[id] = (c[id]||0)+1; setCart(c); renderShop(); }
function changeQty(id, d){
  const c = getCart(); c[id] = (c[id]||0)+d; if (c[id] <= 0) delete c[id]; setCart(c);
  renderShop(); renderCartDrawer();
}
function updateCartBadge(){
  const count = Object.values(getCart()).reduce((a,b)=>a+b,0);
  document.querySelectorAll(".cart-count").forEach(el => { el.textContent = count; el.style.display = count>0?"flex":"none"; });
}
function getWishlist(){ return JSON.parse(localStorage.getItem("ifenzi-wishlist") || "{}"); }
function toggleWish(id){ const w = getWishlist(); w[id] = !w[id]; localStorage.setItem("ifenzi-wishlist", JSON.stringify(w)); renderShop(); }

/* ---------------- shop ---------------- */
let PRODUCTS_CACHE = [];
let currentShopCat = "All";
function filterShop(cat, btn){
  currentShopCat = cat;
  document.querySelectorAll("#shopFilters .pill").forEach(p=>p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderShop();
}
async function initShop(){
  const grid = document.getElementById("shopGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="skeleton">Loading products&hellip;</div>`;
  try {
    PRODUCTS_CACHE = await getJSON("/api/products");
    const cats = ["All", ...Array.from(new Set(PRODUCTS_CACHE.map(p=>p.category)))];
    const filterBox = document.getElementById("shopFilters");
    if (filterBox) filterBox.innerHTML = cats.map(c =>
      `<button class="pill${c==="All"?" active":""}" onclick="filterShop('${c}', this)">${c}</button>`
    ).join("");
    renderShop();
  } catch(e){
    grid.innerHTML = `<div class="skeleton">Couldn&rsquo;t load products &mdash; is the server running?</div>`;
  }
}
function renderShop(){
  const grid = document.getElementById("shopGrid");
  if (!grid) return;
  const cart = getCart(); const wish = getWishlist();
  const list = currentShopCat === "All" ? PRODUCTS_CACHE : PRODUCTS_CACHE.filter(p=>p.category===currentShopCat);
  grid.innerHTML = list.map(p => `
    <div class="card product-card">
      <div class="product-photo-wrap">
        ${ph(p.name)}
        <button class="wish-btn" onclick="toggleWish(${p.id})">${HEART_ICON(!!wish[p.id])}</button>
      </div>
      <div class="cat">${p.category}</div>
      <div style="font-weight:600">${p.name}</div>
      <div class="price-row">
        <span style="font-weight:500">&#8358;${p.price.toLocaleString()}</span>
        ${cart[p.id]
          ? `<div class="qty-row">
              <button class="qty-btn" onclick="changeQty(${p.id},-1)">${MINUS_ICON}</button>
              <span>${cart[p.id]}</span>
              <button class="qty-btn" onclick="changeQty(${p.id},1)">${PLUS_ICON}</button>
            </div>`
          : `<button class="btn btn-primary" style="padding:6px 14px;font-size:.8rem" onclick="addToCart(${p.id})">Add</button>`
        }
      </div>
    </div>
  `).join("") || `<div class="skeleton">No products in this category yet.</div>`;
  updateCartBadge();
}

/* ---------------- cart drawer + checkout ---------------- */
function openCart(){ document.getElementById("cartOverlay").classList.add("open"); document.getElementById("cartDrawer").classList.add("open"); renderCartDrawer(); }
function closeCart(){ document.getElementById("cartOverlay").classList.remove("open"); document.getElementById("cartDrawer").classList.remove("open"); }
function renderCartDrawer(){
  const body = document.getElementById("cartDrawerBody");
  if (!body) return;
  const cart = getCart(); const entries = Object.entries(cart);
  if (entries.length === 0){ body.innerHTML = `<p style="color:var(--ink-soft);font-size:.9rem">Your cart is empty.</p>`; return; }
  let total = 0;
  const lines = entries.map(([id, qty]) => {
    const p = PRODUCTS_CACHE.find(pr => pr.id === +id);
    if (!p) return "";
    total += p.price * qty;
    return `<div class="cart-line"><span>${p.name} &times; ${qty}</span><span>&#8358;${(p.price*qty).toLocaleString()}</span></div>`;
  }).join("");
  body.innerHTML = `
    ${lines}
    <hr class="hairline" style="margin:16px 0">
    <div class="cart-total-row"><span>Total</span><span>&#8358;${total.toLocaleString()}</span></div>
    <form class="stacked" onsubmit="return submitOrder(event)">
      <input required class="field" id="orderName" placeholder="Full name">
      <input required class="field" id="orderPhone" placeholder="Phone number">
      <input class="field" id="orderEmail" type="email" placeholder="Email (optional)">
      <input class="field" id="orderAddress" placeholder="Delivery address (optional)">
      <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Place Order</button>
      <p style="font-size:.72rem;color:var(--ink-soft)">Payment gateway (Paystack/Flutterwave) not connected yet &mdash; order is saved, payment collected in-salon or on delivery for now.</p>
    </form>
  `;
}
async function submitOrder(e){
  e.preventDefault();
  const cart = getCart();
  const items = Object.entries(cart).map(([id, qty]) => ({ id: +id, qty }));
  const customer_name = document.getElementById("orderName").value;
  const phone = document.getElementById("orderPhone").value;
  const email = document.getElementById("orderEmail").value;
  const address = document.getElementById("orderAddress").value;
  try {
    await postJSON("/api/orders", { items, customer_name, phone, email, address });
    localStorage.removeItem("ifenzi-cart");
    updateCartBadge();
    document.getElementById("cartDrawerBody").innerHTML = `
      <div style="text-align:center;padding:30px 0">
        <div style="font-weight:600">Order placed &mdash; thank you!</div>
        <p style="font-size:.85rem;color:var(--ink-soft);margin-top:8px">We'll reach out to confirm payment and delivery.</p>
        <button class="btn btn-outline" style="margin-top:16px" onclick="closeCart()">Close</button>
      </div>`;
    if (document.getElementById("shopGrid")) renderShop();
  } catch(err){
    alert("Couldn't place order: " + err.message);
  }
  return false;
}

/* ---------------- services page ---------------- */
async function initServices(){
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="skeleton">Loading services&hellip;</div>`;
  try {
    const services = await getJSON("/api/services");
    const cats = ["All", ...Array.from(new Set(services.map(s=>s.category)))];
    const filterBox = document.getElementById("serviceFilters");
    if (filterBox) filterBox.innerHTML = cats.map(c =>
      `<button class="pill${c==="All"?" active":""}" onclick="filterServicesCat('${c}', this)">${c}</button>`
    ).join("");
    window.__servicesCache = services;
    renderServices("All");
  } catch(e){
    grid.innerHTML = `<div class="skeleton">Couldn&rsquo;t load services &mdash; is the server running?</div>`;
  }
}
function filterServicesCat(cat, btn){
  document.querySelectorAll("#serviceFilters .pill").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  renderServices(cat);
}
function renderServices(cat){
  const grid = document.getElementById("servicesGrid");
  const list = cat==="All" ? window.__servicesCache : window.__servicesCache.filter(s=>s.category===cat);
  grid.innerHTML = list.map(s => `
    <div class="card service-card">
      ${ph(s.name)}
      <div style="font-weight:600;margin-top:14px">${s.name}</div>
      <p class="desc">${s.description||""}</p>
      <div class="service-meta">
        <span style="font-weight:500">&#8358;${s.price_label}</span>
        <span class="dur"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>${s.duration}</span>
      </div>
      <a class="btn btn-primary" style="justify-content:center" href="book.html?service=${encodeURIComponent(s.name)}">Book Now</a>
    </div>
  `).join("");
}

/* ---------------- home page featured services + reviews ---------------- */
async function initHomeFeatured(){
  const grid = document.getElementById("featuredServices");
  if (grid){
    try {
      const services = await getJSON("/api/services");
      grid.innerHTML = services.slice(0,4).map(s => `
        <div class="card">
          ${ph(s.name)}
          <div style="font-weight:600;margin-top:14px">${s.name}</div>
          <div style="font-size:.85rem;color:var(--ink-soft);margin-top:4px">&#8358;${s.price_label} &middot; ${s.duration}</div>
        </div>`).join("");
    } catch(e){ grid.innerHTML = `<div class="skeleton">Couldn&rsquo;t load services.</div>`; }
  }
  const revGrid = document.getElementById("homeTestimonials");
  if (revGrid){
    try {
      const reviews = await getJSON("/api/reviews");
      revGrid.innerHTML = reviews.slice(0,3).map(t => reviewCard(t)).join("");
    } catch(e){ revGrid.innerHTML = `<div class="skeleton">Couldn&rsquo;t load reviews.</div>`; }
  }
}
function reviewCard(t){
  return `<div class="card quote-card">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.6"><path d="M7 8a3 3 0 0 0-3 3v5h5v-5H6a2 2 0 0 1 2-2V8Zm10 0a3 3 0 0 0-3 3v5h5v-5h-3a2 2 0 0 1 2-2V8Z"/></svg>
    <p>${t.text}</p>
    <div class="quote-row"><span style="font-weight:500">${t.name}</span>${stars(t.rating)}</div>
  </div>`;
}

/* ---------------- testimonials page ---------------- */
async function initTestimonials(){
  const grid = document.getElementById("testimonialsGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="skeleton">Loading reviews&hellip;</div>`;
  try {
    const reviews = await getJSON("/api/reviews");
    grid.innerHTML = reviews.length ? reviews.map(reviewCard).join("") : `<div class="skeleton">No reviews yet.</div>`;
  } catch(e){ grid.innerHTML = `<div class="skeleton">Couldn&rsquo;t load reviews.</div>`; }
}
async function submitReview(e){
  e.preventDefault();
  const name = document.getElementById("revName").value;
  const rating = document.getElementById("revRating").value;
  const text = document.getElementById("revText").value;
  const box = document.getElementById("reviewFormBox");
  try {
    await postJSON("/api/reviews", { name, rating, text });
    box.innerHTML = `<p style="font-size:.9rem;color:var(--ink-soft)">Thanks! Your review is awaiting approval and will appear here once approved.</p>`;
  } catch(err){ alert("Couldn't submit review: " + err.message); }
  return false;
}

/* ---------------- booking flow ---------------- */
let bookState = { service: "", staff: "", date: "", time: "", name: "", phone: "", email: "" };
function bookGoStep(n){
  document.querySelectorAll(".book-step").forEach(s=>s.classList.remove("active"));
  document.getElementById("bookStep"+n).classList.add("active");
  document.querySelectorAll(".step-dot").forEach((d,i)=>d.classList.toggle("active", i<n));
}
async function initBooking(){
  const select = document.getElementById("bookServiceSelect");
  if (!select) return;
  try {
    const services = await getJSON("/api/services");
    select.innerHTML = `<option value="">Select a service&hellip;</option>` +
      services.map(s => `<option value="${s.name}">${s.name} &mdash; &#8358;${s.price_label}</option>`).join("");
    const params = new URLSearchParams(location.search);
    const svc = params.get("service");
    if (svc){ select.value = svc; bookState.service = svc; document.getElementById("continueStep1").disabled = false; }
  } catch(e){ select.innerHTML = `<option value="">Couldn't load services</option>`; }
}
function selectTime(el, t){
  document.querySelectorAll(".time-slot").forEach(s=>s.classList.remove("selected"));
  el.classList.add("selected"); bookState.time = t;
  document.getElementById("continueStep2").disabled = !(bookState.date && bookState.time);
}
function onDateChange(el){ bookState.date = el.value; document.getElementById("continueStep2").disabled = !(bookState.date && bookState.time); }
function onServiceChange(el){ bookState.service = el.value; document.getElementById("continueStep1").disabled = !bookState.service; }
function checkStep3(){
  bookState.name = document.getElementById("bookName").value;
  bookState.phone = document.getElementById("bookPhone").value;
  bookState.email = document.getElementById("bookEmail").value;
  document.getElementById("confirmBookingBtn").disabled = !(bookState.name && bookState.phone);
}
async function confirmBooking(){
  const btn = document.getElementById("confirmBookingBtn");
  btn.disabled = true; btn.textContent = "Booking\u2026";
  try {
    await postJSON("/api/appointments", {
      service: bookState.service, staff: document.getElementById("bookStaffSelect").value,
      date: bookState.date, time: bookState.time,
      customer_name: bookState.name, phone: bookState.phone, email: bookState.email,
    });
    document.querySelectorAll(".book-step").forEach(s=>s.classList.remove("active"));
    document.getElementById("bookConfirm").classList.add("active");
    document.getElementById("bookSummary").textContent =
      `We'll confirm your ${bookState.service} on ${bookState.date} at ${bookState.time} by email/WhatsApp shortly.`;
  } catch(err){
    alert("Couldn't submit booking: " + err.message);
    btn.disabled = false; btn.textContent = "Confirm Booking";
  }
}
function restartBooking(){
  bookState = { service:"", staff:"", date:"", time:"", name:"", phone:"", email:"" };
  document.getElementById("bookForm")?.reset();
  document.querySelectorAll(".time-slot").forEach(s=>s.classList.remove("selected"));
  document.getElementById("bookConfirm").classList.remove("active");
  const btn = document.getElementById("confirmBookingBtn"); if (btn){ btn.disabled = true; btn.textContent = "Confirm Booking"; }
  bookGoStep(1);
}

/* ---------------- gallery filter (static placeholders) ---------------- */
function filterGallery(cat, btn){
  document.querySelectorAll("#galleryFilters .pill").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll("#galleryGrid .gallery-item").forEach(item => {
    item.style.display = (cat==="All" || item.dataset.cat===cat) ? "" : "none";
  });
}

/* ---------------- FAQ accordion ---------------- */
function toggleFaq(el){
  const item = el.closest(".faq-item");
  const wasOpen = item.classList.contains("open");
  document.querySelectorAll(".faq-item.open").forEach(i=>i.classList.remove("open"));
  if (!wasOpen) item.classList.add("open");
}

/* ---------------- contact form ---------------- */
async function submitContact(e){
  e.preventDefault();
  const form = document.getElementById("contactForm");
  const name = form.querySelector('[name="name"]').value;
  const email = form.querySelector('[name="email"]').value;
  const phone = form.querySelector('[name="phone"]').value;
  const message = form.querySelector('[name="message"]').value;
  try {
    await postJSON("/api/messages", { name, email, phone, message });
    document.getElementById("contactForm").style.display = "none";
    document.getElementById("contactSuccess").style.display = "block";
  } catch(err){ alert("Couldn't send message: " + err.message); }
  return false;
}
function resetContact(){
  document.getElementById("contactForm").style.display = "flex";
  document.getElementById("contactSuccess").style.display = "none";
  document.getElementById("contactForm").reset();
}

/* ---------------- init on load ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  loadSettings();
  initShop();
  initServices();
  initHomeFeatured();
  initTestimonials();
  initBooking();

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.main-nav a, .mobile-nav a").forEach(a => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
});
