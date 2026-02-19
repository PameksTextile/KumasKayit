/**
 * dashboard.js - Frontend Uygulama Mantığı (Tam ve İşlevsel Sürüm)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbwlswF2jfmFR54VdKUE8wsuf58vaK-R-Hekqsaednn6fjmdBWaXJRr6UfGvf3zPSf32Cw/exec";

// Global Uygulama Durumu
let allFabrics = [];
let filteredFabrics = [];
let currentPage = 1;
let rowsPerPage = 50;
let entryCustomersLoaded = false;

/**
 * Sayfa Yükleme ve Oturum Kontrolü
 */
document.addEventListener('DOMContentLoaded', function() {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userJson);
    document.getElementById('displayFullName').textContent = user.full_name;

    // Çıkış Butonu Dinleyicisi
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    // Başlangıç Bölümü
    fetchUsers();
});

/**
 * Loading Ekranı Kontrolü
 */
function toggleLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        if (show) loader.classList.remove('d-none');
        else loader.classList.add('d-none');
    }
}

/**
 * Bölüm Değiştirme (SPA Mantığı)
 */
function showSection(name) {
    // Tüm bölümleri gizle
    document.getElementById('section-users').classList.add('d-none');
    document.getElementById('section-entry').classList.add('d-none');
    document.getElementById('section-fabrics').classList.add('d-none');

    // Hedef bölümü göster
    document.getElementById('section-' + name).classList.remove('d-none');

    // Menü linklerini güncelle
    document.getElementById('menu-users').classList.remove('active');
    document.getElementById('menu-entry').classList.remove('active');
    document.getElementById('menu-fabrics').classList.remove('active');
    document.getElementById('menu-' + name).classList.add('active');

    // Başlık ve Veri Yükleme
    if (name === 'users') {
        document.getElementById('current-page-title').textContent = 'Kullanıcı Yönetimi';
        fetchUsers();
    } else if (name === 'entry') {
        document.getElementById('current-page-title').textContent = 'Kumaş Giriş';
        initEntryFilters();
    } else if (name === 'fabrics') {
        document.getElementById('current-page-title').textContent = 'Kumaş Bilgileri';
        loadFabrics();
    }
}

// ================================================================
// 1. BÖLÜM: KUMAŞ GİRİŞ (PLANLAMA VE HAREKETLER)
// ================================================================

async function initEntryFilters() {
    if (!entryCustomersLoaded) {
        await loadEntryCustomers();
        entryCustomersLoaded = true;
    }
    resetEntryUI();
}

function resetEntryUI() {
    document.getElementById('entryPlanSelect').innerHTML = `<option value="">Plan Seçiniz</option>`;
    document.getElementById('entryPlanSelect').disabled = true;
    document.getElementById('entryHintBadge').textContent = 'Müşteri seçin';
    document.getElementById('entryMasterTbody').innerHTML = `<tr><td colspan="12">Plan seçiniz.</td></tr>`;
    resetEntryDetail();
}

async function loadEntryCustomers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_customers" }) });
        const result = await res.json();
        const sel = document.getElementById('entryCustomerSelect');
        sel.innerHTML = `<option value="">Müşteri Seçiniz</option>`;
        result.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = c;
            sel.appendChild(opt);
        });
    } catch (e) {
        Swal.fire('Hata', 'Müşteriler yüklenemedi.', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function onEntryCustomerChange() {
    const customer = document.getElementById('entryCustomerSelect').value;
    const planSel = document.getElementById('entryPlanSelect');
    resetEntryUI();
    if (!customer) return;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_plans_by_customer", customer }) });
        const result = await res.json();
        result.data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = p;
            planSel.appendChild(opt);
        });
        planSel.disabled = false;
        document.getElementById('entryHintBadge').textContent = 'Plan seçin';
    } finally {
        toggleLoading(false);
    }
}

