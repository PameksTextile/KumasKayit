// dashboard.js (TAM DOSYA) — TXT kuralı: 5 sütun => satırda TAM 4 adet ';' olacak. İlk satır başlık ve atlanır.

const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

let allFabrics = [], filteredFabrics = [], currentPage = 1, rowsPerPage = 50;

document.addEventListener('DOMContentLoaded', function () {
  const userJson = sessionStorage.getItem('user');
  if (!userJson) { window.location.href = 'index.html'; return; }

  const user = JSON.parse(userJson);
  document.getElementById('displayFullName').textContent = user.full_name;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
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

  document.getElementById('current-page-title').textContent =
    name === 'users' ? 'Kullanıcı Yönetimi' : 'Kumaş Bilgileri';

  if (name === 'fabrics' && allFabrics.length === 0) loadFabrics();
}

// --- KULLANICI YÖNETİMİ ---
async function fetchUsers() {
  toggleLoading(true);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "get_users" })
    });
    const result = await res.json();
    if (result.success) renderUserTable(result.data);
    else Swal.fire('Hata', result.message || 'Kullanıcılar alınamadı', 'error');
  } finally {
    toggleLoading(false);
  }
}

function renderUserTable(users) {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = "";

  (users || []).forEach(u => {
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
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "save_user", data })
    });
    const result = await res.json();

    if (result.success) {
      Swal.fire('Başarılı', result.message || 'Kaydedildi', 'success');
      closeUserModal();
      fetchUsers();
    } else {
      Swal.fire('Hata', result.message || 'Kayıt başarısız', 'error');
    }
  } finally {
    toggleLoading(false);
  }
});

function deleteUser(id) {
  Swal.fire({
    title: 'Emin misiniz?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sil',
    cancelButtonText: 'Vazgeç'
  }).then(async (r) => {
    if (!r.isConfirmed) return;

    toggleLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "delete_user", user_id: id })
      });
      const result = await res.json();

      if (result.success) fetchUsers();
      else Swal.fire('Hata', result.message || 'Silme başarısız', 'error');
    } finally {
      toggleLoading(false);
    }
  });
}

// --- KUMAŞ LİSTESİ ---
async function loadFabrics() {
  toggleLoading(true);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "get_fabric_catalog" })
    });
    const result = await res.json();

    if (result.success) {
      allFabrics = result.data || [];
      filteredFabrics = allFabrics;
      currentPage = 1;
      updateFabricTable();
    } else {
      Swal.fire('Hata', result.message || 'Kumaş listesi alınamadı', 'error');
    }
  } finally {
    toggleLoading(false);
  }
}

function updateFabricTable() {
  const tbody = document.getElementById('fabricTableBody');
  tbody.innerHTML = "";

  document.getElementById('totalFabricsBadge').textContent = `${filteredFabrics.length} Kayıt`;

  const start = (currentPage - 1) * rowsPerPage;
  const items = filteredFabrics.slice(start, start + rowsPerPage);

  items.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge">${escapeHtml(f.code || "")}</span></td>
      <td><b>${escapeHtml(f.name || "")}</b></td>
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

// --- TXT UPLOAD (KURAL: 5 sütun => 4 adet ';') ---
function handleFileUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const text = String(e.target.result || "");
      const parsed = parseErpTxtStrict(text);

      if (parsed.records.length === 0) {
        Swal.fire('Uyarı', 'TXT içinde geçerli kayıt bulunamadı.', 'warning');
        input.value = "";
        return;
      }

      const info =
        `Geçerli kayıt: ${parsed.records.length}\n` +
        `Atlanan satır: ${parsed.skippedTotal}\n` +
        `- Başlık: ${parsed.skippedHeader}\n` +
        `- ';' sayısı 4 değil: ${parsed.skippedBadDelimiterCount}\n` +
        `- Kod boş: ${parsed.skippedEmptyCode}\n` +
        `- Kolon sayısı 5 değil: ${parsed.skippedBadColumnCount}`;

      Swal.fire({
        title: 'Onay',
        text: `${info}\n\nSenkronizasyon yapılsın mı?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet',
        cancelButtonText: 'Vazgeç'
      }).then(r => {
        if (r.isConfirmed) syncWithBackend(parsed.records);
        else input.value = "";
      });

    } catch (err) {
      Swal.fire('Hata', 'TXT okunurken/parçalanırken hata oluştu: ' + String(err), 'error');
      input.value = "";
    }
  };

  reader.readAsText(file);
}

// Strict parser:
// - İlk satır başlık: her koşulda atlanır.
// - Her satır tek kayıt.
// - 5 sütun => satırda TAM 4 adet ';' olmalı.
// - Split sonrası TAM 5 kolon olmalı.
// - Kod zorunlu; Tanım boş olabilir.
function parseErpTxtStrict(rawText) {
  // newline normalize
  let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // BOM temizle
  text = text.replace(/^\uFEFF/, "");

  const lines = text
    .split("\n")
    .map(l => (l ?? "").trim())
    .filter(l => l.length > 0);

  let records = [];
  let skippedHeader = 0;
  let skippedBadDelimiterCount = 0;
  let skippedBadColumnCount = 0;
  let skippedEmptyCode = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1) Header: ilk satır her koşulda atlanır
    if (i === 0) {
      skippedHeader++;
      continue;
    }

    // 2) ';' sayısı tam 4 olmalı
    const semiCount = (line.match(/;/g) || []).length;
    if (semiCount !== 4) {
      skippedBadDelimiterCount++;
      continue;
    }

    // 3) Split: tam 5 kolon olmalı
    const parts = line.split(";").map(p => (p ?? "").trim());
    if (parts.length !== 5) {
      skippedBadColumnCount++;
      continue;
    }

    // 4) Kod zorunlu
    const code = String(parts[0] || "").trim().replace(/^\uFEFF/, "");
    if (!code) {
      skippedEmptyCode++;
      continue;
    }

    // 5) Tanım boş olabilir
    const name = String(parts[1] || "").trim();
    const width = String(parts[2] || "").trim();
    const gsm = String(parts[3] || "").trim();
    const unit = String(parts[4] || "").trim();

    records.push({ code, name, width, gsm, unit });
  }

  // Duplicate kod varsa SON GÖRÜLEN kalsın (ERP dosyası içinde tekrar varsa)
  const dedup = {};
  records.forEach(r => { dedup[r.code] = r; });
  records = Object.values(dedup);

  const skippedTotal =
    skippedHeader + skippedBadDelimiterCount + skippedBadColumnCount + skippedEmptyCode;

  return {
    records,
    skippedTotal,
    skippedHeader,
    skippedBadDelimiterCount,
    skippedBadColumnCount,
    skippedEmptyCode
  };
}

async function syncWithBackend(data) {
  toggleLoading(true);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "sync_fabrics", fabrics: data })
    });
    const result = await res.json();

    if (result.success) {
      Swal.fire(
        'Bitti',
        `Eklendi: ${result.data.added}, Güncellendi: ${result.data.updated}, Aynı: ${result.data.same}`,
        'success'
      );
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

function closeUserModal() {
  document.getElementById('userModal').classList.add('d-none');
}

function toggleLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('d-none', !show);
}

function nextPage() {
  if ((currentPage * rowsPerPage) < filteredFabrics.length) {
    currentPage++;
    updateFabricTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    updateFabricTable();
  }
}

// --- XSS kaçış ---
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str ?? "")
    .replaceAll("'", "&#039;")
    .replaceAll('"', "&quot;");
}
