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
  let currentDonor = null;
  let messageTarget = null;
  let detectedLocation = null;
  let currentLanguage = localStorage.getItem("lifeline-language") || "en";

  // ==============================
  // DOM HELPERS
  // ==============================

  const $ = (id) => document.getElementById(id);

  const $$ = (selector) => [
    ...document.querySelectorAll(selector)
  ];

  const ICON_EYE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 7 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const ICON_EYE_OFF = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;

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
      if (togglePasswordBtn) togglePasswordBtn.innerHTML = ICON_EYE;
    }

    const authConfirmPasswordInput = $("auth-confirm-password");
    const toggleConfirmPasswordBtn = $("toggle-confirm-password-btn");
    if (authConfirmPasswordInput && authConfirmPasswordInput.type === "text") {
      authConfirmPasswordInput.type = "password";
      if (toggleConfirmPasswordBtn) toggleConfirmPasswordBtn.innerHTML = ICON_EYE;
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
  // BLOOD COMPATIBILITY & GUIDANCE
  // ==============================

  // Red-cell donation compatibility: donor group -> recipient groups.
  const compatibleRecipients = {
    "O-": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "O+": ["A+", "B+", "AB+", "O+"],
    "A-": ["A+", "A-", "AB+", "AB-"],
    "A+": ["A+", "AB+"],
    "B-": ["B+", "B-", "AB+", "AB-"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB+", "AB-"],
    "AB+": ["AB+"]
  };

  function canDonateTo(donorBlood, recipientBlood) {
    return Boolean(
      compatibleRecipients[String(donorBlood || "").toUpperCase()]?.includes(
        String(recipientBlood || "").toUpperCase()
      )
    );
  }

  const conditionGuidance = {
    anemia: "Anemia has many causes. A doctor should confirm the cause and whether transfusion is needed; do not self-treat with blood.",
    thalassemia: "People with thalassemia may need planned transfusions and iron-overload monitoring. Follow the hematologist’s transfusion plan.",
    leukemia: "During leukemia treatment, the hospital team decides the type, timing, and safety checks for blood products. Contact the treating hospital urgently.",
    hemophilia: "Hemophilia is usually managed with clotting-factor treatment, not routine whole-blood donation. Ask the hematology team what product is needed.",
    sickle_cell: "Sickle-cell transfusions require specialist matching and monitoring. Use the patient’s hospital or hematology team as the source of truth.",
    other: "For any blood-related disease, ask the treating doctor which blood product and amount are needed before posting a request."
  };

  function showConditionGuidance() {
    const condition = $("request-condition")?.value || "";
    const panel = $("condition-guidance");
    if (!panel) return;
    if (!condition) {
      panel.classList.add("hidden");
      panel.textContent = "";
      return;
    }
    panel.textContent = `Doctor guidance: ${conditionGuidance[condition] || conditionGuidance.other}`;
    panel.classList.remove("hidden");
  }

  function getMatchScore(donor, district, requestedBlood) {
    let score = canDonateTo(donor.blood_group, requestedBlood) ? 70 : 0;
    if (String(donor.blood_group) === String(requestedBlood)) score += 20;
    if (district && String(donor.district || "").toLowerCase() === String(district).toLowerCase()) score += 10;
    return score;
  }

  async function findCompatibleDonors(requestedBlood, district) {
    const { data, error } = await supabase
      .from("donor_profiles")
      .select("*")
      .eq("available", true)
      .eq("consent", true)
      .limit(100);

    if (error) {
      console.warn("Compatible donor search unavailable:", error);
      return [];
    }

    return (data || [])
      .filter((donor) => canDonateTo(donor.blood_group, requestedBlood))
      .map((donor) => ({ ...donor, match_score: getMatchScore(donor, district, requestedBlood) }))
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 6);
  }

  function renderMatchPanel(donors, requestedBlood) {
    let panel = $("request-match-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "request-match-panel";
      panel.className = "match-panel";
      $("request-form")?.parentElement?.appendChild(panel);
    }

    if (!donors.length) {
      panel.innerHTML = `<h3>No compatible donor is available right now</h3><p>We checked available, consented profiles. O− is the universal red-cell donor, and other compatible groups may also help. Keep the request open and contact the hospital blood bank.</p>`;
      return;
    }

    panel.innerHTML = `
      <h3>${donors.length} compatible donor${donors.length === 1 ? "" : "s"} found</h3>
      <p>Showing available donors who can donate red cells to ${escapeHtml(requestedBlood)}. Compatibility must still be confirmed by the hospital blood bank.</p>
      <div class="match-list"></div>
    `;
    const list = panel.querySelector(".match-list");
    donors.forEach((donor) => {
      const item = document.createElement("article");
      item.className = "match-item";
      const name = donor.full_name || "Anonymous donor";
      item.innerHTML = `
        <div class="donor-avatar">${donor.avatar_url ? `<img src="${escapeHtml(donor.avatar_url)}" alt="${escapeHtml(name)}">` : escapeHtml(initials(name))}</div>
        <div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(donor.blood_group || "Unknown")} · ${escapeHtml(donor.area || donor.district || "Bangladesh")}</small></div>
        <span class="match-score">${donor.match_score}%</span>
        <button type="button" class="btn btn-light match-contact" style="padding:7px 9px;font-size:10px;">Message</button>
      `;
      item.querySelector(".match-contact")?.addEventListener("click", () => {
        openMessageComposer({ id: donor.user_id, name }, null);
      });
      list?.appendChild(item);
    });
  }

  // ==============================
  // LANGUAGE
  // ==============================

  const translations = {
    en: { heroText: "Lifeline helps people find willing blood donors, publish urgent requests, and coordinate lifesaving support across Bangladesh — without the chaos.", findDonor: "Find a donor →", wantDonate: "I want to donate", requestBlood: "Request blood", home: "Home", findDonors: "Find Donors", requestedBlood: "Requested Blood", becomeDonor: "Become a Donor", howItWorks: "How it works", findTitle: "Find the right donor, faster.", recentRequests: "Recent Blood Requests", requestTitle: "Turn an urgent need into a clear call for help.", donorTitle: "Be the person someone is searching for." },
    bn: { heroText: "লাইফলাইন মানুষকে স্বেচ্ছায় রক্তদাতা খুঁজে পেতে, জরুরি অনুরোধ প্রকাশ করতে এবং বাংলাদেশজুড়ে জীবনরক্ষাকারী সহায়তা সমন্বয় করতে সাহায্য করে।", findDonor: "রক্তদাতা খুঁজুন →", wantDonate: "আমি রক্ত দিতে চাই", requestBlood: "রক্তের অনুরোধ", home: "হোম", findDonors: "রক্তদাতা খুঁজুন", requestedBlood: "রক্তের অনুরোধ", becomeDonor: "রক্তদাতা হন", howItWorks: "যেভাবে কাজ করে", findTitle: "দ্রুত সঠিক রক্তদাতা খুঁজুন।", recentRequests: "সাম্প্রতিক রক্তের অনুরোধ", requestTitle: "জরুরি প্রয়োজনকে সাহায্যের পরিষ্কার আহ্বানে বদলে দিন।", donorTitle: "কারও খোঁজা রক্তদাতা আপনিই হতে পারেন।" }
  };

  function applyLanguage(language = currentLanguage) {
    currentLanguage = language === "bn" ? "bn" : "en";
    localStorage.setItem("lifeline-language", currentLanguage);
    document.documentElement.lang = currentLanguage === "bn" ? "bn" : "en";
    const toggle = $("language-toggle");
    if (toggle) toggle.textContent = currentLanguage === "en" ? "বাংলা" : "English";
    Object.entries(translations[currentLanguage]).forEach(([key, value]) => {
      document.querySelectorAll(`[data-i18n="${key}"]`).forEach((el) => {
        el.textContent = value;
      });
    });
  }

  // ==============================
  // LIFELINE ASSISTANT
  // ==============================

  function assistantReply(question) {
    const q = String(question || "").toLowerCase();
    const bn = currentLanguage === "bn";
    if (/o-.*(donate|give)|universal|blood group|compatible|b-.*ab-/.test(q)) {
      return bn
        ? "O− লোহিত রক্তকণিকার universal donor। B−, AB−-কে দিতে পারে। তবে হাসপাতালকে cross-match ও চূড়ান্ত নিরাপত্তা যাচাই করতেই হবে।"
        : "O− is the universal red-cell donor, and B− can donate red cells to AB−. The hospital must still cross-match and approve the transfusion.";
    }
    if (/thalassemia|anemia|leukemia|hemophilia|sickle|disease|রোগ|থ্যালাসেমিয়া/.test(q)) {
      return bn
        ? "রক্ত-সম্পর্কিত রোগে কোন blood product লাগবে তা রোগীর hematologist/ডাক্তার ঠিক করবেন। Lifeline diagnosis বা transfusion prescription দেয় না—চিকিৎসা করা হাসপাতালে যোগাযোগ করুন।"
        : "For blood-related disease, the treating hematologist must decide which blood product is needed. Lifeline cannot diagnose or prescribe a transfusion—contact the treating hospital.";
    }
    if (/request|need blood|রক্ত.*(চাই|প্রয়োজন)|অনুরোধ/.test(q)) {
      return bn
        ? "প্রথমে রক্তের গ্রুপ, জেলা, হাসপাতাল, জরুরি অবস্থা ও ফোন নম্বর দিয়ে request প্রকাশ করুন। তারপর Lifeline compatible, available donor খুঁজে দেখাবে।"
        : "Publish a request with blood group, district, hospital, urgency, and a safe phone number. Lifeline will then look for available, compatible donors.";
    }
    if (/donate|eligib|রক্ত.*(দিতে|দান)/.test(q)) {
      return bn
        ? "রক্তদানের যোগ্যতা বয়স, স্বাস্থ্য, ওষুধ ও সাম্প্রতিক donation-এর উপর নির্ভর করে। চূড়ান্ত সিদ্ধান্ত সবসময় blood center বা ডাক্তার নেবেন।"
        : "Donation eligibility depends on age, health, medication, and recent donations. A blood center or doctor must make the final decision.";
    }
    if (/message|contact|যোগাযোগ|মেসেজ/.test(q)) {
      return bn
        ? "Donor card-এ Message চাপুন। যোগাযোগের জন্য password, OTP বা টাকা কখনও শেয়ার করবেন না।"
        : "Open a donor card and choose Message. Never share a password, OTP, or payment details while coordinating.";
    }
    return bn
      ? "আমি blood groups, compatibility, donor request, location এবং Lifeline ব্যবহারের বিষয়ে সাহায্য করতে পারি। জরুরি বা চিকিৎসা সিদ্ধান্তে হাসপাতালের ডাক্তারকে অনুসরণ করুন।"
      : "I can help with blood groups, compatibility, donor requests, location, and using Lifeline. For emergencies or medical decisions, follow the hospital team.";
  }

  function addAssistantMessage(text, type) {
    const messages = $("assistant-messages");
    if (!messages) return;
    const bubble = document.createElement("div");
    bubble.className = `assistant-bubble ${type}`;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function wireAssistant() {
    $("assistant-open")?.addEventListener("click", () => $("assistant-panel")?.classList.remove("hidden"));
    $("assistant-close")?.addEventListener("click", () => $("assistant-panel")?.classList.add("hidden"));
    $("assistant-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = $("assistant-input");
      const question = input?.value?.trim();
      if (!question) return;
      addAssistantMessage(question, "user");
      addAssistantMessage(assistantReply(question), "assistant");
      if (input) input.value = "";
    });
  }

  // ==============================
  // LOCATION
  // ==============================

  async function detectLocation() {
    const status = $("donor-location-status");
    if (!navigator.geolocation) {
      if (status) status.textContent = "Location detection is not supported by this browser.";
      return;
    }
    if (status) status.textContent = "Requesting approximate location…";
    navigator.geolocation.getCurrentPosition(async (position) => {
      detectedLocation = {
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
        accuracy: Math.round(position.coords.accuracy || 0)
      };
      try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${detectedLocation.lat}&longitude=${detectedLocation.lng}&localityLanguage=en`);
        const place = await response.json();
        const district = place.city || place.locality || place.principalSubdivision || "";
        const area = place.locality || place.city || "";
        if (district && $("donor-district")) $("donor-district").value = district;
        if (area && $("donor-area")) $("donor-area").value = area;
        if (status) status.textContent = `Location detected: ${district || "nearby area"} (approx. ${detectedLocation.accuracy}m).`;
      } catch (error) {
        if (status) status.textContent = `Coordinates detected (approx. ${detectedLocation.accuracy}m). Add your district if needed.`;
      }
    }, () => {
      if (status) status.textContent = "Location permission was not granted. You can enter your district manually.";
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  // ==============================
  // MESSAGING
  // ==============================

  function closeMessageComposer() {
    $("message-modal")?.classList.add("hidden");
    messageTarget = null;
  }

  function openMessageComposer(target, requestId = null) {
    if (!currentUser) {
      openAuth("signin");
      toast("Please sign in before sending a protected message.", "info");
      return;
    }
    if (!target?.id || target.id === currentUser.id) {
      toast("You cannot message your own profile.", "info");
      return;
    }
    messageTarget = { ...target, requestId };
    if ($("message-title")) $("message-title").textContent = `Message ${target.name || "contact"}`;
    $("message-modal")?.classList.remove("hidden");
    $("message-body")?.focus();
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!currentUser || !messageTarget) return;
    const body = $("message-body")?.value?.trim() || "";
    if (!body) return;
    const button = $("send-message-btn");
    setLoading(button, true, "Sending…");
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.id,
      recipient_id: messageTarget.id,
      request_id: messageTarget.requestId || null,
      body
    });
    setLoading(button, false);
    if (error) {
      console.error("Message send error:", error);
      toast("Messaging is not ready in the database yet. Run the included Supabase schema migration, then try again.", "error");
      return;
    }
    $("message-form")?.reset();
    closeMessageComposer();
    toast("Message sent securely.", "success");
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
          })
          .eq("status", "open"),

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
    currentDonor = donor;

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

    const messageButton = $("profile-message");
    if (messageButton) {
      messageButton.onclick = () => openMessageComposer({
        id: donor.user_id,
        name: donor.full_name || "donor"
      });
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

        ...(detectedLocation
          ? {
              location_lat: detectedLocation.lat,
              location_lng: detectedLocation.lng,
              location_accuracy: detectedLocation.accuracy
            }
          : {}),

        // New profiles are never verified
        // from the client.
        verified:
          false
      };

      let {
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

      if (error && /location_(lat|lng|accuracy)|column/i.test(error.message || "")) {
        delete payload.location_lat;
        delete payload.location_lng;
        delete payload.location_accuracy;
        const retry = await supabase
          .from("donor_profiles")
          .upsert(payload, { onConflict: "user_id" });
        error = retry.error;
      }

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

      detectedLocation = null;

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
        "id, requester_id, patient_name, blood_group, district, hospital_location, units_needed, urgency, contact_phone, note, created_at"
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

          ${
            currentUser && req.requester_id && req.requester_id !== currentUser.id
              ? `<button type="button" class="btn btn-light request-message" style="margin-top:8px;display:block;width:100%;font-size:12px;">Message requester</button>`
              : ""
          }
      `;

      card.querySelector(".request-message")?.addEventListener("click", () => {
        openMessageComposer({ id: req.requester_id, name: patientName }, req.id);
      });
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

      const condition =
        $("request-condition")
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

        condition:
          condition,

        status:
          "open"
      };

      let {
        error
      } = await supabase
        .from("blood_requests")
        .insert(
          payload
        );

      if (error && /condition|column/i.test(error.message || "")) {
        delete payload.condition;
        const retry = await supabase
          .from("blood_requests")
          .insert(payload);
        error = retry.error;
      }

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

      const compatibleDonors = await findCompatibleDonors(bloodGroup, district);
      renderMatchPanel(compatibleDonors, bloodGroup);

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
    await loadBloodRequests();

    // Take the user to the home page
    scrollToId("home");
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
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
          togglePasswordBtn.innerHTML = ICON_EYE_OFF;
        } else {
          authPasswordInput.type = "password";
          togglePasswordBtn.innerHTML = ICON_EYE;
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
          toggleConfirmPasswordBtn.innerHTML = ICON_EYE_OFF;
        } else {
          authConfirmPasswordInput.type = "password";
          toggleConfirmPasswordBtn.innerHTML = ICON_EYE;
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

    $("request-condition")?.addEventListener("change", showConditionGuidance);
    $("detect-donor-location")?.addEventListener("click", detectLocation);
    $("message-form")?.addEventListener("submit", sendMessage);
    $$("[data-close-message]").forEach((element) => {
      element.addEventListener("click", closeMessageComposer);
    });
    $("language-toggle")?.addEventListener("click", () => {
      applyLanguage(currentLanguage === "en" ? "bn" : "en");
    });
    wireAssistant();
    applyLanguage();

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
