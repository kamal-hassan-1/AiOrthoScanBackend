const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
var staticPatientId = -1;

module.exports = (db) => {
	const usersCollection = db.collection("users");

	router.post("/signup", async (req, res) => {
		const { fullName, age, gender, email, password } = req.body;

		function areDetailsValid(fullName, age, gender, email, password) {
			if (!fullName || !age || !gender || !email || !password) {
				return false;
			}
			const numericalAge = parseInt(age);
			if (isNaN(numericalAge) || numericalAge < 0 || numericalAge > 150) {
				return false;
			}
			const passwordPattern =
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
			if (!passwordPattern.test(password)) {
				return false;
			}
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return false;
			}
			return true;
		}
		if (!areDetailsValid(fullName, age, gender, email, password)) {
			return res.status(400).json({ error: "Invalid user details" });
		}

		try {
			const existingUser = await usersCollection.findOne({ email });
			if (existingUser) {
				return res.status(409).json({ error: "Email already registered" });
			}
			const hashedPassword = await bcrypt.hash(password, 10);

			const newUser = {
				fullName,
				age,
				gender,
				email,
				password: hashedPassword,
				patientId: ++staticPatientId,
				createdAt: new Date(),
			};

			await usersCollection.insertOne(newUser);
			res.status(201).json({ message: "User registered successfully" });
		} catch (error) {
			res.status(500).json({ error: "Internal server error" });
		}
	});

	router.post("/login", async (req, res) => {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "Email and password are required" });
		}

		try {
			const user = await usersCollection.findOne({ email });
			if (!user) {
				return res.status(404).json({ error: "User not found" });
			}
			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				return res.status(401).json({ error: "Invalid credentials" });
			}

			const token = jwt.sign({ userId: user._id }, jwtSecret, {
				expiresIn: "1h",
			});
			res.status(200).json({ message: "Login successful", token });
		} catch (error) {
			console.error("Login error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	});
	return router;
};
