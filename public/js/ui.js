export const UI = {
    // Variabel untuk menyimpan ID timer agar bisa di-stop
    typingTimer: null, 

    elements: {
        chatContainer: document.getElementById('chatContainer'),
        messagesBox: document.getElementById('messagesBox'),
        scrollTarget: document.getElementById('scrollTarget'),
        inputField: document.getElementById('userInput'),
        fileInput: document.getElementById('fileInput'),
        previewImg: document.getElementById('previewImg'),
        filePreview: document.getElementById('filePreview'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        sendBtn: document.getElementById('sendBtn')
    },

    toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-bs-theme');
        html.setAttribute('data-bs-theme', current === 'dark' ? 'light' : 'dark');
    },

    scrollToBottom() {
        this.elements.scrollTarget.scrollIntoView({ behavior: "smooth", block: "end" });
    },

    // --- FUNGSI UBAH TOMBOL (KIRIM <-> STOP) ---
    setBtnState(state) {
        const btn = this.elements.sendBtn;
        const icon = btn.querySelector('span');
        
        if (state === 'loading') {
            // Ubah jadi tombol STOP (Kotak)
            icon.innerText = 'stop'; 
            btn.classList.replace('btn-primary', 'btn-danger'); 
            btn.title = "Hentikan";
        } else {
            // Ubah balik jadi tombol KIRIM (Panah)
            icon.innerText = 'arrow_upward';
            btn.classList.replace('btn-danger', 'btn-primary');
            btn.title = "Kirim";
        }
    },

    // --- FUNGSI STOP MENGETIK ---
    stopTyping() {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer); // Matikan loop mengetik
            this.typingTimer = null;
        }
        // Hapus kursor kedip yang tersisa
        const cursors = document.querySelectorAll('.typing-cursor');
        cursors.forEach(el => el.classList.remove('typing-cursor'));
    },

    showFilePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.elements.previewImg.src = e.target.result;
            this.elements.filePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    },

    clearFile() {
        this.elements.fileInput.value = '';
        this.elements.filePreview.style.display = 'none';
    },

    // --- STRUKTUR PESAN DIPERBARUI (AGAR LAYOUT RAPI) ---
    addMessage(htmlContent, sender, isLoading = false) {
        // Wrapper Baris (Flexbox) untuk mengatur posisi Kiri/Kanan
        const rowDiv = document.createElement('div');
        rowDiv.className = `message-row ${sender === 'user' ? 'user' : 'ai'}`;
        if (isLoading) rowDiv.id = 'loading-' + Date.now();

        // Avatar AI (Hanya muncul untuk AI)
        const avatarHTML = sender === 'ai' 
            ? `<div class="ai-avatar"><span class="material-symbols-rounded fs-6">smart_toy</span></div>` 
            : '';

        // Isi Pesan (Bubble)
        const bubbleHTML = `
            <div class="bubble">
                ${isLoading ? '<div class="spinner-grow spinner-grow-sm text-secondary" role="status"></div> Thinking...' : htmlContent}
            </div>
        `;

        // Gabungkan elemen
        rowDiv.innerHTML = sender === 'ai' ? (avatarHTML + bubbleHTML) : bubbleHTML;

        this.elements.messagesBox.appendChild(rowDiv);
        this.scrollToBottom();
        return rowDiv.id;
    },

    // --- EFEK MENGETIK DIPERBARUI (AGAR TOMBOL STOP BEKERJA & LAYOUT RAPI) ---
    async typeWriterEffect(fullText) {
        return new Promise((resolve) => {
            // 1. Buat Struktur HTML yang Rapi (Sama seperti addMessage)
            const rowDiv = document.createElement('div');
            rowDiv.className = `message-row ai`; // Pastikan class 'ai' ada
            
            // Avatar
            const avatar = document.createElement('div');
            avatar.className = 'ai-avatar';
            avatar.innerHTML = `<span class="material-symbols-rounded fs-6">smart_toy</span>`;
            
            // Bubble Text
            const bubble = document.createElement('div');
            bubble.className = 'bubble typing-cursor'; // Kursor aktif
            
            rowDiv.appendChild(avatar);
            rowDiv.appendChild(bubble);
            this.elements.messagesBox.appendChild(rowDiv);

            let i = 0;
            let currentText = "";
            const speed = 5; 
            const step = 3;

            // 2. Fungsi Loop Mengetik
            const type = () => {
                if (i < fullText.length) {
                    currentText += fullText.substring(i, i + step);
                    i += step;
                    
                    bubble.innerHTML = marked.parse(currentText);
                    this.scrollToBottom();
                    
                    // Simpan ID timer agar bisa di-stop lewat stopTyping()
                    this.typingTimer = setTimeout(type, speed); 
                } else {
                    // Selesai
                    bubble.classList.remove('typing-cursor');
                    bubble.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
                    this.addCopyButtons(bubble);
                    bubble.querySelectorAll('table').forEach(t => t.classList.add('table', 'table-bordered', 'table-sm'));
                    
                    this.typingTimer = null; // Reset timer
                    resolve();
                }
            };
            
            // Mulai mengetik
            type();
        });
    },

    addCopyButtons(element) {
        const preElements = element.querySelectorAll('pre');
        preElements.forEach(pre => {
            if (pre.parentNode.classList.contains('code-wrapper')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'code-wrapper';
            
            const btn = document.createElement('button');
            btn.className = 'copy-btn';
            btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px">content_copy</span> Copy`;
            
            btn.onclick = () => {
                const code = pre.querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px">check</span> Copied!`;
                    setTimeout(() => { btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px">content_copy</span> Copy`; }, 2000);
                });
            };
            
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);
            wrapper.appendChild(btn);
        });
    }
};
