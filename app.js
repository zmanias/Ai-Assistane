const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sequelize = require('./config/database');
const ChatController = require('./controllers/ChatController');
const AdminController = require('./controllers/AdminController');

// ... (app.listen)
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'tmp/' });
const apiRoutes = require('./routes/api');

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRoutes);

// Database Sync (Buat tabel otomatis)
sequelize.sync().then(() => console.log("✅ Database Connected & Synced!"));

// Routes
app.post('/ai/chat', upload.single('image'), ChatController.handleChat);

// --- ROUTES ADMIN BARU ---
app.get('/api/admin/stats', AdminController.getStats);
app.post('/api/admin/update-prompt', AdminController.updatePrompt);

app.get('/c/:sessionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jika user buka root /, kirim index.html juga
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
app.listen(process.env.PORT, () => {
    console.log(`🚀 Server Pro berjalan di Port ${process.env.PORT}`);
});
