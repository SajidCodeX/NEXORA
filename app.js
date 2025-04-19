const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const session = require("express-session");
const { parseGanpatResult } = require("./parsers/pdfGanpatParser"); // Ganpat University PDF parser
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("uploads"));

app.use(session({
  secret: "nexora-secret",
  resave: false,
  saveUninitialized: true
}));

// View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Multer setup for PDF only
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, "result-" + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = ext === ".pdf" && file.mimetype === "application/pdf";
    if (isPdf) cb(null, true);
    else cb(new Error("Only PDF files allowed!"));
  }
});

// Routes
app.get("/home", (req, res) => {
  res.render("pages/home");
});

app.get("/choose_college", (req, res) => {
  res.render("pages/categories/education/college");
});

app.post("/choose_university", (req, res) => {
  req.session.university = req.body.university;
  res.redirect("/std_info");
});

app.get("/std_info", (req, res) => {
  res.render("pages/categories/education/std_info", {
    university: req.session.university || "Unknown"
  });
});

app.post("/upload", (req, res) => {
  const { std_name, std_email, std_enrol } = req.body;
  if (!std_name || !std_email || !std_enrol) {
    return res.status(400).send("❌ All fields are required!");
  }
  req.session.student = { std_name, std_email, std_enrol };
  res.redirect("/uploadResult");
});

app.get("/uploadResult", (req, res) => {
  res.render("pages/categories/education/uploadResult", { errorMessage: null });
});

app.post("/uploadResult", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.render("pages/categories/education/uploadResult", { 
        errorMessage: "Please upload a PDF file." 
      });
    }

    const filePath = req.file.path;
    
    // Use the improved parser
    const result = await parseGanpatResult(filePath);
    
    // Add additional user information from the session if needed
    result.userInfo = {
      name: req.session.student?.std_name,
      email: req.session.student?.std_email,
      enrollmentNumber: req.session.student?.std_enrol,
      university: req.session.university
    };

    // Store the full result in the session
    req.session.latestParsedResult = result;
    
    res.redirect("/viewResult");
  } catch (err) {
    console.error("PDF parsing error:", err);
    res.render("pages/categories/education/uploadResult", { 
      errorMessage: "Failed to parse the PDF. Please ensure it's a valid Ganpat University result PDF." 
    });
  }
});

app.get("/viewResult", (req, res) => {
  const result = req.session.latestParsedResult;

  if (!result) {
    return res.status(404).send("No result available. Please upload a PDF first.");
  }

  // You can either return JSON or render a view with the result
  // Option 1: Return JSON
  res.json(result);
  
  
});

// Redirect root to home
app.get("/", (req, res) => {
  res.redirect("/home");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`Something broke! Error: ${err.message}`);
});

// Start server
app.listen(2105, () => {
  console.log("🚀 Server running on port 2105");
});