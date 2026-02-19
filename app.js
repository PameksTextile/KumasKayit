// ÖNEMLİ: Yeni dağıtım sonrası aldığınız URL'yi buraya yapıştırın
const API_URL = "https://script.google.com/macros/s/AKfycbwx-iT9tSuEXx3-A0yCes3YLpWyblUMYjVzW31slyO_BEFTDZqeQTftIKI37RuLsT3-XA/exec";
const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        toggleLoading(true);

        try {
            // Google Apps Script için optimize edilmiş fetch isteği
            const response = await fetch(API_URL, {
                method: "POST",
                mode: "cors", // Tarayıcıya bunun bir CORS isteği olduğunu belirtir
                headers: {
                    // Google Apps Script bazen application/json başlığında 'preflight' (ön denetim) hatası verebilir. 
                    // text/plain kullanımı bu engeli aşmanın en stabil yoludur.
                    "Content-Type": "text/plain;charset=utf-8" 
                },
                body: JSON.stringify({ 
                    action: "login", 
                    username: username, 
                    password: password 
                }),
                redirect: "follow" // Google'ın 302 yönlendirmesini takip etmesi için şarttır
            });

            if (!response.ok) {
                throw new Error("Ağ yanıtı uygun değil: " + response.statusText);
            }

            const result = await response.json();
            
            if (result.success) {
                sessionStorage.setItem('user', JSON.stringify(result.data));
                
                const Toast = Swal.mixin({ 
                    toast: true, 
                    position: 'top', 
                    showConfirmButton: false, 
                    timer: 1000 
                });
                Toast.fire({ icon: 'success', title: 'Giriş Başarılı' });
                
                setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
            } else {
                toggleLoading(false); 
                Swal.fire({ icon: 'error', title: 'Hata', text: result.message });
            }
        } catch (error) {
            toggleLoading(false);
            console.error("Hata Detayı:", error);
            Swal.fire({ 
                icon: 'error', 
                title: 'Bağlantı Hatası', 
                text: 'Sunucuya erişilemedi veya CORS engeline takıldı. Lütfen dağıtım ayarlarını kontrol edin.' 
            });
        }
    });
}

function toggleLoading(show) {
    if (loadingOverlay) {
        if (show) loadingOverlay.classList.remove('d-none');
        else loadingOverlay.classList.add('d-none');
    }
}
