/**
 * dashboard.js - Frontend Uygulama Mantığı (Full Audit & Searchable UI)
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

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    fetchUsers();
});

/**
 * Loading Ekranı Kontrolü (UX Fix: Spinner mekanizması)
 */
function toggleLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.toggle('d-none', !show);
    }
}

/**
 * Bölüm Değiştirme
 */
function showSection(name) {
    document.getElementById('section-users').classList.add('d-none');
    document.getElementById('section-entry').classList.add('d-none');
    document.getElementById('section-fabrics').classList.add('d-none');

    document.getElementById('section-' + name).classList.remove('d-none');

    document.getElementById('menu-users').classList.remove('active');
    document.getElementById('menu-entry').classList.remove('active');
    document.getElementById('menu-fabrics').classList.remove('active');
    document.getElementById('menu-' + name).classList.add('active');

    if (name === 'users') {
        document.getElementById('current-page-title').textContent = 'Kullanıcı Yönetimi';
        fetchUsers();
    } 
    else if (name === 'entry') {
        document.getElementById('current-page-title').textContent = 'Kumaş Giriş';
        initEntryFilters();
    } 
    else if (name === 'fabrics') {
        document.getElementById('current-page-title').textContent = 'Kumaş Bilgileri';
        loadFabrics();
    }
}

// ================================================================
// 1. KUMAŞ GİRİŞ (SEARCHABLE UI & AUDIT LOG)
// ================================================================

async function initEntryFilters() {
    if (!entryCustomersLoaded) {
        await loadEntryCustomers();
        entryCustomersLoaded = true;
    }
    resetEntryUI();
}

function resetEntryUI() {
    document.getElementById('customerList').innerHTML = "";
    document.getElementById('planList').innerHTML = "";
    document.getElementById('entryCustomerInput').value = "";
    document.getElementById('entryPlanInput').value = "";
    document.getElementById('entryPlanInput').disabled = true;
    document.getElementById('entryHintBadge').textContent = 'Müşteri seçin';
    document.getElementById('entryMasterTbody').innerHTML = `<tr><td colspan="12">Müşteri ve Plan seçiniz.</td></tr>`;
    resetEntryDetail();
}

/**
 * Müşterileri Datalist'e Yükle (Arama Fonksiyonu)
 */
async function loadEntryCustomers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_customers" }) });
        const result = await res.json();
        const list = document.getElementById('customerList');
        list.innerHTML = "";
        result.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            list.appendChild(opt);
        });
    } catch {
        Swal.fire('Hata', 'Müşteriler yüklenemedi.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Müşteri Seçilince Planları Datalist'e Yükle
 */
async function onEntryCustomerChange() {
    const customer = document.getElementById('entryCustomerInput').value;
    const planInput = document.getElementById('entryPlanInput');
    const planList = document.getElementById('planList');
    
    planInput.value = "";
    planInput.disabled = true;
    planList.innerHTML = "";

    if (!customer) return;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_plans_by_customer", customer }) });
        const result = await res.json();
        result.data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            planList.appendChild(opt);
        });
        planInput.disabled = false;
        document.getElementById('entryHintBadge').textContent = 'Plan no yazın...';
    } finally {
        toggleLoading(false);
    }
}

/**
 * Plan Seçilince Tabloyu Getir
 */
async function onEntryPlanChange() {
    const customer = document.getElementById('entryCustomerInput').value;
    const plan = document.getElementById('entryPlanInput').value;
    const tbody = document.getElementById('entryMasterTbody');
    
    if (!plan) return;

    tbody.innerHTML = `<tr><td colspan="12">Yükleniyor...</td></tr>`;
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "get_plan_summary", customer, plan }) 
        });
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
        
        let statusClr = 'status-pasif';
        if (r.status === 'Tamamlandı' || r.status === 'Manuel Kapatıldı') statusClr = 'status-aktif';

        let actionBtns = '';
        if (r.status === 'Manuel Kapatıldı') {
            actionBtns = `<button class="action-btn edit-btn" title="Geri Aç" onclick="entryReopen('${r.line_id}')"><i class="fas fa-undo"></i></button>`;
        } else if (r.status === 'Devam Ediyor') {
            actionBtns = `<button class="action-btn success-btn" title="Planı Kapat" onclick="entryClose('${r.line_id}')"><i class="fas fa-check"></i></button>`;
        }

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
                    <button class="action-btn add-btn" title="Yeni Giriş" onclick="entryAdd('${r.line_id}')"><i class="fas fa-plus"></i></button>
                    ${actionBtns}
                    <button class="action-btn detail-btn" title="Hareketler" onclick="entryDetail(this,'${r.line_id}')"><i class="fas fa-list"></i> Detay</button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

