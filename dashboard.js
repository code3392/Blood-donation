(() => {
  // Prevent duplicate script execution
  if (window.__lifelineDashboardLoaded) return;
  window.__lifelineDashboardLoaded = true;

  // ==============================
  // SUPABASE CONFIGURATION
  // ==============================

  const supabase_URL = "https://heflnehkwmqsetqkiqgv.supabase.co";
  const supabase_PUBLISHABLE_KEY = "sb_publishable_Ncu8yv6R1hOh8_1Z3j9Mrg_xSJrf6hd";

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
  let detectedLocation = null;
  let currentLanguage = localStorage.getItem("lifeline-language") || "en";

  // WhatsApp Web Dashboard State
  let activeChatPartner = null;
  let dashboardChatPolling = null;
  let dashCurrentAttachment = null;
  let conversationThreads = [];

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

  function safePhone(value = "") {
    return String(value)
      .trim()
      .replace(/[^\d+()\-\s]/g, "");
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
  // LANGUAGE & ASSISTANT
  // ==============================

  function applyLanguage(language = currentLanguage) {
    currentLanguage = language === "bn" ? "bn" : "en";
    localStorage.setItem("lifeline-language", currentLanguage);
    document.documentElement.lang = currentLanguage === "bn" ? "bn" : "en";
    const toggle = $("language-toggle");
    if (toggle) toggle.textContent = currentLanguage === "en" ? "🌐 বাংলা" : "🌐 English";
    const copy = currentLanguage === "bn"
      ? { dashboardTitle: "ডোনার ড্যাশবোর্ড", profileTab: "👤 ডোনার প্রোফাইল ও ছবি", requestsTab: "🩸 আমার রক্তের অনুরোধ", messagesTab: "💬 মেসেজ" }
      : { dashboardTitle: "Donor Dashboard", profileTab: "👤 Donor Profile & Photo", requestsTab: "🩸 My Blood Requests", messagesTab: "💬 Messages" };
    Object.entries(copy).forEach(([key, value]) => {
      document.querySelectorAll(`[data-i18n="${key}"]`).forEach((el) => {
        el.textContent = value;
      });
    });
    if (window.LifelineTranslator) {
      window.LifelineTranslator.setLanguage(currentLanguage);
    }
  }

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
      const messages = $("assistant-messages");
      if (!question || !messages) return;
      const user = document.createElement("div");
      user.className = "assistant-bubble user";
      user.textContent = question;
      const reply = document.createElement("div");
      reply.className = "assistant-bubble assistant";
      reply.textContent = assistantReply(question);
      messages.append(user, reply);
      messages.scrollTop = messages.scrollHeight;
      if (input) input.value = "";
    });
  }

  // ==============================
  // APPROXIMATE PROFILE LOCATION
  // ==============================

  function detectProfileLocation() {
    const status = $("profile-location-status");
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
          if (district && $("edit-district")) $("edit-district").value = district;
          if (area && $("edit-area")) $("edit-area").value = area;
          if (status) status.textContent = `Location detected: ${district || "nearby area"} (approx. ${detectedLocation.accuracy}m).`;
          updateLivePreview();
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
          const maxDim = 400;
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
      if (previewBox) previewBox.innerHTML = `<img src="${avatarUrl}" alt="Avatar preview" />`;
      if (cardAvatar) cardAvatar.innerHTML = `<img src="${avatarUrl}" alt="Card avatar" />`;
      if (removeBtn) removeBtn.style.display = "inline-flex";
    } else {
      const userInitials = initials(donorName);
      if (previewBox) previewBox.innerHTML = `<span id="avatar-initials-fallback">${userInitials}</span>`;
      if (cardAvatar) cardAvatar.innerHTML = userInitials;
      if (removeBtn) removeBtn.style.display = "none";
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

    if ($("preview-card-name")) $("preview-card-name").textContent = name;
    if ($("preview-card-location")) {
      $("preview-card-location").textContent = [area, district].filter(Boolean).join(" · ") || "Worldwide";
    }
    if ($("preview-card-blood")) $("preview-card-blood").textContent = blood;
    if ($("preview-card-district")) $("preview-card-district").textContent = district;
    if ($("preview-card-last")) $("preview-card-last").textContent = formatDate(lastDate);

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
    const tabMessagesBtn = $("tab-messages-btn");
    const profileContent = $("profile-tab-content");
    const requestsContent = $("requests-tab-content");
    const messagesContent = $("messages-tab-content");

    if (tabName === "requests") {
      tabProfileBtn?.classList.remove("active");
      tabRequestsBtn?.classList.add("active");
      tabMessagesBtn?.classList.remove("active");
      profileContent?.classList.add("hidden");
      requestsContent?.classList.remove("hidden");
      messagesContent?.classList.add("hidden");
      loadUserRequests();
      if (dashboardChatPolling) clearInterval(dashboardChatPolling);
    } else if (tabName === "messages") {
      tabProfileBtn?.classList.remove("active");
      tabRequestsBtn?.classList.remove("active");
      tabMessagesBtn?.classList.add("active");
      profileContent?.classList.add("hidden");
      requestsContent?.classList.add("hidden");
      messagesContent?.classList.remove("hidden");
      loadWhatsAppDashboard();
      if (dashboardChatPolling) clearInterval(dashboardChatPolling);
      dashboardChatPolling = setInterval(pollActiveChat, 2500);
    } else {
      tabRequestsBtn?.classList.remove("active");
      tabMessagesBtn?.classList.remove("active");
      tabProfileBtn?.classList.add("active");
      requestsContent?.classList.add("hidden");
      messagesContent?.classList.add("hidden");
      profileContent?.classList.remove("hidden");
      if (dashboardChatPolling) clearInterval(dashboardChatPolling);
    }
  }

  // ============================================================
  // 1. WHATSAPP WEB MESSENGER FOR DASHBOARD (REQ 1)
  // ============================================================

  async function loadWhatsAppDashboard() {
    if (!currentUser) return;
    const threadsList = $("wa-threads-list");
    const badge = $("messages-count-badge");
    const activeBadge = $("wa-active-count-badge");

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        if (threadsList) {
          threadsList.innerHTML = `
            <div style="padding:24px 16px; text-align:center; color:#ef4444; font-size:12px;">
              <div>✉</div>
              <p>Run the updated Supabase SQL migration to activate WhatsApp messaging.</p>
            </div>
          `;
        }
        return;
      }

      const allMessages = data || [];
      const partnersMap = new Map();

      allMessages.forEach((msg) => {
        const partnerId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
        if (!partnersMap.has(partnerId)) {
          partnersMap.set(partnerId, {
            partnerId,
            lastMessage: msg,
            unreadCount: (!msg.read_at && msg.recipient_id === currentUser.id) ? 1 : 0
          });
        }
      });

      conversationThreads = Array.from(partnersMap.values());

      if (badge) badge.textContent = conversationThreads.reduce((acc, t) => acc + t.unreadCount, 0);
      if (activeBadge) activeBadge.textContent = conversationThreads.length;

      if (!conversationThreads.length) {
        if (threadsList) {
          threadsList.innerHTML = `
            <div style="padding:40px 16px; text-align:center; color:#667781; font-size:12px;">
              <div>💬</div>
              <strong>No conversations yet</strong>
              <p style="margin:4px 0 0; font-size:11px;">When you message a donor or requester, your chat appears here.</p>
            </div>
          `;
        }
        return;
      }

      // Fetch donor profile names for partners
      const partnerIds = conversationThreads.map((t) => t.partnerId);
      const { data: profiles } = await supabase
        .from("donor_profiles")
        .select("user_id, full_name, blood_group, phone, avatar_url")
        .in("user_id", partnerIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      conversationThreads.forEach((t) => {
        t.profile = profileMap.get(t.partnerId) || {
          full_name: "Donor Contact",
          blood_group: "✚",
          phone: null
        };
      });

      renderWhatsAppThreads(conversationThreads);

      // Auto-select first thread if none active
      if (!activeChatPartner && conversationThreads.length > 0) {
        selectChatPartner(conversationThreads[0]);
      }
    } catch (err) {
      console.warn("WhatsApp dashboard load error:", err);
    }
  }

  function renderWhatsAppThreads(threads) {
    const list = $("wa-threads-list");
    if (!list) return;

    list.innerHTML = threads
      .map((t) => {
        const name = t.profile.full_name || "Donor Contact";
        let snippet = t.lastMessage.body || "";
        if (snippet.startsWith("{") && snippet.includes('"attachment":')) {
          snippet = "📎 [Document / Photo Attached]";
        }
        const isSelected = activeChatPartner && activeChatPartner.partnerId === t.partnerId;

        return `
          <div class="wa-thread-item ${isSelected ? "active" : ""}" data-partner-id="${escapeHtml(t.partnerId)}">
            <div class="wa-avatar" style="width:38px; height:38px; font-size:13px;">
              ${
                t.profile.avatar_url
                  ? `<img src="${escapeHtml(t.profile.avatar_url)}" alt="${escapeHtml(name)}" />`
                  : escapeHtml(initials(name))
              }
            </div>
            <div class="wa-thread-details">
              <div class="wa-thread-top">
                <strong>${escapeHtml(name)} (${escapeHtml(t.profile.blood_group || "✚")})</strong>
                <small>${formatTime(t.lastMessage.created_at)}</small>
              </div>
              <div class="wa-thread-snippet">${escapeHtml(snippet)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll(".wa-thread-item").forEach((item) => {
      item.addEventListener("click", () => {
        const pId = item.dataset.partnerId;
        const thread = threads.find((t) => t.partnerId === pId);
        if (thread) selectChatPartner(thread);
      });
    });
  }

  async function selectChatPartner(thread) {
    activeChatPartner = thread;
    $$(".wa-thread-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.partnerId === thread.partnerId);
    });

    const name = thread.profile.full_name || "Donor Contact";
    if ($("dash-wa-contact-name")) {
      $("dash-wa-contact-name").textContent = `${name} (${thread.profile.blood_group || "Blood Network"})`;
    }
    if ($("dash-wa-avatar")) $("dash-wa-avatar").textContent = initials(name);

    const callBtn = $("dash-wa-call-btn");
    if (callBtn) {
      if (thread.profile.phone) {
        callBtn.href = `tel:${safePhone(thread.profile.phone)}`;
        callBtn.style.display = "inline-grid";
      } else {
        callBtn.style.display = "none";
      }
    }

    clearDashAttachmentStaging();
    await loadActiveChatMessages();
  }

  async function loadActiveChatMessages() {
    if (!currentUser || !activeChatPartner) return;
    const container = $("dash-wa-messages-container");
    if (!container) return;

    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeChatPartner.partnerId}),and(sender_id.eq.${activeChatPartner.partnerId},recipient_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true })
        .limit(60);

      renderDashChatMessages(data || []);
    } catch (e) {}
  }

  async function pollActiveChat() {
    if (activeChatPartner && $("messages-tab-content") && !$("messages-tab-content").classList.contains("hidden")) {
      await loadActiveChatMessages();
    }
  }

  function renderDashChatMessages(messages) {
    const container = $("dash-wa-messages-container");
    if (!container) return;

    if (!messages.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#667781; font-size:12px;">
          <div>💬</div>
          <p>No messages yet. Send a message or attach a prescription below.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages
      .map((msg) => {
        const isOutgoing = msg.sender_id === currentUser.id;
        let textContent = msg.body || "";
        let attachment = null;

        if (textContent.startsWith("{") && textContent.includes('"attachment":')) {
          try {
            const parsed = JSON.parse(textContent);
            textContent = parsed.text || "";
            attachment = parsed.attachment || null;
          } catch (e) {}
        }

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
                    <strong>${escapeHtml(attachment.name || "Document.pdf")}</strong>
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

    const body = $("dash-wa-chat-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  function clearDashAttachmentStaging() {
    dashCurrentAttachment = null;
    const staging = $("dash-wa-attachment-staging");
    if (staging) staging.style.display = "none";
    const fileInput = $("dash-wa-file-input");
    if (fileInput) fileInput.value = "";
  }

  async function handleSendDashWhatsAppMessage(e) {
    e.preventDefault();
    if (!currentUser || !activeChatPartner) return;

    const input = $("dash-wa-input");
    const text = input?.value?.trim() || "";

    if (!text && !dashCurrentAttachment) {
      toast("Please enter a message or attach a file.", "info");
      return;
    }

    const sendBtn = $("dash-wa-send-btn");
    if (sendBtn) sendBtn.disabled = true;

    const payload = {
      sender_id: currentUser.id,
      recipient_id: activeChatPartner.partnerId,
      body: dashCurrentAttachment ? JSON.stringify({ text, attachment: dashCurrentAttachment }) : text
    };

    if (dashCurrentAttachment) {
      payload.attachment_url = dashCurrentAttachment.url;
      payload.attachment_name = dashCurrentAttachment.name;
      payload.attachment_type = dashCurrentAttachment.type;
      payload.attachment_size = dashCurrentAttachment.size;
    }

    let { error } = await supabase.from("messages").insert(payload);

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
      console.error("Dashboard message send error:", error);
      toast("Could not deliver message.", "error");
      return;
    }

    if (input) input.value = "";
    clearDashAttachmentStaging();
    toast("Delivered via WhatsApp network.", "success");
    await loadActiveChatMessages();
  }

  function handleDashFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast("File size should be under 5MB.", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      dashCurrentAttachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: e.target.result
      };

      const staging = $("dash-wa-attachment-staging");
      const nameEl = $("dash-wa-staging-name");
      const sizeEl = $("dash-wa-staging-size");
      const thumbEl = $("dash-wa-staging-thumb");
      const iconEl = $("dash-wa-staging-icon");

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

    reader.readAsDataURL(file);
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

      const activeCount = userRequests.filter((r) => r.status === "open").length;
      if (badge) badge.textContent = activeCount;
      if (infoCount) infoCount.textContent = `${activeCount} active (${userRequests.length} total)`;

      if (userRequests.length === 0) {
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

          <button type="button" class="btn btn-ghost delete-req-btn" style="font-size:12px; padding:8px 14px; color:#9ca3af;" title="Permanently delete request">
            🗑️ Delete
          </button>
        </div>
      `;

      card.querySelector(".edit-req-btn")?.addEventListener("click", () => openEditRequestModal(req));
      card.querySelector(".fulfill-req-btn")?.addEventListener("click", () => updateRequestStatus(req.id, "fulfilled", "Mark this request as fulfilled?"));
      card.querySelector(".cancel-req-btn")?.addEventListener("click", () => updateRequestStatus(req.id, "cancelled", "Are you sure you want to cancel this request?"));
      card.querySelector(".reopen-req-btn")?.addEventListener("click", () => updateRequestStatus(req.id, "open", "Re-open this blood request?"));
      card.querySelector(".delete-req-btn")?.addEventListener("click", () => deleteRequest(req.id));

      listContainer.appendChild(card);
    });
  }

  async function deleteRequest(requestId) {
    if (!confirm("Are you sure you want to permanently delete this blood request?")) return;

    try {
      const { error } = await supabase
        .from("blood_requests")
        .delete()
        .eq("id", requestId)
        .eq("requester_id", currentUser.id);

      if (error) {
        toast(error.message || "Failed to delete request.", "error");
        return;
      }

      toast("Blood request deleted permanently.", "info");
      await loadUserRequests();
    } catch (err) {
      toast("Error deleting request.", "error");
    }
  }

  async function updateRequestStatus(requestId, newStatus, confirmMessage) {
    if (confirmMessage && !confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ status: newStatus })
        .eq("id", requestId)
        .eq("requester_id", currentUser.id);

      if (error) {
        toast(error.message || "Failed to update status.", "error");
        return;
      }

      toast("Status updated.", "success");
      await loadUserRequests();
    } catch (err) {
      toast("Error updating status.", "error");
    }
  }

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
        toast(error.message || "Failed to update blood request.", "error");
        return;
      }

      toast("Blood request updated successfully!", "success");
      closeEditRequestModal();
      await loadUserRequests();
    } catch (err) {
      setLoading(saveBtn, false);
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
        toast("Please sign in to access your dashboard.", "info");
        setTimeout(() => {
          window.location.href = "index.html?auth=1";
        }, 800);
        return;
      }

      currentUser = data.session.user;

      if ($("header-user-email")) $("header-user-email").textContent = currentUser.email;
      if ($("info-account-email")) $("info-account-email").textContent = currentUser.email;

      if (currentUser.user_metadata?.avatar_url) {
        currentAvatarUrl = currentUser.user_metadata.avatar_url;
      }

      const { data: profile } = await supabase
        .from("donor_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

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

        if (profile.avatar_url) currentAvatarUrl = profile.avatar_url;

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
      toast("Please fill in required fields (Name, Blood Group, District, Phone).", "error");
      return;
    }

    if (!consent) {
      setLoading(saveBtn, false);
      toast("Please provide consent to appear in the protected network.", "error");
      return;
    }

    try {
      const targetAvatar = isAvatarRemoved ? null : currentAvatarUrl;

      try {
        await supabase.auth.updateUser({
          data: { avatar_url: targetAvatar, full_name: fullName }
        });
      } catch (authErr) {}

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
        avatar_url: targetAvatar,
        ...(detectedLocation
          ? {
              location_lat: detectedLocation.lat,
              location_lng: detectedLocation.lng,
              location_accuracy: detectedLocation.accuracy
            }
          : {})
      };

      let { error } = await supabase.from("donor_profiles").upsert(payload, { onConflict: "user_id" });

      if (error && (error.message?.includes("avatar_url") || error.details?.includes("avatar_url"))) {
        delete payload.avatar_url;
        const retryResult = await supabase.from("donor_profiles").upsert(payload, { onConflict: "user_id" });
        error = retryResult.error;
      }

      if (error && /location_(lat|lng|accuracy)|column/i.test(error.message || "")) {
        delete payload.location_lat;
        delete payload.location_lng;
        delete payload.location_accuracy;
        const retryResult = await supabase.from("donor_profiles").upsert(payload, { onConflict: "user_id" });
        error = retryResult.error;
      }

      setLoading(saveBtn, false);

      if (error) {
        toast(error.message || "Failed to save profile.", "error");
        return;
      }

      toast("Donor profile & picture saved successfully!", "success");
      detectedLocation = null;
      updateLivePreview();
    } catch (err) {
      setLoading(saveBtn, false);
      toast(err.message || "An unexpected error occurred.", "error");
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      window.location.href = "index.html";
    } catch (err) {
      window.location.href = "index.html";
    }
  }

  // ==============================
  // WIRE DASHBOARD
  // ==============================

  function wireDashboard() {
    $("tab-profile-btn")?.addEventListener("click", () => switchTab("profile"));
    $("tab-requests-btn")?.addEventListener("click", () => switchTab("requests"));
    $("tab-messages-btn")?.addEventListener("click", () => switchTab("messages"));
    $("switch-to-requests-btn")?.addEventListener("click", () => switchTab("requests"));
    $("detect-profile-location")?.addEventListener("click", detectProfileLocation);

    $("language-toggle")?.addEventListener("click", () => {
      applyLanguage(currentLanguage === "en" ? "bn" : "en");
    });
    wireAssistant();
    applyLanguage();

    $("profile-edit-form")?.addEventListener("submit", submitProfile);

    ["edit-name", "edit-blood", "edit-district", "edit-area", "edit-phone", "edit-last"].forEach((id) => {
      const el = $(id);
      el?.addEventListener("input", updateLivePreview);
      el?.addEventListener("change", updateLivePreview);
    });

    $("edit-available")?.addEventListener("change", updateLivePreview);

    // Profile photo upload trigger
    const chooseAvatarBtn = $("choose-avatar-btn");
    const avatarInput = $("avatar-file-input");

    chooseAvatarBtn?.addEventListener("click", () => avatarInput?.click());

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
        toast(err.message || "Could not process photo.", "error");
      }
    });

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

    // WhatsApp Dashboard Events
    $("dash-wa-chat-form")?.addEventListener("submit", handleSendDashWhatsAppMessage);
    $("dash-wa-attach-btn")?.addEventListener("click", () => $("dash-wa-file-input")?.click());
    $("dash-wa-file-input")?.addEventListener("change", handleDashFileSelect);
    $("dash-wa-remove-file")?.addEventListener("click", clearDashAttachmentStaging);

    // Filter conversations
    $("wa-search-contacts")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = conversationThreads.filter((t) => {
        const name = (t.profile.full_name || "").toLowerCase();
        const blood = (t.profile.blood_group || "").toLowerCase();
        return name.includes(q) || blood.includes(q);
      });
      renderWhatsAppThreads(filtered);
    });

    // Sign out button
    $("dash-signout-btn")?.addEventListener("click", handleSignOut);

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

    const CELL_COUNT = Math.max(14, Math.min(28, Math.floor(window.innerWidth / 50)));
    const PARTICLE_COUNT = Math.max(16, Math.min(32, Math.floor(window.innerWidth / 45)));
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
  // INITIALIZE
  // ==============================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initAmbientCanvas();
      wireDashboard();
      loadDashboard();
    }, { once: true });
  } else {
    initAmbientCanvas();
    wireDashboard();
    loadDashboard();
  }
})();
