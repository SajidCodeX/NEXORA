const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    std_name: {
        type: String,
        required: true,
    },
    std_enrol: {
        type: String,
        required: true// Unique enrollment number
    },
    std_email: {
        type: String,
        required: true // Unique email
    },
}
);

const Students = mongoose.model("Students", studentSchema);

module.exports = Students;
