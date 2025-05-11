const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // assuming there's a User model
    required: true
  },
  filePath: String,
  uploadDate: {
    type: Date,
    default: Date.now
  },

  // 🆕 Additional fields for admin panel
  university: {
    type: String,
    default: "Unknown"
  },
  status: String,
  parsedData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  filePath: {
    type: String,
    required: true,
  },
  parsedData: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model("File", fileSchema);
