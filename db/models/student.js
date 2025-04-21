const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  enrollmentNumber: { type: String, required: true },
  name: { type: String, required: true },
  branch: { type: String },
  programme: { type: String },
  semester: { type: String },
  courses: [
    {
      courseCode: String,
      courseTitle: String,
      credits: Number,
      grade: String,
      points: Number,
    },
  ],
  currentSemesterPerformance: {
    sgpa: Number,
    cgpa: Number,
    backlog: Number,
  },
  progressivePerformance: {
    sgpa: Number,
    cgpa: Number,
    backlog: Number,
  },
});

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
