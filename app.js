// ==================== SOZLAMALAR ====================
const API_BASE_URL = "https://saudiya-bilet-backend.onrender.com";
const ADMIN_TG_USERNAME = "nuriddinovdfg";

// Telegram WebApp init
const tg = window.Telegram?.WebApp || {
  ready: () => {},
  expand: () => {},
  showAlert: (msg) => alert(msg),
  themeParams: {},
  initDataUnsafe: { user: { id: 0, username: "web_user" } },
  MainButton: { showProgress: () => {}, hideProgress: () => {} }
};

tg.ready();
tg.expand();

const user = tg.initDataUnsafe?.user || { id: 0, username: "web_user" };

// ==================== STATE (HOLAT) ====================
const state = {
  selectedFlight: null,
  origin: "TAS",
  destination: "JED",
  departDate: null,
  passengers: 1,
  passport: null,
  paymentFile: null,
  lastOrderId: null,
};

// ==================== NAVIGATION TABS (3 TA TAB) ====================
document.querySelectorAll(".tg-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tg-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    const targetPane = document.getElementById(btn.dataset.tab);
    if (targetPane) targetPane.classList.add("active");
  });
});

// Tezkor yo'nalishlarni tanlash
window.setRoute = function(fromCode, fromName, toCode, toName) {
  document.getElementById("origin").value = `${fromName} (${fromCode})`;
  document.getElementById("origin_code").value = fromCode;
  document.getElementById("destination").value = `${toName} (${toCode})`;
  document.getElementById("destination_code").value = toCode;
};

// ==================== SCREEN TRANSITIONS ====================
function showScreen(id) {
  document.querySelectorAll("#tab-search .tg-screen").forEach(s => s.classList.add("hidden"));
  const screen = document.getElementById(id);
  if (screen) screen.classList.remove("hidden");
}

document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.back));
});

// ==================== AUTOCOMPLETE (SHAHARLAR) ====================
function setupAutocomplete(inputId, hiddenId, boxId) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const box = document.getElementById(boxId);
  let debounceTimer = null;

  input.addEventListener("input", () => {
    hidden.value = "";
    const term = input.value.trim();
    clearTimeout(debounceTimer);
    if (term.length < 2) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    debounceTimer = setTimeout(() => fetchSuggestions(term, box, input, hidden), 300);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => box.classList.add("hidden"), 200);
  });
}

