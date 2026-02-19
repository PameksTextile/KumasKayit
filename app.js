// Google Apps Script Web App URL - Yeni paylaşılan adres
const API_URL = "https://script.google.com/macros/s/AKfycbxF0I9Du0TacfepOWbTpUlvL_u3feaLt4Qw75C6Gsl2gaAb2WDFtuBDi7A15tX2qc86/exec";

const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

/**
 * Giriş formu gönderildiğinde çalışır.
 */
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
             * CORS ÇÖZÜMÜ: 
             * 'Content-Type': 'application/json' başlığı eklenirse tarayıcı "preflight" (OPTIONS) isteği atar.
             * Google Apps Script bunu desteklemediği için CORS hatası verir.
             * Bu nedenle headers kısmını tamamen boş bırakıyoruz (Simple Request).
             */
            const response = await fetch(API_URL, {
                method: "POST",
                mode: "no-cors", // Sunucu yanıtını okuyabilmek için bazen gerekebilir ancak JSON dönüşü beklediğimiz için varsayılanı kullanıyoruz
                body: JSON.stringify({ 
                    action: "login", 
                    username: username, 
                    password: password 
                })
            });

            // Yanıtı al
            const result = await response.json();
            
            if (result.success) {
                // Kullanıcı bilgilerini tarayıcı oturumunda sakla
                sessionStorage.setItem('user', JSON.stringify(result.data));
                
                const Toast = Swal.mixin({ 
                    toast: true, 
                    position: 'top', 
                    showConfirmButton: false, 
                    timer: 1000 
                });
                Toast.fire({ icon: 'success', title: 'Giriş Başarılı' });
                
                // Dashboard sayfasına yönlendir
                setTimeout(() => { 
                    window.location.href = "dashboard.html"; 
                }, 800);
            } else {
                toggleLoading(false); 
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Hata', 
                    text: result.message || 'Giriş yapılamadı.' 
                });
            }
        } catch (error) {
            console.error("Bağlantı Hatası:", error);
            toggleLoading(false);
            Swal.fire({ 
                icon: 'error', 
                title: 'Sunucu Hatası', 
                text: 'Bağlantı kurulamadı. İnternet bağlantınızı veya API durumunu kontrol edin.' 
            });
        }
    });
}

/**
 * Yükleme göstergesini yönetir.
 */
function toggleLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.classList.toggle('d-none', !show);
    }
}
