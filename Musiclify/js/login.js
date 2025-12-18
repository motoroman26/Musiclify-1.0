document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.login-form');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }
        
        const submitBtn = loginForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Вхід...';
            
            if (window.contentLoader) {
                await window.contentLoader.login(email, password);
            } else {
                const backendUrl = 'http://localhost:5255';
                
                const response = await fetch(`${backendUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    
                    try {
                        const errorData = JSON.parse(errorText);
                        throw new Error(errorData.message || `Помилка входу (${response.status})`);
                    } catch {
                        throw new Error(`Помилка сервера: ${response.status}`);
                    }
                }
                
                const result = await response.json();
                const userData = result.user || result;
                localStorage.setItem('musiclify_user', JSON.stringify(userData));
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
            
        } catch (error) {
            alert(error.message || 'Невірний email або пароль');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    const savedUser = localStorage.getItem('musiclify_user');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            const emailInput = document.getElementById('email');
            if (emailInput && userData.email) {
                emailInput.value = userData.email;
            }
        } catch (error) {}
    }
});