// dashboard.js (TAM DOSYA) — TXT okuma/parçalama + başlık satırı + satır sonu sorunları düzeltildi

const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

let allFabrics = [], filteredFabrics = [], currentPage = 1, rowsPerPage = 50;

document.addEventListener('DOMContentLoaded', function () {
  const userJson = sessionStorage.getItem('user');
  if (!userJson) { window.location.href = 'index.html'; return; }

  const user = JSON.parse(userJson);
  document.getElementById('displayFullName').textContent = user.full_name;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.clear(); window.location.href = 'index.html';
  });

  // Başlangıçta kullanıcıları getir
  fetchUsers();
});

// --- BÖLÜM GEÇİŞLERİ ---
function showSection(name) {
  document.getElementById('section-users').classList.toggle('d-none', name !== 'users');
  document.getElementById('section-fabrics').classList.toggle('d-none', name !== 'fabrics');

  document.getElementById('menu-users').classList.toggle('active', name === 'users');
  document.getElementById('menu-fabrics').classList.toggle('active', name === 'fabrics');

  document.getElementById('current-page-title').textContent = name === 'users' ? 'Kullanıcı Yönetimi' : 'Kumaş Bilgileri';

  if (name === 'fabrics' && allFabrics.length === 0) loadFabrics();
}

// --- KULLANICI YÖNETİMİ FONKSİYONLARI ---
async function fetchUsers() {
  toggleLoading(true);
  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_users" }) });
    const result = await res.json();
    if (result.success) renderUserTable(result.data);
  } finally { toggleLoading(false); }
}

function renderUserTable(users) {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = "";
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(u.full_name || "")}</td>
      <td>${escapeHtml(u.username || "")}</td>
      <td>${escapeHtml(u.mail || "")}</td>
      <td><span class="badge">${String(u.role || "").toUpperCase()}</span></td>
      <td><span class="status-badge status-${escapeAttr(u.status || "")}">${String(u.status || "").toUpperCase()}</span></td>
      <td>
        <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(u)})'><i class="fas fa-edit"></i></button>
        <button class="action-btn delete-btn" onclick="deleteUser('${escapeAttr(u.user_id || "")}')"><i class="fas fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('userForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const data = {
    user_id: document.getElementById('editUserId').value,
    full_name: document.getElementById('inputName').value,
    mail: document.getElementById('inputMail').value,
    username: document.getElementById('inputUsername').value,
    password: document.getElementById('inputPassword').value,
    role: document.getElementById('inputRole').value,
    status: document.getElementById('inputStatus').value
  };
  toggleLoading(true);
  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_user", data }) });
    const result = await res.json();
    if (result.success) { Swal.fire('Başarılı', result.message, 'success'); closeUserModal(); fetchUsers(); }
    else Swal.fire('Hata', result.message || 'İşlem başarısız', 'error');
  } finally { toggleLoading(false); }
});

function deleteUser(id) {
  Swal.fire({ title: 'Emin misiniz?', icon: 'warning', showCancelButton: true }).then(async (r) => {
    if (r.isConfirmed) {
      toggleLoading(true);
      try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_user", user_id: id }) });
        const result = await res.json();
        if (result.success) fetchUsers();
        else Swal.fire('Hata', result.message || 'Silme başarısız', 'error');
      } finally { toggleLoading(false); }
    }
  });
}

// --- KUMAŞ YÖNETİMİ FONKSİYONLARI ---
async function loadFabrics() {
  toggleLoading(true);
  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_fabric_catalog" }) });
    const result = await res.json();
    if (result.success) { allFabrics = result.data || []; filteredFabrics = allFabrics; currentPage = 1; updateFabricTable(); }
    else Swal.fire('Hata', result.message || 'Liste çekilemedi', 'error');
  } finally { toggleLoading(false); }
}

function updateFabricTable() {
  const tbody = document.getElementById('fabricTableBody');
  tbody.innerHTML = "";
  document.getElementById('totalFabricsBadge').textContent = `${filteredFabrics.length} Kayıt`;

  const start = (currentPage - 1) * rowsPerPage;
  const items = filteredFabrics.slice(start, start + rowsPerPage);

  items.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><span class="badge">${escapeHtml(f.code)}</span></td>
       <td><b>${escapeHtml(f.name)}</b></td>
       <td>${escapeHtml(String(f.width ?? ""))}</td>
       <td>${escapeHtml(String(f.gsm ?? ""))}</td>
       <td>${escapeHtml(String(f.unit ?? ""))}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('pageIndicator').textContent =
    `Sayfa ${currentPage} / ${Math.ceil(filteredFabrics.length / rowsPerPage) || 1}`;
}

function filterFabrics() {
  const q = (document.getElementById('fabricSearch').value || "").toLowerCase();
  filteredFabrics = allFabrics.filter(f =>
    String(f.code || "").toLowerCase().includes(q) ||
    String(f.name || "").toLowerCase().includes(q)
  );
  currentPage = 1;
  updateFabricTable();
}

