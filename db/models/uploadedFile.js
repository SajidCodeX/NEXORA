const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    fileName: String,
    filePath: String,
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UploadedFile", fileSchema);
