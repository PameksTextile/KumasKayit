const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

// Oturum ve Temel Kontroller
document.addEventListener('DOMContentLoaded', function() {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) { window.location.href = 'index.html'; return; }
    
    const user = JSON.parse(userJson);
    document.getElementById('displayFullName').textContent = user.full_name;

    // Menü ve Çıkış İşlemleri (Önceki kodlardan)
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if(sidebarToggle) sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('user'); window.location.href = 'index.html';
    });

    // Sayfa açılınca kullanıcıları çek
    fetchUsers();
});

// --- API FONKSİYONLARI ---

// 1. Kullanıcıları Listele
function fetchUsers() {
    toggleLoading(true);
    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "get_users" })
    })
    .then(res => res.json())
    .then(data => {
        toggleLoading(false);
        if(data.success) {
            renderTable(data.data);
        } else {
            Swal.fire("Hata", data.message, "error");
        }
    });
}

// 2. Tabloyu Ekrana Çiz
function renderTable(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = "";

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.full_name}</td>
            <td>${user.username}</td>
            <td>${user.mail || '-'}</td>
            <td><span class="badge">${user.role.toUpperCase()}</span></td>
            <td><span class="status-badge status-${user.status}">${user.status.toUpperCase()}</span></td>
            <td>
                <button class="action-btn edit-btn" onclick='editUser(${JSON.stringify(user)})'>
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

// 3. Kullanıcı Kaydet (Ekle veya Düzenle)
document.getElementById('userForm').addEventListener('submit', function(e) {
    e.preventDefault();
    toggleLoading(true);

    const formData = {
        user_id: document.getElementById('editUserId').value, // Boşsa yeni kayıt
        full_name: document.getElementById('inputName').value,
        mail: document.getElementById('inputMail').value,
        username: document.getElementById('inputUsername').value,
        password: document.getElementById('inputPassword').value,
        role: document.getElementById('inputRole').value,
        status: document.getElementById('inputStatus').value
    };

    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "save_user", data: formData })
    })
    .then(res => res.json())
    .then(data => {
        toggleLoading(false);
        closeUserModal();
        if(data.success) {
            Swal.fire("Başarılı", data.message, "success");
            fetchUsers(); // Tabloyu yenile
        } else {
            Swal.fire("Hata", data.message, "error");
        }
    });
});

// 4. Kullanıcı Silme
function deleteUser(id) {
    Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu kullanıcı silinecek!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Evet, Sil',
        cancelButtonText: 'İptal',
        confirmButtonColor: '#ef4444'
    }).then((result) => {
        if (result.isConfirmed) {
            toggleLoading(true);
            fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "delete_user", user_id: id })
            })
            .then(res => res.json())
            .then(data => {
                toggleLoading(false);
                if(data.success) {
                    Swal.fire("Silindi!", data.message, "success");
                    fetchUsers();
                } else {
                    Swal.fire("Hata", data.message, "error");
                }
            });
        }
    });
}

// --- MODAL İŞLEMLERİ ---
const modal = document.getElementById('userModal');

function openUserModal() {
    document.getElementById('userForm').reset();
    document.getElementById('editUserId').value = ""; // ID'yi temizle (Yeni Kayıt modu)
    document.getElementById('modalTitle').textContent = "Yeni Kullanıcı Ekle";
    modal.classList.remove('d-none');
}

function editUser(user) {
    // Formu doldur
    document.getElementById('editUserId').value = user.user_id;
    document.getElementById('inputName').value = user.full_name;
    document.getElementById('inputMail').value = user.mail;
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
    if(show) overlay.classList.remove('d-none');
    else overlay.classList.add('d-none');
}
