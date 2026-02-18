document.addEventListener('DOMContentLoaded', function() {
    // 1. Oturum Kontrolü
    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userJson);
    
    // Kullanıcı Bilgilerini Yaz
    document.getElementById('displayFullName').textContent = user.full_name;
    document.getElementById('displayRole').textContent = user.role === 'admin' ? 'Yönetici' : 'Personel';

    // Admin Menüsü Kontrolü
    if (user.role === 'admin') {
        document.getElementById('adminMenu').style.display = 'block';
    }

    // 2. Mobil Menü (Sidebar) Mantığı
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Menü Aç/Kapa Fonksiyonu
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    // Hamburger butona tıklanınca
    if(sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Siyah alana (overlay) tıklanınca menüyü kapat
    if(sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // 3. Çıkış İşlemi
    document.getElementById('logoutBtn').addEventListener('click', function() {
        Swal.fire({
            title: 'Çıkış Yapılıyor',
            text: "Oturumu kapatmak istediğinize emin misiniz?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Evet, Çıkış Yap',
            cancelButtonText: 'İptal'
        }).then((result) => {
            if (result.isConfirmed) {
                sessionStorage.removeItem('user');
                window.location.href = 'index.html';
            }
        });
    });
});
