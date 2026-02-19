const API_URL = "https://script.google.com/macros/s/AKfycbxF0I9Du0TacfepOWbTpUlvL_u3feaLt4Qw75C6Gsl2gaAb2WDFtuBDi7A15tX2qc86/exec";

let allFabrics = [], filteredFabrics = [], currentPage = 1, rowsPerPage = 50;
let entryCustomersLoaded = false;

document.addEventListener('DOMContentLoaded', function() {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) { window.location.href = 'index.html'; return; }

    const user = JSON.parse(userJson);
    document.getElementById('displayFullName').textContent = user.full_name;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.clear(); window.location.href = 'index.html';
    });

    fetchUsers();
});

function showSection(name) {
    document.getElementById('section-users').classList.toggle('d-none', name !== 'users');
    document.getElementById('section-entry').classList.toggle('d-none', name !== 'entry');
    document.getElementById('section-fabrics').classList.toggle('d-none', name !== 'fabrics');

    document.getElementById('menu-users').classList.toggle('active', name === 'users');
    document.getElementById('menu-entry').classList.toggle('active', name === 'entry');
    document.getElementById('menu-fabrics').classList.toggle('active', name === 'fabrics');

    const title =
        name === 'users' ? 'Kullanıcı Yönetimi' :
        name === 'entry' ? 'Kumaş Giriş' :
        'Kumaş Bilgileri';
    document.getElementById('current-page-title').textContent = title;

    if (name === 'fabrics' && allFabrics.length === 0) loadFabrics();
    if (name === 'entry') initEntryFilters();
}

function toggleLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('d-none', !show);
}

// ============================
// KUMAŞ GİRİŞ – ÜST FİLTRE + MASTER
// ============================
async function initEntryFilters() {
    const planSel = document.getElementById('entryPlanSelect');
    const badge = document.getElementById('entryHintBadge');
    const tbody = document.getElementById('entryMasterTbody');

    if (!entryCustomersLoaded) {
        await loadEntryCustomers();
        entryCustomersLoaded = true;
    }

    planSel.innerHTML = `<option value="">Plan Seçiniz</option>`;
    planSel.disabled = true;
    badge.textContent = 'Müşteri seçin';

    tbody.innerHTML = `<tr><td colspan="12">Plan seçiniz.</td></tr>`;

    resetEntryDetail();
}

async function loadEntryCustomers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_customers" }) });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Müşteri listesi alınamadı.');

        const customerSel = document.getElementById('entryCustomerSelect');
        customerSel.innerHTML = `<option value="">Müşteri Seçiniz</option>`;
        result.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            customerSel.appendChild(opt);
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Hata', text: e.message || 'Bilinmeyen hata' });
    } finally {
        toggleLoading(false);
    }
}

async function onEntryCustomerChange() {
    const customer = document.getElementById('entryCustomerSelect').value;
    const planSel = document.getElementById('entryPlanSelect');
    const badge = document.getElementById('entryHintBadge');
    const tbody = document.getElementById('entryMasterTbody');

    planSel.innerHTML = `<option value="">Plan Seçiniz</option>`;
    planSel.disabled = true;
    tbody.innerHTML = `<tr><td colspan="12">Plan seçiniz.</td></tr>`;
    resetEntryDetail();

    if (!customer) { badge.textContent = 'Müşteri seçin'; return; }

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_plans_by_customer", customer })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Plan listesi alınamadı.');

        result.data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            planSel.appendChild(opt);
        });

        planSel.disabled = false;
        badge.textContent = 'Plan seçin';
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Hata', text: e.message || 'Bilinmeyen hata' });
        badge.textContent = 'Hata';
    } finally {
        toggleLoading(false);
    }
}

async function onEntryPlanChange() {
    const customer = document.getElementById('entryCustomerSelect').value;
    const plan = document.getElementById('entryPlanSelect').value;
    const badge = document.getElementById('entryHintBadge');
    const tbody = document.getElementById('entryMasterTbody');

    resetEntryDetail();

    if (!customer) { badge.textContent = 'Müşteri seçin'; return; }
    if (!plan) { badge.textContent = 'Plan seçin'; tbody.innerHTML = `<tr><td colspan="12">Plan seçiniz.</td></tr>`; return; }

    badge.textContent = 'Liste yükleniyor...';
    tbody.innerHTML = `<tr><td colspan="12">Yükleniyor...</td></tr>`;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_plan_summary", customer, plan })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Liste alınamadı.');

        renderEntryMaster(result.data || []);
        badge.textContent = `Toplam satır: ${result.data.length}`;
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Hata', text: e.message || 'Bilinmeyen hata' });
        badge.textContent = 'Hata';
        tbody.innerHTML = `<tr><td colspan="12">Hata oluştu.</td></tr>`;
    } finally {
        toggleLoading(false);
    }
}

