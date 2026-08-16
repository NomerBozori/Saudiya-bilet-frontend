// ==================== SOZLAMALAR ====================
// Backend (Render.com) manzilini shu yerga qo'ying, masalan:
// "https://umra-chipta-backend.onrender.com"
const API_BASE_URL = "https://saudiya-bilet-backend.onrender.com";

// ==================== TELEGRAM WEBAPP INIT ====================
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Telegram temasidan CSS o'zgaruvchilarni tortib olamiz (fallback style.css'da bor)
document.documentElement.style.setProperty("--tg-theme-bg-color", tg.themeParams.bg_color || "#f4f6f5");
document.documentElement.style.setProperty("--tg-theme-text-color", tg.themeParams.text_color || "#111111");
document.documentElement.style.setProperty("--tg-theme-hint-color", tg.themeParams.hint_color || "#999999");
document.documentElement.style.setProperty("--tg-theme-secondary-bg-color", tg.themeParams.secondary_bg_color || "#ffffff");
document.documentElement.style.setProperty("--tg-theme-button-color", tg.themeParams.button_color || "#0f7a6b");
document.documentElement.style.setProperty("--tg-theme-button-text-color", tg.themeParams.button_text_color || "#ffffff");

const user = tg.initDataUnsafe?.user || { id: 0, username: "test_user" };

// ==================== HOLAT (STATE) ====================
const state = {
  selectedFlight: null,
  origin: null,
  destination: null,
  departDate: null,
  passengers: 1,
  passport: null,
  paymentFile: null,
  lastOrderId: null,
};

// ==================== EKRANLARNI ALMASHTIRISH ====================
function showScreen(id) {
  document.querySelectorAll(".tg-screen").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.back));
});

// ==================== AVTOMATIK TAKLIF (dunyoning istalgan shahri) ====================
function setupAutocomplete(inputId, hiddenId, boxId) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const box = document.getElementById(boxId);
  let debounceTimer = null;

  input.addEventListener("input", () => {
    hidden.value = ""; // foydalanuvchi qayta yozsa, avvalgi tanlov bekor bo'ladi
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
    setTimeout(() => box.classList.add("hidden"), 200); // click ulgurishi uchun kichik kechikish
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
        input.value = label;
        hidden.value = item.code;
        box.classList.add("hidden");
      });
      box.appendChild(el);
    });
    box.classList.remove("hidden");
  } catch (e) {
    console.error("Autocomplete error:", e);
  }
}

setupAutocomplete("origin", "origin_code", "origin_suggestions");
setupAutocomplete("destination", "destination_code", "destination_suggestions");

// ==================== 1. QIDIRUV ====================
document.getElementById("btn-search").addEventListener("click", async () => {
  const origin = document.getElementById("origin_code").value;
  const destination = document.getElementById("destination_code").value;
  const departDate = document.getElementById("depart_date").value;
  const passengers = parseInt(document.getElementById("passengers").value || "1", 10);

  if (!origin || !destination) {
    tg.showAlert("Iltimos, \"Qayerdan\" va \"Qayerga\" maydonlarida ro'yxatdan chiqqan shahar/aeroportni tanlang.");
    return;
  }
  if (!departDate) {
    tg.showAlert("Iltimos, jo'nash sanasini tanlang.");
    return;
  }

  state.origin = origin;
  state.destination = destination;
  state.departDate = departDate;
  state.passengers = passengers;

  tg.MainButton.showProgress();
  try {
    const url = `${API_BASE_URL}/api/search?origin=${origin}&destination=${destination}&depart_date=${departDate}`;
    const res = await fetch(url);
    const data = await res.json();
    renderResults(data.results || []);
    showScreen("screen-results");
  } catch (e) {
    tg.showAlert("Chiptalarni yuklashda xatolik yuz berdi. Internetni tekshiring.");
    console.error(e);
  } finally {
    tg.MainButton.hideProgress();
  }
});

function renderResults(flights) {
  const list = document.getElementById("results-list");
  const empty = document.getElementById("results-empty");
  list.innerHTML = "";

  if (!flights.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  flights.forEach((f, idx) => {
    const card = document.createElement("div");
    card.className = "tg-flight-card";
    const badge = f.source === "manual" ? `<span class="tg-badge-label">Bizning agentlik</span>` : "";
    const externalLink = (f.source === "api" && f.link)
      ? `<a href="${f.link}" target="_blank" class="tg-btn-outline-link">🔗 Boshqa saytda ko'rish</a>`
      : "";
    card.innerHTML = `
      <div class="tg-flight-row">
        <div>
          ${badge}
          <div class="tg-flight-route">${state.origin.toUpperCase()} → ${state.destination.toUpperCase()}</div>
          <div class="tg-flight-meta">${f.airline || "Aviakompaniya"} · ${f.departure_at ? new Date(f.departure_at).toLocaleString("uz-UZ") : state.departDate}</div>
          <div class="tg-flight-meta">Transfer: ${f.transfers === 0 ? "To'g'ridan-to'g'ri" : f.transfers + " ta"}</div>
        </div>
        <div class="tg-flight-price">$${f.price}</div>
      </div>
      <button class="tg-flight-select" data-idx="${idx}">Tanlash</button>
      ${externalLink}
    `;
    list.appendChild(card);
    card.querySelector(".tg-flight-select").addEventListener("click", () => selectFlight(f));
  });
}

function selectFlight(flight) {
  state.selectedFlight = flight;
  document.getElementById("selected-flight-summary").innerHTML = `
    <h2 class="tg-card-title">Tanlangan reys</h2>
    <div class="tg-flight-row">
      <div class="tg-flight-route">${state.origin.toUpperCase()} → ${state.destination.toUpperCase()}</div>
      <div class="tg-flight-price">$${flight.price}</div>
    </div>
    <div class="tg-flight-meta">${flight.airline || ""} · ${state.departDate}</div>
  `;
  showScreen("screen-passport");
}

// ==================== 2. PASSPORT ====================
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

  state.passport = { first_name, last_name, passport_number, birth_year: parseInt(birth_year, 10), expiry_date };
  showScreen("screen-payment");
});

// ==================== 3. TO'LOV ====================
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
    tg.showAlert("Iltimos, to'lov chekini (skrinshot) yuklang.");
    return;
  }

  tg.MainButton.showProgress();
  try {
    // 1) Buyurtmani yaratamiz
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
    if (!orderRes.ok) throw new Error("order create failed");
    const orderData = await orderRes.json();
    state.lastOrderId = orderData.order_id;

    // 2) To'lov chekini yuklaymiz
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
    tg.MainButton.hideProgress();
  }
});

// ==================== 4. YANGI BUYURTMA ====================
document.getElementById("btn-new-order").addEventListener("click", () => {
  state.selectedFlight = null;
  state.passport = null;
  state.paymentFile = null;
  document.getElementById("payment_preview").classList.add("hidden");
  showScreen("screen-search");
});
