(() => {
  // Prevent duplicate script execution
  if (window.__lifelineAppLoaded) {
    console.warn("Lifeline app.js is already loaded.");
    return;
  }
  window.__lifelineAppLoaded = true;

  // ==============================
  // SUPABASE CONFIGURATION
  // ==============================

  const supabase_URL = "https://heflnehkwmqsetqkiqgv.supabase.co";
  const supabase_PUBLISHABLE_KEY = "sb_publishable_Ncu8yv6R1hOh8_1Z3j9Mrg_xSJrf6hd";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Lifeline could not start: Supabase JS was not loaded. Add https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 before app.js.");
    const showSetupError = () => {
      const root = document.getElementById("toast-root");
      if (root) {
        root.innerHTML = '<div class="toast error">Supabase could not load. Check the Supabase script tag before app.js.</div>';
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showSetupError, { once: true });
    } else {
      showSetupError();
    }
    return;
  }

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
  let chatPollingTimer = null;
  let currentAttachment = null;
  let currentDonorPrescription = null;
  let currentRequestPrescription = null;
  let detectedLocation = null;
  let currentLanguage = localStorage.getItem("lifeline-language") || "en";

  // ==============================
  // DOM HELPERS
  // ==============================

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const ICON_EYE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 7 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const ICON_EYE_OFF = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;

  // ==============================
  // TOAST NOTIFICATIONS
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
  // SMOOTH SCROLL
  // ==============================

  function scrollToId(id) {
    document.getElementById(id)?.scrollIntoView({
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
    toast("Please sign in to access the protected donor network.", "info");
    return null;
  }

  // ==============================
  // AUTH MODAL
  // ==============================

  let currentAuthContext = "";

  function openAuth(mode = "signin", context = "") {
    authMode = mode === "signup" ? "signup" : "signin";
    if (context) currentAuthContext = context;
    const modal = $("auth-modal");
    if (!modal) return;

    modal.classList.remove("hidden");

    const isDonorContext = currentAuthContext === "donor" || sessionStorage.getItem("lifeline_auth_redirect") === "donate.html";

    if ($("auth-title")) {
      $("auth-title").textContent =
        authMode === "signin"
          ? "Welcome to Lifeline"
          : "Create your Lifeline account";
    }

    if ($("auth-subtitle")) {
      if (isDonorContext) {
        $("auth-subtitle").textContent =
          authMode === "signin"
            ? "Sign in to complete your donor registration and save lives."
            : "Sign up to join our voluntary blood donor network.";
      } else {
        $("auth-subtitle").textContent =
          authMode === "signin"
            ? "Sign in to search donor profiles and manage your availability."
            : "Create an account to safely access the donor network.";
      }
    }

    if ($("auth-submit")) {
      $("auth-submit").textContent =
        authMode === "signin" ? "Sign in" : "Create account";
    }

    if ($("switch-auth")) {
      $("switch-auth").textContent =
        authMode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in";
    }

    const confirmGroup = $("confirm-password-group");
    const confirmPassword = $("auth-confirm-password");

    if (confirmGroup) {
      if (authMode === "signup") {
        confirmGroup.classList.remove("hidden");
      } else {
        confirmGroup.classList.add("hidden");
        if (confirmPassword) confirmPassword.value = "";
      }
    }
  }

  function closeAuth() {
    $("auth-modal")?.classList.add("hidden");
    currentAuthContext = "";

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
      .toUpperCase() || "✚";
  }

  function formatDate(date) {
    if (!date) return "Not provided";
    const value = String(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(`${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return "Not provided";
      return parsed.toLocaleDateString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Not provided";
    return parsed.toLocaleDateString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function setLoading(button, loading, text) {
    if (!button) return;
    if (loading) {
      if (!button.dataset.original) {
        button.dataset.original = button.innerHTML;
      }
      button.disabled = true;
      button.innerHTML = `<span class="spinner">⟳</span> ${text || "Working..."}`;
    } else {
      button.disabled = false;
      if (button.dataset.original) {
        button.innerHTML = button.dataset.original;
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

  // ============================================================
  // 2. SCIENTIFIC COMPATIBILITY MATRIX
  // ============================================================
  // Standard transfusion compatibility chart:
  // Recipient (গ্রহীতা) -> Array of Compatible Donors (দাতা)

  const COMPATIBILITY_RULES_FIGURE_6_12 = {
    "AB+": ["O-", "O+", "B-", "B+", "A-", "A+", "AB-", "AB+"], // সর্বজনীন গ্রহীতা (Universal Recipient)
    "AB-": ["O-", "B-", "A-", "AB-"],                            // All Rh-negative groups
    "A+":  ["O-", "O+", "A-", "A+"],
    "A-":  ["O-", "A-"],
    "B+":  ["O-", "O+", "B-", "B+"],
    "B-":  ["O-", "B-"],
    "O+":  ["O-", "O+"],
    "O-":  ["O-"]                                                // Can only receive O-
  };

  function canDonateTo(donorBlood, recipientBlood) {
    const r = String(recipientBlood || "").trim().toUpperCase();
    const d = String(donorBlood || "").trim().toUpperCase();
    return Boolean(COMPATIBILITY_RULES_FIGURE_6_12[r]?.includes(d));
  }

  const conditionGuidance = {
    anemia: "Severe/Aplastic Anemia: Transfusion indicated when Hb < 7-8 g/dL or symptomatic. Whole blood should be avoided if PRBC is available.",
    thalassemia: "Thalassemia: Regular planned PRBC transfusions every 2-4 weeks with strict iron-overload monitoring. Follow hematologist protocol.",
    leukemia: "Leukemia/Blood Cancer: Time-sensitive platelet (SDP) and irradiated PRBC transfusions are required during chemotherapy.",
    hemophilia: "Hemophilia: Managed primarily with clotting factors (Factor VIII/IX) or emergency Cryoprecipitate/FFP, not routine whole blood.",
    sickle_cell: "Sickle Cell Disease: Simple or exchange transfusions required to reduce HbS below 30% during acute crises.",
    dengue: "Dengue Shock: Platelet transfusion is indicated ONLY with active bleeding or count < 10,000/µL as per National Dengue Guidelines.",
    other: "For any blood-related disease, consult the treating hematologist for specific blood component and cross-matching requirements."
  };

  function showConditionGuidance() {
    const condition = $("request-condition")?.value || "";
    const panel = $("condition-guidance");
    const diseaseLink = $("condition-disease-link");

    if (!panel) return;
    if (!condition) {
      panel.classList.add("hidden");
      panel.textContent = "";
      diseaseLink?.classList.add("hidden");
      return;
    }

    panel.textContent = `Doctor guidance: ${conditionGuidance[condition] || conditionGuidance.other}`;
    panel.classList.remove("hidden");

    if (diseaseLink) {
      diseaseLink.href = `diseases.html#${condition}`;
      diseaseLink.classList.remove("hidden");
      diseaseLink.textContent = `Learn medical guidance & transfusion protocol for this condition (${condition}) ⟶`;
    }
  }

  // Calculate detailed match score and scientific category according to transfusion rules
  function evaluateDonorMatch(donor, district, requestedBlood) {
    const dGroup = String(donor.blood_group || "").trim().toUpperCase();
    const rGroup = String(requestedBlood || "").trim().toUpperCase();
    const dDistrict = String(donor.district || "").trim().toLowerCase();
    const rDistrict = String(district || "").trim().toLowerCase();
    const isSameDistrict = dDistrict && rDistrict && dDistrict === rDistrict;

    if (!canDonateTo(dGroup, rGroup)) {
      return { isMatch: false, score: 0, tag: "Incompatible", category: "none" };
    }

    if (dGroup === rGroup) {
      return {
        isMatch: true,
        score: isSameDistrict ? 100 : 92,
        tag: isSameDistrict ? "🎯 Exact Match (Same District)" : "🎯 Exact Match",
        category: "exact"
      };
    }

    if (dGroup === "O-") {
      return {
        isMatch: true,
        score: isSameDistrict ? 95 : 88,
        tag: "🌟 Universal Donor (O-)",
        category: "universal"
      };
    }

    return {
      isMatch: true,
      score: isSameDistrict ? 85 : 75,
      tag: "✓ Compatible Donor Group",
      category: "compatible"
    };
  }

  // Backup emergency verified donors for immediate demonstration if fresh database has no local entries
  function getBackupDonors(requestedBlood, district) {
    const list = [
      { id: "demo-1", user_id: "demo-donor-1", full_name: "Dr. Kazi Tanvir", blood_group: requestedBlood, district: district || "Dhaka", area: "Dhanmondi", phone: "01711002233", verified: true, available: true, last_donation_date: "2026-06-15" },
      { id: "demo-2", user_id: "demo-donor-2", full_name: "Nusrat Jahan", blood_group: "O-", district: district || "Dhaka", area: "Mirpur", phone: "01819887766", verified: true, available: true, last_donation_date: "2026-05-10" },
      { id: "demo-3", user_id: "demo-donor-3", full_name: "Mahmudul Hasan", blood_group: requestedBlood, district: "Chattogram", area: "Agrabad", phone: "01912334455", verified: true, available: true, last_donation_date: "2026-07-01" },
      { id: "demo-4", user_id: "demo-donor-4", full_name: "Farhana Akter", blood_group: "O+", district: district || "Dhaka", area: "Uttara", phone: "01615556677", verified: true, available: true, last_donation_date: "2026-04-20" }
    ];

    return list.filter((d) => canDonateTo(d.blood_group, requestedBlood));
  }

  // Auto-find compatible donors directly after request submission
  async function autoFindAndRenderMatchingDonors(requestedBlood, district, hospital, patientName) {
    const container = $("auto-matched-donors-container");
    if (!container) return;

    container.innerHTML = `
      <div class="auto-match-panel">
        <div style="text-align:center; padding:20px;">
          <div class="spinner" style="font-size:24px; color:var(--red);">⟳</div>
          <h4 style="margin:10px 0 4px;">Matching Compatible Donors…</h4>
          <p style="color:var(--muted); font-size:12px;">Checking consenting donors compatible with ${escapeHtml(requestedBlood)}</p>
        </div>
      </div>
    `;

    const { data, error } = await supabase
      .from("donor_profiles")
      .select("*")
      .eq("available", true)
      .eq("consent", true)
      .limit(100);

    let candidates = (data || []).filter((d) => canDonateTo(d.blood_group, requestedBlood));

    // Fallback to verified demonstration donors if local database is currently empty
    if (!candidates.length) {
      candidates = getBackupDonors(requestedBlood, district);
    }

    const scoredDonors = candidates
      .map((donor) => {
        const evalResult = evaluateDonorMatch(donor, district, requestedBlood);
        return { ...donor, ...evalResult };
      })
      .filter((d) => d.isMatch)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const allowedGroups = COMPATIBILITY_RULES_FIGURE_6_12[String(requestedBlood).toUpperCase()] || [requestedBlood];

    container.innerHTML = `
      <div class="auto-match-panel" id="auto-match-results">
        <div class="auto-match-header">
          <div class="auto-match-title-wrap">
            <div class="radar-icon-badge">⚡</div>
            <div>
              <h3>Auto-Found Donors for ${escapeHtml(patientName || "Patient")} (${escapeHtml(requestedBlood)})</h3>
              <p>Matched automatically based on standardized blood compatibility criteria.</p>
            </div>
          </div>
          <button type="button" class="chart-btn-trigger" id="view-fig-chart-btn">
            🔬 View Blood Compatibility Matrix
          </button>
        </div>

        <div class="match-criteria-pill-row">
          <span><strong>Medical Rule:</strong> Recipients of group <strong>${escapeHtml(requestedBlood)}</strong> can receive red cells from:</span>
          ${allowedGroups.map((g) => `<span class="compat-donor-tag">${escapeHtml(g)}</span>`).join("")}
        </div>

        <div class="match-list">
          ${scoredDonors
            .map(
              (donor) => `
            <article class="match-card">
              <div class="match-card-top">
                <div class="donor-avatar">
                  ${
                    donor.avatar_url
                      ? `<img src="${escapeHtml(donor.avatar_url)}" alt="${escapeHtml(donor.full_name || "Donor")}" />`
                      : escapeHtml(initials(donor.full_name))
                  }
                </div>
                <div>
                  <strong>${escapeHtml(donor.full_name || "Anonymous Donor")}</strong>
                  <small style="display:block; color:#888;">${escapeHtml(donor.area || donor.district || "Worldwide")}</small>
                  <span class="match-tag ${donor.category}">${donor.tag}</span>
                </div>
              </div>

              <div style="font-size:11px; color:#555; background:#fafafa; padding:8px 10px; border-radius:10px;">
                <span>Blood Group: <strong style="color:var(--red); font-size:12px;">${escapeHtml(donor.blood_group || "Unknown")}</strong></span>
                <span style="float:right;">Last: ${escapeHtml(formatDate(donor.last_donation_date))}</span>
              </div>

              <div class="match-card-actions">
                <button type="button" class="btn btn-primary auto-wa-contact" data-donor-id="${escapeHtml(donor.user_id || donor.id)}" data-donor-name="${escapeHtml(donor.full_name || "Donor")}" data-donor-phone="${escapeHtml(donor.phone || "")}" style="font-size:11px; padding:7px 10px;">
                  💬 Message
                </button>
                ${
                  donor.phone
                    ? `<a href="tel:${escapeHtml(safePhone(donor.phone))}" class="btn btn-light" style="font-size:11px; padding:7px 10px;">📞 Call</a>`
                    : `<button type="button" class="btn btn-light" disabled style="font-size:11px; padding:7px 10px; opacity:.5;">No phone</button>`
                }
              </div>
            </article>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // Connect trigger for compatibility chart modal
    $("view-fig-chart-btn")?.addEventListener("click", () => {
      $("figure-chart-modal")?.classList.remove("hidden");
    });

    // Connect WhatsApp contact buttons
    container.querySelectorAll(".auto-wa-contact").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = {
          id: btn.dataset.donorId,
          name: btn.dataset.donorName,
          phone: btn.dataset.donorPhone
        };
        const context = `Blood Request: ${patientName} (${requestedBlood}) at ${hospital}, ${district}`;
        openWhatsAppChat(target, context);
      });
    });

    // Auto-send urgent message to matched donors
    if (currentUser && currentUser.id) {
      scoredDonors.forEach((donor) => {
        if (donor.user_id && donor.user_id !== currentUser.id) {
          const payload = {
            sender_id: currentUser.id,
            recipient_id: donor.user_id,
            body: "I need blood urgently!"
          };
          supabase.from("messages").insert(payload).then(() => {});
        }
      });
    }

    // Smooth scroll directly to the matched results
    setTimeout(() => {
      document.getElementById("auto-match-results")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }

  // ============================================================
  // 1. WHATSAPP MESSAGING SYSTEM (REQ 1)
  // ============================================================

  function closeWhatsAppChat() {
    $("whatsapp-modal")?.classList.add("hidden");
    if (chatPollingTimer) {
      clearInterval(chatPollingTimer);
      chatPollingTimer = null;
    }
    currentAttachment = null;
    clearAttachmentStaging();
    messageTarget = null;
  }

  function clearAttachmentStaging() {
    currentAttachment = null;
    const staging = $("wa-attachment-staging");
    if (staging) staging.style.display = "none";
    const fileInput = $("wa-file-input");
    if (fileInput) fileInput.value = "";
  }

  function openWhatsAppChat(target, requestContext = null) {
    if (!currentUser) {
      openAuth("signin");
      toast("Please sign in before messaging a donor.", "info");
      return;
    }
    if (!target?.id || target.id === currentUser.id) {
      toast("You cannot message your own profile.", "info");
      return;
    }

    messageTarget = { ...target, requestContext };

    // Update WhatsApp header
    if ($("wa-contact-name")) $("wa-contact-name").textContent = target.name || "Donor Contact";
    if ($("wa-avatar-box")) $("wa-avatar-box").textContent = initials(target.name);

    const callBtn = $("wa-call-btn") || $("wa-header-call-btn");
    if (callBtn) {
      if (target.phone) {
        callBtn.href = `tel:${safePhone(target.phone)}`;
        callBtn.style.display = "inline-grid";
      } else {
        callBtn.style.display = "none";
      }
    }

    // Context bar
    const contextBar = $("wa-context-bar");
    const contextText = $("wa-context-text");
    if (requestContext && contextBar && contextText) {
      contextText.textContent = `🩸 ${requestContext}`;
      contextBar.style.display = "flex";
    } else if (contextBar) {
      contextBar.style.display = "none";
    }

    clearAttachmentStaging();

    // Show modal
    $("whatsapp-modal")?.classList.remove("hidden");
    $("wa-message-input")?.focus();

    // Load existing messages & start real-time polling
    loadConversationMessages();
    if (chatPollingTimer) clearInterval(chatPollingTimer);
    chatPollingTimer = setInterval(loadConversationMessages, 2500);
  }

  async function loadConversationMessages() {
    if (!currentUser || !messageTarget) return;
    const container = $("wa-messages-container");
    if (!container) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},recipient_id.eq.${messageTarget.id}),and(sender_id.eq.${messageTarget.id},recipient_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true })
        .limit(60);

      if (error) {
        // Fallback for demo or when table is fresh
        return;
      }

      renderWhatsAppMessages(data || []);
    } catch (err) {
      console.warn("Messages load issue:", err);
    }
  }

  function renderWhatsAppMessages(messages) {
    const container = $("wa-messages-container");
    if (!container) return;

    if (!messages.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:#667781; font-size:12px;">
          <div>💬</div>
          <p>No messages yet. Send a message or attach a prescription to coordinate blood donation safely.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages
      .map((msg) => {
        const isOutgoing = msg.sender_id === currentUser.id;
        let textContent = msg.body || "";
        let attachment = null;

        // Parse structured JSON attachment if stored in body
        if (textContent.startsWith("{") && textContent.includes('"attachment":')) {
          try {
            const parsed = JSON.parse(textContent);
            textContent = parsed.text || "";
            attachment = parsed.attachment || null;
          } catch (e) {}
        }

        // Or native attachment columns
        if (!attachment && msg.attachment_url) {
          attachment = {
            url: msg.attachment_url,
            name: msg.attachment_name || "Attachment",
            type: msg.attachment_type || "",
            size: msg.attachment_size || 0
          };
        }

        let attachmentHtml = "";
        if (attachment) {
          if (attachment.type && attachment.type.startsWith("image/")) {
            attachmentHtml = `
              <div class="wa-attachment-box">
                <a href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener">
                  <img src="${escapeHtml(attachment.url)}" class="wa-image-attachment" alt="Prescription" />
                </a>
              </div>
            `;
          } else {
            attachmentHtml = `
              <div class="wa-attachment-box">
                <div class="wa-doc-attachment">
                  <div class="wa-doc-icon">📄</div>
                  <div class="wa-doc-info">
                    <strong>${escapeHtml(attachment.name || "Medical Report.pdf")}</strong>
                    <small>${formatBytes(attachment.size)}</small>
                  </div>
                  <a href="${escapeHtml(attachment.url)}" download="${escapeHtml(attachment.name)}" class="wa-doc-download" target="_blank">Download</a>
                </div>
              </div>
            `;
          }
        }

        return `
          <div class="wa-bubble-row">
            <div class="wa-bubble ${isOutgoing ? "outgoing" : "incoming"}">
              ${attachmentHtml}
              ${textContent ? `<div>${escapeHtml(textContent)}</div>` : ""}
              <div class="wa-bubble-meta">
                <span>${formatTime(msg.created_at)}</span>
                ${isOutgoing ? `<span class="wa-blue-ticks">✓✓</span>` : ""}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Auto-scroll chat body
    const body = $("wa-chat-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  // Send WhatsApp message with file attachment support
  async function handleSendWhatsAppMessage(e) {
    e.preventDefault();
    if (!currentUser || !messageTarget) return;

    const input = $("wa-message-input");
    const text = input?.value?.trim() || "";

    if (!text && !currentAttachment) {
      toast("Please enter a message or attach a file.", "info");
      return;
    }

    const sendBtn = $("wa-send-btn");
    if (sendBtn) sendBtn.disabled = true;

    // Structured payload for maximum safety and compatibility
    const payload = {
      sender_id: currentUser.id,
      recipient_id: messageTarget.id,
      request_id: messageTarget.requestContext ? "req-" + Date.now() : null,
      body: currentAttachment ? JSON.stringify({ text, attachment: currentAttachment }) : text
    };

    if (currentAttachment) {
      payload.attachment_url = currentAttachment.url;
      payload.attachment_name = currentAttachment.name;
      payload.attachment_type = currentAttachment.type;
      payload.attachment_size = currentAttachment.size;
    }

    let { error } = await supabase.from("messages").insert(payload);

    // If native attachment columns don't exist yet, retry with standard columns
    if (error && /attachment_/i.test(error.message || "")) {
      delete payload.attachment_url;
      delete payload.attachment_name;
      delete payload.attachment_type;
      delete payload.attachment_size;
      const retry = await supabase.from("messages").insert(payload);
      error = retry.error;
    }

    if (sendBtn) sendBtn.disabled = false;

    if (error) {
      console.error("WhatsApp message send error:", error);
      toast("Could not deliver message. Please verify Supabase messages table.", "error");
      return;
    }

    if (input) input.value = "";
    clearAttachmentStaging();
    toast("Message sent successfully.", "success");
    await loadConversationMessages();
  }

  // File Picker & Attachment Processing
  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast("File size should be under 5MB for fast delivery.", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      currentAttachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: e.target.result // Base64 data URL
      };

      const staging = $("wa-attachment-staging");
      const nameEl = $("wa-staging-name");
      const sizeEl = $("wa-staging-size");
      const thumbEl = $("wa-staging-thumb");
      const iconEl = $("wa-staging-icon");

      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = formatBytes(file.size);

      if (file.type.startsWith("image/") && thumbEl && iconEl) {
        thumbEl.src = e.target.result;
        thumbEl.style.display = "block";
        iconEl.style.display = "none";
      } else if (thumbEl && iconEl) {
        thumbEl.style.display = "none";
        iconEl.style.display = "inline";
        iconEl.textContent = "📄";
      }

      if (staging) staging.style.display = "flex";
      toast(`Attached: ${file.name}`, "info");
    };

    reader.onerror = () => {
      toast("Failed to read file.", "error");
    };

    reader.readAsDataURL(file);
  }

  // ============================================================
  // 5. COOKIE PREFERENCES & CONSENT BANNER (REQ 5)
  // ============================================================

  function renderPrescriptionPreview(prefix, fileData) {
    const dropzone = $(`${prefix}-prescription-dropzone`);
    const preview = $(`${prefix}-prescription-preview`);
    const thumb = $(`${prefix}-prescription-thumb`);
    const badge = $(`${prefix}-prescription-badge`);
    const nameEl = $(`${prefix}-prescription-name`);
    const sizeEl = $(`${prefix}-prescription-size`);
    const linkEl = $(`${prefix}-prescription-link`);

    if (!preview) return;

    if (nameEl) nameEl.textContent = fileData.name || "Medical Prescription";
    if (sizeEl) sizeEl.textContent = fileData.size ? formatBytes(fileData.size) : "Attached Document";
    if (linkEl && fileData.url) linkEl.href = fileData.url;

    const isImg = fileData.type?.startsWith("image/") || (typeof fileData.url === "string" && fileData.url.startsWith("data:image/"));
    if (isImg && thumb && badge) {
      thumb.src = fileData.url;
      thumb.style.display = "block";
      badge.style.display = "none";
    } else if (thumb && badge) {
      thumb.style.display = "none";
      badge.style.display = "flex";
      const ext = (fileData.name || "").split(".").pop().toUpperCase();
      badge.textContent = ext && ext.length <= 4 ? ext : "DOC";
    }

    if (dropzone) dropzone.style.display = "none";
    preview.style.display = "flex";
  }

  function initPrescriptionUpload(prefix, onSet, onRemove) {
    const input = $(`${prefix}-prescription-input`);
    const dropzone = $(`${prefix}-prescription-dropzone`);
    const preview = $(`${prefix}-prescription-preview`);
    const removeBtn = $(`${prefix}-prescription-remove`);

    if (!input || !dropzone) return;

    dropzone.addEventListener("click", () => input.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files?.[0]) {
        processPrescriptionFile(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener("change", (e) => {
      if (e.target.files?.[0]) {
        processPrescriptionFile(e.target.files[0]);
      }
    });

    removeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.value = "";
      dropzone.style.display = "flex";
      preview.style.display = "none";
      if (onRemove) onRemove();
      toast("Prescription removed.", "info");
    });

    function processPrescriptionFile(file) {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast("File size should be under 5MB.", "error");
        input.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: evt.target.result
        };

        renderPrescriptionPreview(prefix, fileData);
        if (onSet) onSet(fileData);
        toast(`Attached prescription: ${file.name}`, "success");
      };

      reader.onerror = () => toast("Failed to read prescription file.", "error");
      reader.readAsDataURL(file);
    }
  }

  function initCookieConsent() {
    const consent = localStorage.getItem("lifeline_cookie_consent");
    if (!consent) {
      setTimeout(() => {
        const banner = $("cookie-banner");
        if (banner) banner.style.display = "block";
      }, 1000);
    }

    $("cookie-accept-all")?.addEventListener("click", () => {
      localStorage.setItem("lifeline_cookie_consent", JSON.stringify({ essential: true, functional: true, analytics: true }));
      $("cookie-banner").style.display = "none";
      toast("Cookie preferences saved: All enabled.", "info");
    });

    $("cookie-essential-only")?.addEventListener("click", () => {
      localStorage.setItem("lifeline_cookie_consent", JSON.stringify({ essential: true, functional: false, analytics: false }));
      $("cookie-banner").style.display = "none";
      toast("Cookie preferences saved: Essential only.", "info");
    });

    $("cookie-open-settings")?.addEventListener("click", () => {
      $("cookie-settings-modal")?.classList.remove("hidden");
    });

    $("cookie-settings-trigger")?.addEventListener("click", () => {
      $("cookie-settings-modal")?.classList.remove("hidden");
    });

    $("cookie-save-settings")?.addEventListener("click", () => {
      const functional = $("cookie-functional-check")?.checked ?? true;
      const analytics = $("cookie-analytics-check")?.checked ?? true;
      localStorage.setItem("lifeline_cookie_consent", JSON.stringify({ essential: true, functional, analytics }));
      $("cookie-settings-modal")?.classList.add("hidden");
      const banner = $("cookie-banner");
      if (banner) banner.style.display = "none";
      toast("Preferences updated.", "success");
    });

    $$("[data-close-cookie-modal]").forEach((btn) => {
      btn.addEventListener("click", () => $("cookie-settings-modal")?.classList.add("hidden"));
    });
  }

  // ==============================
  // LANGUAGE & TRANSLATIONS
  // ==============================

  const translations = {
    en: {
      heroText: "Lifeline helps people find willing blood donors, publish urgent requests, and coordinate lifesaving support worldwide — without the chaos.",
      findDonor: "Find a donor →",
      wantDonate: "I want to donate",
      requestBlood: "Request blood",
      home: "Home",
      findDonors: "Find Donors",
      diseaseInfo: "Disease Info",
      requestedBlood: "Requested Blood",
      becomeDonor: "Become a Donor",
      howItWorks: "How it works",
      findTitle: "Find the right donor, faster.",
      recentRequests: "Recent Blood Requests",
      requestTitle: "Turn an urgent need into a clear call for help.",
      donorTitle: "Be the person someone is searching for."
    },
    bn: {
      heroText: "লাইফলাইন মানুষকে স্বেচ্ছায় রক্তদাতা খুঁজে পেতে, জরুরি অনুরোধ প্রকাশ করতে এবং বিশ্বজুড়ে জীবনরক্ষাকারী সহায়তা সমন্বয় করতে সাহায্য করে।",
      findDonor: "রক্তদাতা খুঁজুন →",
      wantDonate: "আমি রক্ত দিতে চাই",
      requestBlood: "রক্তের অনুরোধ",
      home: "হোম",
      findDonors: "রক্তদাতা খুঁজুন",
      diseaseInfo: "রোগের তথ্য",
      requestedBlood: "রক্তের অনুরোধ",
      becomeDonor: "রক্তদাতা হন",
      howItWorks: "যেভাবে কাজ করে",
      findTitle: "দ্রুত সঠিক রক্তদাতা খুঁজুন।",
      recentRequests: "সাম্প্রতিক রক্তের অনুরোধ",
      requestTitle: "জরুরি প্রয়োজনকে সাহায্যের পরিষ্কার আহ্বানে বদলে দিন।",
      donorTitle: "কারও খোঁজা রক্তদাতা আপনিই হতে পারেন।"
    }
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
    if (window.LifelineTranslator) {
      window.LifelineTranslator.setLanguage(currentLanguage);
    }
  }

  // ==============================
  // LIFELINE ASSISTANT
  // ==============================

  const BLOOD_COMPATIBILITY = {
    "O-": { canDonateTo: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], canReceiveFrom: ["O-"] },
    "O+": { canDonateTo: ["O+", "A+", "B+", "AB+"], canReceiveFrom: ["O+", "O-"] },
    "A-": { canDonateTo: ["A-", "A+", "AB-", "AB+"], canReceiveFrom: ["A-", "O-"] },
    "A+": { canDonateTo: ["A+", "AB+"], canReceiveFrom: ["A+", "A-", "O+", "O-"] },
    "B-": { canDonateTo: ["B-", "B+", "AB-", "AB+"], canReceiveFrom: ["B-", "O-"] },
    "B+": { canDonateTo: ["B+", "AB+"], canReceiveFrom: ["B+", "B-", "O+", "O-"] },
    "AB-": { canDonateTo: ["AB-", "AB+"], canReceiveFrom: ["AB-", "A-", "B-", "O-"] },
    "AB+": { canDonateTo: ["AB+"], canReceiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] }
  };

  function extractBloodGroups(str) {
    if (!str) return [];
    const s = str
      .replace(/এবি/gi, "AB")
      .replace(/এ/gi, "A")
      .replace(/বি/gi, "B")
      .replace(/ও/gi, "O")
      .replace(/পজিটিভ|\+ve|positive/gi, "+")
      .replace(/নেগেটিভ|-ve|negative/gi, "-");

    const regex = /\b(AB|A|B|O)\s*([+-])/gi;
    const groups = [];
    let m;
    while ((m = regex.exec(s)) !== null) {
      groups.push(m[1].toUpperCase() + m[2]);
    }
    return groups;
  }

  function assistantReply(question) {
    const raw = String(question || "").trim();
    if (!raw) {
      return (typeof currentLanguage !== "undefined" && currentLanguage === "bn")
        ? "কীভাবে সাহায্য করতে পারি? রক্তদানের নিয়ম, গ্রুপ সামঞ্জস্য বা জরুরি তথ্য জানতে আমাকে লিখুন।"
        : "How can I help you? Ask me about blood group compatibility, donation rules, or emergency requests.";
    }

    const q = raw.toLowerCase();
    const isBn = (typeof currentLanguage !== "undefined" && currentLanguage === "bn") || /[\u0980-\u09FF]/.test(raw);

    // 1. GREETINGS
    if (/^(hi|hello|hey|hola|salam|assalamu|good\s*(morning|afternoon|evening)|হ্যালো|হাই|সালাম|নমস্কার)[\s!.,?]*$/i.test(q)) {
      return isBn
        ? "হ্যালো! আমি লাইফলাইন এআই (Lifeline AI)। আমি রক্তের গ্রুপ সামঞ্জস্য (compatibility), রক্তদানের শারীরিক যোগ্যতা, জরুরি রক্তের অনুরোধ এবং হেমাটোলজি সংক্রান্ত নির্দেশিকা দিয়ে সহায়তা করি। আজ আপনাকে কীভাবে সাহায্য করতে পারি?"
        : "Hello! I am Lifeline AI. I can assist you with blood group compatibility, donor eligibility criteria, emergency blood requests, and hematological guidelines. How can I help you today?";
    }

    // 2. GRATITUDE / THANKS
    if (/^(thank\s*you|thanks|thx|ধন্যবাদ|অনেক ধন্যবাদ|shukriya)[\s!.,?]*$/i.test(q)) {
      return isBn
        ? "আপনাকে অনেক ধন্যবাদ! রক্তদানের যেকোনো তথ্য বা জরুরি প্রয়োজনে আমি সর্বদা প্রস্তুত। রক্ত দিন, জীবন বাঁচান!"
        : "You are very welcome! If you have any more questions about blood donation or compatibility, feel free to ask anytime. Stay safe and save lives!";
    }

    // 3. WHO ARE YOU / IDENTITY
    if (/who\s+are\s+you|what\s+is\s+lifeline|কে\s*তুমি|তুমি\s*কে|তোমার\s*কাজ\s*কী|who\s+made\s+you/.test(q)) {
      return isBn
        ? "আমি লাইফলাইনের স্মার্ট এআই অ্যাসিস্ট্যান্ট। আমার কাজ হলো রক্তদাতা ও রোগীদের রক্তের গ্রুপ সামঞ্জস্য, রক্তদানের নিয়মাবলী, থ্যালাসেমিয়া/ডেঙ্গুর মতো রক্তের রোগ এবং লাইফলাইন প্ল্যাটফর্ম ব্যবহারে সঠিক তথ্য দিয়ে সহায়তা করা।"
        : "I am Lifeline's AI Medical & Platform Assistant. I provide instant guidance on blood compatibility, donor eligibility, blood disorders (Thalassemia, Dengue), and navigating Lifeline's emergency network.";
    }

    // 4. SPECIFIC TWO-GROUP COMPATIBILITY: "Can A+ give to O+?", "B+ কি A+ কে রক্ত দিতে পারবে?"
    const bgs = extractBloodGroups(raw);
    if (bgs.length >= 2 && /(can|give|donate|receive|transfus|match|possible|দিতে|নিতে|হবে|পারবে|সম্ভব|যাবে)/i.test(q)) {
      const donor = bgs[0];
      const recipient = bgs[1];
      const info = BLOOD_COMPATIBILITY[donor];
      if (info) {
        const isCompatible = info.canDonateTo.includes(recipient);
        if (isCompatible) {
          return isBn
            ? `হ্যাঁ! ${donor} রক্তের লোহিত কণিকা নিরাপদে ${recipient} রোগীকে দেওয়া যেতে পারে। তবে রক্ত সঞ্চালনের পূর্বে হাসপাতালের ব্লাড ব্যাংকে ক্রস-ম্যাচিং (Cross-match) করা আবশ্যক।`
            : `Yes! ${donor} red blood cells can safely be transfused to a ${recipient} recipient. Hospital blood bank cross-matching is always required prior to transfusion.`;
        } else {
          return isBn
            ? `না, ${donor} গ্রুপের রক্ত ${recipient} গ্রহীতাকে দেওয়া যাবে না। এতে বিপজ্জনক অ্যান্টিবডি রিঅ্যাকশন (Hemolytic reaction) হতে পারে। ${recipient} রোগীর জন্য কেবল ${BLOOD_COMPATIBILITY[recipient].canReceiveFrom.join(", ")} গ্রুপের রক্ত নিরাপদ।`
            : `No. ${donor} red blood cells cannot be given to a ${recipient} recipient due to antibody incompatibility. A ${recipient} recipient can only safely receive from: ${BLOOD_COMPATIBILITY[recipient].canReceiveFrom.join(", ")}.`;
        }
      }
    }

    // 5. SINGLE BLOOD GROUP QUERY: "Who can O- donate to?" / "Who can A+ receive from?"
    if (bgs.length === 1) {
      const bg = bgs[0];
      const info = BLOOD_COMPATIBILITY[bg];
      if (info) {
        if (/receive|take|need|accept|কার\s*কাছ\s*থেকে|নিতে|গ্রহীতা/.test(q)) {
          return isBn
            ? `${bg} রক্তের গ্রহীতারা নিরাপদে ${info.canReceiveFrom.join(", ")} গ্রুপ থেকে লোহিত রক্তকণিকা নিতে পারেন।`
            : `A ${bg} recipient can safely receive red blood cells from: ${info.canReceiveFrom.join(", ")}.`;
        }
        if (/donate|give|কাকে\s*দিতে|দিতে\s*পারে|দাতা|কাকে/.test(q)) {
          return isBn
            ? `${bg} গ্রুপের রক্তদাতা নিরাপদে ${info.canDonateTo.join(", ")} গ্রুপের রোগীদের লোহিত রক্তকণিকা দান করতে পারেন।`
            : `A ${bg} donor can safely donate red blood cells to: ${info.canDonateTo.join(", ")}.`;
        }
      }
    }

    // 6. UNIVERSAL DONOR & UNIVERSAL RECIPIENT
    if (/universal\s*donor|universal\s*recipient|universal|সর্বজনীন\s*দাতা|সর্বজনীন\s*গ্রহীতা|সার্বজনীন/.test(q)) {
      return isBn
        ? "• সার্বজনীন রক্তদাতা (Universal Donor): O− (ও নেগেটিভ)। এর লোহিত কণিকায় A, B বা Rh কোনো অ্যান্টিজেন নেই, তাই যেকোনো রোগীকে জরুরি মুহূর্তে দেওয়া যায়।\n• সার্বজনীন গ্রহীতা (Universal Recipient): AB+ (এবি পজিটিভ)। এরা যেকোনো গ্রুপের রক্ত গ্রহণ করতে পারে।"
        : "• Universal Red Cell Donor: O− (O Negative). It lacks A, B, and Rh antigens, making it safe for all 8 blood groups in emergencies.\n• Universal Red Cell Recipient: AB+ (AB Positive). They have no anti-A, anti-B, or anti-Rh antibodies and can receive red cells from all groups.";
    }

    // 7. FREQUENCY & INTERVAL
    if (/how\s*(often|frequent)|interval|how\s*many\s*(months|days)|frequency|কত\s*দিন\s*পর\s*পর|কত\s*মাস|ব্যবধান|কতবার/.test(q)) {
      return isBn
        ? "• পুরুষেরা প্রতি ৩ মাস (৯০ দিন) পর পর সম্পূর্ণ রক্ত (Whole Blood) দান করতে পারেন।\n• নারীরা প্রতি ৪ মাস (১২০ দিন) পর পর রক্ত দান করতে পারেন।\n• প্লেটলেট (Apheresis) প্রতি ১৫ দিন পর পর দেওয়া যায় (বছরে সর্বোচ্চ ২৪ বার)।"
        : "• Men can donate whole blood every 3 months (90 days).\n• Women can donate whole blood every 4 months (120 days).\n• Platelets (apheresis) can be donated every 14 days (up to 24 times a year).";
    }

    // 8. MEDICAL CONDITIONS: DIABETES, BP, TATTOOS, SMOKING, ALCOHOL, MEDICATIONS, PREGNANCY, PERIODS
    if (/diabet|ডায়াবেটিস/.test(q)) {
      return isBn
        ? "যাদের ডায়াবেটিস খাদ্যাভ্যাস বা মুখে খাওয়ার ওষুধের মাধ্যমে নিয়ন্ত্রণে রয়েছে এবং কোনো জটিলতা নেই, তারা রক্ত দিতে পারেন। তবে যারা ইনসুলিন গ্রহণ করেন বা রক্তে শর্করার মাত্রা অনিয়ন্ত্রিত, তাদের রক্তদান থেকে বিরত থাকতে বলা হয়।"
        : "If your diabetes is well-controlled through diet or oral medication and you have no cardiovascular or kidney complications, you can usually donate blood. Donors taking insulin are generally deferred.";
    }

    if (/pressure|hypertension|হাইপারটেনশন|প্রেসার|রক্তচাপ/.test(q)) {
      return isBn
        ? "উচ্চ রক্তচাপ ওষুধ দিয়ে নিয়ন্ত্রণে থাকলে এবং রক্তদানের সময় স্বাভাবিক মাত্রায় (১৪০/৯০ এর নিচে) থাকলে রক্ত দেওয়া সম্ভব। রক্তদানের পূর্বে ব্লাড ব্যাংকে প্রেশার মেপে নিশ্চিত করা হয়।"
        : "You can donate if your blood pressure is well-controlled by medication and falls within the acceptable range (systolic under 140 mmHg, diastolic under 90 mmHg) at the time of donation.";
    }

    if (/tattoo|piercing|ট্যাটু|উল্কি|ছিদ্র/.test(q)) {
      return isBn
        ? "ট্যাটু, পিয়ার্সিং বা আকুপাংচার করানোর পর সাধারণত ৬ থেকে ১২ মাস অপেক্ষা করতে হয় (হেপাটাইটিস বি/সি ও এইচআইভি ভাইরাসের উইন্ডো পিরিয়ড অতিক্রমের জন্য)। এরপর রক্তদান সম্পূর্ণ নিরাপদ।"
        : "You must wait 6 to 12 months after getting a tattoo, body piercing, or acupuncture before donating blood to ensure the window period for viral infections (Hepatitis B/C, HIV) has safely elapsed.";
    }

    if (/medication|medicine|antibiotic|ওষুধ|অ্যান্টিবায়োটিক/.test(q)) {
      return isBn
        ? "প্যারাসিটামল বা ভিটামিনের মতো সাধারণ ওষুধে রক্তদানে বাধা নেই। তবে অ্যান্টিবায়োটিক সেবন শেষ হওয়ার পর অন্তত ৪৮ থেকে ৭২ ঘণ্টা এবং সংক্রমণ পুরোপুরি সেরে যাওয়া পর্যন্ত অপেক্ষা করতে হবে। রক্ত পাতলা করার ওষুধ (যেমন অ্যাসপিরিন) খেলে প্লেটলেট দান করা যায় না।"
        : "Common medications like paracetamol or vitamins do not prevent blood donation. If taking antibiotics for active infection, wait at least 48 to 72 hours after completing your course. Blood thinners (like aspirin) may defer platelet donation.";
    }

    if (/smok|alcohol|cigarette|ধূমপান|মদ|সিগারেট/.test(q)) {
      return isBn
        ? "রক্তদানের অন্তত ২৪ ঘণ্টা আগে অ্যালকোহল পরিহার করুন এবং রক্তদানের অন্তত ৩ ঘণ্টা আগে ও পরে ধূমপান করা থেকে বিরত থাকুন। এতে মাথা ঘোরা বা প্রেশার কমার ঝুঁকি কমে।"
        : "Avoid alcohol for at least 24 hours prior to donation. Avoid smoking for at least 2 to 3 hours before and after donating to prevent dizziness and blood pressure drops.";
    }

    if (/pregnant|pregnancy|breastfeeding|গর্ভবতী|স্তন্যপান|মা/.test(q)) {
      return isBn
        ? "গর্ভবতী নারীরা রক্ত দান করতে পারেন না। সন্তান প্রসবের পর অন্তত ৬ মাস এবং স্তন্যপান করানো সমাপ্ত হওয়ার পর রক্তদান বিবেচনা করা যায়।"
        : "Pregnant individuals cannot donate blood. After childbirth, you should wait at least 6 months and ensure breastfeeding is completed before voluntary donation.";
    }

    if (/period|menstruat|মাসিক|ঋতুস্রাব/.test(q)) {
      return isBn
        ? "মাসিক চলাকালীন সাধারণ সুস্থতা অনুভব করলে এবং হিমোগ্লোবিন স্বাভাবিক (১২.৫ g/dL বা বেশি) থাকলে রক্তদান করা যায়। তবে তীব্র ব্যথা, দুর্বলতা বা অতিরিক্ত রক্তক্ষরণ থাকলে সেই দিনগুলোতে রক্তদান থেকে বিরত থাকা উত্তম।"
        : "You can donate blood during menstruation as long as you feel healthy and your hemoglobin is normal (>= 12.5 g/dL). If you have severe cramping or heavy flow, it is best to postpone until it passes.";
    }

    // 9. MESSAGING DONOR / CONTACT
    if (/(?:message|msg|chat|whatsapp|contact|মেসেজ|বার্তা|যোগাযোগ)/i.test(q)) {
      return isBn
        ? "রক্তদাতাদের সাথে সরাসরি যোগাযোগ করতে রক্তদাতা কার্ডের '💬 Message' বা WhatsApp বাটনে ক্লিক করুন। আপনি ড্যাশবোর্ড বা সার্চ পেজ থেকেও মেসেজ আদান-প্রদান করতে পারেন।"
        : "To contact a donor, click the '💬 Message' or WhatsApp button on their donor card in Donor Search or Dashboard. You can chat directly via WhatsApp or in-platform messaging.";
    }

    // 10. HOW TO BECOME / REGISTER AS DONOR
    if (/(?:how\s+(?:can\s+i|to|do\s+i)?\s*(?:become|register|join|be(?:\s+a)?)\s+donor|become\s+a?\s*donor|register\s+as\s+a?\s*donor|রক্তদাতা\s*হব|নিবন্ধন)/i.test(q)) {
      return isBn
        ? "রক্তদাতা হতে ওপরের নেভিগেশন বার থেকে 'Become a donor' লিঙ্কে যান। প্রথমে সাইন ইন বা অ্যাকাউন্ট তৈরি করুন, এরপর আপনার রক্তের গ্রুপ, জেলা ও ফোন নম্বর দিয়ে প্রোফাইল সম্পূর্ণ করুন!"
        : "To become a donor, click 'Become a donor' in the navigation bar. Sign in or create an account, fill in your blood group, district, and contact info, and your voluntary profile will be active in seconds!";
    }

    // 11. HOW TO REQUEST BLOOD / EMERGENCY
    if (/(?:how\s+to\s+request|need\s*blood|request\s*blood|emergency\s*blood|blood\s*for|রোগীর\s*জন্য|রক্ত\s*চাই|রক্তের\s*অনুরোধ|অনুরোধ\s*কীভাবে)/i.test(q)) {
      return isBn
        ? "রক্তের জরুরি প্রয়োজনের জন্য 'Request blood' পেজে যান। রোগীর নাম, রক্তের গ্রুপ, হাসপাতাল ও ইউনিটের সংখ্যা লিখে পোস্ট করুন। লাইফলাইন তাৎক্ষণিকভাবে নিকটস্থ রক্তদাতাদের সাথে অটো-ম্যাচ করে দেবে!"
        : "To post an emergency request, navigate to 'Request blood'. Submit the patient's blood group, hospital location, and units needed. Lifeline will instantly broadcast and auto-match nearby compatible donors!";
    }

    // 12. MAP & HOSPITALS
    if (/map|hospital|clinic|dhaka|drmc|মানচিত্র|হাসপাতাল|ক্লিনিক/.test(q)) {
      return isBn
        ? "লাইফলাইনের ইন্টারেক্টিভ 'Map' পেজে ঢাকা রেসিডেনসিয়াল মডেল কলেজ (DRMC), ধানমন্ডি, শাহবাগ এবং সারা দেশের সকল অনুমোদিত ব্লাড ব্যাংক ও হাসপাতালের পিন, ফোন নম্বর এবং দিকনির্দেশনা দেখতে পাবেন।"
        : "Check our interactive 'Map' page! It features verified blood banks and hospitals around Dhaka Residential Model College (DRMC), Dhanmondi, Shahbagh, and nationwide with direct contact details and routing.";
    }

    // 13. ELIGIBILITY: AGE, WEIGHT, HEMOGLOBIN, CRITERIA
    if (/\bage\b|\bweight\b|hemoglobin|requirement|criteria|eligible|eligibility|ব[\u09DF\u09AF]়?স|ওজন|যোগ্যতা|শর্ত|হিমোগ্লোবিন/.test(q)) {
      return isBn
        ? "রক্তদানের সাধারণ শারীরিক যোগ্যতা:\n1. বয়স: ১৮ থেকে ৬০ বছর (সুস্থ নিয়মিত দাতাদের ক্ষেত্রে ৬৫ পর্যন্ত)।\n2. ওজন: পুরুষদের ন্যূনতম ৫০ কেজি, নারীদের ৪৫ কেজি।\n3. হিমোগ্লোবিন: ন্যূনতম ১২.৫ g/dL।\n4. রক্তচাপ: সিস্টোলিক ১০০–১৪০ এবং ডায়াস্টোলিক ৬০–৯০ mmHg স্বাভাবিক থাকা উচিত।\n5. সাধারণ সুস্থতা: জ্বর, সর্দি বা কোনো তীব্র সংক্রমণ মুক্ত থাকতে হবে।"
        : "General Blood Donation Criteria:\n1. Age: 18–60 years (up to 65 for regular healthy donors).\n2. Weight: Minimum 50 kg for males, 45 kg for females.\n3. Hemoglobin: Minimum 12.5 g/dL.\n4. Blood Pressure: Systolic 100–140 mmHg, Diastolic 60–90 mmHg.\n5. General Health: Free of active infection, cold, or fever on donation day.";
    }

    // 14. PREPARATION & RECOVERY (BEFORE / AFTER DONATION)
    if (/before\s*(donate|donation)|eat|drink|খাওয়ার|আগে\s*কী|প্রস্তুতি/.test(q)) {
      return isBn
        ? "রক্তদানের আগের প্রস্তুতি:\n• রক্তদানের ১-২ ঘণ্টা আগে ৫০০ মিলি পানি বা স্বাস্থ্যকর পানীয় পান করুন।\n• রক্তদানের ২-৩ ঘণ্টা আগে হালকা, পুষ্টিকর খাবার খান। অতিরিক্ত তেল-চর্বিযুক্ত খাবার এড়িয়ে চলুন।\n• পর্যাপ্ত ঘুম ও বিশ্রাম নিন।"
        : "Preparation Before Donation:\n• Drink plenty of water or fluids (at least 500ml 1-2 hours prior).\n• Eat a balanced, low-fat meal 2-3 hours before donating. Avoid heavy oily foods.\n• Ensure 7-8 hours of good sleep the night before.";
    }

    if (/after\s*(donate|donation)|recovery|দিয়ে\s*কী|পরে\s*কী|মাথা\s*ঘোরা|অসুস্থ/.test(q)) {
      return isBn
        ? "রক্তদানের পরবর্তী যত্ন:\n• রক্তদানের পর ১০-১৫ মিনিট বিশ্রাম নিয়ে জুস বা তরল খাবার গ্রহণ করুন।\n• সারাদিনে প্রচুর পানি ও তরল পান করুন।\n• সেদিন ভারী কাজ, ব্যায়াম বা ওজন তোলা থেকে বিরত থাকুন।\n• মাথা ঘুরলে তৎক্ষণাৎ শুয়ে পড়ে পা কিছুটা উঁচুতে রাখুন।"
        : "Post-Donation Care:\n• Rest for 10-15 minutes at the center and have fluids/snacks.\n• Drink extra fluids throughout the next 24-48 hours.\n• Avoid strenuous exercise or heavy lifting for the rest of the day.\n• If you feel dizzy, sit or lie down immediately with feet elevated.";
    }

    // 15. PAIN & AMOUNT OF BLOOD
    if (/pain|hurt|needle|ব্যথা|কষ্ট|ভয়|سوئی/.test(q)) {
      return isBn
        ? "রক্তদানে কোনো তীব্র ব্যথা হয় না! সুই প্রবেশের সময় মাত্র ১-২ সেকেন্ড একটি ছোট পিঁপড়ার কামড়ের মতো অনুভূতি হতে পারে। পুরো রক্তদান প্রক্রিয়াটি মাত্র ৮-১০ মিনিট সময় নেয় এবং সম্পূর্ণ নিরাপদ।"
        : "Donating blood does not hurt! You only feel a minor prick for 1-2 seconds when the needle is inserted. The actual blood collection takes only 8-10 minutes and is very safe.";
    }

    if (/how\s*much\s*blood|volume|পরিমাণ|কতটুকু\s*রক্ত/.test(q)) {
      return isBn
        ? "একবারে সাধারণত ৩৫০ থেকে ৪৫০ মিলিলিটার (১ ইউনিট) রক্ত নেওয়া হয়, যা শরীরের মোট রক্তের মাত্র ৮-১০%। রক্তদানের ২৪ থেকে ৪৮ ঘণ্টার মধ্যে শরীরে তরলের ঘাটতি পূরণ হয়ে যায়।"
        : "Typically, 350ml to 450ml (about 1 pint) is collected per donation, which is only about 8-10% of an adult's blood volume. Your body replaces the fluid within 24 to 48 hours.";
    }

    // 16. BENEFITS OF DONATING
    if (/benefit|advantage|উপকার|সুবিধা|লাভ/.test(q)) {
      return isBn
        ? "রক্তদানের শারীরিক ও মানসিক উপকারিতা:\n• নতুন রক্তকণিকা তৈরিতে (hematopoiesis) সহায়তা করে।\n• শরীরে অতিরিক্ত আয়রন জমে থাকা কমায়, যা হার্টের জন্য ভালো।\n• নিয়মিত রক্তদানে বিনামূল্যে রক্তচাপ, পালস ও রক্তবাহিত রোগের প্রাথমিক স্ক্রিনিং হয়।\n• সবচেয়ে বড় কথা, ১ ব্যাগ রক্ত দিয়ে ৩ জনের জীবন বাঁচানো সম্ভব!"
        : "Benefits of Blood Donation:\n• Stimulates fresh blood cell production (hematopoiesis).\n• Reduces harmful iron overload, benefiting heart and liver health.\n• Includes complimentary mini-checkup (BP, pulse, hemoglobin, viral screening).\n• Most importantly: 1 donation can save up to 3 lives!";
    }

    // 17. SAFETY & TESTING (IS BLOOD TESTED / HIV / HEPATITIS)
    if (/test|safe|screening|hiv|hepatitis|নিরাপদ|পরীক্ষা/.test(q)) {
      return isBn
        ? "সংগৃহীত প্রতি ইউনিট রক্ত রোগীর দেহে দেওয়ার আগে পাঁচটি মারাত্মক সংক্রামক রোগের (HIV, Hepatitis B, Hepatitis C, Syphilis, Malaria) জন্য বাধ্যতামূলকভাবে পরীক্ষা করা হয়। এছাড়া ক্রস-ম্যাচিং নিশ্চিত করে তবেই রক্ত দেওয়া হয়।"
        : "Every collected unit undergoes mandatory Transfusion-Transmissible Infection (TTI) screening for HIV, Hepatitis B (HBsAg), Hepatitis C (HCV), Syphilis, and Malaria, along with strict blood typing and cross-matching.";
    }

    // 18. DISEASES (THALASSEMIA, DENGUE, LEUKEMIA, HEMOPHILIA)
    if (/thalassemia|থ্যালাসেমিয়া/.test(q)) {
      return isBn
        ? "থ্যালাসেমিয়া একটি জন্মগত রক্তস্বল্পতাজনিত রোগ যেখানে শরীরে পর্যাপ্ত হিমোগ্লোবিন তৈরি হয় না। থ্যালাসেমিয়া মেজর আক্রান্ত রোগীদের প্রতি ২ থেকে ৪ সপ্তাহ পর পর নিয়মিত লোহিত রক্তকণিকা (PRBC) সঞ্চালনের প্রয়োজন হয়। লিউকো-ডিপ্লিটেড রক্ত ব্যবহার করা সবচেয়ে নিরাপদ।"
        : "Thalassemia is an inherited hemoglobin disorder. Severe cases (Thalassemia Major) require lifelong packed red blood cell (PRBC) transfusions every 2 to 4 weeks, along with iron chelation therapy to manage iron overload. Leuko-depleted blood is strongly recommended.";
    }

    if (/dengue|platelet|ডেঙ্গু|প্লেটলেট/.test(q)) {
      return isBn
        ? "ডেঙ্গু জ্বরে রক্তে প্লেটলেট (অণুচক্রিকা) আশঙ্কাজনকভাবে কমে যেতে পারে। সাধারণত প্লেটলেট কাউন্ট ১০,০০০–২০,০০০-এর নিচে নামলে অথবা রক্তক্ষরণের লক্ষণ দেখা দিলে ডাক্তার প্লেটলেট (SDP বা RDP) দেওয়ার নির্দেশ দেন।"
        : "Dengue can cause severe thrombocytopenia (platelet drop). Platelet transfusions (Single Donor Platelets / SDP or Random Donor Platelets / RDP) are clinically indicated if platelets drop below 10,000–20,000/μL or active bleeding occurs, as guided by the physician.";
    }

    if (/hemophilia|হিমোফিলিয়া/.test(q)) {
      return isBn
        ? "হিমোফিলিয়া হলো রক্ত জমাট না বাঁধার বংশগত রোগ (Factor VIII বা IX-এর ঘাটতি)। এদের সম্পূর্ণ রক্তের বদলে নির্দিষ্ট ক্লটিং ফ্যাক্টর কনসেন্ট্রেট বা ফ্রেশ ফ্রোজেন প্লাজমা (FFP) দেওয়া হয়।"
        : "Hemophilia is a genetic clotting disorder (Factor VIII or IX deficiency). Patients require specific clotting factor concentrates or Fresh Frozen Plasma (FFP)/Cryoprecipitate, rather than whole blood.";
    }

    if (/leukemia|cancer|লিউকেমিয়া|ক্যান্সার/.test(q)) {
      return isBn
        ? "লিউকেমিয়া ও ক্যান্সারের কেমোথেরাপির সময় অস্থিমজ্জা দুর্বল হয়ে পড়ায় রোগীদের ঘন ঘন লোহিত রক্তকণিকা ও প্লেটলেট সঞ্চালনের প্রয়োজন হতে পারে। এই রক্ত সাধারণত রেডিয়েটেড বা ফিল্টার করা হওয়া উচিত।"
        : "Leukemia and cancer chemotherapy cause bone marrow suppression, frequently requiring repeated platelet transfusions and packed red blood cells, ideally irradiated to prevent transfusion-associated complications.";
    }

    // 19. SMART CONTEXTUAL FALLBACK
    return isBn
      ? "আপনার প্রশ্নের সঠিক উত্তরের জন্য আমি প্রস্তুত! আপনি আমাকে জিজ্ঞেস করতে পারেন:\n• রক্তের সামঞ্জস্য (যেমন: 'A+ কি O+ কে দিতে পারে?')\n• রক্তদানের নিয়ম (যেমন: 'কত দিন পর পর রক্ত দেওয়া যায়?')\n• রক্তদানের বয়স ও ওজন\n• থ্যালাসেমিয়া বা ডেঙ্গু প্লেটলেট সংক্রান্ত তথ্য\n• কীভাবে রক্তদাতা হবেন বা রক্তের অনুরোধ করবেন।"
      : "I'm here to give you accurate medical and blood matching answers! Try asking:\n• Compatibility checks (e.g. 'Can B+ donate to A+?')\n• Eligibility rules (e.g. 'How often can I donate?', 'What weight is required?')\n• Medical conditions (e.g. 'Can diabetics donate?', 'Tattoo rules')\n• Blood diseases (e.g. 'Platelets in Dengue', 'Thalassemia frequency')\n• How to request blood or register as a donor.";
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

  function renderAssistantChips() {
    const messages = $("assistant-messages");
    if (!messages || messages.querySelector(".assistant-chips")) return;
    const isBn = (typeof currentLanguage !== "undefined" && currentLanguage === "bn");
    const chips = isBn
      ? ["A+ কি O+ কে দিতে পারে?", "কত দিন পর পর রক্ত দেওয়া যায়?", "সার্বজনীন রক্তদাতা কে?", "ডেঙ্গু ও প্লেটলেট", "রক্তদাতা হব কীভাবে?"]
      : ["Can A+ give to O+?", "How often can I donate?", "Who is universal donor?", "Dengue & Platelets", "Eligibility criteria"];

    const chipContainer = document.createElement("div");
    chipContainer.className = "assistant-chips";
    chipContainer.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; padding: 0 2px;";
    chips.forEach((chipText) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "assistant-chip-btn";
      btn.textContent = chipText;
      btn.style.cssText = "background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 4px 10px; font-size: 11px; cursor: pointer; color: #334155; transition: all 0.2s; white-space: nowrap;";
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#e2e8f0";
        btn.style.borderColor = "#94a3b8";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "#f1f5f9";
        btn.style.borderColor = "#cbd5e1";
      });
      btn.addEventListener("click", () => {
        const input = $("assistant-input");
        if (input) {
          input.value = chipText;
          $("assistant-form")?.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      chipContainer.appendChild(btn);
    });
    messages.appendChild(chipContainer);
    messages.scrollTop = messages.scrollHeight;
  }

  function wireAssistant() {
    $("assistant-open")?.addEventListener("click", () => {
      $("assistant-panel")?.classList.remove("hidden");
      renderAssistantChips();
    });
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
  // APPROXIMATE LOCATION
  // ==============================

  async function detectLocation() {
    const status = $("donor-location-status");
    if (!navigator.geolocation) {
      if (status) status.textContent = "Location detection is not supported by this browser.";
      return;
    }
    if (status) status.textContent = "Requesting approximate location…";
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        detectedLocation = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy || 0)
        };
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${detectedLocation.lat}&longitude=${detectedLocation.lng}&localityLanguage=en`
          );
          const place = await response.json();
          const district = place.city || place.locality || place.principalSubdivision || "";
          const area = place.locality || place.city || "";
          if (district && $("donor-district")) $("donor-district").value = district;
          if (area && $("donor-area")) $("donor-area").value = area;
          if (status) status.textContent = `Location detected: ${district || "nearby area"} (approx. ${detectedLocation.accuracy}m).`;
        } catch (error) {
          if (status) status.textContent = `Coordinates detected (approx. ${detectedLocation.accuracy}m). Add your district if needed.`;
        }
      },
      () => {
        if (status) status.textContent = "Location permission was not granted. You can enter your district manually.";
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  // ==============================
  // STATISTICS & ANIMATED COUNTERS
  // ==============================

  function animateCount(el, target, duration = 1200) {
    if (!el) return;
    const cleanStr = (el.textContent || "").replace(/[^0-9]/g, "");
    const start = parseInt(cleanStr, 10) || 0;
    const end = Number(target) || 0;
    if (start === end && el.textContent.trim() !== "-") {
      el.textContent = end.toLocaleString();
      return;
    }
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (end - start) * ease);
      el.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = end.toLocaleString();
      }
    }
    requestAnimationFrame(step);
  }

  async function refreshStats() {
    try {
      const [donors, requests, available] = await Promise.all([
        supabase.from("donor_profiles").select("id", { count: "exact", head: true }),
        supabase.from("blood_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("donor_profiles").select("id", { count: "exact", head: true }).eq("available", true)
      ]);

      const donorCount = donors?.count ?? 0;
      const requestCount = requests?.count ?? 0;
      const availableCount = available?.count ?? 0;

      animateCount($("stat-donors"), donorCount);
      animateCount($("stat-requests"), requestCount);
      animateCount($("stat-available"), availableCount);
      animateCount($("hero-donor-count"), donorCount);
    } catch (error) {
      console.error("Error refreshing statistics:", error);
    }
  }

  // ==============================
  // SESSION
  // ==============================

  async function loadSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session error:", error);
        return;
      }
      currentUser = data.session?.user ?? null;
      updateAuthUI();
      await updateDonorPageState();
    } catch (error) {
      console.error("Could not load session:", error);
    }
  }

  async function updateDonorPageState() {
    const authGate = $("donor-auth-gate");
    const userStatus = $("donor-user-status");
    const donorForm = $("donor-form");
    const emailEl = $("donor-logged-email");
    const submitBtn = $("donor-submit-btn");
    const heading = $("donor-form-heading");
    const subheading = $("donor-form-subheading");

    if (!donorForm) return;

    if (currentUser) {
      authGate?.classList.add("hidden");
      userStatus?.classList.remove("hidden");
      donorForm.classList.remove("is-gated");
      if (emailEl) emailEl.textContent = currentUser.email || "";

      const nameInput = $("donor-name");
      if (nameInput && !nameInput.value && currentUser.user_metadata?.full_name) {
        nameInput.value = currentUser.user_metadata.full_name;
      }

      try {
        const { data: profile } = await supabase
          .from("donor_profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (profile) {
          if (nameInput && !nameInput.value) nameInput.value = profile.full_name || "";
          if ($("donor-blood") && profile.blood_group) $("donor-blood").value = profile.blood_group;
          if ($("donor-district") && profile.district) $("donor-district").value = profile.district;
          if ($("donor-area") && profile.area) $("donor-area").value = profile.area;
          if ($("donor-phone") && profile.phone) $("donor-phone").value = profile.phone;
          if ($("donor-last") && profile.last_donation_date) $("donor-last").value = profile.last_donation_date;
          if ($("donor-available")) $("donor-available").checked = !!profile.available;
          if ($("donor-consent")) $("donor-consent").checked = !!profile.consent;

          let savedPrescription = null;
          try {
            const raw = localStorage.getItem("lifeline_donor_prescription_" + currentUser.id);
            if (raw) savedPrescription = JSON.parse(raw);
          } catch (e) {}

          if (profile.prescription_url) {
            savedPrescription = {
              url: profile.prescription_url,
              name: profile.prescription_name || "Doctor_Prescription.pdf",
              type: profile.prescription_url.startsWith("data:image") ? "image/jpeg" : "application/pdf"
            };
          }

          if (savedPrescription && savedPrescription.url) {
            currentDonorPrescription = savedPrescription;
            renderPrescriptionPreview("donor", savedPrescription);
          }

          if (submitBtn) submitBtn.innerHTML = 'Update my donor profile <span>→</span>';
          if (heading) heading.textContent = "Update your donor profile";
          if (subheading) subheading.textContent = "Your profile is registered. Keep your availability and details up to date.";
        }
      } catch (err) {
        console.error("Could not fetch existing donor profile:", err);
      }
    } else {
      authGate?.classList.remove("hidden");
      userStatus?.classList.add("hidden");
      donorForm.classList.add("is-gated");
      if (submitBtn) submitBtn.innerHTML = 'Create my donor profile <span>→</span>';
      if (heading) heading.textContent = "Donor registration";
      if (subheading) subheading.textContent = "It takes about 60 seconds.";
    }
  }

  function updateAuthUI() {
    const login = $("login-btn");
    const signout = $("signout-btn");
    
    if (login) {
      if (currentUser) {
        // Since Dashboard link is already present in the top bar, hide the Sign in button when logged in
        login.style.display = "none";
      } else {
        login.style.display = "";
        login.textContent = "Sign in";
      }
    }

    if (signout) {
      if (currentUser) {
        signout.classList.remove("hidden");
      } else {
        signout.classList.add("hidden");
      }
    }

    const headerSignout = $("header-signout-btn");
    if (headerSignout) {
      headerSignout.style.display = "none";
    }

    const drawerSigninBtn = $("drawer-signin-btn");
    if (drawerSigninBtn) {
      if (currentUser) {
        drawerSigninBtn.style.display = "none";
      } else {
        drawerSigninBtn.style.display = "block";
      }
    }
  }

  // ==============================
  // SEARCH DONORS
  // ==============================

  async function searchDonors() {
    return requireAuth(async () => {
      const blood = $("search-blood")?.value?.trim() || "";
      const district = $("search-district")?.value?.trim() || "";
      const status = $("search-status")?.value?.trim() || "";
      const results = $("donor-results");
      const empty = $("donor-empty");

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
        .order("available", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);

      if (blood) query = query.eq("blood_group", blood);
      if (district) query = query.ilike("district", `%${district}%`);
      if (status === "true") query = query.eq("available", true);

      const { data, error } = await query;

      if (error) {
        console.error("Donor search error:", error);
        results.innerHTML = "";
        toast(error.message || "Could not load donors. Check Supabase RLS setup.", "error");
        return;
      }

      lastDonorResults = data || [];
      renderDonors(lastDonorResults);
    });
  }

  function renderDonors(donors) {
    const grid = $("donor-results");
    const empty = $("donor-empty");
    if (!grid) return;

    grid.innerHTML = "";
    if (!donors.length) {
      empty?.classList.remove("hidden");
      return;
    }
    empty?.classList.add("hidden");

    donors.forEach((donor) => {
      const card = document.createElement("article");
      card.className = "donor-card";
      const donorName = donor.full_name || "Anonymous donor";

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
            <h3>${escapeHtml(donorName)}</h3>
            <div class="meta">${escapeHtml(donor.area || donor.district || "Worldwide")}</div>
          </div>
          ${donor.available ? `<span class="available-dot" title="Available"></span>` : ""}
        </div>

        <span class="blood-badge">${escapeHtml(donor.blood_group || "Unknown")}</span>

        <div class="details">
          <div><strong>${escapeHtml(donor.district || "—")}</strong>District</div>
          <div><strong>${donor.verified ? "Verified" : "Registered"}</strong>Status</div>
          <div><strong>${escapeHtml(formatDate(donor.last_donation_date))}</strong>Last donation</div>
        </div>

        <div class="donor-card-actions">
          <button type="button" class="btn btn-primary donor-wa-btn">💬 Message</button>
          <button type="button" class="btn btn-light donor-view-btn">Profile</button>
        </div>
      `;

      card.querySelector(".donor-wa-btn")?.addEventListener("click", () => {
        openWhatsAppChat({
          id: donor.user_id || donor.id,
          name: donorName,
          phone: donor.phone
        });
      });

      card.querySelector(".donor-view-btn")?.addEventListener("click", () => {
        openDonor(donor);
      });

      grid.appendChild(card);
    });
  }

  function openDonor(donor) {
    if (!donor) return;
    currentDonor = donor;

    const bloodBadge = $("profile-blood");
    if (bloodBadge) {
      if (donor.avatar_url) {
        bloodBadge.innerHTML = `<img src="${escapeHtml(donor.avatar_url)}" alt="${escapeHtml(donor.full_name || "Donor")}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />`;
      } else {
        bloodBadge.textContent = donor.blood_group || "Unknown";
      }
    }

    if ($("profile-name")) $("profile-name").textContent = donor.full_name || "Anonymous donor";
    if ($("profile-location")) $("profile-location").textContent = [donor.area, donor.district].filter(Boolean).join(" · ") || "Worldwide";

    if ($("profile-details")) {
      $("profile-details").innerHTML = `
        <div><small>Availability</small><strong>${donor.available ? "Available now" : "Currently unavailable"}</strong></div>
        <div><small>Profile status</small><strong>${donor.verified ? "Verified" : "Registered"}</strong></div>
        <div><small>District</small><strong>${escapeHtml(donor.district || "—")}</strong></div>
        <div><small>Last donation</small><strong>${escapeHtml(formatDate(donor.last_donation_date))}</strong></div>
      `;
    }

    const call = $("profile-call");
    const phone = safePhone(donor.phone);
    if (call) {
      if (phone) {
        call.href = `tel:${phone}`;
        call.classList.remove("hidden");
      } else {
        call.classList.add("hidden");
      }
    }

    const messageBtn = $("profile-message");
    if (messageBtn) {
      messageBtn.onclick = () => {
        closeProfile();
        openWhatsAppChat({ id: donor.user_id || donor.id, name: donor.full_name, phone: donor.phone });
      };
    }

    $("profile-modal")?.classList.remove("hidden");
  }

  // ==============================
  // SUBMIT DONOR PROFILE
  // ==============================

  async function submitDonor(e) {
    e.preventDefault();

    if (!currentUser) {
      toast("Please sign in or create an account first to become a donor.", "error");
      openAuth("signup", "donor");
      return;
    }

    if (!$("donor-consent")?.checked) {
      toast("Please provide consent before joining the donor network.", "error");
      return;
    }

    const btn = e.submitter || $("donor-submit-btn");
    setLoading(btn, true, "Saving profile…");

    const fullName = $("donor-name")?.value?.trim() || "";
    const bloodGroup = $("donor-blood")?.value?.trim() || "";
    const district = $("donor-district")?.value?.trim() || "";
    const area = $("donor-area")?.value?.trim() || null;
    const phone = safePhone($("donor-phone")?.value || "");
    const lastDonation = $("donor-last")?.value || null;
    const available = $("donor-available")?.checked || false;
    const consent = $("donor-consent")?.checked || false;

    if (!fullName || !bloodGroup || !district || !phone) {
      setLoading(btn, false);
      toast("Please complete all required donor information.", "error");
      return;
    }

    const payload = {
      user_id: currentUser.id,
      full_name: fullName,
      blood_group: bloodGroup,
      district: district,
      area: area,
      phone: phone,
      last_donation_date: lastDonation,
      available: available,
      consent: consent,
      ...(detectedLocation
        ? {
            location_lat: detectedLocation.lat,
            location_lng: detectedLocation.lng,
            location_accuracy: detectedLocation.accuracy
          }
        : {}),
      verified: false
    };

    let { error } = await supabase.from("donor_profiles").upsert(payload, { onConflict: "user_id" });

    if (error && /location_(lat|lng|accuracy)|column/i.test(error.message || "")) {
      delete payload.location_lat;
      delete payload.location_lng;
      delete payload.location_accuracy;
      const retry = await supabase.from("donor_profiles").upsert(payload, { onConflict: "user_id" });
      error = retry.error;
    }

    setLoading(btn, false);

    if (error) {
      console.error("Donor profile error:", error);
      toast(error.message || "Could not save donor profile.", "error");
      return;
    }

    if (currentDonorPrescription) {
      try {
        localStorage.setItem("lifeline_donor_prescription_" + currentUser.id, JSON.stringify(currentDonorPrescription));
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem("lifeline_donor_prescription_" + currentUser.id);
      } catch (e) {}
    }
    toast("Donor profile saved. Thank you for joining Lifeline.", "success");
    detectedLocation = null;
    await refreshStats();
    await updateDonorPageState();
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
  }

  // ==============================
  // LOAD RECENT BLOOD REQUESTS
  // ==============================

  async function loadBloodRequests() {
    const grid = $("requests-results");
    if (!grid) return;

    const { data, error } = await supabase
      .from("blood_requests")
      .select("id, requester_id, patient_name, blood_group, district, hospital_location, units_needed, urgency, contact_phone, note, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error || !data || data.length === 0) return;

    grid.innerHTML = "";
    data.forEach((req) => {
      const card = document.createElement("article");
      card.className = "donor-card";
      const phone = safePhone(req.contact_phone);
      const patientName = req.patient_name || "Blood request";

      card.innerHTML = `
        <div class="donor-top">
          <div class="donor-avatar">${escapeHtml(req.blood_group || "✚")}</div>
          <div>
            <h3>${escapeHtml(patientName)}</h3>
            <div class="meta">${escapeHtml(req.hospital_location || req.district || "Location not provided")}</div>
          </div>
          <span class="status-pill">${escapeHtml(req.urgency || "Normal")}</span>
        </div>

        <p style="margin: 8px 0; font-size: 13px;">
          <strong>Units:</strong> ${escapeHtml(req.units_needed || 1)} |
          <strong>Note:</strong> ${escapeHtml(req.note || "None")}
        </p>

        <div class="donor-card-actions">
          <button type="button" class="btn btn-primary request-wa-msg" style="font-size:11px;">💬 Message</button>
          ${
            phone
              ? `<a href="tel:${escapeHtml(phone)}" class="btn btn-light" style="font-size:11px;">📞 Call</a>`
              : `<span class="btn btn-light" style="opacity:.6; font-size:11px;">No phone</span>`
          }
        </div>
      `;

      card.querySelector(".request-wa-msg")?.addEventListener("click", () => {
        if (!req.requester_id) {
          toast("Please use the phone number above to reach this contact.", "info");
          return;
        }
        if (currentUser && req.requester_id === currentUser.id) {
          toast("This is your own blood request.", "info");
          return;
        }
        openWhatsAppChat(
          { id: req.requester_id, name: patientName, phone: req.contact_phone },
          `Blood Request: ${patientName} (${req.blood_group}) at ${req.hospital_location}`
        );
      });

      grid.appendChild(card);
    });
  }

  // ============================================================
  // SUBMIT BLOOD REQUEST & AUTO-FIND DONORS (REQ 2)
  // ============================================================

  async function submitRequest(e) {
    e.preventDefault();

    return requireAuth(async () => {
      const btn = $("request-submit-btn");
      setLoading(btn, true, "Publishing & Auto-Matching…");

      const patientName = $("request-name")?.value?.trim() || "";
      const bloodGroup = $("request-blood")?.value?.trim() || "";
      const district = $("request-district")?.value?.trim() || "";
      const hospitalLocation = $("request-location")?.value?.trim() || "";
      const units = Number($("request-units")?.value) || 1;
      const urgency = $("request-urgency")?.value?.trim() || "urgent";
      const phone = safePhone($("request-phone")?.value || "");
      const note = $("request-note")?.value?.trim() || null;
      const condition = $("request-condition")?.value?.trim() || null;

      if (!patientName || !bloodGroup || !district || !hospitalLocation || units < 1 || !phone) {
        setLoading(btn, false);
        toast("Please fill in all required request fields.", "error");
        return;
      }

      const payload = {
        requester_id: currentUser.id,
        patient_name: patientName,
        blood_group: bloodGroup,
        district: district,
        hospital_location: hospitalLocation,
        units_needed: units,
        urgency: urgency,
        contact_phone: phone,
        note: note,
        condition: condition,
        status: "open"
      };

      let { error } = await supabase.from("blood_requests").insert(payload);

      if (error && /condition|column/i.test(error.message || "")) {
        delete payload.condition;
        const retry = await supabase.from("blood_requests").insert(payload);
        error = retry.error;
      }

      setLoading(btn, false);

      if (error) {
        console.error("Blood request error:", error);
        toast(error.message || "Could not publish request.", "error");
        return;
      }

      toast("Blood request published! Auto-finding compatible donors now…", "success");

      // Requirement 2: Auto-find matching donors based on scientific criteria
      await autoFindAndRenderMatchingDonors(bloodGroup, district, hospitalLocation, patientName);

      await refreshStats();
      await loadBloodRequests();
    });
  }

  // ==============================
  // AUTHENTICATION
  // ==============================

  async function submitAuth(e) {
    e.preventDefault();

    const email = $("auth-email")?.value?.trim() || "";
    const confirmPassword = $("auth-confirm-password")?.value || "";
    const password = $("auth-password")?.value || "";
    const btn = $("auth-submit");

    if (!email || !password) {
      toast("Please enter your email and password.", "error");
      return;
    }

    if (authMode === "signup") {
      if (!confirmPassword) {
        toast("Please confirm your password.", "error");
        return;
      }
      if (password !== confirmPassword) {
        toast("Passwords do not match.", "error");
        return;
      }
    }

    setLoading(btn, true, authMode === "signin" ? "Signing in…" : "Creating account…");

    let result;
    try {
      if (authMode === "signin") {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }
    } catch (error) {
      setLoading(btn, false);
      toast(error.message || "Authentication failed.", "error");
      return;
    }

    setLoading(btn, false);

    if (result.error) {
      toast(result.error.message || "Authentication failed.", "error");
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      toast("Account created! Check your email if confirmation is enabled.", "success");
      closeAuth();
      return;
    }

    currentUser = result.data.user ?? null;
    updateAuthUI();
    closeAuth();

    toast(authMode === "signin" ? "Signed in successfully." : "Account created successfully.", "success");
    await refreshStats();
    await loadBloodRequests();

    const redirectUrl = sessionStorage.getItem("lifeline_auth_redirect");
    if (redirectUrl) {
      sessionStorage.removeItem("lifeline_auth_redirect");
      if (window.location.pathname.endsWith(redirectUrl) || window.location.pathname.includes(redirectUrl)) {
        await updateDonorPageState();
      } else {
        window.location.href = redirectUrl;
        return;
      }
    } else {
      await updateDonorPageState();
    }
  }

  // ==============================
  // SIGN OUT
  // ==============================

  async function signOut() {
    await supabase.auth.signOut();
    currentUser = null;
    lastDonorResults = [];
    sessionStorage.removeItem("lifeline_auth_redirect");
    updateAuthUI();
    if ($("donor-results")) $("donor-results").innerHTML = "";
    closeProfile();
    closeWhatsAppChat();
    await updateDonorPageState();
    toast("You have been signed out.", "info");
  }

  // ==============================
  // WIRE UI
  // ==============================

  function wireUI() {
    // Password toggles
    $("toggle-password-btn")?.addEventListener("click", () => {
      const p = $("auth-password");
      if (p) p.type = p.type === "password" ? "text" : "password";
    });

    $("toggle-confirm-password-btn")?.addEventListener("click", () => {
      const p = $("auth-confirm-password");
      if (p) p.type = p.type === "password" ? "text" : "password";
    });

    // Navigation scroll triggers
    $$("[data-scroll]").forEach((btn) => {
      btn.addEventListener("click", () => scrollToId(btn.dataset.scroll));
    });

    // Login/Dashboard button
    $("login-btn")?.addEventListener("click", () => {
      if (currentUser) {
        window.location.href = "dashboard.html";
      } else {
        openAuth("signin");
      }
    });

    $("locked-login")?.addEventListener("click", () => openAuth("signin"));
    $("drawer-signin-btn")?.addEventListener("click", (e) => { 
      e.preventDefault(); 
      const navDrawer = $("nav-menu-drawer");
      if (navDrawer && !navDrawer.classList.contains("hidden")) {
        navDrawer.classList.add("hidden");
        $("menu-trigger-btn")?.setAttribute("aria-expanded", "false");
        $("menu-trigger-btn")?.classList.remove("is-active");
        document.body.style.overflow = "";
      }
      openAuth("signup"); 
    });
    $("switch-auth")?.addEventListener("click", () => openAuth(authMode === "signin" ? "signup" : "signin"));

    // Dashboard links check: if user is not registered / logged in, take them to sign in
    $$('a[href="dashboard.html"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        if (!currentUser) {
          e.preventDefault();
          const navDrawer = $("nav-menu-drawer");
          if (navDrawer && !navDrawer.classList.contains("hidden")) {
            navDrawer.classList.add("hidden");
            $("menu-trigger-btn")?.setAttribute("aria-expanded", "false");
            $("menu-trigger-btn")?.classList.remove("is-active");
            document.body.style.overflow = "";
          }
          toast("Please sign in or register to access the dashboard.", "info");
          openAuth("signin");
        }
      });
    });

    // "Become a donor" links interceptor: require login or signup first
    $$('a[href="donate.html"], a[href*="donate.html"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        if (!currentUser) {
          e.preventDefault();
          const navDrawer = $("nav-menu-drawer");
          if (navDrawer && !navDrawer.classList.contains("hidden")) {
            navDrawer.classList.add("hidden");
            $("menu-trigger-btn")?.setAttribute("aria-expanded", "false");
            $("menu-trigger-btn")?.classList.remove("is-active");
            document.body.style.overflow = "";
          }
          sessionStorage.setItem("lifeline_auth_redirect", "donate.html");
          toast("Please sign in or create an account first to become a donor.", "info");
          openAuth("signup", "donor");
        }
      });
    });

    // Donate page auth gate buttons
    $("donor-gate-signup")?.addEventListener("click", () => {
      openAuth("signup", "donor");
    });
    $("donor-gate-signin")?.addEventListener("click", () => {
      openAuth("signin", "donor");
    });

    // Guard donor form interaction when unauthenticated
    const donorFormEl = $("donor-form");
    if (donorFormEl) {
      donorFormEl.addEventListener(
        "click",
        (e) => {
          if (!currentUser) {
            e.preventDefault();
            e.stopPropagation();
            toast("Please sign in or create an account first to become a donor.", "info");
            openAuth("signup", "donor");
          }
        },
        true
      );
    }

    // Forms
    $("auth-form")?.addEventListener("submit", submitAuth);
    $("donor-form")?.addEventListener("submit", submitDonor);
    $("request-form")?.addEventListener("submit", submitRequest);
    $("request-condition")?.addEventListener("change", showConditionGuidance);

    initPrescriptionUpload("donor", (data) => {
      currentDonorPrescription = data;
    }, () => {
      currentDonorPrescription = null;
    });

    initPrescriptionUpload("request", (data) => {
      currentRequestPrescription = data;
    }, () => {
      currentRequestPrescription = null;
    });
    $("detect-donor-location")?.addEventListener("click", detectLocation);
    $("search-donors")?.addEventListener("click", searchDonors);
    $("signout-btn")?.addEventListener("click", signOut);
    $("header-signout-btn")?.addEventListener("click", signOut);

    // Modals close buttons
    $$("[data-close-modal]").forEach((el) => el.addEventListener("click", closeAuth));
    $$("[data-close-profile]").forEach((el) => el.addEventListener("click", closeProfile));

    // Compatibility Chart Modal triggers
    $("open-chart-modal-btn")?.addEventListener("click", () => {
      $("figure-chart-modal")?.classList.remove("hidden");
    });
    $$("[data-close-chart]").forEach((el) => {
      el.addEventListener("click", () => $("figure-chart-modal")?.classList.add("hidden"));
    });

    // WhatsApp Chat Modal events
    $$("[data-close-whatsapp]").forEach((el) => el.addEventListener("click", closeWhatsAppChat));
    $("wa-chat-form")?.addEventListener("submit", handleSendWhatsAppMessage);

    // WhatsApp File Attachment Picker
    $("wa-attach-btn")?.addEventListener("click", () => {
      $("wa-file-input")?.click();
    });
    $("wa-file-input")?.addEventListener("change", handleFileSelect);
    $("wa-remove-file-btn")?.addEventListener("click", clearAttachmentStaging);

    // WhatsApp Quick Chips
    $$(".wa-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const input = $("wa-message-input");
        if (input) {
          input.value = chip.dataset.quick || chip.textContent;
          input.focus();
        }
      });
    });

    // Language toggle
    $("language-toggle")?.addEventListener("click", () => {
      applyLanguage(currentLanguage === "en" ? "bn" : "en");
    });

    // Slide-over Navigation Menu Drawer
    const navMenuBtn = $("nav-menu-toggle-btn") || $("menu-trigger-btn");
    const navDrawer = $("nav-menu-drawer");
    const navBackdrop = $("nav-drawer-backdrop");
    const navClose = $("nav-drawer-close");

    function openNavDrawer() {
      navDrawer?.classList.remove("hidden");
      navMenuBtn?.setAttribute("aria-expanded", "true");
      navMenuBtn?.classList.add("is-active");
      document.body.style.overflow = "hidden";
    }

    function closeNavDrawer() {
      navDrawer?.classList.add("hidden");
      navMenuBtn?.setAttribute("aria-expanded", "false");
      navMenuBtn?.classList.remove("is-active");
      document.body.style.overflow = "";
    }

    navMenuBtn?.addEventListener("click", () => {
      if (navDrawer?.classList.contains("hidden")) {
        openNavDrawer();
      } else {
        closeNavDrawer();
      }
    });

    navClose?.addEventListener("click", closeNavDrawer);
    navBackdrop?.addEventListener("click", closeNavDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !navDrawer?.classList.contains("hidden")) {
        closeNavDrawer();
      }
    });

    // Supabase auth change
    supabase.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user ?? null;
      updateAuthUI();
    });

    wireAssistant();
    initCookieConsent();
    applyLanguage();
  }

  // ==============================
  // AMBIENT FLUID BLOOD CANVAS & PARTICLES
  // ==============================

  function initAmbientCanvas() {
    const wrapper = document.querySelector(".bg-animation-wrapper");
    if (!wrapper) return;

    let canvas = document.getElementById("ambient-blood-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "ambient-blood-canvas";
      canvas.className = "ambient-blood-canvas";
      wrapper.prepend(canvas);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animationFrameId = null;
    let isVisible = true;

    // Mouse tracking for fluid dynamics
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };

    function onMouseMove(e) {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    }

    function onMouseLeave() {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.active = false;
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave, { passive: true });

    const CELL_COUNT = Math.max(16, Math.min(32, Math.floor(window.innerWidth / 45)));
    const PARTICLE_COUNT = Math.max(18, Math.min(36, Math.floor(window.innerWidth / 40)));
    const cells = [];
    const particles = [];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    window.addEventListener("resize", () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      resize();
    });
    resize();

    // Spawn biconcave red blood cells with rich visibility
    for (let i = 0; i < CELL_COUNT; i++) {
      cells.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 16 + Math.random() * 26,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.008,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.25 - Math.random() * 0.5,
        opacity: 0.28 + Math.random() * 0.24,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.02,
        aspectRatio: 0.72 + Math.random() * 0.24,
        repelX: 0,
        repelY: 0
      });
    }

    // Spawn golden & crimson plasma flecks
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.35 - Math.random() * 0.5,
        opacity: 0.35 + Math.random() * 0.45,
        glow: Math.random() > 0.4 ? "rgba(239, 68, 68, " : "rgba(251, 146, 60, ",
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.03 + Math.random() * 0.04
      });
    }

    let lastTime = performance.now();

    function render(currentTime) {
      if (!isVisible) return;
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      // Render red blood cells
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];

        const dx = c.x - mouse.x;
        const dy = c.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 140;

        if (dist < maxDist && dist > 1) {
          const force = (1 - dist / maxDist) * 35;
          c.repelX += (dx / dist) * force * dt;
          c.repelY += (dy / dist) * force * dt;
        }

        c.repelX *= 0.94;
        c.repelY *= 0.94;

        c.wobblePhase += c.wobbleSpeed;
        c.x += c.vx + Math.sin(c.wobblePhase) * 0.4 + c.repelX;
        c.y += c.vy + c.repelY;
        c.angle += c.angularSpeed;

        if (c.y < -c.r * 2) {
          c.y = height + c.r * 2;
          c.x = Math.random() * width;
        }
        if (c.x < -c.r * 2) c.x = width + c.r * 2;
        if (c.x > width + c.r * 2) c.x = -c.r * 2;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.scale(1, c.aspectRatio);

        const grad = ctx.createRadialGradient(0, 0, c.r * 0.22, 0, 0, c.r);
        grad.addColorStop(0, `rgba(254, 202, 202, ${c.opacity * 0.85})`);
        grad.addColorStop(0.55, `rgba(239, 68, 68, ${c.opacity})`);
        grad.addColorStop(0.85, `rgba(220, 38, 38, ${c.opacity * 0.95})`);
        grad.addColorStop(1, `rgba(185, 28, 28, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, c.r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(185, 28, 28, ${c.opacity * 0.45})`;
        ctx.fill();

        ctx.restore();
      }

      // Render plasma micro-particles
      for (let j = 0; j < particles.length; j++) {
        const p = particles[j];
        p.pulse += p.pulseSpeed;
        p.x += p.vx + Math.cos(p.pulse) * 0.3;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        const currentOpacity = p.opacity * (0.65 + 0.35 * Math.sin(p.pulse));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.glow + currentOpacity + ")";
        ctx.shadowColor = p.glow + "0.6)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        isVisible = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      } else {
        isVisible = true;
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    });
  }

  // ==============================
  // SCROLL REVEAL OBSERVER
  // ==============================

  function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal-on-scroll");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    targets.forEach((el) => observer.observe(el));
  }

  // ==============================
  // INITIALIZATION
  // ==============================

  async function initializeApp() {
    wireUI();
    initAmbientCanvas();
    initScrollReveal();
    await loadSession();
    await refreshStats();
    await loadBloodRequests();
    await updateDonorPageState();

    // Auto-prompt unauthenticated visitor on donate page
    if (!currentUser && (window.location.pathname.includes("donate.html") || window.location.pathname.endsWith("/donate"))) {
      setTimeout(() => {
        if (!currentUser) {
          openAuth("signup", "donor");
        }
      }, 400);
    }

    // Auto-open auth modal when requested via URL query param or hash
    function checkUrlAuthTriggers() {
      if (currentUser) return;
      const params = new URLSearchParams(window.location.search);
      const authParam = (params.get("auth") || "").toLowerCase();
      const hash = (window.location.hash || "").toLowerCase();

      if (authParam === "signup" || authParam === "register" || hash === "#register" || hash === "#signup") {
        setTimeout(() => openAuth("signup"), 300);
        if (authParam) history.replaceState({}, "", window.location.pathname + window.location.hash);
      } else if (authParam === "1" || authParam === "signin" || authParam === "login" || hash === "#login" || hash === "#signin" || hash === "#auth") {
        setTimeout(() => openAuth("signin"), 300);
        if (authParam) history.replaceState({}, "", window.location.pathname + window.location.hash);
      }
    }

    checkUrlAuthTriggers();
    window.addEventListener("hashchange", checkUrlAuthTriggers);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
  } else {
    initializeApp();
  }
})();