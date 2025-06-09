const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;
const jwt = require('jsonwebtoken');

module.exports = (db) => {
    const diagnoseCollection = db.collection('diagnose');

    const UPLOAD_DIR = path.join(__dirname, 'Images');
    console.log(UPLOAD_DIR);
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${file.originalname}`;
            cb(null, uniqueName);
        },
    });

    const fileFilter = (req, file, cb) => {
        const fileTypes = ['image/png', 'image/jpeg'];
        if (fileTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG and JPG images are allowed'), false);
        }
    };

    const upload = multer({
        storage,
        fileFilter,
    });

    router.post('/uploadPatientData', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded or invalid file type' });
            }
            const { relevantData } = req.body;
    
            if (!relevantData || typeof relevantData !== 'string') {
                return res.status(400).json({ error: 'Invalid input. relevantData must be a non-empty string.' });
            }
            const publicUrl = `${req.protocol}://${req.get('host')}/public/images/${req.file.filename}`;
            const result = await diagnoseCollection.insertOne({
                imageUrl: publicUrl,
                relevantData,
                createdAt: new Date()
            });
            res.status(200).json({ 
                message: 'Patient data uploaded successfully',
                id: result.insertedId,
                imageUrl: publicUrl
            });
        } catch (error) {
            res.status(500).json({ error: 'An error occurred while saving the data' });
        }
    });

    const usersCollection = db.collection('users');

    const verifySession = (req, res, next) => {
        const headersOfJWT = req.headers.authorization;
        if (!headersOfJWT || !headersOfJWT.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized access, token missing' });
        }
        const token = headersOfJWT.split(' ')[1];
        try {
            const decoded = jwt.verify(token, jwtSecret);
            req.user = decoded;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(403).json({ error: 'Token has expired' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
    };
    router.get('/patientRecords',verifySession, async (req, res) => {
        try {
            const userId = req.user.userId;
            const record = await usersCollection.findOne(
                { _id: new ObjectId(userId) },
                { projection: { fullName: 1, age: 1, gender: 1, patientId: 1 } }
            );
            if (!record) {
                return res.status(404).json({ error: 'Patient record not found' });
            }
            res.status(200).json(record);
        } catch (error) {
            console.error('Error fetching patient record:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.use((err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: `Multer error: ${err.message}` });
        }
        next(err);
    });
    return router;
};