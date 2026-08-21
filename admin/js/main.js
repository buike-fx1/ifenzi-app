/* =========================================================
   IFENZI BEAUTY SALON — admin dashboard script
   ========================================================= */

async function getJSON(url){
  const r = await fetch(url, { credentials: "same-origin" });
  if (r.status === 401){ location.href = "login.html"; throw new Error("Not authenticated"); }
  if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || "Request failed");
  return r.json();
}
async function sendJSON(url, method, body){
  const r = await fetch(url, {
    method, credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401){ location.href = "login.html"; throw new Error("Not authenticated"); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toast(msg){
  let el = document.getElementById("toast");
  if (!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

function badge(status){
  return `<span class="badge badge-${status}">${status}</span>`;
}

function fmtMoney(n){ return "\u20A6" + Number(n).toLocaleString(); }
function fmtDate(s){ try { return new Date(s).toLocaleString(); } catch(e){ return s; } }

/* ---------------- auth guard for every admin page except login ---------------- */
async function requireAuth(){
  try {
    const me = await getJSON("/api/admin/me");
    if (!me.loggedIn){ location.href = "login.html"; return null; }
    const el = document.getElementById("adminUsername");
    if (el) el.textContent = me.username;
    return me;
  } catch(e){ return null; }
}

async function logout(){
  await sendJSON("/api/admin/logout", "POST");
  location.href = "login.html";
}

/* ---------------- login page ---------------- */
async function handleLogin(e){
  e.preventDefault();
  const username = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  errEl.style.display = "none";
  try {
    await sendJSON("/api/admin/login", "POST", { username, password });
    location.href = "index.html";
  } catch(err){
    errEl.textContent = err.message;
    errEl.style.display = "block";
  }
  return false;
}

/* ---------------- simple modal helper ---------------- */
function openModal(id){ document.getElementById(id).classList.add("open"); }
function closeModal(id){ document.getElementById(id).classList.remove("open"); }

/* =========================================================
   DASHBOARD OVERVIEW
   ========================================================= */
async function loadOverview(){
  const data = await getJSON("/api/admin/overview");
  document.getElementById("statAppointments").textContent = data.pendingAppointments;
  document.getElementById("statOrders").textContent = data.pendingOrders;
  document.getElementById("statRevenue").textContent = fmtMoney(data.revenue);
  document.getElementById("statMessages").textContent = data.unreadMessages;

  document.getElementById("recentAppts").innerHTML = data.recentAppts.map(a => `
    <tr><td>${a.customer_name}</td><td>${a.service}</td><td>${a.date} ${a.time}</td><td>${badge(a.status)}</td></tr>
  `).join("") || `<tr><td colspan="4">No appointments yet.</td></tr>`;

  document.getElementById("recentOrders").innerHTML = data.recentOrders.map(o => `
    <tr><td>${o.customer_name}</td><td>${fmtMoney(o.total)}</td><td>${badge(o.status)}</td></tr>
  `).join("") || `<tr><td colspan="3">No orders yet.</td></tr>`;
}

/* =========================================================
   SERVICES
   ========================================================= */
let servicesCache = [];
async function loadServices(){
  servicesCache = await getJSON("/api/admin/services");
  const body = document.getElementById("servicesBody");
  body.innerHTML = servicesCache.map(s => `
    <tr>
      <td>${s.name}</td><td>${s.category}</td><td>&#8358;${s.price_label}</td><td>${s.duration}</td>
      <td>${s.active ? badge("approved") : badge("cancelled")}</td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="editService(${s.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6">No services yet.</td></tr>`;
}
function newService(){
  document.getElementById("serviceModalTitle").textContent = "Add Service";
  document.getElementById("serviceForm").reset();
  document.getElementById("serviceId").value = "";
  document.getElementById("serviceActive").checked = true;
  openModal("serviceModal");
}
function editService(id){
  const s = servicesCache.find(x => x.id === id);
  document.getElementById("serviceModalTitle").textContent = "Edit Service";
  document.getElementById("serviceId").value = s.id;
  document.getElementById("serviceName").value = s.name;
  document.getElementById("serviceCategory").value = s.category;
  document.getElementById("servicePrice").value = s.price;
  document.getElementById("servicePriceLabel").value = s.price_label;
  document.getElementById("serviceDuration").value = s.duration;
  document.getElementById("serviceDescription").value = s.description;
  document.getElementById("serviceActive").checked = !!s.active;
  openModal("serviceModal");
}
async function saveService(e){
  e.preventDefault();
  const id = document.getElementById("serviceId").value;
  const payload = {
    name: document.getElementById("serviceName").value,
    category: document.getElementById("serviceCategory").value,
    price: +document.getElementById("servicePrice").value,
    price_label: document.getElementById("servicePriceLabel").value,
    duration: document.getElementById("serviceDuration").value,
    description: document.getElementById("serviceDescription").value,
    active: document.getElementById("serviceActive").checked,
  };
  try {
    if (id) await sendJSON(`/api/admin/services/${id}`, "PUT", payload);
    else await sendJSON("/api/admin/services", "POST", payload);
    closeModal("serviceModal"); toast("Service saved"); loadServices();
  } catch(err){ alert(err.message); }
  return false;
}
async function deleteService(id){
  if (!confirm("Delete this service?")) return;
  await sendJSON(`/api/admin/services/${id}`, "DELETE");
  toast("Service deleted"); loadServices();
}

/* =========================================================
   PRODUCTS
   ========================================================= */
let productsCache = [];
async function loadProducts(){
  productsCache = await getJSON("/api/admin/products");
  const body = document.getElementById("productsBody");
  body.innerHTML = productsCache.map(p => `
    <tr>
      <td>${p.name}</td><td>${p.category}</td><td>${fmtMoney(p.price)}</td><td>${p.stock}</td>
      <td>${p.active ? badge("approved") : badge("cancelled")}</td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6">No products yet.</td></tr>`;
}
function newProduct(){
  document.getElementById("productModalTitle").textContent = "Add Product";
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productActive").checked = true;
  openModal("productModal");
}
function editProduct(id){
  const p = productsCache.find(x => x.id === id);
  document.getElementById("productModalTitle").textContent = "Edit Product";
  document.getElementById("productId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productCategory").value = p.category;
  document.getElementById("productPrice").value = p.price;
  document.getElementById("productStock").value = p.stock;
  document.getElementById("productActive").checked = !!p.active;
  openModal("productModal");
}
async function saveProduct(e){
  e.preventDefault();
  const id = document.getElementById("productId").value;
  const payload = {
    name: document.getElementById("productName").value,
    category: document.getElementById("productCategory").value,
    price: +document.getElementById("productPrice").value,
    stock: +document.getElementById("productStock").value,
    active: document.getElementById("productActive").checked,
  };
  try {
    if (id) await sendJSON(`/api/admin/products/${id}`, "PUT", payload);
    else await sendJSON("/api/admin/products", "POST", payload);
    closeModal("productModal"); toast("Product saved"); loadProducts();
  } catch(err){ alert(err.message); }
  return false;
}
async function deleteProduct(id){
  if (!confirm("Delete this product?")) return;
  await sendJSON(`/api/admin/products/${id}`, "DELETE");
  toast("Product deleted"); loadProducts();
}

/* =========================================================
   APPOINTMENTS
   ========================================================= */
async function loadAppointments(){
  const rows = await getJSON("/api/admin/appointments");
  document.getElementById("apptBody").innerHTML = rows.map(a => `
    <tr>
      <td>${a.customer_name}<br><span style="color:var(--ink-soft);font-size:.78rem">${a.phone}</span></td>
      <td>${a.service}${a.staff ? `<br><span style="color:var(--ink-soft);font-size:.78rem">${a.staff}</span>` : ""}</td>
      <td>${a.date}<br>${a.time}</td>
      <td>${badge(a.status)}</td>
      <td class="row-actions">
        ${a.status !== "approved" ? `<button class="btn btn-primary btn-sm" onclick="setApptStatus(${a.id},'approved')">Approve</button>` : ""}
        ${a.status !== "cancelled" ? `<button class="btn btn-danger btn-sm" onclick="setApptStatus(${a.id},'cancelled')">Cancel</button>` : ""}
        <button class="btn btn-outline btn-sm" onclick="deleteAppt(${a.id})">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5">No appointments yet.</td></tr>`;
}
async function setApptStatus(id, status){
  await sendJSON(`/api/admin/appointments/${id}`, "PUT", { status });
  toast("Appointment updated"); loadAppointments();
}
async function deleteAppt(id){
  if (!confirm("Delete this appointment?")) return;
  await sendJSON(`/api/admin/appointments/${id}`, "DELETE");
  toast("Appointment deleted"); loadAppointments();
}

/* =========================================================
   ORDERS
   ========================================================= */
async function loadOrders(){
  const rows = await getJSON("/api/admin/orders");
  document.getElementById("ordersBody").innerHTML = rows.map(o => `
    <tr>
      <td>${o.customer_name}<br><span style="color:var(--ink-soft);font-size:.78rem">${o.phone}</span></td>
      <td>${o.items.map(i => `${i.name} &times;${i.qty}`).join("<br>")}</td>
      <td>${fmtMoney(o.total)}</td>
      <td>${badge(o.status)}</td>
      <td class="row-actions">
        <select class="field" style="padding:6px 8px;margin:0" onchange="setOrderStatus(${o.id}, this.value)">
          ${["pending","paid","shipped","completed","cancelled"].map(s => `<option value="${s}" ${s===o.status?"selected":""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>`).join("") || `<tr><td colspan="5">No orders yet.</td></tr>`;
}
async function setOrderStatus(id, status){
  await sendJSON(`/api/admin/orders/${id}`, "PUT", { status });
  toast("Order updated"); loadOrders();
}

/* =========================================================
   MESSAGES
   ========================================================= */
async function loadMessages(){
  const rows = await getJSON("/api/admin/messages");
  document.getElementById("messagesBody").innerHTML = rows.map(m => `
    <tr style="${m.is_read ? "" : "font-weight:600"}">
      <td>${m.name}<br><span style="color:var(--ink-soft);font-size:.78rem;font-weight:400">${m.email}${m.phone ? " &middot; "+m.phone : ""}</span></td>
      <td style="max-width:320px">${m.message}</td>
      <td style="font-size:.78rem;color:var(--ink-soft)">${fmtDate(m.created_at)}</td>
      <td class="row-actions">
        ${!m.is_read ? `<button class="btn btn-outline btn-sm" onclick="markRead(${m.id})">Mark read</button>` : ""}
        <button class="btn btn-danger btn-sm" onclick="deleteMessage(${m.id})">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="4">No messages yet.</td></tr>`;
}
async function markRead(id){ await sendJSON(`/api/admin/messages/${id}/read`, "PUT"); loadMessages(); }
async function deleteMessage(id){
  if (!confirm("Delete this message?")) return;
  await sendJSON(`/api/admin/messages/${id}`, "DELETE");
  toast("Message deleted"); loadMessages();
}

/* =========================================================
   REVIEWS
   ========================================================= */
async function loadReviews(){
  const rows = await getJSON("/api/admin/reviews");
  document.getElementById("reviewsBody").innerHTML = rows.map(r => `
    <tr>
      <td>${r.name}</td><td>${"&#9733;".repeat(r.rating)}</td>
      <td style="max-width:320px">${r.text}</td>
      <td>${r.approved ? badge("approved") : badge("pending")}</td>
      <td class="row-actions">
        ${!r.approved ? `<button class="btn btn-primary btn-sm" onclick="setReviewApproved(${r.id},true)">Approve</button>` : `<button class="btn btn-outline btn-sm" onclick="setReviewApproved(${r.id},false)">Hide</button>`}
        <button class="btn btn-danger btn-sm" onclick="deleteReview(${r.id})">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5">No reviews yet.</td></tr>`;
}
async function setReviewApproved(id, approved){
  await sendJSON(`/api/admin/reviews/${id}`, "PUT", { approved });
  toast("Review updated"); loadReviews();
}
async function deleteReview(id){
  if (!confirm("Delete this review?")) return;
  await sendJSON(`/api/admin/reviews/${id}`, "DELETE");
  toast("Review deleted"); loadReviews();
}

/* =========================================================
   SETTINGS
   ========================================================= */
async function loadSettings(){
  const s = await getJSON("/api/admin/settings");
  ["business_name","address","phone","instagram","facebook","hours"].forEach(k => {
    const el = document.getElementById("set_" + k);
    if (el) el.value = s[k] || "";
  });
}
async function saveSettings(e){
  e.preventDefault();
  const payload = {};
  ["business_name","address","phone","instagram","facebook","hours"].forEach(k => {
    payload[k] = document.getElementById("set_" + k).value;
  });
  await sendJSON("/api/admin/settings", "PUT", payload);
  toast("Settings saved");
  return false;
}
async function changePassword(e){
  e.preventDefault();
  const currentPassword = document.getElementById("curPass").value;
  const newPassword = document.getElementById("newPass").value;
  const msg = document.getElementById("passMsg");
  try {
    await sendJSON("/api/admin/change-password", "POST", { currentPassword, newPassword });
    msg.style.color = "var(--gold-deep)"; msg.textContent = "Password updated.";
    document.getElementById("passwordForm").reset();
  } catch(err){
    msg.style.color = "var(--danger)"; msg.textContent = err.message;
  }
  return false;
}
