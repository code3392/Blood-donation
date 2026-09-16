
const SUPABASE_URL = "https://heflnehkwmqsetqkiqgv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ncu8yv6R1hOh8_1Z3j9Mrg_xSJrf6hd";

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let currentUser = null;
let authMode = "signin";
let lastDonorResults = [];

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function toast(message, type="info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $("toast-root").appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
}

function requireAuth(callback) {
  if (currentUser) return callback();
  openAuth("signin");
  toast("Please sign in to use the protected donor network.", "info");
}

function openAuth(mode="signin") {
  authMode = mode;
  $("auth-modal").classList.remove("hidden");
  $("auth-title").textContent = mode === "signin" ? "Welcome to Lifeline" : "Create your Lifeline account";
  $("auth-subtitle").textContent = mode === "signin"
    ? "Sign in to search donor profiles and manage your availability."
    : "Create an account to safely access the donor network.";
  $("auth-submit").textContent = mode === "signin" ? "Sign in" : "Create account";
}

function closeAuth() { $("auth-modal").classList.add("hidden"); }
function closeProfile() { $("profile-modal").classList.add("hidden"); }

function initials(name="Donor") {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
}

function formatDate(date) {
  if (!date) return "Not provided";
  return new Date(date + "T00:00:00").toLocaleDateString("en-BD", {day:"numeric", month:"short", year:"numeric"});
}

function setLoading(button, loading, text) {
  if (!button) return;
  if (loading) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner">⟳</span> ${text || "Working..."}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.original || button.innerHTML;
  }
}

async function refreshStats() {
  const [donors, requests, available] = await Promise.all([
    supabase.from("donor_profiles").select("id", {count:"exact", head:true}),
    supabase.from("blood_requests").select("id", {count:"exact", head:true}),
    supabase.from("donor_profiles").select("id", {count:"exact", head:true}).eq("available", true)
  ]);

  const safeCount = (r) => r?.count ?? 0;
  const dc = safeCount(donors), rc = safeCount(requests), ac = safeCount(available);
  $("stat-donors").textContent = dc.toLocaleString();
  $("stat-requests").textContent = rc.toLocaleString();
  $("stat-available").textContent = ac.toLocaleString();
  $("hero-donor-count").textContent = dc.toLocaleString();
}

async function loadSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user ?? null;
  updateAuthUI();
}

function updateAuthUI() {
  const login = $("login-btn");
  const signout = $("signout-btn");
  if (currentUser) {
    login.textContent = "Dashboard";
    signout.classList.remove("hidden");
  } else {
    login.textContent = "Sign in";
    signout.classList.add("hidden");
  }
}

async function searchDonors() {
  requireAuth(async () => {
    const blood = $("search-blood").value;
    const district = $("search-district").value;
    const status = $("search-status").value;

    const results = $("donor-results");
    const empty = $("donor-empty");
    results.innerHTML = `<div class="empty-state"><div>⌁</div><h3>Searching the network…</h3><p>Checking consented donor profiles.</p></div>`;
    empty.classList.add("hidden");

    let query = supabase
      .from("donor_profiles")
      .select("id, full_name, blood_group, district, area, phone, available, last_donation_date, verified, created_at")
      .order("available", {ascending:false})
      .order("created_at", {ascending:false})
      .limit(30);

    if (blood) query = query.eq("blood_group", blood);
    if (district) query = query.ilike("district", district);
    if (status) query = query.eq("available", true);

    const { data, error } = await query;
    if (error) {
      console.error(error);
      results.innerHTML = "";
      toast(error.message || "Could not load donors. Check your Supabase table/RLS setup.", "error");
      return;
    }

    lastDonorResults = data || [];
    renderDonors(lastDonorResults);
  });
}

