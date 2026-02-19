const API_URL = "https://script.google.com/macros/s/AKfycbxF0I9Du0TacfepOWbTpUlvL_u3feaLt4Qw75C6Gsl2gaAb2WDFtuBDi7A15tX2qc86/exec";

const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        toggleLoading(true);

        try {
            // CORS ÇÖZÜMÜ: Headers kısmını tamamen kaldırdık. 
            // Bu sayede tarayıcı isteği "Simple POST" olarak algılar ve OPTIONS kontrolü yapmaz.
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ 
                    action: "login", 
                    username: username, 
                    password: password 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                sessionStorage.setItem('user', JSON.stringify(result.data));
                window.location.href = "dashboard.html";
            } else {
                toggleLoading(false);
                Swal.fire({ icon: 'error', title: 'Hata', text: result.message });
            }
        } catch (error) {
            console.error("Detaylı Hata:", error);
            toggleLoading(false);
            Swal.fire({ 
                icon: 'error', 
                title: 'Bağlantı Hatası', 
                text: 'İstek engellendi. Lütfen Apps Script üzerinden "Herkes" (Anyone) seçeneğiyle YENİ bir dağıtım yapın.' 
            });
        }
    });
}

function toggleLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.classList.toggle('d-none', !show);
    }
}
