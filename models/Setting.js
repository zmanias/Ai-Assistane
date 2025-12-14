const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
    key: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true,
        primaryKey: true 
    },
    value: { 
        type: DataTypes.TEXT, 
        allowNull: false 
    }
}, {
    tableName: 'settings', // Pastikan nama tabelnya ini
    timestamps: false      // PENTING: Matikan ini agar tidak error 'createdAt'
});

module.exports = Setting;