function renderDonors(donors) {
  const grid = $("donor-results");
  const empty = $("donor-empty");
  grid.innerHTML = "";

  if (!donors.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  donors.forEach(donor => {
    const card = document.createElement("article");
    card.className = "donor-card";
    card.innerHTML = `
      <div class="donor-top">
        <div class="donor-avatar">${initials(donor.full_name)}</div>
        <div>
          <h3>${escapeHtml(donor.full_name)}</h3>
          <div class="meta">${escapeHtml(donor.area || donor.district || "Bangladesh")}</div>
        </div>
        ${donor.available ? `<span class="available-dot" title="Available"></span>` : ""}
      </div>
      <span class="blood-badge">${escapeHtml(donor.blood_group)}</span>
      <div class="details">
        <div><strong>${escapeHtml(donor.district || "—")}</strong>District</div>
        <div><strong>${donor.verified ? "Verified" : "Registered"}</strong>Status</div>
        <div><strong>${formatDate(donor.last_donation_date)}</strong>Last donation</div>
      </div>
      <button class="btn btn-primary contact donor-contact" data-id="${donor.id}">View & contact</button>
    `;
    card.querySelector(".donor-contact").addEventListener("click", () => openDonor(donor));
    grid.appendChild(card);
  });
}

function openDonor(donor) {
  $("profile-blood").textContent = donor.blood_group;
  $("profile-name").textContent = donor.full_name;
  $("profile-location").textContent = [donor.area, donor.district].filter(Boolean).join(" · ") || "Bangladesh";
  $("profile-details").innerHTML = `
    <div><small>Availability</small><strong>${donor.available ? "Available now" : "Currently unavailable"}</strong></div>
    <div><small>Profile status</small><strong>${donor.verified ? "Verified" : "Registered"}</strong></div>
    <div><small>District</small><strong>${escapeHtml(donor.district || "—")}</strong></div>
    <div><small>Last donation</small><strong>${formatDate(donor.last_donation_date)}</strong></div>
  `;
  const call = $("profile-call");
  call.href = `tel:${donor.phone}`;
  call.textContent = `Call ${donor.phone}`;
  $("profile-modal").classList.remove("hidden");
}

async function submitDonor(e) {
  e.preventDefault();
  requireAuth(async () => {
    const btn = e.submitter;
    setLoading(btn, true, "Saving profile…");

    const payload = {
      user_id: currentUser.id,
      full_name: $("donor-name").value.trim(),
      blood_group: $("donor-blood").value,
      district: $("donor-district").value.trim(),
      area: $("donor-area").value.trim() || null,
      phone: $("donor-phone").value.trim(),
      last_donation_date: $("donor-last").value || null,
      available: $("donor-available").checked,
      consent: $("donor-consent").checked,
      verified: false
    };

    const { error } = await supabase.from("donor_profiles").upsert(payload, {onConflict:"user_id"});
    setLoading(btn, false);

    if (error) {
      toast(error.message || "Could not save donor profile.", "error");
      return;
    }
    toast("Donor profile saved. Thank you for joining the Lifeline.", "success");
    await refreshStats();
    await searchDonors();
  });
}

async function submitRequest(e) {
  e.preventDefault();
  requireAuth(async () => {
    const btn = e.submitter;
    setLoading(btn, true, "Publishing…");

    const payload = {
      requester_id: currentUser.id,
      patient_name: $("request-name").value.trim(),
      blood_group: $("request-blood").value,
      district: $("request-district").value.trim(),
      hospital_location: $("request-location").value.trim(),
      units_needed: Number($("request-units").value),
      urgency: $("request-urgency").value,
      contact_phone: $("request-phone").value.trim(),
      note: $("request-note").value.trim() || null,
      status: "open"
    };

    const { error } = await supabase.from("blood_requests").insert(payload);
    setLoading(btn, false);

    if (error) {
      toast(error.message || "Could not publish request.", "error");
      return;
    }
    e.target.reset();
    $("request-units").value = 1;
    toast("Blood request published successfully.", "success");
    await refreshStats();
    scrollToId("find");
  });
}

async function submitAuth(e) {
  e.preventDefault();
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const btn = $("auth-submit");
  setLoading(btn, true, authMode === "signin" ? "Signing in…" : "Creating account…");

  let result;
  if (authMode === "signin") {
    result = await supabase.auth.signInWithPassword({email, password});
  } else {
    result = await supabase.auth.signUp({email, password});
  }

  setLoading(btn, false);

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  if (authMode === "signup" && !result.data.session) {
    toast("Account created. Check your email if confirmation is enabled.", "success");
    closeAuth();
    return;
  }

  currentUser = result.data.user;
  updateAuthUI();
  closeAuth();
  toast("Signed in successfully.", "success");
  await refreshStats();
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  updateAuthUI();
  $("donor-results").innerHTML = "";
  toast("You have been signed out.", "info");
}

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function wireUI() {
  $$("[data-scroll]").forEach(btn => btn.addEventListener("click", () => scrollToId(btn.dataset.scroll)));
  $$(".announcement-link").forEach(btn => btn.addEventListener("click", () => scrollToId("request")));

  $("login-btn").addEventListener("click", () => currentUser ? scrollToId("find") : openAuth("signin"));
  $("locked-login").addEventListener("click", () => openAuth("signin"));
  $("switch-auth").addEventListener("click", () => openAuth(authMode === "signin" ? "signup" : "signin"));
  $("auth-form").addEventListener("submit", submitAuth);
  $("donor-form").addEventListener("submit", submitDonor);
  $("request-form").addEventListener("submit", submitRequest);
  $("search-donors").addEventListener("click", searchDonors);
  $("signout-btn").addEventListener("click", signOut);

  $$("[data-close-modal]").forEach(el => el.addEventListener("click", closeAuth));
  $$("[data-close-profile]").forEach(el => el.addEventListener("click", closeProfile));

  $("mobile-menu").addEventListener("click", () => {
    const nav = $("main-nav");
    nav.style.display = nav.style.display === "flex" ? "" : "flex";
    nav.style.position = "absolute";
    nav.style.top = "76px";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.padding = "20px 5vw";
    nav.style.background = "#fff";
    nav.style.flexDirection = "column";
    nav.style.borderBottom = "1px solid #eee";
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  wireUI();
  await loadSession();
  await refreshStats();
});