// --- TXT YÜKLEME (DÜZELTİLMİŞ) ---
function handleFileUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const text = String(e.target.result || "");

      const parsed = parseErpTxt(text);
      const data = parsed.records;

      if (data.length === 0) {
        Swal.fire('Uyarı', 'TXT içinde geçerli kayıt bulunamadı.', 'warning');
        input.value = "";
        return;
      }

      const info =
        `Geçerli kayıt: ${data.length}\n` +
        `Atlanan satır: ${parsed.skipped}\n` +
        (parsed.firstLineHeaderSkipped ? `Başlık satırı atlandı.\n` : ``);

      Swal.fire({
        title: 'Onay',
        text: `${info}\nKarşılaştırma ve senkronizasyon yapılsın mı?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet',
        cancelButtonText: 'Vazgeç'
      }).then(r => {
        if (r.isConfirmed) syncWithBackend(data);
        else input.value = "";
      });

    } catch (err) {
      Swal.fire('Hata', 'TXT okunurken/parçalanırken hata oluştu: ' + String(err), 'error');
      input.value = "";
    }
  };

  // ERP TXT genelde ANSI/UTF-8 olur. FileReader bunu string verir.
  reader.readAsText(file);
}

// TXT PARSER — satır sonu normalize + BOM temizleme + başlık satırı atlama + boş/bozuk satır filtreleme
function parseErpTxt(rawText) {
  // 1) Normalize satır sonları: \r\n ve \r -> \n
  let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2) BOM (UTF-8 BOM) varsa temizle
  text = text.replace(/^\uFEFF/, "");

  // 3) Satırları al, trimle, boşları at
  const lines = text
    .split("\n")
    .map(l => (l ?? "").trim())
    .filter(l => l.length > 0);

  let records = [];
  let skipped = 0;
  let firstLineHeaderSkipped = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bazı ERP’ler dosyada ayırıcı satır / yorum satırı koyabiliyor
    if (!line.includes(";")) { skipped++; continue; }

    const parts = line.split(";").map(p => (p ?? "").trim());

    // Güvenlik: en az kod + isim olmalı
    let code = parts[0] ? String(parts[0]).trim() : "";
    let name = parts[1] ? String(parts[1]).trim() : "";

    // Koda BOM/garip karakter yapışmışsa temizle
    code = code.replace(/^\uFEFF/, "").trim();

    // İlk satır başlıksa atla (KOD / KUMAŞ vb.)
    if (i === 0 && looksLikeHeaderRow(code, name, parts)) {
      firstLineHeaderSkipped = true;
      skipped++;
      continue;
    }

    // Geçersiz satırlar: code veya name boşsa atla
    if (!code || !name) { skipped++; continue; }

    const width = parts[2] ? String(parts[2]).trim() : "";
    const gsm = parts[3] ? String(parts[3]).trim() : "";
    const unit = parts[4] ? String(parts[4]).trim() : "";

    records.push({ code, name, width, gsm, unit });
  }

  // Aynı kod tekrar ediyorsa (dosyada duplicate), sonuncusunu baz al (overwrite)
  // Bu, gereksiz şişmeyi önler.
  const dedupMap = {};
  records.forEach(r => { dedupMap[r.code] = r; });
  records = Object.values(dedupMap);

  return { records, skipped, firstLineHeaderSkipped };
}

// Başlık satırı heuristiği
function looksLikeHeaderRow(code, name, parts) {
  const joined = parts.join(" ").toLowerCase();

  // Yaygın kolon adları
  const headerSignals = [
    "kod", "kumaş", "kumas", "tanım", "tanim", "açıklama", "aciklama",
    "en", "gramaj", "birim", "unit"
  ];

  // Kod alanı “KOD” gibi ise direkt başlık kabul et
  const codeLower = String(code || "").toLowerCase();
  if (codeLower === "kod" || codeLower === "kodu" || codeLower === "stok kodu") return true;

  // İçerikte çok sayıda header sinyali varsa başlık kabul et
  let hit = 0;
  for (const s of headerSignals) {
    if (joined.includes(s)) hit++;
  }
  return hit >= 2 || (String(name || "").toLowerCase().includes("tanım") || String(name || "").toLowerCase().includes("tanim"));
}

async function syncWithBackend(data) {
  toggleLoading(true);
  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "sync_fabrics", fabrics: data }) });
    const result = await res.json();
    if (result.success) {
      Swal.fire('Bitti', `Eklendi: ${result.data.added}, Güncellendi: ${result.data.updated}, Aynı: ${result.data.same}`, 'success');
      await loadFabrics();
    } else {
      Swal.fire('Hata', result.message || 'Senkronizasyon başarısız', 'error');
    }
  } finally {
    toggleLoading(false);
    const fileInput = document.getElementById('fabricFileInput');
    if (fileInput) fileInput.value = "";
  }
}

// --- MODAL & YARDIMCILAR ---
function openUserModal() {
  document.getElementById('userForm').reset();
  document.getElementById('editUserId').value = "";
  document.getElementById('modalTitle').textContent = "Yeni Kullanıcı";
  document.getElementById('userModal').classList.remove('d-none');
}
function openEditModal(u) {
  document.getElementById('editUserId').value = u.user_id || "";
  document.getElementById('inputName').value = u.full_name || "";
  document.getElementById('inputMail').value = u.mail || "";
  document.getElementById('inputUsername').value = u.username || "";
  document.getElementById('inputPassword').value = u.password || "";
  document.getElementById('inputRole').value = u.role || "user";
  document.getElementById('inputStatus').value = u.status || "aktif";
  document.getElementById('modalTitle').textContent = "Kullanıcı Düzenle";
  document.getElementById('userModal').classList.remove('d-none');
}
function closeUserModal() { document.getElementById('userModal').classList.add('d-none'); }
function toggleLoading(s) { document.getElementById('loadingOverlay').classList.toggle('d-none', !s); }
function nextPage() { if ((currentPage * rowsPerPage) < filteredFabrics.length) { currentPage++; updateFabricTable(); } }
function prevPage() { if (currentPage > 1) { currentPage--; updateFabricTable(); } }

// --- XSS / HTML güvenliği için basit kaçış ---
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str) {
  // attribute için basit kaçış
  return String(str ?? "").replaceAll("'", "&#039;").replaceAll('"', "&quot;");
}
