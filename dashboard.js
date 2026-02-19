/**
 * dashboard.js - Frontend Uygulama Mantığı (SVG Icon'lu + Mobil Uyumlu + Audit Log)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbwlswF2jfmFR54VdKUE8wsuf58vaK-R-Hekqsaednn6fjmdBWaXJRr6UfGvf3zPSf32Cw/exec";

// Global Uygulama Durumu
let allFabrics = [];
let filteredFabrics = [];
let currentPage = 1;
let rowsPerPage = 50;
let entryCustomersLoaded = false;

// Dropdown Veri Havuzu
let currentCustomerList = [];
let currentPlanList = [];

// ============================================
// SVG ICON KÜTÜPHANESİ (Font Awesome Yerine)
// ============================================
const SVG_ICONS = {
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    undo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg>`,
    list: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

/**
 * ============================================
 * SAYFA YÜKLEME VE MOBİL MENÜ KONTROLÜ
 * ============================================
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

    // ============================================
    // MOBİL HAMBURGER MENÜ KONTROLÜ
    // ============================================
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    // Hamburger menü toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }
    
    // Overlay'e tıklandığında menüyü kapat
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    // Menü linklerine tıklandığında mobilde sidebar'ı kapat
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });

    // ============================================
    // DROPDOWN KONTROLÜ (Sayfa dışına tıklandığında kapat)
    // ============================================
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.searchable-select')) {
            hideAllDropdowns();
        }
    });

    // İlk sayfa yüklemesi
    fetchUsers();
});

/**
 * ============================================
 * LOADING EKRANI KONTROLÜ
 * ============================================
 */
function toggleLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.toggle('d-none', !show);
    }
}

/**
 * ============================================
 * BÖLÜM DEĞİŞTİRME (Responsive Optimizasyonlu)
 * ============================================
 */
function showSection(name) {
    // Tüm bölümleri gizle
    document.getElementById('section-users').classList.add('d-none');
    document.getElementById('section-entry').classList.add('d-none');
    document.getElementById('section-fabrics').classList.add('d-none');

    // Seçili bölümü göster
    document.getElementById('section-' + name).classList.remove('d-none');

    // Menü aktif durumunu güncelle
    document.getElementById('menu-users').classList.remove('active');
    document.getElementById('menu-entry').classList.remove('active');
    document.getElementById('menu-fabrics').classList.remove('active');
    document.getElementById('menu-' + name).classList.add('active');

    // Sayfa başlığını güncelle
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

    // Mobilde sayfa değiştiğinde üste scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================================================
// 1. KUMAŞ GİRİŞ (CUSTOM SEARCHABLE DROPDOWN MANTIĞI)
// ================================================================

/**
 * Dropdown Görünürlük Kontrolü
 */
function toggleDropdown(id, show) {
    if (show) {
        hideAllDropdowns();
        document.getElementById(id).classList.remove('d-none');
    } else {
        document.getElementById(id).classList.add('d-none');
    }
}

function hideAllDropdowns() {
    document.querySelectorAll('.dropdown-list').forEach(d => d.classList.add('d-none'));
}

/**
 * Dropdown İçinde Arama Filtresi (Anlık Süzme)
 */
function filterDropdown(dropdownId, query) {
    const div = document.getElementById(dropdownId);
    const options = div.getElementsByClassName('dropdown-item');
    const q = query.toLowerCase();
    
    for (let i = 0; i < options.length; i++) {
        const txt = options[i].textContent.toLowerCase();
        options[i].style.display = txt.includes(q) ? "" : "none";
    }
}

async function initEntryFilters() {
    if (!entryCustomersLoaded) {
        await loadEntryCustomers();
        entryCustomersLoaded = true;
    }
}

/**
 * Müşterileri Getir ve Özel Dropdown'u Doldur
 */
async function loadEntryCustomers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_customers" }) });
        const result = await res.json();
        currentCustomerList = result.data || [];
        renderDropdown('customerDropdown', currentCustomerList, selectCustomer);
    } catch (error) {
        Swal.fire('Hata', 'Müşteriler yüklenemedi.', 'error');
        console.error('Müşteri yükleme hatası:', error);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Dropdown Liste Oluşturucu (Modern Kart Görünümü)
 */
function renderDropdown(id, data, onSelect) {
    const container = document.getElementById(id);
    container.innerHTML = "";
    
    if (data.length === 0) {
        container.innerHTML = `<div class="dropdown-item" style="color:var(--text-muted); pointer-events:none;">Sonuç yok</div>`;
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--primary-color);opacity:0.4;margin-right:10px;"></span>${item}`;
        div.onclick = () => {
            onSelect(item);
            toggleDropdown(id, false);
        };
        container.appendChild(div);
    });
}

