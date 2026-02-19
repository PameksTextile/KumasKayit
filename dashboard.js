const API_URL = "https://script.google.com/macros/s/AKfycbwlswF2jfmFR54VdKUE8wsuf58vaK-R-Hekqsaednn6fjmdBWaXJRr6UfGvf3zPSf32Cw/exec";

// Global Değişkenler
let allFabrics = [];
let filteredFabrics = [];
let currentPage = 1;
let rowsPerPage = 50;
let entryCustomersLoaded = false;

/**
 * Sayfa yüklendiğinde çalışacak ana fonksiyon
 */
document.addEventListener('DOMContentLoaded', function() {
    // Oturum Kontrolü
    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userJson);
    document.getElementById('displayFullName').textContent = user.full_name;

    // Çıkış Butonu
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    // İlk açılışta kullanıcı listesini getir
    fetchUsers();
});

/**
 * Bölümler arası geçişi sağlar
 */
function showSection(name) {
    // DOM elemanlarını gizle/göster
    document.getElementById('section-users').classList.toggle('d-none', name !== 'users');
    document.getElementById('section-entry').classList.toggle('d-none', name !== 'entry');
    document.getElementById('section-fabrics').classList.toggle('d-none', name !== 'fabrics');

    // Menü aktiflik durumunu güncelle
    document.getElementById('menu-users').classList.toggle('active', name === 'users');
    document.getElementById('menu-entry').classList.toggle('active', name === 'entry');
    document.getElementById('menu-fabrics').classList.toggle('active', name === 'fabrics');

    // Başlığı güncelle
    const title = 
        name === 'users' ? 'Kullanıcı Yönetimi' : 
        name === 'entry' ? 'Kumaş Giriş' : 
        'Kumaş Bilgileri';
    document.getElementById('current-page-title').textContent = title;

    // Bölüme özel verileri yükle
    if (name === 'fabrics' && allFabrics.length === 0) loadFabrics();
    if (name === 'entry') initEntryFilters();
}

/**
 * Yükleme ekranını yönetir
 */
function toggleLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.toggle('d-none', !show);
    }
}

// ================================================================
// KUMAŞ GİRİŞ BÖLÜMÜ (Müşteri -> Plan -> Özet -> Detay)
// ================================================================

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
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "get_customers" }) 
        });
        const result = await res.json();
        
        if (!result.success) throw new Error(result.message);

        const customerSel = document.getElementById('entryCustomerSelect');
        customerSel.innerHTML = `<option value="">Müşteri Seçiniz</option>`;
        
        result.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            customerSel.appendChild(opt);
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Hata', text: 'Müşteriler yüklenemedi: ' + e.message });
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

    if (!customer) {
        badge.textContent = 'Müşteri seçin';
        return;
    }

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_plans_by_customer", customer: customer })
        });
        const result = await res.json();
        
        if (!result.success) throw new Error(result.message);

        result.data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            planSel.appendChild(opt);
        });

        planSel.disabled = false;
        badge.textContent = 'Plan seçin';
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Hata', text: e.message });
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

    if (!plan) {
        badge.textContent = 'Plan seçin';
        tbody.innerHTML = `<tr><td colspan="12">Plan seçiniz.</td></tr>`;
        return;
    }

    badge.textContent = 'Yükleniyor...';
    tbody.innerHTML = `<tr><td colspan="12">Yükleniyor...</td></tr>`;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_plan_summary", customer, plan })
        });
        const result = await res.json();
        
        if (!result.success) throw new Error(result.message);

        renderEntryMaster(result.data || []);
        badge.textContent = `Toplam: ${result.data.length} satır`;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="12">Hata: ${e.message}</td></tr>`;
    } finally {
        toggleLoading(false);
    }
}

function renderEntryMaster(rows) {
    const tbody = document.getElementById('entryMasterTbody');
    tbody.innerHTML = '';

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.dataset.lineId = r.line_id;

        const statusClass = r.status === 'Tamamlandı' ? 'status-aktif' : 'status-pasif';
        const remaining = r.target_qty - r.incoming_qty;

        tr.innerHTML = `
            <td>${r.model || '-'}</td>
            <td>${r.kumas || '-'}</td>
            <td>${r.renk || '-'}</td>
            <td>${r.alan || '-'}</td>
            <td>${r.desired_width || '-'}</td>
            <td>${r.desired_gsm || '-'}</td>
            <td style="font-weight:600;">${formatNumberTR(r.target_qty)}</td>
            <td style="color:var(--primary-color); font-weight:600;">${formatNumberTR(r.incoming_qty)}</td>
            <td style="color:${remaining <= 0 ? 'var(--success)' : 'var(--danger)'}">${formatNumberTR(remaining)}</td>
            <td>%${formatNumberTR(r.percent)}</td>
            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" title="Yeni Giriş" onclick="entryAdd('${r.line_id}')"><i class="fas fa-plus"></i></button>
                    <button class="action-btn" title="Kapat" onclick="entryClose('${r.line_id}')"><i class="fas fa-check"></i></button>
                    <button class="action-btn" title="Detay" onclick="entryDetail(this,'${r.line_id}')"><i class="fas fa-list"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Detay Tablosunu Doldurur (Gelen_Kumas hareketleri)
 */