async function onEntryPlanChange() {
    const customer = document.getElementById('entryCustomerSelect').value;
    const plan = document.getElementById('entryPlanSelect').value;
    const tbody = document.getElementById('entryMasterTbody');
    resetEntryDetail();
    if (!plan) return;

    tbody.innerHTML = `<tr><td colspan="12">Yükleniyor...</td></tr>`;
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_plan_summary", customer, plan }) });
        const result = await res.json();
        renderEntryMaster(result.data || []);
        document.getElementById('entryHintBadge').textContent = `Toplam: ${result.data.length} kalem`;
    } finally {
        toggleLoading(false);
    }
}

function renderEntryMaster(rows) {
    const tbody = document.getElementById('entryMasterTbody');
    tbody.innerHTML = rows.length ? '' : `<tr><td colspan="12">Kayıt yok.</td></tr>`;
    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.dataset.lineId = r.line_id;
        const diff = r.target_qty - r.incoming_qty;
        const statusClr = r.status === 'Tamamlandı' ? 'status-aktif' : 'status-pasif';

        // İstenen En ve Gramaj için undefined kontrolü eklenmiştir
        tr.innerHTML = `
            <td>${r.model || '-'}</td>
            <td>${r.kumas || '-'}</td>
            <td>${r.renk || '-'}</td>
            <td>${r.alan || '-'}</td>
            <td>${r.desired_width || '-'}</td>
            <td>${r.desired_gsm || '-'}</td>
            <td>${formatNumberTR(r.target_qty)}</td>
            <td>${formatNumberTR(r.incoming_qty)}</td>
            <td style="color:${diff <= 0 ? 'green' : 'red'}">${formatNumberTR(diff)}</td>
            <td>%${formatNumberTR(r.percent)}</td>
            <td><span class="status-badge ${statusClr}">${r.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" title="Giriş Yap" onclick="entryAdd('${r.line_id}')"><i class="fas fa-plus"></i></button>
                    <button class="action-btn" title="Planı Kapat" onclick="entryClose('${r.line_id}')"><i class="fas fa-check"></i></button>
                    <button class="action-btn" title="Detaylar" onclick="entryDetail(this,'${r.line_id}')"><i class="fas fa-list"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

/**
 * HAREKET DETAYLARI - EN, GRAMAJ VE İŞLEMLER DAHİL
 */
async function entryDetail(btn, lineId) {
    clearSelectedRows();
    btn.closest('tr').classList.add('row-selected');
    
    document.getElementById('entryDetailHint').classList.add('d-none');
    const card = document.getElementById('entryDetailCard');
    const tbody = document.getElementById('entryDetailTbody');
    
    card.classList.remove('d-none');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Yükleniyor...</td></tr>`;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_entry_details", line_id: lineId }) });
        const result = await res.json();
        tbody.innerHTML = '';
        
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Henüz hareket kaydı yok.</td></tr>`;
        } else {
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.gelis_tarihi}</td>
                    <td>${item.parti_no}</td>
                    <td>${item.top_sayisi}</td>
                    <td style="font-weight:600;">${formatNumberTR(item.gelen_miktar)}</td>
                    <td>${item.gelen_en || '-'}</td>
                    <td>${item.gelen_gramaj || '-'}</td>
                    <td>${item.kumas_lokasyonu}</td>
                    <td>${item.sevk_tarihi}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="editEntry(${JSON.stringify(item)})"><i class="fas fa-edit"></i></button>
                            <button class="action-btn delete-btn" onclick="deleteEntry(${item.row_index}, '${lineId}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Yeni Kumaş Giriş Kaydı
 */
async function entryAdd(lineId) {
    const { value: formValues } = await Swal.fire({
        title: 'Yeni Kumaş Girişi',
        html:
            '<input id="swal-parti" class="swal2-input" placeholder="Parti No">' +
            '<input id="swal-top" type="number" class="swal2-input" placeholder="Top Sayısı">' +
            '<input id="swal-miktar" type="number" step="0.01" class="swal2-input" placeholder="Miktar">' +
            '<input id="swal-en" type="number" class="swal2-input" placeholder="Gelen En (cm)">' +
            '<input id="swal-gramaj" type="number" class="swal2-input" placeholder="Gelen Gramaj (gr/m²)">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        preConfirm: () => {
            return {
                parti_no: document.getElementById('swal-parti').value,
                top_sayisi: document.getElementById('swal-top').value,
                gelen_miktar: document.getElementById('swal-miktar').value,
                gelen_en: document.getElementById('swal-en').value,
                gelen_gramaj: document.getElementById('swal-gramaj').value
            }
        }
    });

    if (formValues) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "save_fabric_entry", line_id: lineId, data: formValues })
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Başarılı', 'Kayıt eklendi.', 'success');
                onEntryPlanChange();
            }
        } finally {
            toggleLoading(false);
        }
    }
}

/**
 * Mevcut Hareketi Düzenle
 */
async function editEntry(item) {
    const { value: formValues } = await Swal.fire({
        title: 'Kaydı Düzenle',
        html:
            `<input id="swal-parti" class="swal2-input" placeholder="Parti No" value="${item.parti_no}">` +
            `<input id="swal-top" type="number" class="swal2-input" placeholder="Top Sayısı" value="${item.top_sayisi}">` +
            `<input id="swal-miktar" type="number" step="0.01" class="swal2-input" placeholder="Miktar" value="${item.gelen_miktar}">` +
            `<input id="swal-en" type="number" class="swal2-input" placeholder="Gelen En (cm)" value="${item.gelen_en}">` +
            `<input id="swal-gramaj" type="number" class="swal2-input" placeholder="Gelen Gramaj (gr/m²)" value="${item.gelen_gramaj}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Güncelle',
        preConfirm: () => {
            return {
                row_idx: item.row_index,
                parti_no: document.getElementById('swal-parti').value,
                top_sayisi: document.getElementById('swal-top').value,
                gelen_miktar: document.getElementById('swal-miktar').value,
                gelen_en: document.getElementById('swal-en').value,
                gelen_gramaj: document.getElementById('swal-gramaj').value
            }
        }
    });

    if (formValues) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "update_fabric_entry", data: formValues })
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Güncellendi', 'Değişiklikler kaydedildi.', 'success');
                onEntryPlanChange();
            }
        } finally {
            toggleLoading(false);
        }
    }
}

