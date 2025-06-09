const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const connectDB = require("./config/db.js");
const auth = require("./auth.js");
const dashboard = require("./dashboard.js");

const port = process.env.PORT;
const app = express();

app.use(express.json());
app.use("/public/images", express.static(path.join(__dirname, "Images")));

app.use(
	cors({
		origin: "https://ai-ortho-scan-qd0zhvi4p-kamal-hassans-projects.vercel.app/",
	})
);

async function startServer() {
	const db = await connectDB();
	app.use("/api/auth", auth(db));
	app.use("/api/main", dashboard(db));
	app.listen(port);
}
startServer();
