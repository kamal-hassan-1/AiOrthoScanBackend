const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt'); // For secure password hashing (optional but recommended)
const router = express.Router();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

//global variable for patientId
var staticPatientId = -1;

module.exports = (db) => {
    const usersCollection = db.collection('users');

    // Signup functionality
    router.post('/signup', async (req, res) => {
        const { fullName, age, gender, email, password } = req.body;

        // Validation function
        function areDetailsValid(fullName, age, gender, email, password) {
            //general validation
            if (!fullName || !age || !gender || !email || !password) {
                return false;
            }
            //age validation
            const numericalAge = parseInt(age);
            if (isNaN(numericalAge) || numericalAge < 0 || numericalAge > 150) {
                return false;
            }

            //no specific gender validation

            //password validation
            const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
            if (!passwordPattern.test(password)) {
                return false;
            }
            //email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return false;
            }
            return true;
        }

        // Validate user input
        if (!areDetailsValid(fullName, age, gender, email, password)) {
            return res.status(400).json({ error: 'Invalid user details' });
        }

        try {
            // Check if the email already exists
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ error: 'Email already registered' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Save the user to the database
            const newUser = {
                fullName,
                age,
                gender,
                email,
                password: hashedPassword,
                patientId : ++staticPatientId,
                createdAt: new Date(),
            };

            await usersCollection.insertOne(newUser);

            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Login functionality
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            // Find the user in the database
            const user = await usersCollection.findOne({ email });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Verify the password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { userId: user._id }, // Payload
                jwtSecret, // Secret key from .env
                { expiresIn: '1h' } // Token expiry
            );

            res.status(200).json({ message: 'Login successful', token});
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}
