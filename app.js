// ===== EDIT THIS LINE: your Render backend address (no slash at the end) =====
const API = "https://opportunities-site.onrender.com";

const T = {
  en: {
    heroTitle: "Find your next opportunity.",
    heroText: "Verified jobs and scholarships from around the world, starting with Ethiopia.",
    search: "Search title or organization",
    go: "Search",
    all: "All", job: "Jobs", scholarship: "Scholarships", other: "Other",
    loading: "Loading... the first load can take up to a minute.",
    none: "No opportunities yet.",
    deadline: "Deadline",
    login: "Login / Register",
    logout: "Logout",
    viewDetails: "View details",
    back: "← Back",
    loginToApply: "Login to apply",
    coverNote: "A short note about you (optional)",
    submit: "Submit application",
    applied: "Your application was sent.",
    official: "Official application link",
    netErr: "Cannot reach the server. Check your internet and try again.",
    loginTab: "Login", register: "Register",
    fullName: "Full name", username: "Username", contact: "Email or phone",
    country: "Country", password: "Password",
    createAccount: "Create account", loginBtn: "Login",
    notFound: "Not found.",
    adminOnly: "Admins only."
  },
  am: {
    heroTitle: "ቀጣዩን ዕድልዎን ያግኙ።",
    heroText: "ከዓለም ዙሪያ የተረጋገጡ ሥራዎችና ስኮላርሺፖች፣ በኢትዮጵያ ይጀምራል።",
    search: "ርዕስ ወይም ድርጅት ይፈልጉ",
    go: "ፈልግ",
    all: "ሁሉም", job: "ሥራዎች", scholarship: "ስኮላርሺፖች", other: "ሌሎች",
    loading: "በመጫን ላይ... የመጀመሪያው ጊዜ እስከ አንድ ደቂቃ ሊወስድ ይችላል።",
    none: "እስካሁን ዕድል የለም።",
    deadline: "የመጨረሻ ቀን",
    login: "ግባ / ተመዝገብ",
    logout: "ውጣ",
    viewDetails: "ዝርዝር ይመልከቱ",
    back: "← ተመለስ",
    loginToApply: "ለማመልከት ይግቡ",
    coverNote: "ስለ እርስዎ አጭር ማስታወሻ (አማራጭ)",
    submit: "ማመልከቻ ላክ",
    applied: "ማመልከቻዎ ተልኳል።",
    official: "ይፋዊ የማመልከቻ ማስፈንጠሪያ",
    netErr: "ሰርቨሩ ሊደረስበት አልቻለም። ኢንተርኔትዎን ያረጋግጡ።",
    loginTab: "ግባ", register: "ተመዝገብ",
    fullName: "ሙሉ ስም", username: "የተጠቃሚ ስም", contact: "ኢሜይል ወይም ስልክ",
    country: "ሀገር", password: "የይለፍ ቃል",
    createAccount: "መለያ ፍጠር", loginBtn: "ግባ",
    notFound: "አልተገኘም።",
    adminOnly: "ለአስተዳዳሪዎች ብቻ።"
  },
  om: {
    heroTitle: "Carraa kee itti aanu argadhu.",
    heroText: "Hojii fi gargaarsa barnootaa mirkanaa'an addunyaa irraa, Itoophiyaan jalqabee.",
    search: "Mata-duree ykn dhaabbata barbaadi",
    go: "Barbaadi",
    all: "Hunda", job: "Hojii", scholarship: "Gargaarsa barnootaa", other: "Kan biroo",
    loading: "Fe'aa jira... yeroo jalqabaa daqiiqaa tokko ni fudhata.",
    none: "Amma carraan hin jiru.",
    deadline: "Guyyaa xumuraa",
    login: "Seeni / Galmaa'i",
    logout: "Ba'i",
    viewDetails: "Ibsa ilaali",
    back: "← Deebi'i",
    loginToApply: "Iyyachuuf seeni",
    coverNote: "Waa'ee kee yaada gabaabaa (filannoo)",
    submit: "Iyyaticha ergi",
    applied: "Iyyannoon kee ergameera.",
    official: "Linkii iyyannoo mirkanaa'e",
    netErr: "Serveriin hin argamne. Interneetii ilaali.",
    loginTab: "Seeni", register: "Galmaa'i",
    fullName: "Maqaa guutuu", username: "Maq-masoo", contact: "E-mail ykn bilbila",
    country: "Biyya", password: "Jecha darbii",
    createAccount: "Akkaawuntii uumi", loginBtn: "Seeni",
    notFound: "Hin argamne.",
    adminOnly: "Bulchitoota qofaaf."
  }
};

let LANG = (function () {
  try {
    const l = localStorage.getItem("oppLang");
    return l === "am" || l === "om" ? l : "en";
  } catch (e) { return "en"; }
})();

function t(k) { return (T[LANG] && T[LANG][k]) || T.en[k] || k; }

