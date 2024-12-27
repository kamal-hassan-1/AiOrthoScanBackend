const express = require('express')
const path = require('path');
const cors = require('cors');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv'); // something related to database
dotenv.config(); //loads environment variables

const bodyParser = require('body-parser');
const connectDB = require('./config/db.js');

const session = require('express-session')

const authRouter = require('./auth.js');
const dashboardRouter = require('./dashboard.js');


//the port at which backend operates
const port = process.env.PORT || 3500;

const app = express()
app.use(bodyParser.json());
app.use(express.json());
app.use('/public/images', express.static(path.join(__dirname, 'Images')));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));

app.use(session({
    secret: 'dancingLizard',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // For local development; change to true if using HTTPS in production
        httpOnly: true,
        sameSite: 'None',  // Allow cookies to be sent in cross-origin requests
    }
}));



async function startServer() {
    const db = await connectDB();
    app.use('/api/auth',authRouter(db));
    app.use('/api/main', dashboardRouter(db));
    app.listen(port)
}

startServer();