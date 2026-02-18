const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

// Oturum ve Temel Kontroller
document.addEventListener('DOMContentLoaded', async function() {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) { window.location.href = 'index.html'; return; }
    
    const user = JSON.parse(userJson);
    document.getElementById('displayFullName').textContent = user.full_name;

    // Menü İşlemleri
    setupSidebar();

    // Veriyi Hızlıca Getir (Önce Cache kontrolü)
    await loadUsers();
});

// --- MENÜ VE SIDEBAR AYARLARI ---
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay') || createOverlay();

    if(sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if(overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.clear(); // Tüm veriyi temizle
        window.location.href = 'index.html';
    });
}

function createOverlay() {
    const div = document.createElement('div');
    div.id = 'sidebarOverlay';
    div.className = 'sidebar-overlay';
    document.body.appendChild(div);
    return div;
}

// --- KULLANICI YÖNETİMİ (API) ---

// 1. Kullanıcıları Yükle (Akıllı Yükleme)
async function loadUsers(forceRefresh = false) {
    const tbody = document.getElementById('userTableBody');
    
    // Eğer zorla yenileme istenmediyse ve veri cache'de varsa, oradan kullan (HIZ!)
    const cachedUsers = sessionStorage.getItem('cached_users');
    if (!forceRefresh && cachedUsers) {
        console.log("Veri önbellekten çekildi (Hızlı)");
        renderTable(JSON.parse(cachedUsers));
        return;
    }

    // Yoksa sunucudan çek
    console.log("Veri sunucudan çekiliyor...");
    toggleLoading(true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_users" })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Veriyi hafızaya al
            sessionStorage.setItem('cached_users', JSON.stringify(result.data));
            renderTable(result.data);
        } else {
            showToast("Hata: " + result.message, "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Bağlantı Hatası!", "error");
    } finally {
        toggleLoading(false); // Her durumda spinner kapanır
    }
}

// 2. Tabloyu Çiz (DOM Manipülasyonu)
function renderTable(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = "";

    if (users.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Kayıt bulunamadı.</td></tr>";
        return;
    }

    const fragment = document.createDocumentFragment(); // Performans için fragment kullan

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="fw-bold">${user.full_name}</div></td>
            <td>${user.username}</td>
            <td>${user.mail || '-'}</td>
            <td><span class="badge badge-${user.role}">${user.role === 'admin' ? 'Yönetici' : 'Personel'}</span></td>
            <td><span class="status-badge status-${user.status}">${user.status === 'aktif' ? 'Aktif' : 'Pasif'}</span></td>
            <td>
                <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(user)})'>
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteUser('${user.user_id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        fragment.appendChild(tr);
    });
    
    tbody.appendChild(fragment);
}

// 3. Kullanıcı Kaydet (Ekle/Güncelle)
const userForm = document.getElementById('userForm');
if(userForm) {
    userForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            user_id: document.getElementById('editUserId').value,
            full_name: document.getElementById('inputName').value,
            mail: document.getElementById('inputMail').value,
            username: document.getElementById('inputUsername').value,
            password: document.getElementById('inputPassword').value,
            role: document.getElementById('inputRole').value,
            status: document.getElementById('inputStatus').value
        };

        closeUserModal(); // Modalı hemen kapat, kullanıcı beklemesin
        toggleLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "save_user", data: formData })
            });
            const result = await response.json();

            if (result.success) {
                showToast(result.message, "success");
                loadUsers(true); // Listeyi sunucudan yenile
            } else {
                showToast(result.message, "error");
                // Hata olduysa modalı geri açabilirsin (Opsiyonel)
            }
        } catch (error) {
            showToast("Sunucu hatası oluştu.", "error");
        } finally {
            toggleLoading(false);
        }
    });
}

// 4. Kullanıcı Silme
function deleteUser(id) {
    Swal.fire({
        title: 'Silmek istediğine emin misin?',
        text: "Bu işlem geri alınamaz!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Evet, Sil',
        cancelButtonText: 'İptal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            toggleLoading(true);
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "delete_user", user_id: id })
                });
                const res = await response.json();
                
                if (res.success) {
                    showToast("Kullanıcı silindi.", "success");
                    loadUsers(true); // Listeyi yenile
                } else {
                    showToast(res.message, "error");
                }
            } catch (error) {
                showToast("Silme işlemi başarısız.", "error");
            } finally {
                toggleLoading(false);
            }
        }
    });
}

// --- YARDIMCI FONKSİYONLAR ---

// Modal İşlemleri
const modal = document.getElementById('userModal');

function openUserModal() {
    document.getElementById('userForm').reset();
    document.getElementById('editUserId').value = "";
    document.getElementById('modalTitle').textContent = "Yeni Kullanıcı Ekle";
    modal.classList.remove('d-none');
}

function openEditModal(user) {
    // String gelen user nesnesini parse etmeye gerek yok, zaten obje geliyor
    document.getElementById('editUserId').value = user.user_id;
    document.getElementById('inputName').value = user.full_name;
    document.getElementById('inputMail').value = user.mail || "";
    document.getElementById('inputUsername').value = user.username;
    document.getElementById('inputPassword').value = user.password;
    document.getElementById('inputRole').value = user.role;
    document.getElementById('inputStatus').value = user.status;
    
    document.getElementById('modalTitle').textContent = "Kullanıcı Düzenle";
    modal.classList.remove('d-none');
}

function closeUserModal() {
    modal.classList.add('d-none');
}

// Toast Bildirim (Hızlı ve Modern)
function showToast(msg, type = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    Toast.fire({
        icon: type,
        title: msg
    });
}

// Spinner Kontrolü (Güvenli)
function toggleLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    if (show) {
        overlay.classList.remove('d-none');
    } else {
        // Biraz gecikmeli kapat ki kullanıcı sonucun geldiğini hissetsin (isteğe bağlı, şimdilik direkt kapatıyoruz)
        overlay.classList.add('d-none');
    }
}
