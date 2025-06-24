// routes/accommodations.js - PostgreSQL Compatible Routes
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Search accommodations with filters
router.get('/search', async (req, res) => {
    try {
        console.log('🔍 Accommodation search request:', req.query);
        
        const { city, checkin, checkout, type } = req.query;
        
        let query = `
            SELECT 
                id, name, description, city, address, 
                price_per_night, accommodation_type, 
                amenities, photos, is_active, created_at
            FROM accommodations 
            WHERE is_active = true
        `;
        
        const params = [];
        let paramCount = 0;
        
        // Add city filter if provided
        if (city && city.trim() !== '') {
            paramCount++;
            if (process.env.DATABASE_URL) {
                // PostgreSQL syntax
                query += ` AND LOWER(city) LIKE LOWER($${paramCount})`;
            } else {
                // MySQL syntax
                query += ` AND LOWER(city) LIKE LOWER(?)`;
            }
            params.push(`%${city.trim()}%`);
        }
        
        // Add type filter if provided
        if (type && type.trim() !== '') {
            paramCount++;
            if (process.env.DATABASE_URL) {
                query += ` AND accommodation_type = $${paramCount}`;
            } else {
                query += ` AND accommodation_type = ?`;
            }
            params.push(type.trim());
        }
        
        query += ' ORDER BY price_per_night ASC';
        
        console.log('📝 Query:', query);
        console.log('📝 Params:', params);
        
        let results;
        
        if (process.env.DATABASE_URL) {
            // PostgreSQL query
            const client = await db.connect();
            try {
                const result = await client.query(query, params);
                results = result.rows;
            } finally {
                client.release();
            }
        } else {
            // MySQL query
            const [rows] = await db.execute(query, params);
            results = rows;
        }
        
        console.log(`✅ Found ${results.length} accommodations`);
        
        // Add calculated fields for frontend compatibility
        const accommodationsWithExtras = results.map(acc => ({
            ...acc,
            safety_rating: 4, // Default safety rating
            verified: true,   // Default verification status
            average_rating: 4.2 // Default average rating
        }));
        
        res.json({
            success: true,
            count: accommodationsWithExtras.length,
            accommodations: accommodationsWithExtras
        });
        
    } catch (error) {
        console.error('❌ Accommodation search error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching accommodations',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get specific accommodation by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🏨 Getting accommodation details for ID: ${id}`);
        
        let query, results;
        
        if (process.env.DATABASE_URL) {
            // PostgreSQL query
            query = `
                SELECT 
                    id, name, description, city, address, 
                    latitude, longitude, price_per_night, 
                    accommodation_type, amenities, photos, 
                    contact_info, is_active, created_at
                FROM accommodations 
                WHERE id = $1 AND is_active = true
            `;
            
            const client = await db.connect();
            try {
                const result = await client.query(query, [id]);
                results = result.rows;
            } finally {
                client.release();
            }
        } else {
            // MySQL query
            query = `
                SELECT 
                    id, name, description, city, address, 
                    latitude, longitude, price_per_night, 
                    accommodation_type, amenities, photos, 
                    contact_info, is_active, created_at
                FROM accommodations 
                WHERE id = ? AND is_active = true
            `;
            
            const [rows] = await db.execute(query, [id]);
            results = rows;
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Accommodation not found'
            });
        }
        
        const accommodation = {
            ...results[0],
            safety_rating: 4,
            verified: true,
            average_rating: 4.2
        };
        
        console.log('✅ Accommodation details retrieved');
        
        res.json({
            success: true,
            accommodation
        });
        
    } catch (error) {
        console.error('❌ Get accommodation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving accommodation',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Test route
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Accommodations route is working!',
        timestamp: new Date().toISOString(),
        database: process.env.DATABASE_URL ? 'PostgreSQL (Render)' : 'MySQL (Local)'
    });
});

module.exports = router;
