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

  const supabase_URL =
    "https://heflnehkwmqsetqkiqgv.supabase.co";

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

    return null;
  }

  // ==============================
  // AUTH MODAL
  // ==============================

  function openAuth(mode = "signin") {
    authMode =
      mode === "signup"
        ? "signup"
        : "signin";

    const modal = $("auth-modal");

    if (!modal) return;

    modal.classList.remove("hidden");

    if ($("auth-title")) {
      $("auth-title").textContent =
        authMode === "signin"
          ? "Welcome to Lifeline"
          : "Create your Lifeline account";
    }

    if ($("auth-subtitle")) {
      $("auth-subtitle").textContent =
        authMode === "signin"
          ? "Sign in to search donor profiles and manage your availability."
          : "Create an account to safely access the donor network.";
    }

    if ($("auth-submit")) {
      $("auth-submit").textContent =
        authMode === "signin"
          ? "Sign in"
          : "Create account";
    }

    if ($("switch-auth")) {
      $("switch-auth").textContent =
        authMode === "signin"
          ? "Create an account"
          : "Already have an account? Sign in";
    }
    const confirmGroup = $("confirm-password-group");
    const confirmPassword = $("auth-confirm-password");

    if (confirmGroup) {
      if (authMode === "signup") {
        confirmGroup.classList.remove("hidden");
      } else {
        confirmGroup.classList.add("hidden");
        if (confirmPassword) {
          confirmPassword.value = "";
        }
      }
    }
  }

  function closeAuth() {
    $("auth-modal")?.classList.add("hidden");

    // Reset password visibility toggles on modal close
    const authPasswordInput = $("auth-password");
    const togglePasswordBtn = $("toggle-password-btn");
    if (authPasswordInput && authPasswordInput.type === "text") {
      authPasswordInput.type = "password";
      if (togglePasswordBtn) togglePasswordBtn.textContent = "👁️";
    }

    const authConfirmPasswordInput = $("auth-confirm-password");
    const toggleConfirmPasswordBtn = $("toggle-confirm-password-btn");
    if (authConfirmPasswordInput && authConfirmPasswordInput.type === "text") {
      authConfirmPasswordInput.type = "password";
      if (toggleConfirmPasswordBtn) toggleConfirmPasswordBtn.textContent = "👁️";
    }
  }

  function closeProfile() {
    $("profile-modal")?.classList.add("hidden");
  }

  // ==============================
  // UTILITIES
  // ==============================

  function initials(name = "Donor") {
    return String(name)
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

    const value = String(date);

    // PostgreSQL date column
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(`${value}T00:00:00`);

      if (Number.isNaN(parsed.getTime())) {
        return "Not provided";
      }

      return parsed.toLocaleDateString(
        "en-BD",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      );
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return "Not provided";
    }

    return parsed.toLocaleDateString(
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
      if (!button.dataset.original) {
        button.dataset.original =
          button.innerHTML;
      }

      button.disabled = true;

      button.innerHTML =
        `<span class="spinner">⟳</span> ${
          text || "Working..."
        }`;
    } else {
      button.disabled = false;

      if (button.dataset.original) {
        button.innerHTML =
          button.dataset.original;

        delete button.dataset.original;
      }
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

  function safePhone(value = "") {
    return String(value)
      .trim()
      .replace(/[^\d+()\-\s]/g, "");
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

      if (donors?.error) {
        console.error(
          "Donor statistics error:",
          donors.error
        );
      }

      if (requests?.error) {
        console.error(
          "Request statistics error:",
          requests.error
        );
      }

      if (available?.error) {
        console.error(
          "Available donor statistics error:",
          available.error
        );
      }

      const donorCount =
        safeCount(donors);

      const requestCount =
        safeCount(requests);

      const availableCount =
        safeCount(available);

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
      const {
        data,
        error
      } =
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
    return requireAuth(async () => {

      const blood =
        $("search-blood")?.value?.trim() || "";

      const district =
        $("search-district")?.value?.trim() || "";

      const status =
        $("search-status")?.value?.trim() || "";

      const results =
        $("donor-results");

      const empty =
        $("donor-empty");

      if (!results) return;

      results.innerHTML = `
        <div class="empty-state">
          <div>⌁</div>
          <h3>Searching the network…</h3>
          <p>Checking consented donor profiles.</p>
        </div>
      `;

      empty?.classList.add("hidden");

      let query = supabase
        .from("donor_profiles")
        .select("*")
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
          `%${district}%`
        );
      }

      if (status === "available") {
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
        console.error(
          "Donor search error:",
          error
        );

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

      const donorName =
        donor.full_name ||
        "Anonymous donor";

      const phone =
        safePhone(donor.phone);

      card.innerHTML = `
        <div class="donor-top">

          <div class="donor-avatar">
            ${
              donor.avatar_url
                ? `<img src="${escapeHtml(donor.avatar_url)}" alt="${escapeHtml(donorName)}" />`
                : escapeHtml(initials(donorName))
            }
          </div>

          <div>
            <h3>
              ${escapeHtml(
                donorName
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
            donor.blood_group ||
            "Unknown"
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
              ${escapeHtml(
                formatDate(
                  donor.last_donation_date
                )
              )}
            </strong>
            Last donation
          </div>

        </div>

        <button
          type="button"
          class="btn btn-primary contact donor-contact"
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

    if (!donor) return;

    const bloodBadge = $("profile-blood");
    if (bloodBadge) {
      if (donor.avatar_url) {
        bloodBadge.innerHTML = `<img src="${escapeHtml(donor.avatar_url)}" alt="${escapeHtml(donor.full_name || 'Donor')}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />`;
      } else {
        bloodBadge.textContent = donor.blood_group || "Unknown";
      }
    }

    if ($("profile-name")) {
      $("profile-name").textContent =
        donor.full_name ||
        "Anonymous donor";
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
            ${escapeHtml(
              formatDate(
                donor.last_donation_date
              )
            )}
          </strong>
        </div>
      `;
    }

    const call =
      $("profile-call");

    const phone =
      safePhone(donor.phone);

    if (call) {

      if (phone) {
        call.href =
          `tel:${phone}`;

        call.textContent =
          `Call ${phone}`;

        call.classList.remove(
          "hidden"
        );
      } else {
        call.removeAttribute(
          "href"
        );

        call.textContent =
          "Phone unavailable";

        call.classList.add(
          "hidden"
        );
      }
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

    return requireAuth(async () => {

      if (!$("donor-consent")?.checked) {
        toast(
          "Please provide consent before joining the donor network.",
          "error"
        );
        return;
      }

      const btn =
        e.submitter;

      setLoading(
        btn,
        true,
        "Saving profile…"
      );

      const fullName =
        $("donor-name")
          ?.value
          ?.trim() || "";

      const bloodGroup =
        $("donor-blood")
          ?.value
          ?.trim() || "";

      const district =
        $("donor-district")
          ?.value
          ?.trim() || "";

      const area =
        $("donor-area")
          ?.value
          ?.trim() || null;

      const phone =
        safePhone(
          $("donor-phone")
            ?.value || ""
        );

      const lastDonation =
        $("donor-last")
          ?.value || null;

      const available =
        $("donor-available")
          ?.checked || false;

      const consent =
        $("donor-consent")
          ?.checked || false;

      if (
        !fullName ||
        !bloodGroup ||
        !district ||
        !phone
      ) {
        setLoading(
          btn,
          false
        );

        toast(
          "Please complete all required donor information.",
          "error"
        );

        return;
      }

      const payload = {

        user_id:
          currentUser.id,

        full_name:
          fullName,

        blood_group:
          bloodGroup,

        district:
          district,

        area:
          area,

        phone:
          phone,

        last_donation_date:
          lastDonation,

        available:
          available,

        consent:
          consent,

        // New profiles are never verified
        // from the client.
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

        console.error(
          "Donor profile error:",
          error
        );

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
  // LOAD BLOOD REQUESTS
  // ==============================

  async function loadBloodRequests() {
    const grid =
      $("requests-results");

    if (!grid) return;

    const {
      data,
      error
    } = await supabase
      .from("blood_requests")
      .select(
        "id, patient_name, blood_group, district, hospital_location, units_needed, urgency, contact_phone, note, created_at"
      )
      .eq(
        "status",
        "open"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(4);

    if (error) {
      console.error(
        "Blood request loading error:",
        error
      );

      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    grid.innerHTML = "";

    data.forEach((req) => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "donor-card";

      const phone =
        safePhone(
          req.contact_phone
        );

      const patientName =
        req.patient_name ||
        "Blood request";

      const location =
        req.hospital_location ||
        req.district ||
        "Location not provided";

      const urgency =
        req.urgency ||
        "Normal";

      const bloodGroup =
        req.blood_group ||
        "Unknown";

      const units =
        Number(req.units_needed) || 0;

      const note =
        req.note ||
        "None";

      card.innerHTML = `
        <div class="donor-top">

          <div class="donor-avatar">
            ${escapeHtml(
              bloodGroup
            )}
          </div>

          <div>
            <h3>
              ${escapeHtml(
                patientName
              )}
            </h3>

            <div class="meta">
              ${escapeHtml(
                location
              )}
            </div>
          </div>

          <span class="status-pill">
            ${escapeHtml(
              urgency
            )}
          </span>

        </div>

        <p style="margin: 8px 0; font-size: 13px;">
          <strong>Units:</strong>
          ${escapeHtml(units)}

          |

          <strong>Note:</strong>
          ${escapeHtml(note)}
        </p>

        ${
          phone
            ? `
              <a
                href="tel:${escapeHtml(phone)}"
                class="btn btn-primary contact"
                style="margin-top:10px; display:block; text-align:center;"
              >
                Call ${escapeHtml(phone)}
              </a>
            `
            : `
              <span
                class="btn btn-primary contact"
                style="margin-top:10px; display:block; text-align:center; opacity:.6;"
              >
                Phone unavailable
              </span>
            `
        }
      `;

      grid.appendChild(card);
    });
  }

  // ==============================
  // SUBMIT BLOOD REQUEST
  // ==============================

  async function submitRequest(e) {
    e.preventDefault();

    return requireAuth(async () => {

      const btn =
        e.submitter;

      setLoading(
        btn,
        true,
        "Publishing…"
      );

      const patientName =
        $("request-name")
          ?.value
          ?.trim() || "";

      const bloodGroup =
        $("request-blood")
          ?.value
          ?.trim() || "";

      const district =
        $("request-district")
          ?.value
          ?.trim() || "";

      const hospitalLocation =
        $("request-location")
          ?.value
          ?.trim() || "";

      const units =
        Number(
          $("request-units")
            ?.value
        );

      const urgency =
        $("request-urgency")
          ?.value
          ?.trim() || "";

      const phone =
        safePhone(
          $("request-phone")
            ?.value || ""
        );

      const note =
        $("request-note")
          ?.value
          ?.trim() || null;

      if (
        !patientName ||
        !bloodGroup ||
        !district ||
        !hospitalLocation ||
        !Number.isFinite(units) ||
        units < 1 ||
        !urgency ||
        !phone
      ) {
        setLoading(
          btn,
          false
        );

        toast(
          "Please complete all required blood request information.",
          "error"
        );

        return;
      }

      const payload = {

        requester_id:
          currentUser.id,

        patient_name:
          patientName,

        blood_group:
          bloodGroup,

        district:
          district,

        hospital_location:
          hospitalLocation,

        units_needed:
          units,

        urgency:
          urgency,

        contact_phone:
          phone,

        note:
          note,

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

        console.error(
          "Blood request error:",
          error
        );

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
      await loadBloodRequests();

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
        ?.value
        ?.trim() || "";

        const confirmPassword =
  $("auth-confirm-password")
    ?.value || "";

    const password =
      $("auth-password")
        ?.value || "";

    const btn =
      $("auth-submit");

    if (!email || !password) {
  toast(
    "Please enter your email and password.",
    "error"
  );

  return;
}

if (authMode === "signup") {
  if (!confirmPassword) {
    toast(
      "Please confirm your password.",
      "error"
    );

    return;
  }

  if (password !== confirmPassword) {
    toast(
      "Passwords do not match.",
      "error"
    );

    return;
  }
}

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

      console.error(
        "Authentication exception:",
        error
      );

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

      console.error(
        "Authentication error:",
        result.error
      );

      toast(
        result.error.message ||
        "Authentication failed.",
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
      result.data.user ?? null;

    updateAuthUI();

    closeAuth();

    toast(
      authMode === "signin"
        ? "Signed in successfully."
        : "Account created successfully.",
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
    } =
      await supabase.auth.signOut();

    if (error) {

      console.error(
        "Sign out error:",
        error
      );

      toast(
        error.message ||
        "Could not sign out.",
        "error"
      );

      return;
    }

    currentUser = null;

    lastDonorResults = [];

    updateAuthUI();

    if ($("donor-results")) {
      $("donor-results")
        .innerHTML = "";
    }

    if ($("donor-empty")) {
      $("donor-empty")
        .classList.add(
          "hidden"
        );
    }

    $("profile-modal")
      ?.classList.add(
        "hidden"
      );

    toast(
      "You have been signed out.",
      "info"
    );
  }

  // ==============================
  // CONNECT UI
  // ==============================

  function wireUI() {
    // Toggle password visibility
    const togglePasswordBtn = $("toggle-password-btn");
    const authPasswordInput = $("auth-password");
    if (togglePasswordBtn && authPasswordInput) {
      togglePasswordBtn.addEventListener("click", () => {
        if (authPasswordInput.type === "password") {
          authPasswordInput.type = "text";
          togglePasswordBtn.textContent = "🙈";
        } else {
          authPasswordInput.type = "password";
          togglePasswordBtn.textContent = "👁️";
        }
      });
    }

    // Toggle confirm password visibility
    const toggleConfirmPasswordBtn = $("toggle-confirm-password-btn");
    const authConfirmPasswordInput = $("auth-confirm-password");
    if (toggleConfirmPasswordBtn && authConfirmPasswordInput) {
      toggleConfirmPasswordBtn.addEventListener("click", () => {
        if (authConfirmPasswordInput.type === "password") {
          authConfirmPasswordInput.type = "text";
          toggleConfirmPasswordBtn.textContent = "🙈";
        } else {
          authConfirmPasswordInput.type = "password";
          toggleConfirmPasswordBtn.textContent = "👁️";
        }
      });
    }

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

    // Login button / Dashboard button
    $("login-btn")
      ?.addEventListener(
        "click",
        () => {

          if (currentUser) {
            window.location.href = "dashboard.html";
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
    await loadBloodRequests();
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
