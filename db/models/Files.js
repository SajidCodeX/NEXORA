const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  filePath: { type: String, required: true },
  uploadDate: { type: Date, required: true }
});

const File = mongoose.model("File", fileSchema);
module.exports = File;