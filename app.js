const API_URL = "https://script.google.com/macros/s/AKfycbwlswF2jfmFR54VdKUE8wsuf58vaK-R-Hekqsaednn6fjmdBWaXJRr6UfGvf3zPSf32Cw/exec";
const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        toggleLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                mode: "cors",
                headers: {
                    // Önemli: application/json yerine text/plain CORS sorunlarını azaltır
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({ 
                    action: "login", 
                    username: username, 
                    password: password 
                }),
                redirect: "follow"
            });

            if (!response.ok) {
                throw new Error("Sunucu yanıt vermedi: " + response.statusText);
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
                text: 'Uygulama sunucuya erişemiyor. Lütfen internet bağlantınızı ve script erişim yetkilerini kontrol edin.' 
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