async function entryDetail(btn, lineId) {
    clearSelectedRows();
    btn.closest('tr').classList.add('row-selected');

    const detailHint = document.getElementById('entryDetailHint');
    const detailCard = document.getElementById('entryDetailCard');
    const detailTbody = document.getElementById('entryDetailTbody');

    detailHint.classList.add('d-none');
    detailCard.classList.remove('d-none');
    detailTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Detaylar sorgulanıyor...</td></tr>`;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_entry_details", line_id: lineId })
        });
        const result = await res.json();

        if (!result.success) throw new Error(result.message);

        detailTbody.innerHTML = '';
        if (result.data.length === 0) {
            detailTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Bu satıra ait hareket bulunamadı.</td></tr>`;
        } else {
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.gelis_tarihi}</td>
                    <td>${item.parti_no}</td>
                    <td>${item.top_sayisi}</td>
                    <td style="font-weight:600;">${formatNumberTR(item.gelen_miktar)}</td>
                    <td>${item.birim}</td>
                    <td>${item.kumas_lokasyonu}</td>
                    <td>${item.sevk_tarihi}</td>
                `;
                detailTbody.appendChild(tr);
            });
        }
    } catch (e) {
        detailTbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger);">Hata: ${e.message}</td></tr>`;
    } finally {
        toggleLoading(false);
    }
}

function clearSelectedRows() {
    document.querySelectorAll('#entryMasterTbody tr').forEach(r => r.classList.remove('row-selected'));
}

function resetEntryDetail() {
    document.getElementById('entryDetailCard').classList.add('d-none');
    document.getElementById('entryDetailHint').classList.remove('d-none');
    clearSelectedRows();
}

// ================================================================
// KULLANICI YÖNETİMİ BÖLÜMÜ
// ================================================================

async function fetchUsers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "get_users" }) 
        });
        const result = await res.json();
        if (result.success) {
            renderUserTable(result.data);
        }
    } catch (e) {
        console.error("Kullanıcı listesi hatası:", e);
    } finally {
        toggleLoading(false);
    }
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
            <td><span class="badge">${String(u.role).toUpperCase()}</span></td>
            <td><span class="status-badge status-${u.status}">${String(u.status).toUpperCase()}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(u)})' title="Düzenle"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteUser('${u.user_id}')" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

function openCreateUserModal() {
    document.getElementById('userModalTitle').textContent = 'Yeni Kullanıcı Oluştur';
    document.getElementById('userForm').reset();
    document.getElementById('inputUserId').value = '';
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

function closeUserModal() {
    document.getElementById('userModal').classList.add('d-none');
}

document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userData = {
        user_id: document.getElementById('inputUserId').value || null,
        full_name: document.getElementById('inputFullName').value.trim(),
        username: document.getElementById('inputUsername').value.trim(),
        password: document.getElementById('inputPassword').value.trim(),
        mail: document.getElementById('inputMail').value.trim(),
        role: document.getElementById('inputRole').value,
        status: document.getElementById('inputStatus').value
    };

    if (!userData.full_name || !userData.username || !userData.password) {
        Swal.fire('Uyarı', 'Lütfen zorunlu alanları doldurun.', 'warning');
        return;
    }

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "save_user", data: userData })
        });
        const result = await res.json();
        
        if (result.success) {
            Swal.fire('Başarılı', result.message, 'success');
            closeUserModal();
            fetchUsers();
        } else {
            throw new Error(result.message);
        }
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    } finally {
        toggleLoading(false);
    }
});

async function deleteUser(userId) {
    const confirm = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Kullanıcı durumu 'silindi' olarak işaretlenecektir.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Evet, Sil',
        cancelButtonText: 'İptal'
    });

    if (confirm.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "delete_user", user_id: userId })
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Silindi', result.message, 'success');
                fetchUsers();
            }
        } catch (e) {
            Swal.fire('Hata', 'İşlem başarısız.', 'error');
        } finally {
            toggleLoading(false);
        }
    }
}

// ================================================================
// KUMAŞ BİLGİLERİ (KATALOG) BÖLÜMÜ
// ================================================================

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
            filteredFabrics = [...allFabrics];
            currentPage = 1;
            renderFabrics();
        }
    } catch (e) {
        console.error("Katalog yükleme hatası:", e);
    } finally {
        toggleLoading(false);
    }
}

function filterFabrics() {
    const query = document.getElementById('fabricSearch').value.toLowerCase().trim();
    filteredFabrics = allFabrics.filter(f => 
        String(f.code).toLowerCase().includes(query) || 
        String(f.name).toLowerCase().includes(query)
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
        tbody.innerHTML = `<tr><td colspan="5">Aranan kriterde kumaş bulunamadı.</td></tr>`;
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

    document.getElementById('totalFabricsBadge').textContent = `Toplam: ${filteredFabrics.length}`;
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(filteredFabrics.length / rowsPerPage) || 1;
    container.innerHTML = '';

    // Önceki Butonu
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-secondary';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderFabrics(); };

    // Bilgi
    const info = document.createElement('span');
    info.className = 'badge';
    info.textContent = `${currentPage} / ${totalPages}`;

    // Sonraki Butonu
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-secondary';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderFabrics(); };

    container.appendChild(prevBtn);
    container.appendChild(info);
    container.appendChild(nextBtn);
}

// ================================================================
// YARDIMCI ARAÇLAR & PLACEHOLDERS
// ================================================================

function formatNumberTR(n) {
    if (n === null || n === undefined || n === '') return '0,00';
    const num = Number(n);
    if (isNaN(num)) return n;
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function entryAdd(id) {
    Swal.fire('Bilgi', 'Yeni kumaş girişi (Gelen_Kumas kaydı) özelliği bir sonraki adımda eklenecektir.', 'info');
}

function entryClose(id) {
    Swal.fire('Bilgi', 'Plan kapatma özelliği bir sonraki adımda eklenecektir.', 'info');
}

async function handleFileUpload(input) {
    Swal.fire('Bilgi', 'ERP TXT senkronizasyon altyapısı hazır ancak dosya okuma mantığı bir sonraki adımda aktif edilecektir.', 'info');
    input.value = '';
}