/**
 * Müşteri Seçimi İşlemi
 */
async function selectCustomer(val) {
    document.getElementById('entryCustomerInput').value = val;
    
    const planInput = document.getElementById('entryPlanInput');
    const planDropdown = document.getElementById('planDropdown');
    
    planInput.value = "";
    planInput.disabled = true;
    planDropdown.innerHTML = "";
    document.getElementById('entryMasterTbody').innerHTML = `<tr><td colspan="12" style="text-align:center;">Plan seçiniz.</td></tr>`;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_plans_by_customer", customer: val }) });
        const result = await res.json();
        currentPlanList = result.data || [];
        renderDropdown('planDropdown', currentPlanList, selectPlan);
        planInput.disabled = false;
        document.getElementById('entryHintBadge').textContent = 'Müşteri seçildi, plan bekleniyor...';
    } catch (error) {
        Swal.fire('Hata', 'Planlar yüklenemedi.', 'error');
        console.error('Plan yükleme hatası:', error);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Plan Seçimi ve Tabloyu Getirme
 */
async function selectPlan(val) {
    document.getElementById('entryPlanInput').value = val;
    const customer = document.getElementById('entryCustomerInput').value;
    const tbody = document.getElementById('entryMasterTbody');
    
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;">Veriler hazırlanıyor...</td></tr>`;
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "get_plan_summary", customer, plan: val }) 
        });
        const result = await res.json();
        renderEntryMaster(result.data || []);
        document.getElementById('entryHintBadge').textContent = `Toplam: ${result.data.length} kalem`;
    } catch (error) {
        Swal.fire('Hata', 'Plan özeti yüklenemedi.', 'error');
        console.error('Plan özeti hatası:', error);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Plan Özet Tablosunu Render Et (SVG Icon'lu)
 */
function renderEntryMaster(rows) {
    const tbody = document.getElementById('entryMasterTbody');
    tbody.innerHTML = rows.length ? '' : `<tr><td colspan="12" style="text-align:center;">Kayıt yok.</td></tr>`;

    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.dataset.lineId = r.line_id;
        const diff = r.target_qty - r.incoming_qty;
        
        let statusClr = 'status-pasif';
        if (r.status === 'Tamamlandı' || r.status === 'Manuel Kapatıldı') statusClr = 'status-aktif';

        let actions = '';
        if (r.status === 'Manuel Kapatıldı') {
            actions = `
                <button class="action-btn edit-btn" title="Planı Geri Aç" onclick="entryReopen('${r.line_id}')">
                    ${SVG_ICONS.undo}
                </button>`;
        } else if (r.status === 'Devam Ediyor') {
            actions = `
                <button class="action-btn success-btn" title="Planı Manuel Kapat" onclick="entryClose('${r.line_id}')">
                    ${SVG_ICONS.check}
                </button>`;
        }

        tr.innerHTML = `
            <td style="font-weight:600;">${r.model || '-'}</td>
            <td>${r.kumas || '-'}</td>
            <td>${r.renk || '-'}</td>
            <td>${r.alan || '-'}</td>
            <td>${r.desired_width || '-'}</td>
            <td>${r.desired_gsm || '-'}</td>
            <td style="color:var(--text-muted);">${formatNumberTR(r.target_qty)}</td>
            <td style="font-weight:700;">${formatNumberTR(r.incoming_qty)}</td>
            <td style="color:${diff <= 0 ? '#10b981' : '#ef4444'}">${formatNumberTR(diff)}</td>
            <td>%${formatNumberTR(r.percent)}</td>
            <td><span class="status-badge ${statusClr}">${r.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn add-btn" title="Yeni Kumaş Girişi" onclick="entryAdd('${r.line_id}')">
                        ${SVG_ICONS.plus}
                    </button>
                    ${actions}
                    <button class="action-btn detail-btn" title="Hareket Detaylarını Göster" onclick="entryDetail(this,'${r.line_id}')">
                        ${SVG_ICONS.list}
                    </button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

/**
 * Hareket Detaylarını Listele (SVG Icon'lu)
 */
async function entryDetail(btn, lineId) {
    clearSelectedRows();
    btn.closest('tr').classList.add('row-selected');
    document.getElementById('entryDetailHint').classList.add('d-none');
    
    const card = document.getElementById('entryDetailCard');
    const tbody = document.getElementById('entryDetailTbody');
    card.classList.remove('d-none');
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Detaylar yükleniyor...</td></tr>`;

    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "get_entry_details", line_id: lineId }) 
        });
        const result = await res.json();
        tbody.innerHTML = '';
        
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Henüz bir hareket kaydı yok.</td></tr>`;
        } else {
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.gelis_tarihi}</td>
                    <td>${item.parti_no}</td>
                    <td>${item.top_sayisi}</td>
                    <td style="font-weight:700;">${formatNumberTR(item.gelen_miktar)}</td>
                    <td>${item.birim || '-'}</td>
                    <td>${item.gelen_en || '-'}</td>
                    <td>${item.gelen_gramaj || '-'}</td>
                    <td>${item.kumas_lokasyonu || '-'}</td>
                    <td>${item.sevk_tarihi || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" title="Kaydı Düzenle" onclick='editEntry(${JSON.stringify(item)})'>
                                ${SVG_ICONS.edit}
                            </button>
                            <button class="action-btn delete-btn" title="Kaydı Sil" onclick="deleteEntry(${item.row_index}, '${lineId}')">
                                ${SVG_ICONS.trash}
                            </button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        }

        // Mobilde detay kartına scroll
        if (window.innerWidth <= 768) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (error) {
        Swal.fire('Hata', 'Detaylar yüklenemedi.', 'error');
        console.error('Detay yükleme hatası:', error);
    } finally {
        toggleLoading(false);
    }
}

// ================================================================
// FONKSİYONLAR: GİRİŞ, DÜZENLEME, SİLME (AUDIT LOG DESTEKLİ)
// ================================================================

/**
 * Yeni Kumaş Girişi Modal Aç
 */
function entryAdd(lineId) {
    document.getElementById('entryForm').reset();
    document.getElementById('entryLineId').value = lineId;
    document.getElementById('inGelisTarihi').value = new Date().toISOString().split('T')[0];
    document.getElementById('entryModal').classList.remove('d-none');
}

function closeEntryModal() { 
    document.getElementById('entryModal').classList.add('d-none'); 
}

/**
 * Yeni Kayıt Kaydetme (Audit: Oluşturan Bilgisi)
 */
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
        user_name: user.full_name
    };
    
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_entry", data }) });
        const result = await res.json();
        if (result.success) {
            Swal.fire('Başarılı', 'Kayıt ve Audit Log oluşturuldu.', 'success');
            closeEntryModal();
            await selectPlan(document.getElementById('entryPlanInput').value);
        } else {
            Swal.fire('Hata', result.message || 'Kayıt eklenemedi.', 'error');
        }
    } catch (error) {
        Swal.fire('Hata', 'Kayıt eklenirken bir sorun oluştu.', 'error');
        console.error('Kayıt ekleme hatası:', error);
    } finally { 
        toggleLoading(false); 
    }
});

/**
 * Kayıt Düzenleme Modal Aç
 */
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
    
    if(item.sevk_tarihi && item.sevk_tarihi !== "-") {
        const partsS = item.sevk_tarihi.split('.');
        document.getElementById('editSevkTarihi').value = `${partsS[2]}-${partsS[1]}-${partsS[0]}`;
    } else {
        document.getElementById('editSevkTarihi').value = "";
    }
    
    document.getElementById('editEntryModal').classList.remove('d-none');
}

function closeEditEntryModal() { 
    document.getElementById('editEntryModal').classList.add('d-none'); 
}

/**
 * Kayıt Güncelleme (Audit: Düzenleyen Bilgisi)
 */
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
        user_name: user.full_name
    };
    
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "update_entry", data }) });
        const result = await res.json();
        if (result.success) {
            Swal.fire('Güncellendi', 'Düzenleme geçmişi veritabanına işlendi.', 'success');
            closeEditEntryModal();
            await selectPlan(document.getElementById('entryPlanInput').value);
            const targetBtn = document.querySelector(`tr[data-line-id="${lineId}"] .action-btn.detail-btn`);
            if(targetBtn) targetBtn.click();
        } else {
            Swal.fire('Hata', result.message || 'Güncelleme yapılamadı.', 'error');
        }
    } catch (error) {
        Swal.fire('Hata', 'Güncelleme sırasında bir sorun oluştu.', 'error');
        console.error('Güncelleme hatası:', error);
    } finally { 
        toggleLoading(false); 
    }
});

/**
 * Planı Manuel Kapat
 */
async function entryClose(lineId) {
    const { value: text } = await Swal.fire({ 
        title: 'Planı Manuel Kapat', 
        input: 'textarea', 
        inputLabel: 'Kapatma Sebebi', 
        inputPlaceholder: 'İsteğe bağlı not...', 
        showCancelButton: true,
        cancelButtonText: 'İptal',
        confirmButtonText: 'Kapat'
    });
    
    if (text !== undefined) {
        const user = JSON.parse(sessionStorage.getItem('user'));
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ 
                    action: "close_plan", 
                    data: { 
                        line_id: lineId, 
                        note: text, 
                        user_id: user.user_id, 
                        user_name: user.full_name 
                    } 
                })
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Kapatıldı', 'Plan manuel olarak kapatıldı.', 'success');
                await selectPlan(document.getElementById('entryPlanInput').value);
            } else {
                Swal.fire('Hata', result.message || 'Plan kapatılamadı.', 'error');
            }
        } catch (error) {
            Swal.fire('Hata', 'Plan kapatılırken bir sorun oluştu.', 'error');
            console.error('Plan kapatma hatası:', error);
        } finally { 
            toggleLoading(false); 
        }
    }
}

/**
 * Planı Geri Aç
 */
async function entryReopen(lineId) {
    const confirm = await Swal.fire({ 
        title: 'Plan Geri Açılsın mı?', 
        icon: 'question', 
        showCancelButton: true,
        cancelButtonText: 'İptal',
        confirmButtonText: 'Evet, Aç'
    });
    
    if (confirm.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, { 
                method: "POST", 
                body: JSON.stringify({ action: "reopen_plan", line_id: lineId }) 
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Geri Açıldı', 'Plan tekrar "Devam Ediyor" statüsünde.', 'success');
                await selectPlan(document.getElementById('entryPlanInput').value);
            } else {
                Swal.fire('Hata', result.message || 'Plan açılamadı.', 'error');
            }
        } catch (error) {
            Swal.fire('Hata', 'Plan açılırken bir sorun oluştu.', 'error');
            console.error('Plan açma hatası:', error);
        } finally { 
            toggleLoading(false); 
        }
    }
}

/**
 * Hareket Kaydını Sil
 */
async function deleteEntry(rowIdx, lineId) {
    const confirm = await Swal.fire({ 
        title: 'Emin misiniz?', 
        text: "Bu hareket kalıcı olarak silinecek.", 
        icon: 'warning', 
        showCancelButton: true,
        cancelButtonText: 'İptal',
        confirmButtonText: 'Evet, Sil',
        confirmButtonColor: '#ef4444'
    });
    
    if (confirm.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, { 
                method: "POST", 
                body: JSON.stringify({ action: "delete_entry", row_idx: rowIdx }) 
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Silindi', 'Kayıt başarıyla silindi.', 'success');
                await selectPlan(document.getElementById('entryPlanInput').value);
                const targetBtn = document.querySelector(`tr[data-line-id="${lineId}"] .action-btn.detail-btn`);
                if(targetBtn) targetBtn.click();
            } else {
                Swal.fire('Hata', result.message || 'Kayıt silinemedi.', 'error');
            }
        } catch (error) {
            Swal.fire('Hata', 'Silme işlemi sırasında bir sorun oluştu.', 'error');
            console.error('Silme hatası:', error);
        } finally { 
            toggleLoading(false); 
        }
    }
}

/**
 * Yardımcı Fonksiyonlar
 */
function clearSelectedRows() { 
    document.querySelectorAll('#entryMasterTbody tr').forEach(r => r.classList.remove('row-selected')); 
}

function resetEntryDetail() { 
    document.getElementById('entryDetailCard').classList.add('d-none'); 
    document.getElementById('entryDetailHint').classList.remove('d-none'); 
    clearSelectedRows(); 
}

// ================================================================
// 2. KULLANICI YÖNETİMİ (SVG Icon'lu)
// ================================================================

/**
 * Kullanıcıları Listele
 */
async function fetchUsers() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_users" })});
        const result = await res.json();
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = "";
        
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Kullanıcı bulunamadı.</td></tr>';
            return;
        }
        
        result.data.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.full_name}</td>
                <td>${u.username}</td>
                <td>${u.mail || '-'}</td>
                <td><span class="badge">${u.role.toUpperCase()}</span></td>
                <td><span class="status-badge status-${u.status}">${u.status.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" title="Kullanıcıyı Düzenle" onclick='openEditModal(${JSON.stringify(u)})'>
                            ${SVG_ICONS.edit}
                        </button>
                        <button class="action-btn delete-btn" title="Kullanıcıyı Sil" onclick="deleteUser('${u.user_id}')">
                            ${SVG_ICONS.trash}
                        </button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (error) {
        Swal.fire('Hata', 'Kullanıcılar yüklenemedi.', 'error');
        console.error('Kullanıcı yükleme hatası:', error);
    } finally { 
        toggleLoading(false); 
    }
}

/**
 * Yeni Kullanıcı Modal Aç
 */
function openCreateUserModal() { 
    document.getElementById('userModalTitle').textContent = 'Yeni Kullanıcı'; 
    document.getElementById('userForm').reset(); 
    document.getElementById('inputUserId').value = ''; 
    document.getElementById('userModal').classList.remove('d-none'); 
}

/**
 * Kullanıcı Düzenleme Modal Aç
 */
function openEditModal(u) { 
    document.getElementById('userModalTitle').textContent = 'Kullanıcı Düzenle'; 
    document.getElementById('inputUserId').value = u.user_id; 
    document.getElementById('inputFullName').value = u.full_name; 
    document.getElementById('inputUsername').value = u.username; 
    document.getElementById('inputPassword').value = u.password; 
    document.getElementById('inputMail').value = u.mail || ''; 
    document.getElementById('inputRole').value = u.role; 
    document.getElementById('inputStatus').value = u.status; 
    document.getElementById('userModal').classList.remove('d-none'); 
}

function closeUserModal() { 
    document.getElementById('userModal').classList.add('d-none'); 
}

/**
 * Kullanıcı Kaydet/Güncelle
 */
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
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_user", data }) });
        const result = await res.json();
        if (result.success) { 
            Swal.fire('Başarılı', 'Kullanıcı başarıyla kaydedildi.', 'success'); 
            closeUserModal(); 
            fetchUsers(); 
        } else {
            Swal.fire('Hata', result.message || 'Kullanıcı kaydedilemedi.', 'error');
        }
    } catch (error) {
        Swal.fire('Hata', 'Kullanıcı kaydedilirken bir sorun oluştu.', 'error');
        console.error('Kullanıcı kaydetme hatası:', error);
    } finally { 
        toggleLoading(false); 
    }
});

/**
 * Kullanıcı Sil
 */
async function deleteUser(id) {
    const c = await Swal.fire({ 
        title: 'Emin misiniz?', 
        text: 'Bu kullanıcı kalıcı olarak silinecek.',
        icon: 'warning', 
        showCancelButton: true,
        cancelButtonText: 'İptal',
        confirmButtonText: 'Evet, Sil',
        confirmButtonColor: '#ef4444'
    });
    
    if (c.isConfirmed) {
        toggleLoading(true);
        try {
            const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_user", user_id: id }) });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Silindi', 'Kullanıcı başarıyla silindi.', 'success');
                fetchUsers();
            } else {
                Swal.fire('Hata', result.message || 'Kullanıcı silinemedi.', 'error');
            }
        } catch (error) {
            Swal.fire('Hata', 'Kullanıcı silinirken bir sorun oluştu.', 'error');
            console.error('Kullanıcı silme hatası:', error);
        } finally { 
            toggleLoading(false); 
        }
    }
}

// ================================================================
// 3. KUMAŞ KATALOĞU
// ================================================================

/**
 * Kumaş Kataloğunu Yükle
 */
async function loadFabrics() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_fabric_catalog" }) });
        const r = await res.json();
        allFabrics = filteredFabrics = r.data || [];
        currentPage = 1; 
        renderFabrics();
    } catch (error) {
        Swal.fire('Hata', 'Kumaş kataloğu yüklenemedi.', 'error');
        console.error('Katalog yükleme hatası:', error);
    } finally { 
        toggleLoading(false); 
    }
}

/**
 * Kumaş Filtrele
 */
function filterFabrics() {
    const q = document.getElementById('fabricSearch').value.toLowerCase().trim();
    filteredFabrics = allFabrics.filter(f => 
        f.code.toLowerCase().includes(q) || 
        f.name.toLowerCase().includes(q)
    );
    currentPage = 1; 
    renderFabrics();
}

/**
 * Kumaşları Render Et
 */
function renderFabrics() {
    const tbody = document.getElementById('fabricTableBody');
    tbody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const items = filteredFabrics.slice(start, start + rowsPerPage);
    
    if (items.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Kayıt bulunamadı.</td></tr>`; 
    } else { 
        items.forEach(f => { 
            const tr = document.createElement('tr'); 
            tr.innerHTML = `
                <td style="font-weight:600;">${f.code}</td>
                <td>${f.name}</td>
                <td>${f.width}</td>
                <td>${f.gsm}</td>
                <td>${f.unit}</td>`;
            tbody.appendChild(tr); 
        }); 
    }
    
    document.getElementById('totalFabricsBadge').textContent = `Toplam: ${filteredFabrics.length}`;
    renderPagination();
}

/**
 * Sayfalama Render Et
 */
function renderPagination() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredFabrics.length / rowsPerPage) || 1;
    
    const chevronLeft = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
    const chevronRight = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    
    container.innerHTML = `
        <button class="btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="currentPage--; renderFabrics();">
            ${chevronLeft} Geri
        </button>
        <span class="badge">${currentPage} / ${totalPages}</span>
        <button class="btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="currentPage++; renderFabrics();">
            İleri ${chevronRight}
        </button>`;
}

/**
 * ERP TXT Dosyası Yükle
 */
function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        Swal.fire('Bilgi', 'ERP Verisi yükleme işlemi başlatıldı.', 'info');
        console.log('Dosya içeriği:', e.target.result);
    };
    reader.readAsText(file);
}

// ================================================================
// YARDIMCI FONKSİYONLAR
// ================================================================

/**
 * Sayıları Türkçe Formatta Göster
 */
function formatNumberTR(n) { 
    if (n === null || n === undefined) return "0,00"; 
    return Number(n).toLocaleString('tr-TR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }); 
}
