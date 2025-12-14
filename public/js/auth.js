// Menangani Logika Login & Register
const API_URL = '/api/auth';

async function handleAuth(event, type) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()); // Convert form ke JSON Object

    const btn = form.querySelector('button');
    const originalText = btn.innerText;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Loading...`;
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (result.status === 'success') {
            if (type === 'login') {
                // Simpan sesi dan redirect
                localStorage.setItem('user_session', JSON.stringify(result.data));
                localStorage.setItem('session_id', result.data.username); // Biar chat history sync
                
                // Cek Role
                if (result.data.role === 'admin') window.location.href = '/admin.html';
                else window.location.href = '/';
            } else {
                alert('Registrasi berhasil! Silakan login.');
                document.getElementById('login-tab').click(); // Pindah ke tab login
                form.reset();
            }
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('Gagal menghubungi server.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

document.getElementById('loginForm').addEventListener('submit', (e) => handleAuth(e, 'login'));
document.getElementById('registerForm').addEventListener('submit', (e) => handleAuth(e, 'register'));