/**
 * Planı Kapat (Manuel Kapatma)
 */
async function entryClose(lineId) {
    const confirm = await Swal.fire({
        title: 'Plan Kapatılsın mı?',
        text: "Bu işlem miktar dolmasa bile durumu 'Tamamlandı' yapacaktır.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet, Kapat'
    });

    if (confirm.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "close_plan", line_id: lineId })
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Kapatıldı', 'Plan durumu güncellendi.', 'success');
                onEntryPlanChange();
            }
        } finally {
            toggleLoading(false);
        }
    }
}

async function deleteEntry(rowIdx, lineId) {
    const confirm = await Swal.fire({ title: 'Emin misiniz?', text: "Bu giriş kaydı silinecek!", icon: 'warning', showCancelButton: true, confirmButtonText: 'Sil', cancelButtonText: 'İptal' });
    if (confirm.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_entry", row_idx: rowIdx }) });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Silindi', 'Kayıt başarıyla silindi.', 'success');
                onEntryPlanChange();
            }
        } finally {
            toggleLoading(false);
        }
    }
}

function clearSelectedRows() { document.querySelectorAll('#entryMasterTbody tr').forEach(r => r.classList.remove('row-selected')); }
function resetEntryDetail() { document.getElementById('entryDetailCard').classList.add('d-none'); document.getElementById('entryDetailHint').classList.remove('d-none'); clearSelectedRows(); }

// ================================================================
// 2. BÖLÜM: KULLANICI YÖNETİMİ (Mevcut kodun korunmuştur)
// ================================================================

