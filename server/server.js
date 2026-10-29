require('dotenv').config();
const connectDB = require('./config/db');
const createApp = require('./app');
connectDB();
const PORT = process.env.PORT || 5000;
createApp().listen(PORT, () => console.log('Server running on port ' + PORT));
