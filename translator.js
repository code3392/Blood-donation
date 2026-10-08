/**
 * Lifeline Automated Global & Bangla Translator
 * Translates the entire website automatically with a single button click.
 * Zero manual effort required — walks the DOM and translates all text,
 * navigation menus, buttons, forms, cards, and dynamic content.
 */
(function () {
  "use strict";

  const UI_DICTIONARY = [
    // Top Bar & Header
    ["Menu", "মেনু"],
    ["Explore pages", "মেনু দেখুন"],
    ["Sign in", "সাইন ইন"],
    ["Sign out", "সাইন আউট"],
    ["Become a donor", "রক্তদাতা হন"],
    ["Become a Donor", "রক্তদাতা হন"],
    ["Request Blood Urgently", "জরুরি রক্তের অনুরোধ"],
    ["Request Blood", "রক্তের অনুরোধ"],
    ["Request blood", "রক্তের অনুরোধ"],
    ["Register / Sign In", "নিবন্ধন / সাইন ইন"],
    ["Register as a Donor", "রক্তদাতা হিসেবে নিবন্ধন করুন"],
    ["Back to Site", "মূল পাতায় ফিরুন"],
    ["Medical Knowledge", "মেডিকেল তথ্য"],
    ["Lifeline Portal", "লাইফলাইন পোর্টাল"],
    ["Emergency Request →", "জরুরি রক্তের অনুরোধ →"],
    ["Medical Knowledge Base:", "মেডিকেল নলেজ বেস:"],
    ["Understand blood diseases, transfusion frequencies, and scientific compatibility.", "রক্তের রোগ, রক্ত সঞ্চালন চক্র এবং বৈজ্ঞানিক সামঞ্জস্য জানুন।"],

    // Navigation Drawer Items
    ["Main emergency landing page", "প্রধান জরুরি পাতা"],
    ["Find Donors", "রক্তদাতা খুঁজুন"],
    ["Search verified voluntary donors", "যাচাইকৃত রক্তদাতা অনুসন্ধান"],
    ["Requested Blood", "রক্তের অনুরোধসমূহ"],
    ["View live open blood emergencies", "লাইভ জরুরি অনুরোধ দেখুন"],
    ["Post an urgent request with auto-matching", "স্বয়ংক্রিয় ম্যাচিং সুবিধা নিয়ে অনুরোধ প্রকাশ করুন"],
    ["Join our network of lifesaving donors", "জীবনরক্ষাকারী রক্তদাতা নেটওয়ার্কে যোগ দিন"],
    ["Disease Info & Medical Guide", "রোগের তথ্য ও মেডিকেল গাইড"],
    ["Scientific compatibility matrix & diseases", "রক্তের ম্যাচিং ছক ও রোগের গাইড"],
    ["How It Works", "যেভাবে কাজ করে"],
    ["Step-by-step coordination guide", "ধাপে ধাপে সমন্বয় নির্দেশিকা"],
    ["Dashboard & Messages", "ড্যাশবোর্ড ও মেসেজ"],
    ["Manage your profile & chat threads", "প্রোফাইল ও চ্যাট পরিচালনা"],
    ["Home", "হোম"],

    // Hero Section
    ["Built for fast, human connection", "দ্রুত ও মানবিক সংযোগের জন্য তৈরি"],
    ["One donation can become someone's", "এক ব্যাগ রক্ত হতে পারে কারও"],
    ["second chance.", "দ্বিতীয় জীবন।"],
    ["Lifeline helps people find willing blood donors, publish urgent requests, and coordinate lifesaving support worldwide — without the chaos.", "লাইফলাইন মানুষকে স্বেচ্ছায় রক্তদাতা খুঁজে পেতে, জরুরি অনুরোধ প্রকাশ করতে এবং বিশ্বজুড়ে জীবনরক্ষাকারী সহায়তা সমন্বয় করতে সাহায্য করে — কোনো বিশৃঙ্খলা ছাড়াই।"],
    ["Find a donor →", "রক্তদাতা খুঁজুন →"],
    ["Find a donor", "রক্তদাতা খুঁজুন"],
    ["I want to donate", "আমি রক্ত দিতে চাই"],
    ["Active Response Network", "সক্রিয় জরুরি নেটওয়ার্ক"],
    ["Voluntary Donors Registered", "নিবন্ধিত স্বেচ্ছাসেবী রক্তদাতা"],
    ["Verified Patient Recoveries", "সফল রক্তদান ও সুস্থতা"],
    ["Average Match Speed", "গড় ম্যাচিং গতি"],
    ["Minutes", "মিনিট"],
    ["Under 15 Mins", "১৫ মিনিটের মধ্যে"],

    // 6 Feature Portal Cards (index.html)
    ["Instant Donor Search", "তাৎক্ষণিক রক্তদাতা অনুসন্ধান"],
    ["Search active, verified blood donors worldwide by blood group and city with direct WhatsApp messaging.", "রক্তের গ্রুপ ও শহর অনুযায়ী বিশ্বজুড়ে যাচাইকৃত রক্তদাতা খুঁজুন সরাসরি হোয়াটসঅ্যাপ মেসেজের মাধ্যমে।"],
    ["Search Donors →", "রক্তদাতা অনুসন্ধান →"],
    ["Urgent Blood Request", "জরুরি রক্তের অনুরোধ"],
    ["Publish an emergency blood request with instant scientific auto-matching for nearby compatible donors.", "জরুরি রক্তের অনুরোধ প্রকাশ করুন এবং তাৎক্ষণিক বৈজ্ঞানিক অটো-ম্যাচিংয়ের মাধ্যমে উপযুক্ত রক্তদাতা খুঁজুন।"],
    ["Request Blood →", "রক্তের অনুরোধ →"],
    ["Live Emergency Feed", "লাইভ জরুরি রক্তের ফিড"],
    ["View real-time open transfusion requests across hospitals and step up to save a life today.", "হাসপাতালের রিয়েল-টাইম রক্তের অনুরোধগুলো দেখুন এবং জীবন বাঁচাতে এগিয়ে আসুন।"],
    ["View Requests →", "অনুরোধ তালিকা →"],
    ["Join as a Donor", "রক্তদাতা হিসেবে যোগ দিন"],
    ["Register your blood group, set your availability status, and become a lifeline in someone's critical hour.", "আপনার রক্তের গ্রুপ নিবন্ধন করুন, প্রাপ্যতা সেট করুন এবং কারও সংকটের মুহূর্তে সহায়ক হন।"],
    ["Register as a Donor →", "রক্তদাতা নিবন্ধন →"],
    ["Disease & Clinical Guide", "রোগের তথ্য ও ক্লিনিক্যাল গাইড"],
    ["Understand transfusion cycles, clinical management for Thalassemia, Dengue, and scientific compatibility.", "থ্যালাসেমিয়া, ডেঙ্গু সহ বিভিন্ন রোগের রক্ত সঞ্চালন চক্র ও বৈজ্ঞানিক তথ্য জানুন।"],
    ["Explore Guide →", "গাইড দেখুন →"],
    ["How Lifeline Operates", "লাইফলাইন কীভাবে কাজ করে"],
    ["A transparent 4-step walkthrough of how requests, donor matching, messaging, and donations succeed safely.", "অনুরোধ, রক্তদাতা ম্যাচিং ও নিরাপদ যোগাযোগের একটি স্বচ্ছ ৪-ধাপের প্রক্রিয়া।"],
    ["See Process →", "প্রক্রিয়া দেখুন →"],

    // How It Works Steps
    ["How Lifeline Works — Step-by-Step Coordination", "লাইফলাইন যেভাবে কাজ করে — ধাপে ধাপে সমন্বয়"],
    ["Four simple, transparent steps connecting urgent transfusion needs with willing voluntary donors worldwide.", "চারটি সহজ ও স্বচ্ছ ধাপ যা বিশ্বজুড়ে জরুরি রক্তের রোগীদের স্বেচ্ছাসেবী রক্তদাতাদের সাথে সংযুক্ত করে।"],
    ["Publish Request", "অনুরোধ প্রকাশ করুন"],
    ["Fill patient details, blood group, hospital location, and urgency in 30 seconds.", "রোগীর তথ্য, রক্তের গ্রুপ, হাসপাতাল এবং জরুরি স্তর ৩০ সেকেন্ডে পূরণ করুন।"],
    ["Auto-Match", "স্বয়ংক্রিয় ম্যাচিং"],
    ["Publish an emergency request to auto-find compatible donors using scientific compatibility standards.", "বৈজ্ঞানিক নিয়ম অনুসারে স্বয়ংক্রিয়ভাবে উপযুক্ত রক্তদাতাদের খুঁজে পান।"],
    ["Connect via WhatsApp", "সরাসরি যোগাযোগ"],
    ["Direct, private WhatsApp-style chat and file sharing to coordinate donation arrival safely.", "রক্তদানের সময় সমন্বয় করতে সরাসরি প্রাইভেট হোয়াটসঅ্যাপ চ্যাট ও প্রেসক্রিপশন শেয়ার করুন।"],
    ["Complete Donation", "রক্তদান সম্পন্ন"],
    ["Coordinate at the hospital blood bank with certified safety and verified recoveries.", "হাসপাতালের ব্লাড ব্যাংকে নিশ্চিত নিরাপত্তার সাথে সফলভাবে রক্তদান সম্পন্ন করুন।"],

    // Mission & Trust
    ["Trust, Speed, and Voluntary Compassion", "বিশ্বাস, গতি ও মানবিক সহানুভূতি"],
    ["Lifeline connects voluntary donors with patients during life-or-death emergencies across the globe. No middlemen, no confusion — just immediate scientific coordination.", "লাইফলাইন কোনো মধ্যস্বত্বভোগী বা বিশৃঙ্খলা ছাড়াই বিশ্বজুড়ে রোগীদের স্বেচ্ছাসেবী রক্তদাতাদের সাথে দ্রুত সংযুক্ত করে।"],
    ["WHO & Global Safe Blood Standards Compliant", "ডাব্লিউএইচও ও বৈশ্বিক নিরাপদ রক্ত সঞ্চালন মানসম্মত"],
    ["Strict Transfusion Safety Protocols", "কঠোর রক্ত সঞ্চালন নিরাপত্তা প্রোটোকল"],
    ["Zero Middlemen & 100% Free Service", "সম্পূর্ণ বিনামূল্যে ও মধ্যস্বত্বভোগী মুক্ত সেবা"],
    ["Direct Hospital Blood Bank Verification", "হাসপাতাল ব্লাড ব্যাংক দ্বারা সরাসরি যাচাই"],

    // Search Page & Donor Cards
    ["Find Blood Donors — Lifeline Humanitarian Network", "রক্তদাতা খুঁজুন — লাইফলাইন মানবিক নেটওয়ার্ক"],
    ["Find Blood Donors", "রক্তদাতা খুঁজুন"],
    ["Search verified voluntary blood donors worldwide. Filter by blood group and city or region with privacy-protected contact access.", "বিশ্বজুড়ে যাচাইকৃত স্বেচ্ছাসেবী রক্তদাতা খুঁজুন। রক্তের গ্রুপ এবং শহর অনুযায়ী ফিল্টার করুন।"],
    ["Select blood group", "রক্তের গ্রুপ নির্বাচন করুন"],
    ["All Blood Groups", "সব রক্তের গ্রুপ"],
    ["City / Country / Region", "শহর / দেশ / অঞ্চল"],
    ["Availability", "প্রাপ্যতা"],
    ["Available only", "শুধু প্রস্তুত রক্তদাতা"],
    ["All donors", "সকল রক্তদাতা"],
    ["Search Donors", "রক্তদাতা খুঁজুন"],
    ["Verified voluntary donors ready to help", "সাহায্যের জন্য প্রস্তুত যাচাইকৃত রক্তদাতা"],
    ["District", "জেলা / শহর"],
    ["Status", "অবস্থা"],
    ["Last donation", "সর্বশেষ রক্তদান"],
    ["Message", "মেসেজ"],
    ["Profile", "প্রোফাইল"],
    ["Verified", "যাচাইকৃত"],
    ["Registered", "নিবন্ধিত"],
    ["Available now", "এখন প্রস্তুত"],
    ["Currently unavailable", "বর্তমানে অনুপলব্ধ"],

    // Requests Page
    ["Active Blood Requests & Emergencies", "সক্রিয় রক্তের অনুরোধসমূহ"],
    ["Live urgent blood requests worldwide. Connect directly with patients and coordinate lifesaving donations.", "বিশ্বজুড়ে জরুরি রক্তের অনুরোধ। সরাসরি রোগীদের সাথে যোগাযোগ করে জীবন বাঁচাতে এগিয়ে আসুন।"],
    ["Live Urgent Requests", "লাইভ জরুরি অনুরোধসমূহ"],
    ["Emergency Transfusion Requests", "জরুরি রক্ত সঞ্চালনের অনুরোধ"],
    ["Units needed:", "প্রয়োজনীয় ব্যাগ:"],
    ["Hospital:", "হাসপাতাল:"],
    ["Urgency:", "জরুরি স্তর:"],
    ["Contact:", "যোগাযোগ:"],
    ["Critical", "সংকটজনক"],
    ["Urgent", "জরুরি"],
    ["Planned", "পূর্বনির্ধারিত"],

    // Request Blood Form
    ["Publish an urgent blood request and immediately auto-match compatible voluntary donors worldwide according to international transfusion standards.", "আন্তর্জাতিক রক্ত সঞ্চালন মান অনুসারে জরুরি রক্তের অনুরোধ প্রকাশ করুন এবং তাৎক্ষণিকভাবে রক্তদাতা খুঁজুন।"],
    ["Patient Full Name", "রোগীর পুরো নাম"],
    ["Units Needed", "প্রয়োজনীয় রক্তের ব্যাগ"],
    ["Hospital Name & Location", "হাসপাতালের নাম ও ঠিকানা"],
    ["Urgency Level", "জরুরি মাত্রা"],
    ["Contact Phone Number", "যোগাযোগের ফোন নম্বর"],
    ["Additional Medical Notes", "অতিরিক্ত মেডিকেল নোট"],
    ["Post Urgent Blood Request", "জরুরি রক্তের অনুরোধ প্রকাশ করুন"],

    // Disease Page
    ["Blood Disorders & Transfusion Guide", "রক্তের রোগ ও সঞ্চালন গাইড"],
    ["Clinical Understanding of Blood Disorders", "রক্তের রোগ সম্পর্কে ক্লিনিক্যাল ধারণা"],
    ["Accurate clinical knowledge on blood-related diseases, transfusion cycles, donor matching rules, and essential safety precautions for patients and families worldwide.", "রক্তের রোগ, সঞ্চালন চক্র, রক্তদাতা ম্যাচিং নিয়ম ও প্রয়োজনীয় সতর্কতা সম্পর্কে সঠিক ক্লিনিক্যাল জ্ঞান।"],
    ["STANDARDIZED MEDICAL COMPATIBILITY", "মানসম্মত মেডিকেল কম্প্যাটিবিলিটি"],
    ["Blood Group Compatibility Matrix: Who Can Give Blood to Whom", "রক্তের গ্রুপ ম্যাচিং ছক: কে কাকে রক্ত দিতে পারে"],
    ["This standardized scientific matrix determines blood transfusion compatibility. Click any recipient group below to highlight matching donor groups.", "এই বৈজ্ঞানিক ছক রক্ত সঞ্চালনের উপযুক্ততা নির্ধারণ করে। ম্যাচিং গ্রুপ দেখতে নিচের যেকোনো গ্রুপে ক্লিক করুন।"],
    ["Blood Group", "রক্তের গ্রুপ"],
    ["Donor ⟶", "দাতা ⟶"],
    ["Recipient ⟶", "গ্রহীতা ⟶"],
    ["Transfusion Cycle:", "সঞ্চালন চক্র:"],
    ["Product Required:", "প্রয়োজনীয় উপাদান:"],
    ["Key Precaution:", "প্রধান সতর্কতা:"],
    ["Compatibility:", "উপযুক্ততা:"],
    ["Doctor’s Guidance:", "চিকিৎসকের পরামর্শ:"],
    ["Request Blood for Thalassemia", "থ্যালাসেমিয়ার জন্য রক্তের অনুরোধ"],
    ["Request Blood for Anemia", "রক্তস্বল্পতার জন্য রক্তের অনুরোধ"],
    ["Request Platelets / Blood", "প্লাটিলেট / রক্তের অনুরোধ"],
    ["Find FFP / Blood Donors", "এফএফপি / রক্তদাতা খুঁজুন"],
    ["Request Urgent Platelets", "জরুরি প্লাটিলেটের অনুরোধ"],
    ["Publish Emergency Request", "জরুরি অনুরোধ পোস্ট করুন"],
    ["Thalassemia", "থ্যালাসেমিয়া"],
    ["Severe & Aplastic Anemia", "সিভিয়ার ও অ্যাপ্লাস্টিক অ্যানিমিয়া"],
    ["Leukemia & Blood Cancers", "লিউকেমিয়া ও ব্লাড ক্যান্সার"],
    ["Hemophilia & Bleeding Disorders", "হিমোফিলিয়া ও রক্তক্ষরণজনিত রোগ"],
    ["Dengue with Thrombocytopenia", "ডেঙ্গু ও প্লাটিলেট সংকট"],
    ["Sickle Cell Disease & Emergency Trauma", "সিকেল সেল ও জরুরি ট্রমা"],

    // Dashboard
    ["Donor Dashboard", "ডোনার ড্যাশবোর্ড"],
    ["Donor Profile & Photo", "ডোনার প্রোফাইল ও ছবি"],
    ["My Blood Requests", "আমার রক্তের অনুরোধ"],
    ["Messages", "মেসেজ"],
    ["Availability Status", "প্রাপ্যতা অবস্থা"],
    ["I am available to donate blood immediately", "আমি অবিলম্বে রক্ত দিতে প্রস্তুত"],
    ["Update Profile", "প্রোফাইল আপডেট করুন"],
    ["Send Message", "মেসেজ পাঠান"],
    ["Type a message...", "মেসেজ লিখুন..."],

    // Auth Modal
    ["Welcome to Lifeline", "লাইফলাইনে স্বাগতম"],
    ["Create your Lifeline account", "আপনার লাইফলাইন অ্যাকাউন্ট তৈরি করুন"],
    ["Sign in to search donor profiles and manage your availability.", "রক্তদাতা প্রোফাইল খুঁজতে ও প্রাপ্যতা নিয়ন্ত্রণ করতে সাইন ইন করুন।"],
    ["Create an account to safely access the donor network.", "রক্তদাতা নেটওয়ার্কে প্রবেশ করতে অ্যাকাউন্ট তৈরি করুন।"],
    ["Email", "ইমেইল"],
    ["Password", "পাসওয়ার্ড"],
    ["Confirm Password", "পাসওয়ার্ড নিশ্চিত করুন"],
    ["Create account", "অ্যাকাউন্ট তৈরি করুন"],
    ["New here? Create an account", "নতুন? একটি অ্যাকাউন্ট তৈরি করুন"],
    ["Already have an account? Sign in", "ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন করুন"],
    ["PROTECTED NETWORK", "সুরক্ষিত নেটওয়ার্ক"],

    // Footer
    ["Emergency Services", "জরুরি সেবাসমূহ"],
    ["Find Donors Worldwide", "বিশ্বজুড়ে রক্তদাতা খুঁজুন"],
    ["Post Blood Request", "রক্তের অনুরোধ পোস্ট করুন"],
    ["Active Requests Feed", "সক্রিয় রক্তের অনুরোধসমূহ"],
    ["Become a Lifeline Donor", "লাইফলাইন রক্তদাতা হন"],
    ["Medical Resources", "মেডিকেল তথ্যভাণ্ডার"],
    ["Blood Compatibility Matrix", "রক্তের গ্রুপ ম্যাচিং ছক"],
    ["Disease & Transfusion Guide", "রোগ ও রক্ত সঞ্চালন গাইড"],
    ["WHO Blood Safety Standards", "ডাব্লিউএইচও রক্ত নিরাপত্তা নির্দেশিকা"],
    ["Platform & Legal", "প্ল্যাটফর্ম ও আইনি তথ্য"],
    ["Terms of Service", "ব্যবহারের শর্তাবলী"],
    ["Privacy Policy", "গোপনীয়তা নীতি"],
    ["Cookie Preferences", "কুকি পছন্দসমূহ"],
    ["All rights reserved.", "সর্বস্বত্ব সংরক্ষিত।"],
    ["Built for humanitarian emergency blood coordination.", "মানবিক জরুরি রক্ত সমন্বয়ের জন্য তৈরি।"],
    ["Blood. Hope. Together.", "রক্ত। আশা। একতা।"]
  ];

  // Cache of original English text for reversible translation
  const originalNodeTexts = new WeakMap();

  function translateNode(node, lang) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (!text || !text.trim()) return;

      if (!originalNodeTexts.has(node)) {
        originalNodeTexts.set(node, text);
      }

      const original = originalNodeTexts.get(node);

      if (lang === "en") {
        node.nodeValue = original;
        return;
      }

      let translated = original;
      for (let i = 0; i < UI_DICTIONARY.length; i++) {
        const en = UI_DICTIONARY[i][0];
        const bn = UI_DICTIONARY[i][1];
        if (translated.includes(en)) {
          translated = translated.split(en).join(bn);
        }
      }
      node.nodeValue = translated;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node.tagName || "").toLowerCase();
      if (tag === "script" || tag === "style" || tag === "canvas" || tag === "svg") return;
      if (node.classList && node.classList.contains("language-toggle")) return;

      // Handle placeholder attributes
      if (node.placeholder) {
        if (!node.dataset.origPlaceholder) {
          node.dataset.origPlaceholder = node.placeholder;
        }
        if (lang === "en") {
          node.placeholder = node.dataset.origPlaceholder;
        } else {
          let p = node.dataset.origPlaceholder;
          for (let i = 0; i < UI_DICTIONARY.length; i++) {
            const en = UI_DICTIONARY[i][0];
            const bn = UI_DICTIONARY[i][1];
            if (p.includes(en)) {
              p = p.split(en).join(bn);
            }
          }
          node.placeholder = p;
        }
      }

      for (let i = 0; i < node.childNodes.length; i++) {
        translateNode(node.childNodes[i], lang);
      }
    }
  }

  function setPageLanguage(lang) {
    const targetLang = lang === "bn" ? "bn" : "en";
    localStorage.setItem("lifeline-language", targetLang);
    document.documentElement.lang = targetLang;

    // Update all toggle buttons
    document.querySelectorAll(".language-toggle, #language-toggle").forEach(btn => {
      btn.textContent = targetLang === "en" ? "বাংলা" : "English";
    });

    // Translate DOM
    if (document.body) {
      translateNode(document.body, targetLang);
    }

    // Update Google Translate cookies if present
    document.cookie = "googtrans=" + (targetLang === "bn" ? "/en/bn" : "/en/en") + "; path=/;";
    try {
      const select = document.querySelector(".goog-te-combo");
      if (select && select.value !== targetLang) {
        select.value = targetLang;
        select.dispatchEvent(new Event("change"));
      }
    } catch (e) {}
  }

  function toggleLanguage() {
    const current = localStorage.getItem("lifeline-language") || "en";
    setPageLanguage(current === "en" ? "bn" : "en");
  }

  // Expose global API
  window.LifelineTranslator = {
    setLanguage: setPageLanguage,
    toggle: toggleLanguage,
    getLanguage: function () {
      return localStorage.getItem("lifeline-language") || "en";
    }
  };

  function initTranslator() {
    const initialLang = localStorage.getItem("lifeline-language") || "en";

    // Wire click events on all language toggle buttons
    document.querySelectorAll(".language-toggle, #language-toggle").forEach(btn => {
      btn.removeEventListener("click", toggleLanguage);
      // btn.addEventListener("click", toggleLanguage); // Handled by app.js
    });

    // Apply saved language immediately
    if (initialLang === "bn") {
      setPageLanguage("bn");
    } else {
      setPageLanguage("en");
    }

    // Observe dynamic elements (e.g. search results, live blood requests)
    if (window.MutationObserver && document.body) {
      const observer = new MutationObserver(mutations => {
        const lang = localStorage.getItem("lifeline-language") || "en";
        if (lang !== "bn") return;
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              translateNode(node, "bn");
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTranslator);
  } else {
    initTranslator();
  }
})();
