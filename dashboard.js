(() => {
  // Prevent duplicate script execution
  if (window.__lifelineDashboardLoaded) return;
  window.__lifelineDashboardLoaded = true;

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
  // STATE
  // ==============================

  let currentUser = null;
  let currentProfile = null;
  let currentAvatarUrl = null;
  let isAvatarRemoved = false;
  let userRequests = [];

  // ==============================
  // DOM HELPERS
  // ==============================

  const $ = (id) => document.getElementById(id);

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

  function formatDate(date) {
    if (!date) return "None";
    const value = String(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(`${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return "None";
      return parsed.toLocaleDateString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "None";
    return parsed.toLocaleDateString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function setLoading(button, loading, text) {
    if (!button) return;
    if (loading) {
      if (!button.dataset.original) {
        button.dataset.original = button.innerHTML;
      }
      button.disabled = true;
      button.innerHTML = `<span class="spinner">⟳</span> ${text || "Saving..."}`;
    } else {
      button.disabled = false;
      if (button.dataset.original) {
        button.innerHTML = button.dataset.original;
        delete button.dataset.original;
      }
    }
  }

  // ==============================
  // IMAGE RESIZING & COMPRESSION
  // ==============================

  function processImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        return reject(new Error("Please choose a valid image file (JPG, PNG, WebP)."));
      }

      if (file.size > 5 * 1024 * 1024) {
        return reject(new Error("Image size should be less than 5MB."));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 400; // Optimal square dimension for profile avatar
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("Failed to load image."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  }

  // ==============================
  // AVATAR DISPLAY
  // ==============================

  function updateAvatarDisplay(avatarUrl, donorName) {
    const previewBox = $("avatar-preview-display");
    const removeBtn = $("remove-avatar-btn");
    const cardAvatar = $("preview-card-avatar");

    if (avatarUrl) {
      if (previewBox) {
        previewBox.innerHTML = `<img src="${avatarUrl}" alt="Avatar preview" />`;
      }
      if (cardAvatar) {
        cardAvatar.innerHTML = `<img src="${avatarUrl}" alt="Card avatar" />`;
      }
      if (removeBtn) {
        removeBtn.style.display = "inline-flex";
      }
    } else {
      const userInitials = initials(donorName);
      if (previewBox) {
        previewBox.innerHTML = `<span id="avatar-initials-fallback">${userInitials}</span>`;
      }
      if (cardAvatar) {
        cardAvatar.innerHTML = userInitials;
      }
      if (removeBtn) {
        removeBtn.style.display = "none";
      }
    }
  }

  // ==============================
  // LIVE CARD PREVIEW
  // ==============================

  function updateLivePreview() {
    const name = $("edit-name")?.value?.trim() || "Your Name";
    const blood = $("edit-blood")?.value || "O+";
    const district = $("edit-district")?.value || "Dhaka";
    const area = $("edit-area")?.value?.trim() || "";
    const lastDate = $("edit-last")?.value || "";
    const available = $("edit-available")?.checked ?? true;

    // Card texts
    if ($("preview-card-name")) $("preview-card-name").textContent = name;
    if ($("preview-card-location")) {
      $("preview-card-location").textContent = [area, district, "Bangladesh"].filter(Boolean).join(" · ");
    }
    if ($("preview-card-blood")) $("preview-card-blood").textContent = blood;
    if ($("preview-card-district")) $("preview-card-district").textContent = district;
    if ($("preview-card-last")) $("preview-card-last").textContent = formatDate(lastDate);

    // Availability indicator
    const dot = $("preview-card-dot");
    const statusText = $("info-availability-text");
    const dashStatus = $("dashboard-status-indicator");

    if (available) {
      if (dot) dot.style.display = "block";
      if (statusText) {
        statusText.textContent = "Available now";
        statusText.style.color = "var(--green)";
      }
      if (dashStatus) {
        dashStatus.innerHTML = `<span></span> Available for emergency`;
        dashStatus.className = "status-pill";
      }
    } else {
      if (dot) dot.style.display = "none";
      if (statusText) {
        statusText.textContent = "Currently unavailable";
        statusText.style.color = "var(--muted)";
      }
      if (dashStatus) {
        dashStatus.innerHTML = `<span style="background:#9ca3af;"></span> Unavailable`;
        dashStatus.className = "status-pill";
      }
    }

    updateAvatarDisplay(currentAvatarUrl, name);
  }

  // ==============================
  // TAB NAVIGATION
  // ==============================

  function switchTab(tabName) {
    const tabProfileBtn = $("tab-profile-btn");
    const tabRequestsBtn = $("tab-requests-btn");
    const profileContent = $("profile-tab-content");
    const requestsContent = $("requests-tab-content");

    if (tabName === "requests") {
      tabProfileBtn?.classList.remove("active");
      tabRequestsBtn?.classList.add("active");
      profileContent?.classList.add("hidden");
      requestsContent?.classList.remove("hidden");
      loadUserRequests();
    } else {
      tabRequestsBtn?.classList.remove("active");
      tabProfileBtn?.classList.add("active");
      requestsContent?.classList.add("hidden");
      profileContent?.classList.remove("hidden");
    }
  }

  // ==============================
  // BLOOD REQUESTS MANAGEMENT
  // ==============================

  async function loadUserRequests() {
    if (!currentUser) return;

    const listContainer = $("user-requests-list");
    const emptyState = $("requests-empty-state");
    const badge = $("requests-count-badge");
    const infoCount = $("info-requests-count");

    try {
      const { data, error } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("requester_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading user blood requests:", error);
        if (listContainer) {
          listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Could not load requests: ${escapeHtml(error.message)}</div>`;
        }
        return;
      }

      userRequests = data || [];

      // Update counters
      const count = userRequests.length;
      if (badge) badge.textContent = count;
      if (infoCount) infoCount.textContent = `${count} posted`;

      if (count === 0) {
        if (listContainer) listContainer.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      if (emptyState) emptyState.style.display = "none";
      renderUserRequests(userRequests);
    } catch (err) {
      console.error("Load requests exception:", err);
    }
  }

  function renderUserRequests(requests) {
    const listContainer = $("user-requests-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    requests.forEach((req) => {
      const card = document.createElement("article");
      card.className = "request-item-card";

      const status = req.status || "open";
      let statusBadge = "";
      if (status === "open") {
        statusBadge = `<span class="status-badge-open">● Active / Open</span>`;
      } else if (status === "fulfilled") {
        statusBadge = `<span class="status-badge-fulfilled">✓ Fulfilled</span>`;
      } else {
        statusBadge = `<span class="status-badge-cancelled">✕ Cancelled</span>`;
      }

      const urgencyLabel = {
        critical: "Critical — today",
        urgent: "Urgent — within 24h",
        planned: "Planned"
      }[req.urgency] || req.urgency || "Urgent";

      card.innerHTML = `
        <div class="request-card-header">
          <div class="request-card-title-group">
            <span class="blood-badge" style="margin:0; font-size:14px; padding:6px 12px;">${escapeHtml(req.blood_group || "Unknown")}</span>
            <div>
              <h3 style="margin:0; font-size:16px;">${escapeHtml(req.patient_name || "Patient")}</h3>
              <small style="color:var(--muted); font-size:11px;">Posted on ${formatDate(req.created_at)}</small>
            </div>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div class="request-card-body">
          <div>
            <small>Hospital / Location</small>
            <strong>${escapeHtml(req.hospital_location || "—")}</strong>
          </div>
          <div>
            <small>District</small>
            <strong>${escapeHtml(req.district || "—")}</strong>
          </div>
          <div>
            <small>Units Needed</small>
            <strong>${escapeHtml(req.units_needed || 1)} unit(s)</strong>
          </div>
          <div>
            <small>Urgency</small>
            <strong style="color:var(--red);">${escapeHtml(urgencyLabel)}</strong>
          </div>
          <div>
            <small>Contact Phone</small>
            <strong>${escapeHtml(req.contact_phone || "—")}</strong>
          </div>
        </div>

        ${
          req.note
            ? `<div class="request-card-note"><strong>Note:</strong> ${escapeHtml(req.note)}</div>`
            : ""
        }

        <div class="request-card-actions">
          <button type="button" class="btn btn-light edit-req-btn" style="font-size:12px; padding:8px 14px;">
            ✏️ Edit Request
          </button>

          ${
            status === "open"
              ? `
                <button type="button" class="btn btn-ghost fulfill-req-btn" style="font-size:12px; padding:8px 14px; color:var(--green);">
                  ✓ Mark Fulfilled
                </button>
                <button type="button" class="btn btn-ghost cancel-req-btn" style="font-size:12px; padding:8px 14px; color:#ef4444;">
                  ✕ Cancel Request
                </button>
              `
              : `
                <button type="button" class="btn btn-ghost reopen-req-btn" style="font-size:12px; padding:8px 14px; color:var(--red);">
                  🔄 Re-open Request
                </button>
              `
          }
        </div>
      `;

      // Event listeners for actions
      card.querySelector(".edit-req-btn")?.addEventListener("click", () => {
        openEditRequestModal(req);
      });

      card.querySelector(".fulfill-req-btn")?.addEventListener("click", () => {
        updateRequestStatus(req.id, "fulfilled", "Mark this request as fulfilled? (This means you have found blood and donors will no longer be contacted.)");
      });

      card.querySelector(".cancel-req-btn")?.addEventListener("click", () => {
        updateRequestStatus(req.id, "cancelled", "Are you sure you want to cancel this blood request? It will be marked as cancelled.");
      });

      card.querySelector(".reopen-req-btn")?.addEventListener("click", () => {
        updateRequestStatus(req.id, "open", "Re-open this blood request so it appears active in emergency searches again?");
      });

      listContainer.appendChild(card);
    });
  }

  // Update status (cancel, fulfill, reopen)
  async function updateRequestStatus(requestId, newStatus, confirmMessage) {
    if (confirmMessage && !confirm(confirmMessage)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ status: newStatus })
        .eq("id", requestId)
        .eq("requester_id", currentUser.id);

      if (error) {
        console.error("Status update error:", error);
        toast(error.message || "Failed to update request status.", "error");
        return;
      }

      const statusLabels = {
        open: "Request re-opened and active.",
        fulfilled: "Request marked as fulfilled! Thank you for updating.",
        cancelled: "Blood request has been cancelled."
      };

      toast(statusLabels[newStatus] || "Status updated.", "success");
      await loadUserRequests();
    } catch (err) {
      console.error("Status update exception:", err);
      toast("Error updating status.", "error");
    }
  }

  // ==============================
  // EDIT REQUEST MODAL
  // ==============================

  function openEditRequestModal(request) {
    if (!request) return;

    if ($("edit-req-id")) $("edit-req-id").value = request.id;
    if ($("edit-req-name")) $("edit-req-name").value = request.patient_name || "";
    if ($("edit-req-blood")) $("edit-req-blood").value = request.blood_group || "A+";
    if ($("edit-req-district")) $("edit-req-district").value = request.district || "";
    if ($("edit-req-location")) $("edit-req-location").value = request.hospital_location || "";
    if ($("edit-req-units")) $("edit-req-units").value = request.units_needed || 1;
    if ($("edit-req-urgency")) $("edit-req-urgency").value = request.urgency || "urgent";
    if ($("edit-req-phone")) $("edit-req-phone").value = request.contact_phone || "";
    if ($("edit-req-status")) $("edit-req-status").value = request.status || "open";
    if ($("edit-req-note")) $("edit-req-note").value = request.note || "";

    $("edit-request-modal")?.classList.remove("hidden");
  }

  function closeEditRequestModal() {
    $("edit-request-modal")?.classList.add("hidden");
  }

  async function handleSaveEditedRequest(e) {
    e.preventDefault();

    const id = $("edit-req-id")?.value;
    if (!id || !currentUser) return;

    const patientName = $("edit-req-name")?.value?.trim() || "";
    const bloodGroup = $("edit-req-blood")?.value || "";
    const district = $("edit-req-district")?.value?.trim() || "";
    const location = $("edit-req-location")?.value?.trim() || "";
    const units = Number($("edit-req-units")?.value) || 1;
    const urgency = $("edit-req-urgency")?.value || "urgent";
    const phone = $("edit-req-phone")?.value?.trim() || "";
    const status = $("edit-req-status")?.value || "open";
    const note = $("edit-req-note")?.value?.trim() || null;

    if (!patientName || !bloodGroup || !district || !location || !phone) {
      toast("Please fill in all required request fields.", "error");
      return;
    }

    const saveBtn = $("save-request-btn");
    setLoading(saveBtn, true, "Saving...");

    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({
          patient_name: patientName,
          blood_group: bloodGroup,
          district: district,
          hospital_location: location,
          units_needed: units,
          urgency: urgency,
          contact_phone: phone,
          status: status,
          note: note
        })
        .eq("id", id)
        .eq("requester_id", currentUser.id);

      setLoading(saveBtn, false);

      if (error) {
        console.error("Save request error:", error);
        toast(error.message || "Failed to update blood request.", "error");
        return;
      }

      toast("Blood request updated successfully!", "success");
      closeEditRequestModal();
      await loadUserRequests();
    } catch (err) {
      setLoading(saveBtn, false);
      console.error("Save request exception:", err);
      toast("Error updating blood request.", "error");
    }
  }

  // ==============================
  // LOAD SESSION & PROFILE
  // ==============================

  async function loadDashboard() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.user) {
        toast("Please sign in to access your donor dashboard.", "info");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1200);
        return;
      }

      currentUser = data.session.user;

      // Update header email
      if ($("header-user-email")) {
        $("header-user-email").textContent = currentUser.email;
      }
      if ($("info-account-email")) {
        $("info-account-email").textContent = currentUser.email;
      }

      // Check user metadata for stored avatar
      if (currentUser.user_metadata?.avatar_url) {
        currentAvatarUrl = currentUser.user_metadata.avatar_url;
      }

      // Fetch donor profile from database
      const { data: profile, error: profileErr } = await supabase
        .from("donor_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (profileErr) {
        console.warn("Could not fetch donor profile:", profileErr);
      }

      currentProfile = profile;

      if (profile) {
        if ($("edit-name")) $("edit-name").value = profile.full_name || "";
        if ($("edit-blood")) $("edit-blood").value = profile.blood_group || "";
        if ($("edit-district")) $("edit-district").value = profile.district || "Dhaka";
        if ($("edit-area")) $("edit-area").value = profile.area || "";
        if ($("edit-phone")) $("edit-phone").value = profile.phone || "";
        if ($("edit-last")) $("edit-last").value = profile.last_donation_date || "";
        if ($("edit-available")) $("edit-available").checked = !!profile.available;
        if ($("edit-consent")) $("edit-consent").checked = profile.consent !== false;

        if (profile.avatar_url) {
          currentAvatarUrl = profile.avatar_url;
        }

        if ($("info-profile-status")) {
          $("info-profile-status").textContent = profile.verified ? "Verified Donor" : "Registered Donor";
          $("info-profile-status").style.color = profile.verified ? "#15803d" : "#b91c1c";
        }
        if ($("preview-card-status")) {
          $("preview-card-status").textContent = profile.verified ? "Verified" : "Registered";
        }
      } else {
        if (currentUser.user_metadata?.full_name && $("edit-name")) {
          $("edit-name").value = currentUser.user_metadata.full_name;
        }
      }

      updateLivePreview();

      // Load user requests in background
      await loadUserRequests();
    } catch (err) {
      console.error("Dashboard initialization error:", err);
      toast("Error loading dashboard data.", "error");
    }
  }

  // ==============================
  // SAVE PROFILE
  // ==============================

  async function submitProfile(e) {
    e.preventDefault();

    if (!currentUser) {
      toast("Session expired. Please sign in again.", "error");
      return;
    }

    const saveBtn = $("save-profile-btn");
    setLoading(saveBtn, true, "Saving changes...");

    const fullName = $("edit-name")?.value?.trim() || "";
    const bloodGroup = $("edit-blood")?.value?.trim() || "";
    const district = $("edit-district")?.value?.trim() || "";
    const area = $("edit-area")?.value?.trim() || null;
    const phone = $("edit-phone")?.value?.trim() || "";
    const lastDonation = $("edit-last")?.value || null;
    const available = $("edit-available")?.checked || false;
    const consent = $("edit-consent")?.checked || false;

    if (!fullName || !bloodGroup || !district || !phone) {
      setLoading(saveBtn, false);
      toast("Please fill in all required fields (Name, Blood Group, District, Phone).", "error");
      return;
    }

    if (!consent) {
      setLoading(saveBtn, false);
      toast("Please provide consent to appear in the protected network.", "error");
      return;
    }

    try {
      const targetAvatar = isAvatarRemoved ? null : currentAvatarUrl;

      // 1. Update user metadata in Supabase Auth
      try {
        await supabase.auth.updateUser({
          data: {
            avatar_url: targetAvatar,
            full_name: fullName
          }
        });
      } catch (authErr) {
        console.warn("Could not update auth metadata:", authErr);
      }

      // 2. Prepare payload for donor_profiles table
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
        avatar_url: targetAvatar
      };

      let { error } = await supabase
        .from("donor_profiles")
        .upsert(payload, {
          onConflict: "user_id"
        });

      if (error && (error.message?.includes("avatar_url") || error.details?.includes("avatar_url"))) {
        console.warn("avatar_url column not found in database table, updating without it.");
        delete payload.avatar_url;
        const retryResult = await supabase
          .from("donor_profiles")
          .upsert(payload, {
            onConflict: "user_id"
          });
        error = retryResult.error;
      }

      setLoading(saveBtn, false);

      if (error) {
        console.error("Profile save error:", error);
        toast(error.message || "Failed to save profile.", "error");
        return;
      }

      toast("Donor profile & picture saved successfully!", "success");
      updateLivePreview();
    } catch (err) {
      setLoading(saveBtn, false);
      console.error("Save profile exception:", err);
      toast(err.message || "An unexpected error occurred.", "error");
    }
  }

  // ==============================
  // SIGN OUT
  // ==============================

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      window.location.href = "index.html";
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = "index.html";
    }
  }

  // ==============================
  // CONNECT EVENT LISTENERS
  // ==============================

  function wireDashboard() {
    // Tab buttons
    $("tab-profile-btn")?.addEventListener("click", () => switchTab("profile"));
    $("tab-requests-btn")?.addEventListener("click", () => switchTab("requests"));
    $("switch-to-requests-btn")?.addEventListener("click", () => switchTab("requests"));

    // Profile form submission
    $("profile-edit-form")?.addEventListener("submit", submitProfile);

    // Live preview inputs
    ["edit-name", "edit-blood", "edit-district", "edit-area", "edit-phone", "edit-last"].forEach((id) => {
      const el = $(id);
      el?.addEventListener("input", updateLivePreview);
      el?.addEventListener("change", updateLivePreview);
    });

    $("edit-available")?.addEventListener("change", updateLivePreview);

    // Profile photo upload trigger
    const chooseAvatarBtn = $("choose-avatar-btn");
    const avatarInput = $("avatar-file-input");

    chooseAvatarBtn?.addEventListener("click", () => {
      avatarInput?.click();
    });

    avatarInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        toast("Processing photo...", "info");
        const compressedDataUrl = await processImageFile(file);
        currentAvatarUrl = compressedDataUrl;
        isAvatarRemoved = false;
        updateAvatarDisplay(currentAvatarUrl, $("edit-name")?.value);
        toast("Photo ready! Click 'Save profile changes' to persist.", "success");
      } catch (err) {
        console.error("Avatar process error:", err);
        toast(err.message || "Could not process photo.", "error");
      }
    });

    // Remove avatar button
    $("remove-avatar-btn")?.addEventListener("click", () => {
      currentAvatarUrl = null;
      isAvatarRemoved = true;
      if (avatarInput) avatarInput.value = "";
      updateAvatarDisplay(null, $("edit-name")?.value);
      toast("Photo removed. Remember to click 'Save profile changes'.", "info");
    });

    // Edit request modal events
    $("edit-request-form")?.addEventListener("submit", handleSaveEditedRequest);
    $("close-edit-request-btn")?.addEventListener("click", closeEditRequestModal);
    $("close-edit-modal-backdrop")?.addEventListener("click", closeEditRequestModal);
    $("cancel-edit-modal-btn")?.addEventListener("click", closeEditRequestModal);

    // Sign out button
    $("dash-signout-btn")?.addEventListener("click", handleSignOut);
  }

  // ==============================
  // INITIALIZE
  // ==============================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      wireDashboard();
      loadDashboard();
    }, { once: true });
  } else {
    wireDashboard();
    loadDashboard();
  }
})();
