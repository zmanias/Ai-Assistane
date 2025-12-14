const session = JSON.parse(localStorage.getItem('user_session') || '{}');

// 1. Cek Keamanan (Middleware Frontend)
if (session.role !== 'admin') {
    alert("⛔ Akses Ditolak: Anda bukan Admin!");
    window.location.href = '/';
} else {
    document.getElementById('adminName').innerText = session.username;
    loadDashboardData();
}

// 2. Load Data dari Server
async function loadDashboardData() {
    try {
        // Panggil endpoint getStats (Route yang kita buat di api.js)
        const res = await fetch(`/api/admin/stats?username=${session.username}`);
        const data = await res.json();

        if (data.status === 'success') {
            // Update UI
            document.getElementById('totalUsers').innerText = data.data.totalUsers;
            document.getElementById('totalChats').innerText = data.data.totalChats;
            document.getElementById('promptInput').value = data.data.currentPrompt;
        } else {
            alert("Gagal memuat data: " + data.message);
        }
    } catch (e) {
        console.error(e);
    }
}

// 3. Simpan Prompt Baru
window.savePrompt = async function() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerHTML;
    const newPrompt = document.getElementById('promptInput').value;

    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Menyimpan...`;
    btn.disabled = true;

    try {
        const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: session.username, // Validasi admin di server
                prompt: newPrompt           // Note: di controller pakai req.body.prompt
            })
        });
        const data = await res.json();

        if (data.status === 'success') {
            alert("✅ Otak AI Berhasil Diupdate!");
        } else {
            alert("❌ Gagal: " + data.message);
        }
    } catch (e) {
        alert("Error koneksi.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};