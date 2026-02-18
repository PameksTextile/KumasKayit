// Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if(loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Spinner'ı göster
        toggleLoading(true);

        fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "login", username: username, password: password })
        })
        .then(response => response.json())
        .then(result => {
            toggleLoading(false); // Spinner'ı gizle
            
            if (result.success) {
                // Başarılı Giriş (SweetAlert)
                Swal.fire({
                    icon: 'success',
                    title: 'Giriş Başarılı!',
                    text: 'Yönlendiriliyorsunuz...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    sessionStorage.setItem('user', JSON.stringify(result.data));
                    window.location.href = "dashboard.html";
                });
            } else {
                // Hatalı Giriş
                Swal.fire({
                    icon: 'error',
                    title: 'Hata!',
                    text: result.message,
                    confirmButtonColor: '#4f46e5'
                });
            }
        })
        .catch(error => {
            toggleLoading(false);
            Swal.fire({
                icon: 'error',
                title: 'Sunucu Hatası',
                text: 'Bağlantı kurulamadı. Lütfen internetinizi kontrol edin.',
                footer: error
            });
        });
    });
}

function toggleLoading(show) {
    if (show) loadingOverlay.classList.remove('d-none');
    else loadingOverlay.classList.add('d-none');
}