function formatNumberTR(n, decimals = 2) {
    if (n === null || n === undefined || n === '') return '';
    const num = Number(n);
    if (isNaN(num)) return String(n);
    return num.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatRemaining(target, incoming) {
    const t = Number(target) || 0;
    const g = Number(incoming) || 0;
    const diff = t - g;
    if (diff < 0) return `+${formatNumberTR(Math.abs(diff), 2)} fazla`;
    return formatNumberTR(diff, 2);
}

function renderEntryMaster(rows) {
    const tbody = document.getElementById('entryMasterTbody');
    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    const frag = document.createDocumentFragment();
    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.dataset.lineId = r.line_id;

        const statusHtml = r.is_manual_closed
            ? `<span class="status-badge status-aktif">Tamamlandı (Manuel)</span>`
            : (r.status === 'Tamamlandı'
                ? `<span class="status-badge status-aktif">Tamamlandı</span>`
                : `<span class="status-badge status-pasif">Devam Ediyor</span>`);

        const desiredEnText = (r.desired_width === null || r.desired_width === undefined || r.desired_width === '') ? '' : String(r.desired_width);
        const desiredGsmText = (r.desired_gsm === null || r.desired_gsm === undefined || r.desired_gsm === '') ? '' : String(r.desired_gsm);

        tr.innerHTML = `
          <td>${r.model || ''}</td>
          <td>${r.kumas || ''}</td>
          <td>${r.renk || ''}</td>
          <td>${r.alan || ''}</td>
          <td>${desiredEnText}</td>
          <td>${desiredGsmText}</td>
          <td>${formatNumberTR(r.target_qty, 2)} ${r.unit || ''}</td>
          <td>${formatNumberTR(r.incoming_qty, 2)} ${r.unit || ''}</td>
          <td>${formatRemaining(r.target_qty, r.incoming_qty)} ${r.unit || ''}</td>
          <td>${formatNumberTR(r.percent, 2)}%</td>
          <td>${statusHtml}</td>
          <td>
            <button class="action-btn" title="Yeni Giriş" onclick="entryAdd('${r.line_id}')"><i class="fas fa-plus"></i></button>
            <button class="action-btn" title="Kapat" onclick="entryClose('${r.line_id}')"><i class="fas fa-check"></i></button>
            <button class="action-btn" title="Detay" onclick="entryDetail(this,'${r.line_id}')"><i class="fas fa-list"></i></button>
          </td>
        `;
        frag.appendChild(tr);
    });

    tbody.appendChild(frag);
}

function clearSelectedRows() {
    const rows = document.querySelectorAll('#entryMasterTbody tr');
    rows.forEach(r => r.classList.remove('row-selected'));
}

function resetEntryDetail() {
    document.getElementById('entryDetailCard').classList.add('d-none');
    document.getElementById('entryDetailHint').classList.remove('d-none');
    const dt = document.getElementById('entryDetailTbody');
    if (dt) dt.innerHTML = `<tr><td colspan="7">-</td></tr>`;
    clearSelectedRows();
}

// Placeholder: 3. adımda gerçek modal+detay yapacağız
function entryAdd(lineId) {
    Swal.fire({ icon: 'info', title: 'Sonraki adım', text: `Yeni giriş ekranını 3. adımda açacağız. line_id=${lineId}` });
}
function entryClose(lineId) {
    Swal.fire({ icon: 'info', title: 'Sonraki adım', text: `Kapatma işlemini 3. adımda Kapatmalar'a yazacağız. line_id=${lineId}` });
}
async function entryDetail(btn, lineId) {
    clearSelectedRows();
    const tr = btn.closest('tr');
    if (tr) tr.classList.add('row-selected');

    document.getElementById('entryDetailHint').classList.add('d-none');
    document.getElementById('entryDetailCard').classList.remove('d-none');
    document.getElementById('entryDetailTbody').innerHTML = `<tr><td colspan="7">Detaylar 3. adımda (line_id=${lineId}).</td></tr>`;
}

// ======================
// KULLANICI YÖNETİMİ
// ======================
async function fetchUsers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_users" })});
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
            <td>${u.full_name}</td>
            <td>${u.username}</td>
            <td>${u.mail || ''}</td>
            <td><span class="badge">${String(u.role || '').toUpperCase()}</span></td>
            <td><span class="status-badge status-${u.status}">${String(u.status || '').toUpperCase()}</span></td>
            <td>
                <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(u)})'><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="deleteUser('${u.user_id}')"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });
}

