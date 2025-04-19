const mongoose = require('mongoose');
require("dotenv").config();

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.mongo_uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ MongoDB Atlas Connected Successfully!");
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error);
        process.exit(1);
    }
}

module.exports = connectDB;