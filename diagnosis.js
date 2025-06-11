const express = require("express");
const axios = require("axios");
const fs = require("fs");

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const API_KEY = process.env.GEMINI_API_KEY;

const router = express.Router();

module.exports = (db) => {
	router.post("/Aidiagnosis", async (req, res) => {
		try {
			const { imageBase64, promptText } = req.body;

			if (!imageBase64 || !promptText) {
				return res.status(400).json({ error: "Missing imageBase64 or promptText" });
			}

			const requestBody = {
				contents: [
					{
						parts: [
							{ text: promptText },
							{
								inline_data: {
									mime_type: "image/png",
									data: imageBase64,
								},
							},
						],
					},
				],
			};

			const geminiResponse = await axios.post(
				`${GEMINI_API_URL}?key=${API_KEY}`,
				requestBody,
				{
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const diagnosisText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No diagnosis returned.";
            res.json({ diagnosis: diagnosisText });
		} catch (error) {
			console.error("Error calling Gemini API:",error.response?.data || error.message);
			res.status(500).json({ error: "Failed to generate diagnosis." });
		}
	});
	return router;
};
