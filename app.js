const API_URL = "https://script.google.com/macros/s/AKfycbxF0I9Du0TacfepOWbTpUlvL_u3feaLt4Qw75C6Gsl2gaAb2WDFtuBDi7A15tX2qc86/exec";
const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if(loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        toggleLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "login", username: username, password: password })
            });
            const result = await response.json();
            
            if (result.success) {
                sessionStorage.setItem('user', JSON.stringify(result.data));
                
                const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1000 });
                Toast.fire({ icon: 'success', title: 'Giriş Başarılı' });
                
                setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
            } else {
                toggleLoading(false); 
                Swal.fire({ icon: 'error', title: 'Hata', text: result.message });
            }
        } catch (error) {
            toggleLoading(false);
            Swal.fire({ icon: 'error', title: 'Sunucu Hatası', text: 'Bağlantı kurulamadı.' });
        }
    });
}

function toggleLoading(show) {
    if (show) loadingOverlay.classList.remove('d-none');
    else loadingOverlay.classList.add('d-none');
}