/**
 * Detay Tablosu (UX Fix: Spinner properly closed)
 */
async function entryDetail(btn, lineId) {
    clearSelectedRows();
    btn.closest('tr').classList.add('row-selected');
    document.getElementById('entryDetailHint').classList.add('d-none');
    
    const card = document.getElementById('entryDetailCard');
    const tbody = document.getElementById('entryDetailTbody');
    card.classList.remove('d-none');
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Yükleniyor...</td></tr>`;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "get_entry_details", line_id: lineId }) 
        });
        const result = await res.json();
        tbody.innerHTML = '';
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Hareket bulunamadı.</td></tr>`;
        } else {
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.gelis_tarihi}</td>
                    <td>${item.parti_no}</td>
                    <td>${item.top_sayisi}</td>
                    <td style="font-weight:600;">${formatNumberTR(item.gelen_miktar)}</td>
                    <td>${item.birim || '-'}</td>
                    <td>${item.gelen_en || '-'}</td>
                    <td>${item.gelen_gramaj || '-'}</td>
                    <td>${item.kumas_lokasyonu || '-'}</td>
                    <td>${item.sevk_tarihi || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" title="Düzenle" onclick='editEntry(${JSON.stringify(item)})'><i class="fas fa-edit"></i></button>
                            <button class="action-btn delete-btn" title="Sil" onclick="deleteEntry(${item.row_index}, '${lineId}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        }
    } finally {
        toggleLoading(false);
    }
}

// ================================================================
// FONKSİYONLAR: GİRİŞ, DÜZENLEME, SİLME (WITH AUDIT LOG)
// ================================================================

function entryAdd(lineId) {
    document.getElementById('entryForm').reset();
    document.getElementById('entryLineId').value = lineId;
    document.getElementById('inGelisTarihi').value = new Date().toISOString().split('T')[0];
    document.getElementById('entryModal').classList.remove('d-none');
}

function closeEntryModal() { document.getElementById('entryModal').classList.add('d-none'); }

// Yeni Giriş Formu (Audit Log: Oluşturan Bilgisi)
document.getElementById('entryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const data = {
        line_id: document.getElementById('entryLineId').value,
        gelis_tarihi: document.getElementById('inGelisTarihi').value,
        parti_no: document.getElementById('inPartiNo').value,
        top_sayisi: document.getElementById('inTopSayisi').value,
        gelen_miktar: document.getElementById('inGelenMiktar').value,
        gelen_en: document.getElementById('inGelenEn').value,
        gelen_gramaj: document.getElementById('inGelenGramaj').value,
        kullanilabilir_en: document.getElementById('inKullanilabilirEn').value,
        lokasyon: document.getElementById('inLokasyon').value,
        user_name: user.full_name // AUDIT
    };
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_entry", data }) });
        const result = await res.json();
        if (result.success) {
            Swal.fire('Başarılı', 'Kayıt ve Audit Log oluşturuldu.', 'success');
            closeEntryModal();
            await onEntryPlanChange();
        }
    } finally { toggleLoading(false); }
});