async function fetchUsers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_users" })});
        const result = await res.json();
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = "";
        result.data.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.full_name}</td><td>${u.username}</td><td>${u.mail||''}</td>
                <td><span class="badge">${u.role.toUpperCase()}</span></td>
                <td><span class="status-badge status-${u.status}">${u.status.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(u)})'><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" onclick="deleteUser('${u.user_id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } finally { toggleLoading(false); }
}

function openCreateUserModal() {
    document.getElementById('userModalTitle').textContent = 'Yeni Kullanıcı';
    document.getElementById('userForm').reset();
    document.getElementById('inputUserId').value = '';
    document.getElementById('userModal').classList.remove('d-none');
}

function openEditModal(u) {
    document.getElementById('userModalTitle').textContent = 'Kullanıcı Düzenle';
    document.getElementById('inputUserId').value = u.user_id;
    document.getElementById('inputFullName').value = u.full_name;
    document.getElementById('inputUsername').value = u.username;
    document.getElementById('inputPassword').value = u.password;
    document.getElementById('inputMail').value = u.mail;
    document.getElementById('inputRole').value = u.role;
    document.getElementById('inputStatus').value = u.status;
    document.getElementById('userModal').classList.remove('d-none');
}

function closeUserModal() { document.getElementById('userModal').classList.add('d-none'); }

document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = {
        user_id: document.getElementById('inputUserId').value || null,
        full_name: document.getElementById('inputFullName').value,
        username: document.getElementById('inputUsername').value,
        password: document.getElementById('inputPassword').value,
        mail: document.getElementById('inputMail').value,
        role: document.getElementById('inputRole').value,
        status: document.getElementById('inputStatus').value
    };
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_user", data })});
        const result = await res.json();
        if (result.success) {
            Swal.fire('Başarılı', result.message, 'success');
            closeUserModal(); fetchUsers();
        }
    } finally { toggleLoading(false); }
});

async function deleteUser(id) {
    const c = await Swal.fire({ title: 'Emin misiniz?', text: 'Kullanıcı silindi olarak işaretlenecek.', icon: 'warning', showCancelButton: true });
    if (c.isConfirmed) {
        toggleLoading(true);
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_user", user_id: id })});
        fetchUsers();
        toggleLoading(false);
    }
}

// ================================================================
// 3. BÖLÜM: KUMAŞ KATALOĞU (Mevcut kodun korunmuştur)
// ================================================================

async function loadFabrics() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_fabric_catalog" })});
        const r = await res.json();
        allFabrics = filteredFabrics = r.data || [];
        currentPage = 1;
        renderFabrics();
    } finally { toggleLoading(false); }
}

function filterFabrics() {
    const q = document.getElementById('fabricSearch').value.toLowerCase().trim();
    filteredFabrics = allFabrics.filter(f => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    currentPage = 1;
    renderFabrics();
}

function renderFabrics() {
    const tbody = document.getElementById('fabricTableBody');
    tbody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const items = filteredFabrics.slice(start, start + rowsPerPage);
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Kayıt bulunamadı.</td></tr>`;
    } else {
        items.forEach(f => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${f.code}</td><td>${f.name}</td><td>${f.width}</td><td>${f.gsm}</td><td>${f.unit}</td>`;
            tbody.appendChild(tr);
        });
    }
    document.getElementById('totalFabricsBadge').textContent = `Toplam: ${filteredFabrics.length}`;
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredFabrics.length / rowsPerPage) || 1;
    container.innerHTML = `
        <button class="btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="currentPage--; renderFabrics();">Geri</button>
        <span class="badge">${currentPage} / ${totalPages}</span>
        <button class="btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="currentPage++; renderFabrics();">İleri</button>
    `;
}

// ================================================================
// YARDIMCI ARAÇLAR
// ================================================================

function formatNumberTR(n) {
    if (n === null || n === undefined) return "0,00";
    return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
