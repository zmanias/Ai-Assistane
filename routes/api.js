const express = require('express');
const router = express.Router();
const multer = require('multer');
const ChatController = require('../controllers/ChatController');
const AuthController = require('../controllers/AuthController');
const AdminController = require('../controllers/AdminController');

const upload = multer({ dest: 'tmp/' });

// --- AUTHENTICATION ---
router.post('/auth/login', AuthController.login);
router.post('/auth/register', AuthController.register);

// --- CHAT & AI ---
router.post('/chat', upload.single('image'), ChatController.handleChat);

// --- ADMIN DASHBOARD ---
router.get('/admin/stats', AdminController.getStats);
router.post('/admin/settings', AdminController.updatePrompt);

router.get('/chat/history', ChatController.loadHistory);
module.exports = router;