function editEntry(item) {
    document.getElementById('editRowIndex').value = item.row_index;
    document.getElementById('editLineId').value = document.querySelector('.row-selected').dataset.lineId;
    if(item.gelis_tarihi && item.gelis_tarihi !== "-") {
        const parts = item.gelis_tarihi.split('.');
        document.getElementById('editGelisTarihi').value = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    document.getElementById('editPartiNo').value = item.parti_no === "-" ? "" : item.parti_no;
    document.getElementById('editTopSayisi').value = item.top_sayisi;
    document.getElementById('editGelenMiktar').value = item.gelen_miktar;
    document.getElementById('editGelenEn').value = item.gelen_en === "-" ? "" : item.gelen_en;
    document.getElementById('editGelenGramaj').value = item.gelen_gramaj === "-" ? "" : item.gelen_gramaj;
    document.getElementById('editKullanilabilirEn').value = item.kullanilabilir_en === "-" ? "" : item.kullanilabilir_en;
    document.getElementById('editLokasyon').value = item.kumas_lokasyonu === "-" ? "" : item.kumas_lokasyonu;
    
    // Sevk Tarihi Düzenleme
    if(item.sevk_tarihi && item.sevk_tarihi !== "-") {
        const partsS = item.sevk_tarihi.split('.');
        document.getElementById('editSevkTarihi').value = `${partsS[2]}-${partsS[1]}-${partsS[0]}`;
    } else {
        document.getElementById('editSevkTarihi').value = "";
    }

    document.getElementById('editEntryModal').classList.remove('d-none');
}

function closeEditEntryModal() { document.getElementById('editEntryModal').classList.add('d-none'); }

// Güncelleme Formu (Audit Log: Düzenleyen Bilgisi + Yeni Alanlar)
document.getElementById('editEntryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const lineId = document.getElementById('editLineId').value;
    const data = {
        row_index: document.getElementById('editRowIndex').value,
        gelis_tarihi: document.getElementById('editGelisTarihi').value,
        parti_no: document.getElementById('editPartiNo').value,
        top_sayisi: document.getElementById('editTopSayisi').value,
        gelen_miktar: document.getElementById('editGelenMiktar').value,
        gelen_en: document.getElementById('editGelenEn').value,
        gelen_gramaj: document.getElementById('editGelenGramaj').value,
        kullanilabilir_en: document.getElementById('editKullanilabilirEn').value,
        lokasyon: document.getElementById('editLokasyon').value,
        sevk_tarihi: document.getElementById('editSevkTarihi').value,
        user_name: user.full_name // AUDIT
    };
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "update_entry", data }) });
        const result = await res.json();
        if (result.success) {
            Swal.fire('Güncellendi', 'Veriler ve Audit Log güncellendi.', 'success');
            closeEditEntryModal();
            await onEntryPlanChange();
            const targetBtn = document.querySelector(`tr[data-line-id="${lineId}"] .action-btn.detail-btn`);
            if(targetBtn) targetBtn.click();
        }
    } finally { toggleLoading(false); }
});

/**
 * Manuel Kapatma
 */
async function entryClose(lineId) {
    const { value: text } = await Swal.fire({
        title: 'Planı Manuel Kapat',
        input: 'textarea',
        inputLabel: 'Kapatma Notu',
        inputPlaceholder: 'Neden kapatıldığını yazınız...',
        showCancelButton: true
    });
    if (text) {
        const user = JSON.parse(sessionStorage.getItem('user'));
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "close_plan", data: { line_id: lineId, note: text, user_id: user.user_id, user_name: user.full_name } })
            });
            if ((await res.json()).success) {
                Swal.fire('Kapatıldı', 'Plan manuel statüye alındı.', 'success');
                await onEntryPlanChange();
            }
        } finally { toggleLoading(false); }
    }
}

/**
 * Geri Açma
 */
async function entryReopen(lineId) {
    const confirm = await Swal.fire({ title: 'Plan Geri Açılsın mı?', icon: 'question', showCancelButton: true });
    if (confirm.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "reopen_plan", line_id: lineId }) });
            if ((await res.json()).success) {
                Swal.fire('Geri Açıldı', 'Plan tekrar aktif.', 'success');
                await onEntryPlanChange();
            }
        } finally { toggleLoading(false); }
    }
}

async function deleteEntry(rowIdx, lineId) {
    const confirm = await Swal.fire({ title: 'Emin misiniz?', icon: 'warning', showCancelButton: true });
    if (confirm.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_entry", row_idx: rowIdx }) });
            if ((await res.json()).success) {
                Swal.fire('Silindi', 'Kayıt silindi.', 'success');
                await onEntryPlanChange();
                const targetBtn = document.querySelector(`tr[data-line-id="${lineId}"] .action-btn.detail-btn`);
                if(targetBtn) targetBtn.click();
            }
        } finally { toggleLoading(false); }
    }
}

