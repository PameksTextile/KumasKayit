const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

let allFabrics = [], filteredFabrics = [], currentPage = 1, rowsPerPage = 50;

document.addEventListener('DOMContentLoaded', function() {
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
    
    if(name === 'fabrics' && allFabrics.length === 0) loadFabrics();
}

// --- KULLANICI YÖNETİMİ FONKSİYONLARI ---
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
            <td>${u.mail}</td>
            <td><span class="badge">${u.role.toUpperCase()}</span></td>
            <td><span class="status-badge status-${u.status}">${u.status.toUpperCase()}</span></td>
            <td>
                <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(u)})'><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="deleteUser('${u.user_id}')"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });
}

document.getElementById('userForm').addEventListener('submit', async function(e) {
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
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "save_user", data })});
        const result = await res.json();
        if(result.success) { Swal.fire('Başarılı', result.message, 'success'); closeUserModal(); fetchUsers(); }
    } finally { toggleLoading(false); }
});

function deleteUser(id) {
    Swal.fire({ title: 'Emin misiniz?', icon: 'warning', showCancelButton: true }).then(async (r) => {
        if(r.isConfirmed) {
            toggleLoading(true);
            try {
                const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete_user", user_id: id })});
                const result = await res.json();
                if(result.success) fetchUsers();
            } finally { toggleLoading(false); }
        }
    });
}

// --- KUMAŞ YÖNETİMİ FONKSİYONLARI ---
async function loadFabrics() {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "get_fabric_catalog" })});
        const result = await res.json();
        if (result.success) { allFabrics = result.data; filteredFabrics = allFabrics; updateFabricTable(); }
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
        tr.innerHTML = `<td><span class="badge">${f.code}</span></td><td><b>${f.name}</b></td><td>${f.width}</td><td>${f.gsm}</td><td>${f.unit}</td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('pageIndicator').textContent = `Sayfa ${currentPage} / ${Math.ceil(filteredFabrics.length / rowsPerPage) || 1}`;
}

function filterFabrics() {
    const q = document.getElementById('fabricSearch').value.toLowerCase();
    filteredFabrics = allFabrics.filter(f => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    currentPage = 1; updateFabricTable();
}

function handleFileUpload(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n');
        const data = [];
        lines.forEach(l => {
            const p = l.split(';');
            if(p.length >= 2) data.push({ code: p[0].trim(), name: p[1].trim(), width: p[2]||"", gsm: p[3]||"", unit: p[4]||"" });
        });
        Swal.fire({ title: 'Onay', text: `${data.length} kumaş karşılaştırılsın mı?`, icon: 'question', showCancelButton: true }).then(r => {
            if(r.isConfirmed) syncWithBackend(data);
        });
    };
    reader.readAsText(file);
}

async function syncWithBackend(data) {
    toggleLoading(true);
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "sync_fabrics", fabrics: data })});
        const result = await res.json();
        if(result.success) {
            Swal.fire('Bitti', `Eklendi: ${result.data.added}, Güncellendi: ${result.data.updated}, Aynı: ${result.data.same}`, 'success');
            loadFabrics();
        }
    } finally { toggleLoading(false); document.getElementById('fabricFileInput').value = ""; }
}

// --- MODAL & YARDIMCILAR ---
function openUserModal() { 
    document.getElementById('userForm').reset(); 
    document.getElementById('editUserId').value = ""; 
    document.getElementById('modalTitle').textContent = "Yeni Kullanıcı";
    document.getElementById('userModal').classList.remove('d-none'); 
}
function openEditModal(u) {
    document.getElementById('editUserId').value = u.user_id;
    document.getElementById('inputName').value = u.full_name;
    document.getElementById('inputMail').value = u.mail;
    document.getElementById('inputUsername').value = u.username;
    document.getElementById('inputPassword').value = u.password;
    document.getElementById('inputRole').value = u.role;
    document.getElementById('inputStatus').value = u.status;
    document.getElementById('modalTitle').textContent = "Kullanıcı Düzenle";
    document.getElementById('userModal').classList.remove('d-none');
}
function closeUserModal() { document.getElementById('userModal').classList.add('d-none'); }
function toggleLoading(s) { document.getElementById('loadingOverlay').classList.toggle('d-none', !s); }
function nextPage() { if ((currentPage * rowsPerPage) < filteredFabrics.length) { currentPage++; updateFabricTable(); } }
function prevPage() { if (currentPage > 1) { currentPage--; updateFabricTable(); } }
