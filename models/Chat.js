const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chat = sequelize.define('Chat', {
    sessionId: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'assistant', 'system'), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false }
});

module.exports = Chat;