function cycleLang() {
  const next = { en: "am", am: "om", om: "en" }[LANG];
  try { localStorage.setItem("oppLang", next); } catch (e) {}
  location.reload();
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function titleOf(o) {
  return (LANG === "am" && o.title_am) || (LANG === "om" && o.title_om) || o.title_en;
}

function getToken() { try { return localStorage.getItem("oppToken"); } catch (e) { return null; } }

function getUser() {
  try { return JSON.parse(localStorage.getItem("oppUser") || "null"); } catch (e) { return null; }
}

function saveSession(token, user) {
  try {
    localStorage.setItem("oppToken", token);
    localStorage.setItem("oppUser", JSON.stringify(user));
  } catch (e) {}
}

function logout() {
  try {
    localStorage.removeItem("oppToken");
    localStorage.removeItem("oppUser");
  } catch (e) {}
  location.href = "index.html";
}

async function api(path, opts) {
  opts = opts || {};
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const tok = getToken();
  if (tok) headers.Authorization = "Bearer " + tok;
  let res;
  try {
    res = await fetch(API + path, Object.assign({}, opts, { headers: headers }));
  } catch (e) {
    throw new Error(t("netErr"));
  }
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    throw new Error((LANG === "om" && data.messageOm) || data.message || "Error");
  }
  return data;
}

function applyStatic() {
  document.documentElement.lang = LANG === "am" ? "am" : "en";
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
    el.placeholder = t(el.dataset.i18nPh);
  });
}

function renderHeader() {
  const top = document.getElementById("top");
  if (!top) return;
  const u = getUser();
  const loggedIn = !!getToken() && !!u;
  const nextLabel = LANG === "en" ? "አማርኛ" : LANG === "am" ? "Afaan Oromoo" : "English";
  top.innerHTML =
    '<div class="bar">' +
      '<a class="brand" href="index.html">🌍 Opportunities<span>.com</span></a>' +
      '<div class="nav">' +
        '<button class="lang" onclick="cycleLang()">' + nextLabel + '</button>' +
        (loggedIn && u.role === "admin" ? '<a href="admin.html">Admin</a>' : '') +
        (loggedIn
          ? '<button class="lang" onclick="logout()">' + t("logout") + ' (' + esc(u.username) + ')</button>'
          : '<a class="btn small" href="auth.html">' + t("login") + '</a>') +
      '</div>' +
    '</div>';
}

(function injectStyle() {
  const css = `
    [hidden] { display: none !important; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f4f7fb; color: #17212b; line-height: 1.5; }
    a { color: #1769aa; }
    .wrap { max-width: 1100px; margin: 0 auto; }
    header#top { background: linear-gradient(120deg, #123b63, #1769aa); }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 10px;
      flex-wrap: wrap; padding: 14px 16px; max-width: 1100px; margin: 0 auto; }
    .brand { color: #fff; font-weight: 800; font-size: 1.2rem; text-decoration: none; }
    .brand span { color: #b9e2ff; }
    .nav { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .nav a { color: #fff; text-decoration: none; font-weight: 600; }
    button, .btn { font: inherit; border: 0; border-radius: 10px; padding: 10px 14px; cursor: pointer;
      font-weight: 700; background: #1769aa; color: #fff; text-decoration: none; display: inline-block; }
    .btn.small { padding: 6px 12px; }
    button.lang { background: #fff; color: #123b63; }
    .hero { background: linear-gradient(120deg, #123b63, #1769aa); color: #fff; padding: 20px 16px 36px; }
    .hero h1 { font-size: clamp(1.8rem, 5vw, 2.8rem); margin: 6px auto 8px; line-height: 1.1; max-width: 1100px; }
    .hero p { margin: 0 auto 16px; color: #e5f2ff; max-width: 1100px; }
    .search { display: grid; grid-template-columns: 1fr auto; gap: 8px; background: #fff;
      padding: 10px; border-radius: 14px; max-width: 1100px; margin: 0 auto; }
    .search button { background: #123b63; }
    input, select, textarea { font: inherit; width: 100%; padding: 12px; border: 1px solid #dbe4ee;
      border-radius: 9px; background: #fff; color: #17212b; }
    main { padding: 20px 16px 40px; max-width: 1100px; margin: 0 auto; }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .tabs button { background: #fff; color: #123b63; border: 1px solid #dbe4ee; }
    .tabs button.on { background: #dceafe; border-color: #1769aa; box-shadow: inset 0 0 0 1px #1769aa; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .card { background: #fff; border: 1px solid #dbe4ee; border-radius: 14px; padding: 16px;
      box-shadow: 0 4px 14px rgba(23, 50, 77, 0.06); margin-bottom: 10px; }
    .card h3 { margin: 8px 0 4px; font-size: 1.05rem; }
    .card .btn { margin-top: 10px; }
    .chip { display: inline-block; font-size: 0.78rem; background: #eaf2fb; color: #214e78;
      padding: 3px 9px; border-radius: 999px; }
    .org { font-weight: 700; margin: 0; }
    .muted { color: #64748b; font-size: 0.92rem; }
    .msg { padding: 12px; border-radius: 10px; margin: 12px 0; }
    .ok { background: #e8f7ec; color: #1b5e20; }
    .bad { background: #fdecea; color: #8a1c1c; }
    .box { background: #fff; border: 1px solid #dbe4ee; border-radius: 14px; padding: 18px;
      max-width: 640px; margin: 16px auto; }
    .form { display: grid; gap: 10px; margin-top: 12px; }
    .form button { justify-self: start; }
    label { font-weight: 600; font-size: 0.92rem; }
    .back { display: inline-block; margin: 12px 0; font-weight: 600; }
  `;
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
})();

document.addEventListener("DOMContentLoaded", function () {
  applyStatic();
  renderHeader();
});
