// Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycby940TGnBM18mJG5qoSprAfePXLnlnUKY6lY5wIDexPUX3lVdUFZS8YkYenJEwBFMUB/exec";

const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            Swal.fire({ icon: 'warning', title: 'Uyarı', text: 'Lütfen kullanıcı adı ve şifre giriniz.' });
            return;
        }

        toggleLoading(true);

        try {
            /**
             * CORS Çözümü: 
             * Content-Type: application/json başlığı tarayıcının OPTIONS isteği (preflight) atmasına neden olur.
             * Google Apps Script bunu desteklemediği için hata verir.
             * Çözüm için veriyi düz metin olarak gönderiyoruz ve redirect: "follow" kullanıyoruz.
             */
            const response = await fetch(API_URL, {
                method: "POST",
                mode: "cors", // CORS modunda çalıştır
                redirect: "follow", // Google'ın 302 yönlendirmelerini takip et
                body: JSON.stringify({ 
                    action: "login", 
                    username: username, 
                    password: password 
                })
            });

            // Yanıtın JSON olup olmadığını kontrol ederek oku
            const result = await response.json();
            
            if (result.success) {
                // Kullanıcı bilgilerini sakla
                sessionStorage.setItem('user', JSON.stringify(result.data));
                
                const Toast = Swal.mixin({ 
                    toast: true, 
                    position: 'top', 
                    showConfirmButton: false, 
                    timer: 1000 
                });
                Toast.fire({ icon: 'success', title: 'Giriş Başarılı' });
                
                // Dashboard'a yönlendir
                setTimeout(() => { 
                    window.location.href = "dashboard.html"; 
                }, 800);
            } else {
                toggleLoading(false); 
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Giriş Başarısız', 
                    text: result.message || 'Kullanıcı adı veya şifre hatalı.' 
                });
            }
        } catch (error) {
            console.error("Fetch Hatası:", error);
            toggleLoading(false);
            Swal.fire({ 
                icon: 'error', 
                title: 'Bağlantı Hatası', 
                text: 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı ve Apps Script yayınlama ayarlarını kontrol edin.' 
            });
        }
    });
}

/**
 * Yükleme ekranını göster/gizle
 * @param {boolean} show 
 */
function toggleLoading(show) {
    if (!loadingOverlay) return;
    if (show) loadingOverlay.classList.remove('d-none');
    else loadingOverlay.classList.add('d-none');
}
