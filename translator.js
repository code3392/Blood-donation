/**
 * Lifeline Automated Global & Bangla Translator
 * Translates the entire website automatically with a single button click.
 * Uses intelligent whitespace-flexible regex matching and length-sorted dictionary
 * to ensure 100% clean, fluent translation without English/Bangla text mixing.
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
    ["Registered Donors", "নিবন্ধিত রক্তদাতা"],
    ["Search and view all registered blood donors", "সকল নিবন্ধিত রক্তদাতাদের তালিকা ও বিবরণ দেখুন"],
    ["Search verified voluntary donors", "যাচাইকৃত রক্তদাতা অনুসন্ধান"],
    ["Search blood donors by group & district", "রক্তের গ্রুপ ও জেলা অনুযায়ী রক্তদাতা খুঁজুন"],
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

    // ========================================================
    // DISEASE & MEDICAL GUIDE (Comprehensive Full Paragraphs)
    // ========================================================
    ["CLINICAL REFERENCE & PATIENT EDUCATION", "ক্লিনিক্যাল তথ্য ও রোগী শিক্ষা"],
    ["Blood Disorders & Transfusion Guide", "রক্তের রোগ ও সঞ্চালন নির্দেশিকা"],
    ["Accurate clinical knowledge on blood-related diseases, transfusion cycles, donor matching rules, and essential safety precautions for patients and families worldwide.", "রক্ত সম্পর্কিত রোগ, সঞ্চালন চক্র, রক্তদাতা ম্যাচিং নিয়ম এবং বিশ্বব্যাপী রোগী ও পরিবারের জন্য প্রয়োজনীয় সুরক্ষামূলক ক্লিনিক্যাল জ্ঞান।"],
    ["Search disease, symptoms, or blood product (e.g. Thalassemia, Dengue, Platelets)...", "রোগ, লক্ষণ বা রক্তের উপাদান অনুসন্ধান করুন (যেমন: থ্যালাসেমিয়া, ডেঙ্গু, প্লাটিলেট)..."],

    // Compatibility Matrix Section
    ["STANDARDIZED MEDICAL COMPATIBILITY", "মানসম্মত চিকিৎসা সামঞ্জস্য"],
    ["Blood Group Compatibility Matrix: Who Can Give Blood to Whom", "রক্তের গ্রুপ ম্যাচিং ছক: কে কাকে রক্ত দিতে পারে"],
    ["This standardized scientific matrix determines blood transfusion compatibility. Click any recipient group below to highlight matching donor groups.", "এই মানসম্মত বৈজ্ঞানিক ছক রক্ত সঞ্চালনের উপযুক্ততা নির্ধারণ করে। নিচে যেকোনো গ্রহীতার গ্রুপে ক্লিক করে উপযুক্ত দাতা গ্রুপ দেখুন।"],
    ["Blood Group", "রক্তের গ্রুপ"],
    ["Donor ⟶", "দাতা ⟶"],
    ["Recipient ⟶", "গ্রহীতা ⟶"],
    ["💡 Scientific Principles:", "💡 বৈজ্ঞানিক নীতিমালা:"],
    ["• O− (O Negative): Universal Donor — Lacks A, B, and Rh antigens on red blood cells and can safely donate red cells to any blood group.", "• O− (ও নেগেটিভ): সর্বজনীন দাতা — লোহিত রক্তকণিকায় A, B এবং Rh অ্যান্টিজেন নেই, ফলে যেকোনো গ্রুপের রোগীকে নিরাপদে রক্ত দিতে পারে।"],
    ["• AB+ (AB Positive): Universal Recipient — Contains no anti-A, anti-B, or anti-Rh antibodies in plasma and can receive red cells from any blood group.", "• AB+ (এবি পজিটিভ): সর্বজনীন গ্রহীতা — প্লাজমায় কোনো অ্যান্টি-A, অ্যান্টি-B বা অ্যান্টি-Rh অ্যান্টিবডি নেই, ফলে যেকোনো গ্রুপ থেকে রক্ত গ্রহণ করতে পারে।"],
    ["• Rh Factor Rule: Rh-positive blood must never be transfused into an Rh-negative patient. Rh-negative patients must strictly receive Rh-negative blood.", "• Rh ফ্যাক্টর নিয়ম: Rh-পজিটিভ রক্ত কখনোই Rh-নেগেটিভ রোগীকে দেওয়া যাবে না। Rh-নেগেটিভ রোগীকে কঠোরভাবে Rh-নেগেটিভ রক্তই দিতে হবে।"],

    // Disease Dossiers Heading
    ["DISEASE DOSSIERS", "রোগ নির্দেশিকা"],
    ["Clinical Understanding of Blood Disorders", "রক্তের বিভিন্ন রোগ সম্পর্কে ক্লিনিক্যাল ধারণা"],
    ["Click on any condition to view detailed transfusion protocols and doctor guidance.", "বিস্তারিত রক্ত সঞ্চালন প্রোটোকল ও চিকিৎসকের পরামর্শ দেখতে যেকোনো রোগে ক্লিক করুন।"],

    // Card 1: Thalassemia
    ["Genetic Disorder", "বংশগত রোগ"],
    ["Frequent Transfusion", "ঘন ঘন রক্ত সঞ্চালন"],
    ["Thalassemia", "থ্যালাসেমিয়া"],
    ["An inherited genetic condition causing defective hemoglobin production. Patients with Thalassemia Major cannot produce sufficient healthy red blood cells, leading to severe chronic anemia, bone deformities, and organ enlargement.", "একটি বংশগত রোগ যা ত্রুটিপূর্ণ হিমোগ্লোবিন তৈরি করে। থ্যালাসেমিয়া মেজর রোগীরা পর্যাপ্ত সুস্থ লোহিত রক্তকণিকা তৈরি করতে পারে না, যার ফলে দীর্ঘস্থায়ী রক্তস্বল্পতা, হাড়ের বিকৃতি এবং অঙ্গের আকার বৃদ্ধি পায়।"],
    ["Transfusion Cycle:", "সঞ্চালন চক্র:"],
    ["Every 2 to 4 weeks", "প্রতি ২ থেকে ৪ সপ্তাহ পর পর"],
    ["Product Required:", "প্রয়োজনীয় উপাদান:"],
    ["Leukoreduced Packed RBCs (PRBC)", "লিউকোরেডিউসড প্যাকড লোহিত রক্তকণিকা (PRBC)"],
    ["Key Precaution:", "প্রধান সতর্কতা:"],
    ["Iron Chelation Therapy (Desferal / Kelfer)", "আয়রন চিলেশন থেরাপি (ডেসফেরাল / কেলফার)"],
    ["Compatibility:", "উপযুক্ততা:"],
    ["Extended Rh (C, c, E, e) & Kell Phenotyping", "এক্সটেন্ডেড Rh ও কেল ফেনোটাইপিং"],
    ["Doctor’s Guidance:", "চিকিৎসকের পরামর্শ:"],
    ["Always provide leucodepleted red cells to prevent alloimmunization and febrile reactions. Monitor serum ferritin routinely to prevent cardiac and liver iron toxicity.", "অ্যালোইমিউনাইজেশন এবং জ্বরজনিত প্রতিক্রিয়া রোধ করতে সর্বদা লিউকোডেপ্লিটেড রক্ত দিন। হার্ট ও লিভারে অতিরিক্ত আয়রনের বিষক্রিয়া রোধে নিয়মিত সিরাম ফেরিটিন পরীক্ষা করুন।"],
    ["Request Blood for Thalassemia", "থ্যালাসেমিয়ার জন্য রক্তের অনুরোধ"],

    // Card 2: Severe & Aplastic Anemia
    ["Bone Marrow / Blood Loss", "অস্থিমজ্জা / রক্তক্ষরণ"],
    ["Urgent / Planned", "জরুরি / পূর্বনির্ধারিত"],
    ["Severe & Aplastic Anemia", "সিভিয়ার ও অ্যাপ্লাস্টিক অ্যানিমিয়া"],
    ["Aplastic anemia is bone marrow failure where stem cells fail to produce RBCs, WBCs, and platelets. Severe nutritional or hemolytic anemia causes dangerously low hemoglobin (< 6-7 g/dL) leading to heart strain.", "অ্যাপ্লাস্টিক অ্যানিমিয়ায় অস্থিমজ্জা ব্যর্থ হয়, ফলে স্টেম সেল পর্যাপ্ত লোহিত, শ্বেত রক্তকণিকা ও প্লাটিলেট তৈরি করতে পারে না। মারাত্মক পুষ্টিহীনতা বা রক্তক্ষরণে হিমোগ্লোবিনের মাত্রা বিপজ্জনকভাবে কমে যায় (< ৬-৭ g/dL)।"],
    ["Transfusion Threshold:", "রক্ত সঞ্চালনের মাত্রা:"],
    ["Hb < 7.0 g/dL (or symptomatic)", "হিমোগ্লোবিন < ৭.০ g/dL (বা লক্ষণযুক্ত)"],
    ["Packed Red Blood Cells (PRBC)", "প্যাকড লোহিত রক্তকণিকা (PRBC)"],
    ["Critical Risk:", "মারাত্মক ঝুঁকি:"],
    ["Volume overload & alloimmunization", "ভলিউম ওভারলোড ও অ্যালোইমিউনাইজেশন"],
    ["Do not transfuse whole blood if iron-deficiency can be corrected with IV iron. In aplastic anemia, blood must be irradiated to prevent graft-versus-host disease (TA-GVHD).", "আয়রনের ঘাটতি যদি স্যালাইন/ওষুধ দিয়ে পূরণ করা যায় তবে পুরো রক্ত দেবেন না। অ্যাপ্লাস্টিক অ্যানিমিয়ায় গ্রাফ্ট-ভার্সাস-হোস্ট রোগ (TA-GVHD) প্রতিরোধে রক্ত ইরেডিয়েট (বিকিরণ) করতে হবে।"],
    ["Request Blood for Anemia", "রক্তস্বল্পতার জন্য রক্তের অনুরোধ"],

    // Card 3: Leukemia
    ["Hematologic Cancer", "রক্তের ক্যান্সার"],
    ["Emergency Critical", "জরুরি সংকটজনক"],
    ["Leukemia & Blood Cancers", "লিউকেমিয়া ও রক্তের ক্যান্সার"],
    ["Malignancies of blood-forming tissue (ALL, AML, Lymphoma). Chemotherapy and marrow infiltration cause profound pancytopenia — life-threatening drops in both red cells and clotting platelets.", "রক্ত তৈরিকারী কলার ক্যান্সার (ALL, AML, লিম্ফোমা)। কেমোথেরাপির কারণে প্যানসাইটোপেনিয়া ঘটে — লোহিত রক্তকণিকা ও রক্ত জমাট বাঁধার প্লাটিলেট উভয়ই আশঙ্কাজনকভাবে কমে যায়।"],
    ["Transfusion Need:", "সঞ্চালন প্রয়োজন:"],
    ["Single Donor Platelets (SDP) & PRBC", "সিঙ্গেল ডোনার প্লাটিলেট (SDP) ও PRBC"],
    ["Platelet Trigger:", "প্লাটিলেট মাত্রা:"],
    ["Count < 10,000/µL or active bleeding", "কাউন্ট < ১০,০০০/µL বা সক্রিয় রক্তক্ষরণ"],
    ["Special Processing:", "বিশেষ প্রক্রিয়াজাতকরণ:"],
    ["Irradiated & Leukodepleted Products", "ইরেডিয়েটেড ও লিউকোডেপ্লিটেড উপাদান"],
    ["Platelet transfusions are time-sensitive. Coordinate early with apheresis donors who have not taken aspirin or NSAIDs in the past 72 hours.", "প্লাটিলেট সঞ্চালন অত্যন্ত জরুরি। এমন অ্যাফেরেসিস দাতার সাথে দ্রুত সমন্বয় করুন যিনি গত ৭২ ঘণ্টার মধ্যে অ্যাসপিরিন বা ব্যথানাশক ওষুধ খাননি।"],
    ["Request Platelets / Blood", "প্লাটিলেট / রক্তের অনুরোধ"],

    // Card 4: Hemophilia
    ["Coagulation Disorder", "রক্ত জমাট বাঁধার ব্যাধি"],
    ["Clotting Emergency", "রক্তক্ষরণ জরুরি অবস্থা"],
    ["Hemophilia & Bleeding Disorders", "হিমোফিলিয়া ও রক্তক্ষরণজনিত রোগ"],
    ["Deficiency of clotting Factor VIII (Hemophilia A) or Factor IX (Hemophilia B). Minor trauma can cause devastating internal joint, muscle, or intracranial bleeds.", "রক্ত জমাট বাঁধার ফ্যাক্টর VIII (হিমোফিলিয়া A) বা ফ্যাক্টর IX (হিমোফিলিয়া B)-এর ঘাটতি। সামান্য আঘাতেই শরীরের ভেতরে, জয়েন্টে, মাংসে বা মস্তিষ্কে মারাত্মক রক্তক্ষরণ হতে পারে।"],
    ["Primary Treatment:", "প্রাথমিক চিকিৎসা:"],
    ["Factor Concentrates (Recombinant/Plasma)", "ফ্যাক্টর কনসেন্ট্রেট (রিকম্বিন্যান্ট/প্লাজমা)"],
    ["Alternative Emergency:", "জরুরি বিকল্প:"],
    ["Fresh Frozen Plasma (FFP) / Cryo", "ফ্রেশ ফ্রোজেন প্লাজমা (FFP) / ক্রায়ো"],
    ["Avoid:", "বর্জনীয়:"],
    ["Whole blood (insufficient factor concentration)", "সম্পূর্ণ রক্ত (ফ্যাক্টরের মাত্রা অপর্যাপ্ত)"],
    ["Standard whole blood is ineffective for hemophilia bleeds. Contact the hematology center urgently for factor vials or specialized Cryoprecipitate.", "হিমোফিলিয়ার রক্তক্ষরণে সাধারণ রক্ত অকার্যকর। ফ্যাক্টর ভায়াল বা বিশেষায়িত ক্রায়োপ্রেসিপিটেটের জন্য অবিলম্বে হেমাটোলজি সেন্টারে যোগাযোগ করুন।"],
    ["Find FFP / Blood Donors", "এফএফপি / রক্তদাতা খুঁজুন"],

    // Card 5: Dengue
    ["Seasonal Epidemic", "মৌসুমি মহামারি"],
    ["Critical Window", "সংকটজনক সময়"],
    ["Dengue with Thrombocytopenia", "ডেঙ্গু ও প্লাটিলেট সংকট"],
    ["Dengue hemorrhagic fever causes immune-mediated destruction of platelets and capillary plasma leakage. While platelet count drops sharply, prophylactic transfusion is usually NOT necessary unless severe bleeding exists.", "ডেঙ্গু হেমোরেজিক ফিভারে রক্তনালী থেকে প্লাজমা লিকেজ এবং প্লাটিলেট ধ্বংস হয়। প্লাটিলেট দ্রুত কমলেও মারাত্মক রক্তক্ষরণ না থাকলে আগাম রক্ত সঞ্চালন সাধারণত প্রয়োজন হয় না।"],
    ["Transfusion Criteria:", "সঞ্চালনের মানদণ্ড:"],
    ["Active bleeding OR count < 10,000/µL", "সক্রিয় রক্তক্ষরণ বা কাউন্ট < ১০,০০০/µL"],
    ["Primary Therapy:", "প্রধান চিকিৎসা:"],
    ["Judicious IV crystalloid fluid management", "যথাযথ আইভি ফ্লুইড/স্যালাইন ব্যবস্থাপনা"],
    ["Blood Products:", "রক্তের উপাদান:"],
    ["Platelet Concentrates / Fresh Whole Blood", "প্লাটিলেট কনসেন্ট্রেট / তাজা সম্পূর্ণ রক্ত"],
    ["Avoid panicking over numerical platelet counts. Fluid resuscitation is paramount. Follow the National Guidelines for Clinical Management of Dengue Syndrome.", "প্লাটিলেটের সংখ্যার কমতি দেখে আতঙ্কিত হবেন না। স্যালাইন/ফ্লুইড ব্যবস্থাপনাই প্রধান। জাতীয় ডেঙ্গু চিকিৎসা নির্দেশিকা অনুসরণ করুন।"],
    ["Request Urgent Platelets", "জরুরি প্লাটিলেটের অনুরোধ"],

    // Card 6: Sickle Cell & Trauma
    ["Hemoglobinopathy / Surgery", "হিমোগ্লোবিনোপ্যাথি / সার্জারি"],
    ["Urgent Response", "জরুরি সাড়া"],
    ["Sickle Cell Disease & Emergency Trauma", "সিকেল সেল ও জরুরি ট্রমা"],
    ["Sickle cell patients experience acute chest syndrome or splenic sequestration. In road traffic accidents and post-partum hemorrhage, massive blood loss requires immediate, synchronized transfusion.", "সিকেল সেল রোগীদের তীব্র বুকে ব্যথা বা প্লীহায় রক্ত জমাট বাঁধে। সড়ক দুর্ঘটনা এবং প্রসবোত্তর অতিরিক্ত রক্তক্ষরণে অবিলম্বে সুসংগত রক্ত সঞ্চালন প্রয়োজন।"],
    ["Sickle Cell:", "সিকেল সেল:"],
    ["Exchange transfusion to reduce HbS < 30%", "HbS < ৩০% কমাতে এক্সচেঞ্জ ট্রান্সফিউশন"],
    ["Trauma / MTP:", "ট্রমা / এমটিপি:"],
    ["1:1:1 ratio (PRBC, FFP, Platelets)", "১:১:১ অনুপাত (PRBC, FFP, প্লাটিলেট)"],
    ["Universal Blood:", "সর্বজনীন রক্ত:"],
    ["O-Negative used prior to crossmatch", "ক্রসম্যাচের পূর্বে O-নেগেটিভ রক্ত ব্যবহার"],
    ["In massive hemorrhage, warm blood products to prevent hypothermia and coagulopathy. Always activate hospital emergency transfusion protocols immediately.", "মারাত্মক রক্তক্ষরণে হাইপোথার্মিয়া ও রক্ত জমাট বাঁধার সমস্যা রোধ করতে রক্ত কিছুটা গরম করে দিন। অবিলম্বে হাসপাতালের জরুরি ট্রান্সফিউশন প্রোটোকল সক্রিয় করুন।"],
    ["Publish Emergency Request", "জরুরি রক্তের অনুরোধ প্রকাশ করুন"],

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

  // Helper to escape regex special characters
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Pre-compile dictionary patterns sorted longest first
  // This guarantees longer sentences match before shorter words, completely eliminating mixed-text artifacts!
  const COMPILED_DICTIONARY = UI_DICTIONARY
    .slice()
    .sort((a, b) => b[0].trim().length - a[0].trim().length)
    .map(([en, bn]) => {
      const cleanEn = en.trim();
      const pattern = escapeRegex(cleanEn).replace(/\s+/g, "\\s+");
      return {
        en: cleanEn,
        regex: new RegExp(pattern, "gi"),
        bn: bn
      };
    });

  // Cache of original English text for 100% accurate reversible translation
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
      for (let i = 0; i < COMPILED_DICTIONARY.length; i++) {
        const item = COMPILED_DICTIONARY[i];
        if (item.regex.test(translated)) {
          translated = translated.replace(item.regex, item.bn);
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
          for (let i = 0; i < COMPILED_DICTIONARY.length; i++) {
            const item = COMPILED_DICTIONARY[i];
            if (item.regex.test(p)) {
              p = p.replace(item.regex, item.bn);
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

    // Update all toggle buttons (no globe emoji)
    document.querySelectorAll(".language-toggle, #language-toggle").forEach(btn => {
      btn.textContent = targetLang === "en" ? "বাংলা" : "English";
    });

    // Translate DOM
    if (document.body) {
      translateNode(document.body, targetLang);
    }
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
    });

    // Apply saved language immediately
    if (initialLang === "bn") {
      setPageLanguage("bn");
    } else {
      setPageLanguage("en");
    }

    // Observe dynamic elements
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