function openCreateUserModal() {
    document.getElementById('userModalTitle').textContent = 'Yeni Kullanıcı';
    document.getElementById('inputUserId').value = '';
    document.getElementById('inputFullName').value = '';
    document.getElementById('inputUsername').value = '';
    document.getElementById('inputPassword').value = '';
    document.getElementById('inputMail').value = '';
    document.getElementById('inputRole').value = 'user';
    document.getElementById('inputStatus').value = 'aktif';
    document.getElementById('userModal').classList.remove('d-none');
}
function openEditModal(u) {
    document.getElementById('userModalTitle').textContent = 'Kullanıcı Düzenle';
    document.getElementById('inputUserId').value = u.user_id || '';
    document.getElementById('inputFullName').value = u.full_name || '';
    document.getElementById('inputUsername').value = u.username || '';
    document.getElementById('inputPassword').value = u.password || '';
    document.getElementById('inputMail').value = u.mail || '';
    document.getElementById('inputRole').value = u.role || 'user';
    document.getElementById('inputStatus').value = u.status || 'aktif';
    document.getElementById('userModal').classList.remove('d-none');
}
function closeUserModal() { document.getElementById('userModal').classList.add('d-none'); }

document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        user_id: document.getElementById('inputUserId').value || null,
        full_name: document.getElementById('inputFullName').value.trim(),
        username: document.getElementById('inputUsername').value.trim(),
        password: document.getElementById('inputPassword').value.trim(),
        mail: document.getElementById('inputMail').value.trim(),
        role: document.getElementById('inputRole').value,
        status: document.getElementById('inputStatus').value
    };

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_user", data: payload })});
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Kaydedilemedi');
        closeUserModal();
        await fetchUsers();
        Swal.fire({ icon: 'success', title: 'Başarılı', text: result.message || 'Kaydedildi' });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Hata', text: err.message || 'Bilinmeyen hata' });
    } finally { toggleLoading(false); }
});

async function deleteUser(userId) {
    const ok = await Swal.fire({ icon: 'warning', title: 'Silinsin mi?', text: 'Kullanıcı silinecek.', showCancelButton: true, confirmButtonText: 'Evet', cancelButtonText: 'Vazgeç' });
    if (!ok.isConfirmed) return;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_user", user_id: userId })});
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Silinemedi');
        await fetchUsers();
        Swal.fire({ icon: 'success', title: 'Başarılı', text: result.message || 'Silindi' });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Hata', text: err.message || 'Bilinmeyen hata' });
    } finally { toggleLoading(false); }
}

// ======================
// KUMAŞ BİLGİLERİ (mevcut)
// ======================
async function loadFabrics() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_fabric_catalog" })});
        const result = await res.json();
        if (result.success) {
            allFabrics = result.data || [];
            filteredFabrics = [...allFabrics];
            currentPage = 1;
            renderFabrics();
        }
    } finally { toggleLoading(false); }
}

function filterFabrics() {
    const q = (document.getElementById('fabricSearch').value || '').toLowerCase().trim();
    filteredFabrics = allFabrics.filter(f =>
        String(f.code || '').toLowerCase().includes(q) || String(f.name || '').toLowerCase().includes(q)
    );
    currentPage = 1;
    renderFabrics();
}

function renderFabrics() {
    const tbody = document.getElementById('fabricTableBody');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * rowsPerPage;
    const pageItems = filteredFabrics.slice(start, start + rowsPerPage);

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Kayıt bulunamadı.</td></tr>`;
    } else {
        pageItems.forEach(f => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${f.code || ''}</td>
                <td>${f.name || ''}</td>
                <td>${f.width || ''}</td>
                <td>${f.gsm || ''}</td>
                <td>${f.unit || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const badge = document.getElementById('totalFabricsBadge');
    if (badge) badge.textContent = `Toplam: ${filteredFabrics.length}`;

    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(filteredFabrics.length / rowsPerPage));
    container.innerHTML = '';

    const prev = document.createElement('button');
    prev.className = 'btn-secondary';
    prev.disabled = currentPage <= 1;
    prev.textContent = 'Önceki';
    prev.onclick = () => { currentPage--; renderFabrics(); };

    const next = document.createElement('button');
    next.className = 'btn-secondary';
    next.disabled = currentPage >= totalPages;
    next.textContent = 'Sonraki';
    next.onclick = () => { currentPage++; renderFabrics(); };

    const info = document.createElement('span');
    info.className = 'badge';
    info.textContent = `${currentPage} / ${totalPages}`;

    container.appendChild(prev);
    container.appendChild(info);
    container.appendChild(next);
}

async function handleFileUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    Swal.fire({ icon: 'info', title: 'Bilgi', text: 'TXT yükleme akışı bu adımda değiştirilmedi.' });
    input.value = '';
}
