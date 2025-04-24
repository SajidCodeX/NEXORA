const mongoose = require("mongoose");

const selectCollegeSchema = new mongoose.Schema({
    college_name: {
        type: String,
        required: true,
    }
});


selectUniversity = ( v => {
    university_name = req.body.college_selection;
})

const College = mongoose.model("College", selectCollegeSchema);
module.exports = College;