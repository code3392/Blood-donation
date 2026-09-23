(() => {
  // Prevent the script from being initialized twice
  if (window.__lifelineAppLoaded) {
    console.warn("Lifeline app.js is already loaded.");
    return;
  }

  window.__lifelineAppLoaded = true;

  // ==============================
  // SUPABASE CONFIGURATION
  // ==============================

  const supabase_URL = "https://heflnehkwmqsetqkiqgv.supabase.co";

  const supabase_PUBLISHABLE_KEY =
    "sb_publishable_Ncu8yv6R1hOh8_1Z3j9Mrg_xSJrf6hd";

  const { createClient } = window.supabase;

  const supabase = createClient(
    supabase_URL,
    supabase_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // ==============================
  // APP STATE
  // ==============================

  let currentUser = null;
  let authMode = "signin";
  let lastDonorResults = [];

  // ==============================
  // DOM HELPERS
  // ==============================

  const $ = (id) => document.getElementById(id);

  const $$ = (selector) => [
    ...document.querySelectorAll(selector)
  ];

  // ==============================
  // TOAST
  // ==============================

  function toast(message, type = "info") {
    const root = $("toast-root");

    if (!root) {
      console.log(message);
      return;
    }

    const el = document.createElement("div");

    el.className = `toast ${type}`;
    el.textContent = message;

    root.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 4200);
  }

  // ==============================
  // SCROLL
  // ==============================

  function scrollToId(id) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }

  // ==============================
  // AUTH REQUIREMENT
  // ==============================

  function requireAuth(callback) {
    if (currentUser) {
      return callback();
    }

    openAuth("signin");

    toast(
      "Please sign in to use the protected donor network.",
      "info"
    );
  }

  // ==============================
  // AUTH MODAL
  // ==============================

  function openAuth(mode = "signin") {
    authMode = mode;

    const modal = $("auth-modal");

    if (!modal) return;

    modal.classList.remove("hidden");

    $("auth-title").textContent =
      mode === "signin"
        ? "Welcome to Lifeline"
        : "Create your Lifeline account";

    $("auth-subtitle").textContent =
      mode === "signin"
        ? "Sign in to search donor profiles and manage your availability."
        : "Create an account to safely access the donor network.";

    $("auth-submit").textContent =
      mode === "signin"
        ? "Sign in"
        : "Create account";
  }

  function closeAuth() {
    $("auth-modal")?.classList.add("hidden");
  }

  function closeProfile() {
    $("profile-modal")?.classList.add("hidden");
  }

  // ==============================
  // UTILITIES
  // ==============================

  function initials(name = "Donor") {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
  }

  function formatDate(date) {
    if (!date) {
      return "Not provided";
    }

    return new Date(date + "T00:00:00").toLocaleDateString(
      "en-BD",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  }

  function setLoading(button, loading, text) {
    if (!button) return;

    if (loading) {
      button.dataset.original = button.innerHTML;
      button.disabled = true;

      button.innerHTML =
        `<span class="spinner">⟳</span> ${text || "Working..."}`;
    } else {
      button.disabled = false;

      button.innerHTML =
        button.dataset.original || button.innerHTML;
    }
  }

  function escapeHtml(value = "") {
    return String(value).replace(
      /[&<>"']/g,
      (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
    );
  }

  // ==============================
  // STATISTICS
  // ==============================

  async function refreshStats() {
    try {
      const [
        donors,
        requests,
        available
      ] = await Promise.all([

        supabase
          .from("donor_profiles")
          .select("id", {
            count: "exact",
            head: true
          }),

        supabase
          .from("blood_requests")
          .select("id", {
            count: "exact",
            head: true
          }),

        supabase
          .from("donor_profiles")
          .select("id", {
            count: "exact",
            head: true
          })
          .eq("available", true)

      ]);

      const safeCount = (result) =>
        result?.count ?? 0;

      const donorCount = safeCount(donors);
      const requestCount = safeCount(requests);
      const availableCount = safeCount(available);

      if ($("stat-donors")) {
        $("stat-donors").textContent =
          donorCount.toLocaleString();
      }

      if ($("stat-requests")) {
        $("stat-requests").textContent =
          requestCount.toLocaleString();
      }

      if ($("stat-available")) {
        $("stat-available").textContent =
          availableCount.toLocaleString();
      }

      if ($("hero-donor-count")) {
        $("hero-donor-count").textContent =
          donorCount.toLocaleString();
      }

    } catch (error) {
      console.error(
        "Error refreshing statistics:",
        error
      );
    }
  }

  // ==============================
  // SESSION
  // ==============================

  async function loadSession() {
    try {
      const { data, error } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          "Session error:",
          error
        );
        return;
      }

      currentUser =
        data.session?.user ?? null;

      updateAuthUI();

    } catch (error) {
      console.error(
        "Could not load session:",
        error
      );
    }
  }

  // ==============================
  // AUTH UI
  // ==============================

  function updateAuthUI() {
    const login = $("login-btn");
    const signout = $("signout-btn");

    if (!login || !signout) return;

    if (currentUser) {
      login.textContent = "Dashboard";
      signout.classList.remove("hidden");
    } else {
      login.textContent = "Sign in";
      signout.classList.add("hidden");
    }
  }

  // ==============================
  // SEARCH DONORS
  // ==============================

  async function searchDonors() {
    requireAuth(async () => {

      const blood =
        $("search-blood")?.value || "";

      const district =
        $("search-district")?.value || "";

      const status =
        $("search-status")?.value || "";

      const results =
        $("donor-results");

      const empty =
        $("donor-empty");

      if (!results) return;

     results.innerHTML = `
        <div class="skeleton-card">
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line long" style="margin-top: 20px;"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line long" style="margin-top: 20px;"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line long" style="margin-top: 20px;"></div>
        </div>
      `;

      empty?.classList.add("hidden");

      let query = supabase
        .from("donor_profiles")
        .select(
          "id, full_name, blood_group, district, area, phone, available, last_donation_date, verified, created_at"
        )
        .order("available", {
          ascending: false
        })
        .order("created_at", {
          ascending: false
        })
        .limit(30);

      if (blood) {
        query = query.eq(
          "blood_group",
          blood
        );
      }

      if (district) {
        query = query.ilike(
          "district",
          district
        );
      }

      if (status) {
        query = query.eq(
          "available",
          true
        );
      }

      const {
        data,
        error
      } = await query;

      if (error) {
        console.error(error);

        results.innerHTML = "";

        toast(
          error.message ||
          "Could not load donors. Check your Supabase table and RLS setup.",
          "error"
        );

        return;
      }

      lastDonorResults =
        data || [];

      renderDonors(
        lastDonorResults
      );
    });
  }

  // ==============================
  // RENDER DONORS
  // ==============================

  function renderDonors(donors) {
    const grid =
      $("donor-results");

    const empty =
      $("donor-empty");

    if (!grid) return;

    grid.innerHTML = "";

    if (!donors.length) {
      empty?.classList.remove(
        "hidden"
      );
      return;
    }

    empty?.classList.add(
      "hidden"
    );

    donors.forEach((donor) => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "donor-card";

      card.innerHTML = `
        <div class="donor-top">

          <div class="donor-avatar">
            ${escapeHtml(
              initials(
                donor.full_name
              )
            )}
          </div>

          <div>
            <h3>
              ${escapeHtml(
                donor.full_name
              )}
            </h3>

            <div class="meta">
              ${escapeHtml(
                donor.area ||
                donor.district ||
                "Bangladesh"
              )}
            </div>
          </div>

          ${
            donor.available
              ? `
                <span
                  class="available-dot"
                  title="Available"
                ></span>
              `
              : ""
          }

        </div>

        <span class="blood-badge">
          ${escapeHtml(
            donor.blood_group
          )}
        </span>

        <div class="details">

          <div>
            <strong>
              ${escapeHtml(
                donor.district ||
                "—"
              )}
            </strong>
            District
          </div>

          <div>
            <strong>
              ${
                donor.verified
                  ? "Verified"
                  : "Registered"
              }
            </strong>
            Status
          </div>

          <div>
            <strong>
              ${formatDate(
                donor.last_donation_date
              )}
            </strong>
            Last donation
          </div>

        </div>

        <button
          class="btn btn-primary contact donor-contact"
          data-id="${escapeHtml(
            donor.id
          )}"
        >
          View & contact
        </button>
      `;

      const contactButton =
        card.querySelector(
          ".donor-contact"
        );

      contactButton?.addEventListener(
        "click",
        () => openDonor(donor)
      );

      grid.appendChild(card);
    });
  }

  // ==============================
  // DONOR PROFILE
  // ==============================

  function openDonor(donor) {

    if ($("profile-blood")) {
      $("profile-blood").textContent =
        donor.blood_group;
    }

    if ($("profile-name")) {
      $("profile-name").textContent =
        donor.full_name;
    }

    if ($("profile-location")) {
      $("profile-location").textContent =
        [
          donor.area,
          donor.district
        ]
          .filter(Boolean)
          .join(" · ") ||
        "Bangladesh";
    }

    if ($("profile-details")) {

      $("profile-details").innerHTML = `
        <div>
          <small>Availability</small>
          <strong>
            ${
              donor.available
                ? "Available now"
                : "Currently unavailable"
            }
          </strong>
        </div>

        <div>
          <small>Profile status</small>
          <strong>
            ${
              donor.verified
                ? "Verified"
                : "Registered"
            }
          </strong>
        </div>

        <div>
          <small>District</small>
          <strong>
            ${escapeHtml(
              donor.district ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <small>Last donation</small>
          <strong>
            ${formatDate(
              donor.last_donation_date
            )}
          </strong>
        </div>
      `;
    }

    const call =
      $("profile-call");

    if (call) {

      call.href =
        `tel:${donor.phone}`;

      call.textContent =
        `Call ${donor.phone}`;
    }

    $("profile-modal")
      ?.classList.remove(
        "hidden"
      );
  }

  // ==============================
  // SUBMIT DONOR PROFILE
  // ==============================

  async function submitDonor(e) {
    e.preventDefault();

    requireAuth(async () => {

      const btn =
        e.submitter;

      setLoading(
        btn,
        true,
        "Saving profile…"
      );

      const payload = {

        user_id:
          currentUser.id,

        full_name:
          $("donor-name")
            .value
            .trim(),

        blood_group:
          $("donor-blood")
            .value,

        district:
          $("donor-district")
            .value
            .trim(),

        area:
          $("donor-area")
            .value
            .trim() ||
          null,

        phone:
          $("donor-phone")
            .value
            .trim(),

        last_donation_date:
          $("donor-last")
            .value ||
          null,

        available:
          $("donor-available")
            .checked,

        consent:
          $("donor-consent")
            .checked,

        verified:
          false
      };

      const {
        error
      } = await supabase
        .from("donor_profiles")
        .upsert(
          payload,
          {
            onConflict:
              "user_id"
          }
        );

      setLoading(
        btn,
        false
      );

      if (error) {

        console.error(error);

        toast(
          error.message ||
          "Could not save donor profile.",
          "error"
        );

        return;
      }

      toast(
        "Donor profile saved. Thank you for joining the Lifeline.",
        "success"
      );

      await refreshStats();

      await searchDonors();
    });
  }

  // ==============================
  // SUBMIT BLOOD REQUEST
  // ==============================

  async function submitRequest(e) {
    e.preventDefault();

    requireAuth(async () => {

      const btn =
        e.submitter;

      setLoading(
        btn,
        true,
        "Publishing…"
      );

      const payload = {

        requester_id:
          currentUser.id,

        patient_name:
          $("request-name")
            .value
            .trim(),

        blood_group:
          $("request-blood")
            .value,

        district:
          $("request-district")
            .value
            .trim(),

        hospital_location:
          $("request-location")
            .value
            .trim(),

        units_needed:
          Number(
            $("request-units")
              .value
          ),

        urgency:
          $("request-urgency")
            .value,

        contact_phone:
          $("request-phone")
            .value
            .trim(),

        note:
          $("request-note")
            .value
            .trim() ||
          null,

        status:
          "open"
      };

      const {
        error
      } = await supabase
        .from("blood_requests")
        .insert(
          payload
        );

      setLoading(
        btn,
        false
      );

      if (error) {

        console.error(error);

        toast(
          error.message ||
          "Could not publish request.",
          "error"
        );

        return;
      }

      e.target.reset();

      if ($("request-units")) {
        $("request-units").value = 1;
      }

      toast(
        "Blood request published successfully.",
        "success"
      );

      await refreshStats();

      scrollToId("find");
    });
  }

  // ==============================
  // AUTHENTICATION
  // ==============================

  async function submitAuth(e) {
    e.preventDefault();

    const email =
      $("auth-email")
        .value
        .trim();

    const password =
      $("auth-password")
        .value;

    const btn =
      $("auth-submit");

    setLoading(
      btn,
      true,
      authMode === "signin"
        ? "Signing in…"
        : "Creating account…"
    );

    let result;

    try {

      if (
        authMode === "signin"
      ) {

        result =
          await supabase.auth
            .signInWithPassword({
              email,
              password
            });

      } else {

        result =
          await supabase.auth
            .signUp({
              email,
              password
            });
      }

    } catch (error) {

      setLoading(
        btn,
        false
      );

      console.error(error);

      toast(
        error.message ||
        "Authentication failed.",
        "error"
      );

      return;
    }

    setLoading(
      btn,
      false
    );

    if (result.error) {

      toast(
        result.error.message,
        "error"
      );

      return;
    }

    // Signup with email confirmation enabled
    if (
      authMode === "signup" &&
      !result.data.session
    ) {

      toast(
        "Account created. Check your email if confirmation is enabled.",
        "success"
      );

      closeAuth();

      return;
    }

    currentUser =
      result.data.user;

    updateAuthUI();

    closeAuth();

    toast(
      "Signed in successfully.",
      "success"
    );

    await refreshStats();
  }

  // ==============================
  // SIGN OUT
  // ==============================

  async function signOut() {

    const {
      error
    } = await supabase.auth.signOut();

    if (error) {

      console.error(error);

      toast(
        error.message ||
        "Could not sign out.",
        "error"
      );

      return;
    }

    currentUser = null;

    updateAuthUI();

    if ($("donor-results")) {
      $("donor-results")
        .innerHTML = "";
    }

    toast(
      "You have been signed out.",
      "info"
    );
  }

  // ==============================
  // CONNECT UI
  // ==============================

  function wireUI() {

    // Navigation buttons
    $$("[data-scroll]")
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {
            scrollToId(
              button.dataset.scroll
            );
          }
        );

      });

    // Announcement links
    $$(".announcement-link")
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {
            scrollToId(
              "request"
            );
          }
        );

      });

    // Login button
    $("login-btn")
      ?.addEventListener(
        "click",
        () => {

          if (currentUser) {
            scrollToId("find");
          } else {
            openAuth("signin");
          }

        }
      );

    // Locked login
    $("locked-login")
      ?.addEventListener(
        "click",
        () => {
          openAuth("signin");
        }
      );

    // Switch signin/signup
    $("switch-auth")
      ?.addEventListener(
        "click",
        () => {

          openAuth(
            authMode === "signin"
              ? "signup"
              : "signin"
          );

        }
      );

    // Auth form
    $("auth-form")
      ?.addEventListener(
        "submit",
        submitAuth
      );

    // Donor form
    $("donor-form")
      ?.addEventListener(
        "submit",
        submitDonor
      );

    // Request form
    $("request-form")
      ?.addEventListener(
        "submit",
        submitRequest
      );

    // Search donors
    $("search-donors")
      ?.addEventListener(
        "click",
        searchDonors
      );

    // Sign out
    $("signout-btn")
      ?.addEventListener(
        "click",
        signOut
      );

    // Close auth modal
    $$("[data-close-modal]")
      .forEach((element) => {

        element.addEventListener(
          "click",
          closeAuth
        );

      });

    // Close profile modal
    $$("[data-close-profile]")
      .forEach((element) => {

        element.addEventListener(
          "click",
          closeProfile
        );

      });

    // Mobile menu
    $("mobile-menu")
      ?.addEventListener(
        "click",
        () => {

          const nav =
            $("main-nav");

          if (!nav) return;

          nav.style.display =
            nav.style.display === "flex"
              ? ""
              : "flex";

          nav.style.position =
            "absolute";

          nav.style.top =
            "76px";

          nav.style.left =
            "0";

          nav.style.right =
            "0";

          nav.style.padding =
            "20px 5vw";

          nav.style.background =
            "#fff";

          nav.style.flexDirection =
            "column";

          nav.style.borderBottom =
            "1px solid #eee";
        }
      );

    // Supabase authentication state
    supabase.auth.onAuthStateChange(
      (_event, session) => {

        currentUser =
          session?.user ?? null;

        updateAuthUI();
      }
    );
  }

  // ==============================
  // INITIALIZE APP
  // ==============================

  async function initializeApp() {

    wireUI();

    await loadSession();

    await refreshStats();
  }

  // ==============================
  // START
  // ==============================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeApp,
      {
        once: true
      }
    );

  } else {

    initializeApp();

  }

})();