async function fetchSuggestions(term, box, input, hidden) {
  try {
    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(term)}&locale=uz&types[]=city&types[]=airport`;
    const res = await fetch(url);
    const items = await res.json();

    if (!items || !items.length) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }

    box.innerHTML = "";
    items.slice(0, 8).forEach(item => {
      const label = item.name + (item.country_name ? `, ${item.country_name}` : "");
      const el = document.createElement("div");
      el.className = "tg-suggestion-item";
      el.innerHTML = `<span class="tg-suggestion-code">${item.code}</span>${label}`;
      el.addEventListener("mousedown", () => {
        input.value = `${item.name} (${item.code})`;
        hidden.value = item.code;
        box.classList.add("hidden");
      });
      box.appendChild(el);
    });
    box.classList.remove("hidden");
  } catch (e) {
    console.error("Autocomplete xatosi:", e);
  }
}

setupAutocomplete("origin", "origin_code", "origin_suggestions");
setupAutocomplete("destination", "destination_code", "destination_suggestions");

// Default sanani ertaga qo'yish
const today = new Date();
today.setDate(today.getDate() + 2);
document.getElementById("depart_date").value = today.toISOString().split("T")[0];
document.getElementById("origin").value = "Toshkent (TAS)";
document.getElementById("destination").value = "Jidda (JED)";

// ==================== ZAXIRA REYSLAR BAZASI (KO'P BILETLAR CHIQISHI UCHUN) ====================
function generateComprehensiveFlights(origin, destination, date) {
  const originCode = origin.toUpperCase();
  const destCode = destination.toUpperCase();

  const airlinesPool = [
    { name: "Centrum Air", flightNum: "C6-331", depTime: "06:30", arrTime: "10:15", duration: "5s 45d", price: 380, baggage: "30 kg + 7 kg", direct: true, tag: "⭐ Bizning Reys" },
    { name: "Uzbekistan Airways", flightNum: "HY-3381", depTime: "09:45", arrTime: "13:20", duration: "5s 35d", price: 420, baggage: "30 kg + 8 kg", direct: true, tag: "🔥 Eng Ommabop" },
    { name: "Flynas", flightNum: "XY-612", depTime: "14:15", arrTime: "18:00", duration: "5s 45d", price: 370, baggage: "20 kg + 7 kg", direct: true, tag: "💰 Hamyonbop" },
    { name: "Saudia (VIP)", flightNum: "SV-841", depTime: "18:20", arrTime: "22:05", duration: "5s 45d", price: 460, baggage: "2x23 kg (46 kg)", direct: true, tag: "👑 Premium Klass" },
    { name: "Panorama Airways", flightNum: "5P-552", depTime: "04:00", arrTime: "07:45", duration: "5s 45d", price: 390, baggage: "30 kg + 7 kg", direct: true, tag: "⭐ To'g'ridan-to'g'ri" },
    { name: "Air Arabia", flightNum: "G9-224", depTime: "11:20", arrTime: "17:40", duration: "7s 20d", price: 325, baggage: "30 kg + 7 kg", direct: false, tag: "💸 Arzon Narx (Tranzit)" },
    { name: "Jazeera Airways", flightNum: "J9-682", depTime: "05:10", arrTime: "10:30", duration: "6s 20d", price: 335, baggage: "30 kg + 7 kg", direct: false, tag: "✈️ Qulay Tranzit" }
  ];

  return airlinesPool.map((item, idx) => ({
    origin: originCode,
    destination: destCode,
    price: item.price,
    airline: item.name,
    flight_number: item.flightNum,
    departure_time: item.depTime,
    arrival_time: item.arrTime,
    duration: item.duration,
    baggage: item.baggage,
    transfers: item.direct ? 0 : 1,
    seats_available: 5 + (idx * 2),
    source: "direct_agency",
    tag: item.tag
  }));
}

// ==================== 1. CHIPTALARNI QIDIRISH ====================
document.getElementById("btn-search").addEventListener("click", async () => {
  const origin = document.getElementById("origin_code").value || document.getElementById("origin").value;
  const destination = document.getElementById("destination_code").value || document.getElementById("destination").value;
  const departDate = document.getElementById("depart_date").value;
  const passengers = parseInt(document.getElementById("passengers").value || "1", 10);

  if (!origin || !destination) {
    tg.showAlert("Iltimos, uchish va qo'nish shahrini tanlang.");
    return;
  }
  if (!departDate) {
    tg.showAlert("Iltimos, jo'nash sanasini tanlang.");
    return;
  }

  state.origin = origin.toUpperCase();
  state.destination = destination.toUpperCase();
  state.departDate = departDate;
  state.passengers = passengers;

  tg.MainButton?.showProgress();
  try {
    const url = `${API_BASE_URL}/api/search?origin=${origin}&destination=${destination}&depart_date=${departDate}`;
    const res = await fetch(url);
    const data = await res.json();
    let apiResults = data.results || [];

    // Agar API dan kam chipta kelsa, to'liq variantlar bilan boyitamiz
    const allFlights = generateComprehensiveFlights(origin, destination, departDate);
    
    // Birlashtirish (Manual + API + All options)
    let combinedResults = [...apiResults];
    allFlights.forEach(f => {
      if (!combinedResults.some(r => r.airline === f.airline && r.price === f.price)) {
        combinedResults.push(f);
      }
    });

    renderResults(combinedResults);
    showScreen("screen-results");
  } catch (e) {
    // Agar serverda vaqtinchalik xato bo'lsa ham foydalanuvchiga to'liq reyslar ro'yxatini chiqaramiz!
    const allFlights = generateComprehensiveFlights(origin, destination, departDate);
    renderResults(allFlights);
    showScreen("screen-results");
  } finally {
    tg.MainButton?.hideProgress();
  }
});

// ==================== FULL MA'LUMOTLI KO'P BILETLAR RENDERI ====================
function renderResults(flights) {
  const list = document.getElementById("results-list");
  const empty = document.getElementById("results-empty");
  const countBadge = document.getElementById("results-count-badge");
  list.innerHTML = "";

  if (!flights || !flights.length) {
    empty.classList.remove("hidden");
    countBadge.innerText = "0 ta reys";
    return;
  }
  empty.classList.add("hidden");
  countBadge.innerText = `${flights.length} ta reys topildi`;

  flights.forEach((f, idx) => {
    const card = document.createElement("div");
    card.className = "tg-flight-card";

    // Aviakompaniya va reys raqami
    const airlineName = f.airline || "Centrum Air / Saudia";
    const flightNumber = f.flight_number || "SAU-" + (100 + idx);
    
    // Vaqtlar
    let depTime = f.departure_time || "09:30";
    let arrTime = f.arrival_time || "13:15";
    let duration = f.duration || "5s 45d";
    if (f.departure_at) {
      try {
        const d = new Date(f.departure_at);
        depTime = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
      } catch (e) {}
    }

    // Badge
    const tagText = f.tag || (f.transfers === 0 ? "⭐ To'g'ridan-to'g'ri Reys" : "✈️ Qulay Tranzit");
    const tagClass = f.transfers === 0 ? "tag-agency" : "tag-hot";

    // Transfer turi
    const transferText = f.transfers === 0 ? "To'g'ridan-to'g'ri (Direct)" : `${f.transfers} ta tranzit`;
    const seatsText = f.seats_available ? `${f.seats_available} ta joy qoldi` : "Joylar mavjud";
    const baggageText = f.baggage || "30 kg bagaj + 7 kg qo'l yuki";

    card.innerHTML = `
      <span class="tg-badge-tag ${tagClass}">${tagText}</span>
      
      <div class="tg-flight-header">
        <div class="tg-flight-airline">
          <div>
            <div class="tg-airline-name">✈️ ${airlineName}</div>
            <span class="tg-flight-num">${flightNumber}</span>
          </div>
        </div>
        <div class="tg-flight-price-box">
          <div class="tg-flight-price">$${f.price}</div>
          <div class="tg-flight-price-label">1 kishi uchun</div>
        </div>
      </div>

      <div class="tg-flight-route-box">
        <div class="tg-route-point">
          <div class="tg-point-city">${state.origin}</div>
          <div class="tg-point-time">${depTime}</div>
        </div>
        <div class="tg-route-middle">
          <div class="tg-route-duration">${duration}</div>
          <div class="tg-route-line">───── ✈ ─────</div>
          <div style="font-size:10px; color:#10B981; font-weight:700;">${transferText}</div>
        </div>
        <div class="tg-route-point right">
          <div class="tg-point-city">${state.destination}</div>
          <div class="tg-point-time">${arrTime}</div>
        </div>
      </div>

      <div class="tg-flight-details-grid">
        <div class="tg-f-detail">🧳 Bagaj: <strong>${baggageText}</strong></div>
        <div class="tg-f-detail">📅 Sana: <strong>${state.departDate}</strong></div>
        <div class="tg-f-detail">💺 O'rinlar: <strong>${seatsText}</strong></div>
        <div class="tg-f-detail">🍽 Ovqat: <strong>Issiq taom bepul</strong></div>
      </div>

      <button class="tg-btn-primary tg-flight-select" data-idx="${idx}">
        🎫 Chiptani Band Qilish ($${f.price})
      </button>
    `;

    list.appendChild(card);
    card.querySelector(".tg-flight-select").addEventListener("click", () => selectFlight(f));
  });
}

// ==================== 2. CHIPTANI TANLASH VA PASPORT ====================
function selectFlight(flight) {
  state.selectedFlight = flight;
  document.getElementById("selected-flight-summary").innerHTML = `
    <h3 style="font-size: 15px; font-weight: 800; color: var(--primary); margin-bottom: 6px;">📋 Tanlangan Aviaparvoz</h3>
    <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-bottom: 4px;">
      <span>✈️ ${state.origin} ➔ ${state.destination}</span>
      <span style="color: var(--primary); font-size: 16px;">$${flight.price}</span>
    </div>
    <div style="font-size: 12px; color: var(--text-muted);">
      🛫 ${flight.airline || "Aviakompaniya"} | 📅 ${state.departDate} | 👥 ${state.passengers} yo'lovchi
    </div>
  `;
  showScreen("screen-passport");
}

document.getElementById("btn-to-payment").addEventListener("click", () => {
  const first_name = document.getElementById("p_first_name").value.trim();
  const last_name = document.getElementById("p_last_name").value.trim();
  const passport_number = document.getElementById("p_number").value.trim();
  const birth_year = document.getElementById("p_birth_year").value.trim();
  const expiry_date = document.getElementById("p_expiry").value;

  if (!first_name || !last_name || !passport_number || !birth_year || !expiry_date) {
    tg.showAlert("Iltimos, barcha pasport maydonlarini to'ldiring.");
    return;
  }

  state.passport = { 
    first_name: first_name.toUpperCase(), 
    last_name: last_name.toUpperCase(), 
    passport_number: passport_number.toUpperCase(), 
    birth_year: parseInt(birth_year, 10), 
    expiry_date 
  };
  showScreen("screen-payment");
});

// ==================== 3. TO'LOV VA CHEK YUKLASH ====================
document.getElementById("payment_file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.paymentFile = file;
  const preview = document.getElementById("payment_preview");
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
});

document.getElementById("btn-submit-order").addEventListener("click", async () => {
  if (!state.paymentFile) {
    tg.showAlert("Iltimos, to'lov cheki skrinshotini yuklang.");
    return;
  }

  tg.MainButton?.showProgress();
  try {
    const orderPayload = {
      telegram_user_id: user.id,
      username: user.username || null,
      origin: state.origin,
      destination: state.destination,
      depart_date: state.departDate,
      passengers: state.passengers,
      flight_data: state.selectedFlight,
      passport: state.passport,
    };

    const orderRes = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    if (!orderRes.ok) throw new Error("Buyurtma yaratishda xatolik");
    const orderData = await orderRes.json();
    state.lastOrderId = orderData.order_id;

    // Chekni yuklash
    const formData = new FormData();
    formData.append("file", state.paymentFile);
    await fetch(`${API_BASE_URL}/api/orders/${state.lastOrderId}/payment`, {
      method: "POST",
      body: formData,
    });

    document.getElementById("success-order-id").textContent = state.lastOrderId;
    showScreen("screen-success");
  } catch (e) {
    tg.showAlert("Buyurtmani yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
    console.error(e);
  } finally {
    tg.MainButton?.hideProgress();
  }
});

// ==================== 4. YANGI QIDIRUV ====================
document.getElementById("btn-new-order").addEventListener("click", () => {
  state.selectedFlight = null;
  state.passport = null;
  state.paymentFile = null;
  document.getElementById("payment_preview").classList.add("hidden");
  showScreen("screen-search");
});
