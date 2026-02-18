// Senin verdiğin Google Apps Script Web App URL'si
const API_URL = "https://script.google.com/macros/s/AKfycbz0L3yajjtgcmAnu2ylII1hVLHRcJXekBE2m4px30sAUX3buwMqpUQaFK9VcQZQGMq4/exec";

const loginForm = document.getElementById('loginForm');
const messageEl = document.getElementById('message');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', function(e) {
    e.preventDefault(); // Sayfanın yenilenmesini engelle
    
    // Butonu pasif yap (Çift tıklamayı önlemek için)
    setLoading(true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Gönderilecek veri paketi
    const data = {
        action: "login",
        username: username,
        password: password
    };

    // Google Apps Script'e POST isteği atıyoruz
    // mode: 'no-cors' kullanmıyoruz çünkü GAS redirect ediyor, fetch bunu takip eder.
    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        setLoading(false);
        
        if (result.success) {
            showMessage("Giriş başarılı! Yönlendiriliyorsunuz...", "success");
            
            // Kullanıcı bilgilerini tarayıcı hafızasına (Session) kaydet
            sessionStorage.setItem('user', JSON.stringify(result.data));
            
            // 2 saniye sonra dashboard sayfasına yönlendir (Henüz yapmadık)
            setTimeout(() => {
                // Şimdilik alert veriyoruz, sonra dashboard.html yapacağız
                alert("Hoşgeldin " + result.data.full_name + " (" + result.data.role + ")");
                // window.location.href = "dashboard.html"; 
            }, 1000);
            
        } else {
            showMessage(result.message, "error");
        }
    })
    .catch(error => {
        setLoading(false);
        console.error('Hata:', error);
        showMessage("Sunucu ile iletişim hatası oluştu.", "error");
    });
});

function showMessage(msg, type) {
    messageEl.textContent = msg;
    messageEl.className = "message " + type;
}

function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Kontrol ediliyor...";
    } else {
        loginBtn.disabled = false;
        loginBtn.textContent = "Giriş Yap";
    }
}
