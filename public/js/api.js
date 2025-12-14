export class ApiService {
    // Tambahkan parameter 'signal'
    static async sendChat(formData, signal) {
        try {
            const res = await fetch('/ai/chat', { 
                method: 'POST', 
                body: formData,
                signal: signal // Ini kuncinya agar bisa di-abort
            });
            return await res.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                return { status: 'aborted', message: 'Dibatalkan oleh pengguna.' };
            }
            return { status: 'error', message: 'Gagal menghubungi server.' };
        }
    }
}
