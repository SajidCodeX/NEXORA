const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // or whatever your user model is called
    required: true
  },
  filePath: String,
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("File", fileSchema);
