const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

// --- SAYFA YÜKLENİRKEN ---
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Oturum Kontrolü
    const userJson = sessionStorage.getItem('user');
    if (!userJson) { window.location.href = 'index.html'; return; }
    
    const user = JSON.parse(userJson);
    document.getElementById('displayFullName').textContent = user.full_name;

    // 2. Sidebar Ayarları
    setupSidebar();

    // 3. Veriyi Getir (Hızlı)
    await loadUsers();
});

// --- MENÜ (SIDEBAR) AYARLARI ---
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
        sessionStorage.clear();
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

// --- KULLANICI LİSTELEME (API) ---
async function loadUsers(forceRefresh = false) {
    const tbody = document.getElementById('userTableBody');
    
    // Önbellek kontrolü (Hız için)
    const cachedUsers = sessionStorage.getItem('cached_users');
    if (!forceRefresh && cachedUsers) {
        renderTable(JSON.parse(cachedUsers));
        return;
    }

    // Sunucudan çekme
    toggleLoading(true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get_users" })
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionStorage.setItem('cached_users', JSON.stringify(result.data));
            renderTable(result.data);
        } else {
            Swal.fire("Hata", result.message, "error");
        }
    } catch (error) {
        console.error(error);
        Swal.fire("Hata", "Sunucuya bağlanılamadı.", "error");
    } finally {
        toggleLoading(false); // Spinner kesinlikle kapanacak
    }
}

// --- TABLO OLUŞTURMA ---
function renderTable(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = "";

    if (!users || users.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Kayıt bulunamadı.</td></tr>";
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div style="font-weight:600;">${user.full_name}</div></td>
            <td>${user.username}</td>
            <td>${user.mail || '-'}</td>
            <td><span class="badge">${user.role === 'admin' ? 'YÖNETİCİ' : 'PERSONEL'}</span></td>
            <td><span class="status-badge status-${user.status}">${user.status.toUpperCase()}</span></td>
            <td>
                <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(user)})'>
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteUser('${user.user_id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- KULLANICI EKLEME / GÜNCELLEME ---
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

        closeUserModal();
        toggleLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "save_user", data: formData })
            });
            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Başarılı',
                    text: result.message,
                    timer: 1500,
                    showConfirmButton: false
                });
                loadUsers(true); // Listeyi tazelemek için zorla yenile
            } else {
                Swal.fire("Hata", result.message, "error");
            }
        } catch (error) {
            Swal.fire("Hata", "İşlem başarısız oldu.", "error");
        } finally {
            toggleLoading(false);
        }
    });
}

// --- KULLANICI SİLME ---
function deleteUser(id) {
    Swal.fire({
        title: 'Silmek istediğine emin misin?',
        text: "Bu kullanıcı pasife alınacak!",
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
                    Swal.fire("Silindi!", res.message, "success");
                    loadUsers(true);
                } else {
                    Swal.fire("Hata", res.message, "error");
                }
            } catch (error) {
                Swal.fire("Hata", "Silme işlemi başarısız.", "error");
            } finally {
                toggleLoading(false);
            }
        }
    });
}

// --- YARDIMCI MODAL FONKSİYONLARI ---
const modal = document.getElementById('userModal');

function openUserModal() {
    document.getElementById('userForm').reset();
    document.getElementById('editUserId').value = "";
    document.getElementById('modalTitle').textContent = "Yeni Kullanıcı Ekle";
    modal.classList.remove('d-none');
}

function openEditModal(user) {
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

function toggleLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    if (show) overlay.classList.remove('d-none');
    else overlay.classList.add('d-none');
}