function clearSelectedRows() { document.querySelectorAll('#entryMasterTbody tr').forEach(r => r.classList.remove('row-selected')); }
function resetEntryDetail() { document.getElementById('entryDetailCard').classList.add('d-none'); document.getElementById('entryDetailHint').classList.remove('d-none'); clearSelectedRows(); }

// ================================================================
// 2. KULLANICI YÖNETİMİ & KATALOG (DEĞİŞMEDİ - STABİL)
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
            tr.innerHTML = `<td>${u.full_name}</td><td>${u.username}</td><td>${u.mail || ''}</td><td><span class="badge">${u.role.toUpperCase()}</span></td><td><span class="status-badge status-${u.status}">${u.status.toUpperCase()}</span></td>
                <td><div class="action-buttons"><button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(u)})'><i class="fas fa-edit"></i></button><button class="action-btn delete-btn" onclick="deleteUser('${u.user_id}')"><i class="fas fa-trash"></i></button></div></td>`;
            tbody.appendChild(tr);
        });
    } finally { toggleLoading(false); }
}

function openCreateUserModal() { document.getElementById('userModalTitle').textContent = 'Yeni Kullanıcı'; document.getElementById('userForm').reset(); document.getElementById('inputUserId').value = ''; document.getElementById('userModal').classList.remove('d-none'); }
function openEditModal(u) { document.getElementById('userModalTitle').textContent = 'Kullanıcı Düzenle'; document.getElementById('inputUserId').value = u.user_id; document.getElementById('inputFullName').value = u.full_name; document.getElementById('inputUsername').value = u.username; document.getElementById('inputPassword').value = u.password; document.getElementById('inputMail').value = u.mail; document.getElementById('inputRole').value = u.role; document.getElementById('inputStatus').value = u.status; document.getElementById('userModal').classList.remove('d-none'); }
function closeUserModal() { document.getElementById('userModal').classList.add('d-none'); }

document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = { user_id: document.getElementById('inputUserId').value || null, full_name: document.getElementById('inputFullName').value, username: document.getElementById('inputUsername').value, password: document.getElementById('inputPassword').value, mail: document.getElementById('inputMail').value, role: document.getElementById('inputRole').value, status: document.getElementById('inputStatus').value };
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_user", data }) });
        if ((await res.json()).success) { Swal.fire('Başarılı', 'Kullanıcı kaydedildi.', 'success'); closeUserModal(); fetchUsers(); }
    } finally { toggleLoading(false); }
});

async function deleteUser(id) {
    const c = await Swal.fire({ title: 'Emin misiniz?', icon: 'warning', showCancelButton: true });
    if (c.isConfirmed) {
        toggleLoading(true);
        try {
            await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_user", user_id: id }) });
            fetchUsers();
        } finally { toggleLoading(false); }
    }
}

async function loadFabrics() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_fabric_catalog" }) });
        const r = await res.json();
        allFabrics = filteredFabrics = r.data || [];
        currentPage = 1; renderFabrics();
    } finally { toggleLoading(false); }
}

function filterFabrics() {
    const q = document.getElementById('fabricSearch').value.toLowerCase().trim();
    filteredFabrics = allFabrics.filter(f => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    currentPage = 1; renderFabrics();
}

function renderFabrics() {
    const tbody = document.getElementById('fabricTableBody');
    tbody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const items = filteredFabrics.slice(start, start + rowsPerPage);
    if (items.length === 0) { tbody.innerHTML = `<tr><td colspan="5">Kayıt bulunamadı.</td></tr>`; } 
    else { items.forEach(f => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${f.code}</td><td>${f.name}</td><td>${f.width}</td><td>${f.gsm}</td><td>${f.unit}</td>`; tbody.appendChild(tr); }); }
    document.getElementById('totalFabricsBadge').textContent = `Toplam: ${filteredFabrics.length}`;
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredFabrics.length / rowsPerPage) || 1;
    container.innerHTML = `<button class="btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="currentPage--; renderFabrics();">Geri</button><span class="badge">${currentPage} / ${totalPages}</span><button class="btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="currentPage++; renderFabrics();">İleri</button>`;
}

function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        Swal.fire('Bilgi', 'ERP Yükleme fonksiyonun tetiklendi.', 'info');
    };
    reader.readAsText(file);
}

function formatNumberTR(n) { if (n === null || n === undefined) return "0,00"; return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
