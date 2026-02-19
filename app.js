/**
 * app.js - Login Sayfası Mantığı (Mobil Uyumlu + Gelişmiş Hata Yönetimi)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbwlswF2jfmFR54VdKUE8wsuf58vaK-R-Hekqsaednn6fjmdBWaXJRr6UfGvf3zPSf32Cw/exec";
const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

/**
 * ============================================
 * SAYFA YÜKLEME VE OTURUM KONTROLÜ
 * ============================================
 */
document.addEventListener('DOMContentLoaded', function() {
    // Eğer zaten giriş yapılmışsa dashboard'a yönlendir
    const userJson = sessionStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            if (user && user.user_id) {
                window.location.href = 'dashboard.html';
                return;
            }
        } catch (error) {
            // Bozuk session varsa temizle
            sessionStorage.clear();
        }
    }

    // Enter tuşu ile form submit (şifre alanında)
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Username alanına otomatik focus
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
});

/**
 * ============================================
 * LOGIN FORM SUBMIT
 * ============================================
 */
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // ============================================
        // 1. FRONTEND VALİDASYON
        // ============================================
        if (!username || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'Eksik Bilgi',
                text: 'Lütfen kullanıcı adı ve şifre giriniz.',
                confirmButtonText: 'Tamam',
                confirmButtonColor: '#6366f1'
            });
            return;
        }

        if (username.length < 3) {
            Swal.fire({
                icon: 'warning',
                title: 'Geçersiz Kullanıcı Adı',
                text: 'Kullanıcı adı en az 3 karakter olmalıdır.',
                confirmButtonText: 'Tamam',
                confirmButtonColor: '#6366f1'
            });
            return;
        }

        if (password.length < 4) {
            Swal.fire({
                icon: 'warning',
                title: 'Geçersiz Şifre',
                text: 'Şifre en az 4 karakter olmalıdır.',
                confirmButtonText: 'Tamam',
                confirmButtonColor: '#6366f1'
            });
            return;
        }

        // ============================================
        // 2. API ÇAĞRISI
        // ============================================
        toggleLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                mode: "cors",
                headers: {
                    // CORS sorunlarını azaltmak için text/plain kullanılıyor
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({ 
                    action: "login", 
                    username: username, 
                    password: password 
                }),
                redirect: "follow"
            });

            // HTTP Durum Kontrolü
            if (!response.ok) {
                throw new Error(`Sunucu Hatası: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            
            // ============================================
            // 3. GİRİŞ BAŞARILI
            // ============================================
            if (result.success) {
                // Kullanıcı bilgilerini sessionStorage'a kaydet
                sessionStorage.setItem('user', JSON.stringify(result.data));
                
                // Başarılı giriş toast mesajı
                const Toast = Swal.mixin({ 
                    toast: true, 
                    position: 'top-end', 
                    showConfirmButton: false, 
                    timer: 1500,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer);
                        toast.addEventListener('mouseleave', Swal.resumeTimer);
                    }
                });
                
                await Toast.fire({ 
                    icon: 'success', 
                    title: `Hoş geldiniz, ${result.data.full_name || username}!` 
                });
                
                // Dashboard'a yönlendir
                setTimeout(() => { 
                    window.location.href = "dashboard.html"; 
                }, 800);
            } 
            // ============================================
            // 4. GİRİŞ BAŞARISIZ
            // ============================================
            else {
                toggleLoading(false);
                
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Giriş Başarısız', 
                    text: result.message || 'Kullanıcı adı veya şifre hatalı.',
                    confirmButtonText: 'Tekrar Dene',
                    confirmButtonColor: '#ef4444'
                });
                
                // Şifre alanını temizle ve focus yap
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }
        } 
        // ============================================
        // 5. HATA YÖNETİMİ
        // ============================================
        catch (error) {
            toggleLoading(false);
            console.error("Login Hatası:", error);
            
            // Hata türüne göre mesaj
            let errorMessage = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Ağ hatası oluştu. Lütfen tekrar deneyin.';
            } else if (error.message.includes('Sunucu Hatası')) {
                errorMessage = 'Sunucu geçici olarak yanıt vermiyor. Lütfen daha sonra tekrar deneyin.';
            }
            
            Swal.fire({ 
                icon: 'error', 
                title: 'Bağlantı Hatası', 
                html: `
                    <p style="margin-bottom: 12px;">${errorMessage}</p>
                    <small style="color: #64748b;">Hata Detayı: ${error.message}</small>
                `,
                confirmButtonText: 'Tamam',
                confirmButtonColor: '#6366f1',
                footer: '<a href="mailto:destek@pameks.com" style="color: #6366f1;">Sorun devam ederse destek ekibiyle iletişime geçin</a>'
            });
        }
    });
}

/**
 * ============================================
 * LOADING EKRANI KONTROLÜ
 * ============================================
 */
function toggleLoading(show) {
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('d-none');
        } else {
            loadingOverlay.classList.add('d-none');
        }
    }
}

/**
 * ============================================
 * OTOMATIK LOGOUT (Oturum süresi dolduğunda)
 * ============================================
 */
window.addEventListener('storage', function(e) {
    if (e.key === 'user' && !e.newValue) {
        // Başka sekmede logout yapıldıysa bu sekmede de logout yap
        window.location.href = 'index.html';
    }
});

/**
 * ============================================
 * SAYFA GÖRÜNÜRLÜK KONTROLÜ (Performans)
 * ============================================
 */
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Sayfa gizlendiğinde (arka plana alındığında)
        console.log('Sayfa arka plana alındı');
    } else {
        // Sayfa tekrar görünür olduğunda oturum kontrolü
        const userJson = sessionStorage.getItem('user');
        if (userJson) {
            window.location.href = 'dashboard.html';
        }
    }
});

/**
 * ============================================
 * OFFLINE/ONLINE DURUM KONTROLÜ
 * ============================================
 */
window.addEventListener('online', function() {
    const Toast = Swal.mixin({ 
        toast: true, 
        position: 'bottom-end', 
        showConfirmButton: false, 
        timer: 2000 
    });
    Toast.fire({ 
        icon: 'success', 
        title: 'İnternet bağlantısı yeniden kuruldu' 
    });
});

window.addEventListener('offline', function() {
    const Toast = Swal.mixin({ 
        toast: true, 
        position: 'bottom-end', 
        showConfirmButton: false, 
        timer: 3000 
    });
    Toast.fire({ 
        icon: 'warning', 
        title: 'İnternet bağlantısı kesildi' 
    });
});

/**
 * ============================================
 * FORM INPUT ANIMASYONLARI (UX İyileştirme)
 * ============================================
 */
document.querySelectorAll('.input-wrapper input').forEach(input => {
    // Input focus olduğunda parent'a class ekle
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    // Input blur olduğunda parent'tan class kaldır
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
    
    // Input'a değer girildiğinde parent'a class ekle
    input.addEventListener('input', function() {
        if (this.value.length > 0) {
            this.parentElement.classList.add('has-value');
        } else {
            this.parentElement.classList.remove('has-value');
        }
    });
});

/**
 * ============================================
 * CONSOLE UYARISI (Güvenlik)
 * ============================================
 */
console.log(
    '%c⚠️ DİKKAT!', 
    'color: #ef4444; font-size: 24px; font-weight: bold;'
);
console.log(
    '%cBu konsol, geliştiriciler içindir. Bilinmeyen kodları buraya yapıştırmayın!', 
    'color: #f59e0b; font-size: 14px;'
);
console.log(
    '%cPameks Kumaş Yönetim Sistemi v2.0', 
    'color: #6366f1; font-size: 12px; font-style: italic;'
);
