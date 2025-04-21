const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const session = require("express-session");
const { parseGanpatResult } = require("./parsers/pdfGanpatParser");
const connectDB = require("./db/connection");
const authRoutes = require("./routes/auth");
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("uploads"));

// 🛑 FIRST: Setup session correctly here
app.use(session({
  secret: "nexora-secret",
  resave: false,
  saveUninitialized: true
}));

// ✅ SECOND: Now setup locals middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Auth routes
app.use('/', authRoutes);

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
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = ext === ".pdf" && file.mimetype === "application/pdf";
    if (isPdf) cb(null, true);
    else cb(new Error("Only PDF files allowed!"));
  }
});

// Pages
app.get("/home", (req, res) => {
  res.render("pages/home", { session: req.session });
});

app.get("/choose_college",(req, res) => {
  res.render("pages/categories/education/college");
});

app.post('/choose_college', (req, res) => {
  const selectedCollege = req.body.college;

  if (selectedCollege === 'ganpat') {
    res.redirect('/upload/ganpat');
  } else if (selectedCollege === 'nirma') {
    res.redirect('/upload/nirma');
  } else if (selectedCollege === 'iit') {
    res.redirect('/upload/iit');
  } else {
    // Default ya error handle
    res.redirect('/choose_college');
  }
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

    const result = await parseGanpatResult(filePath);

    result.userInfo = {
      name: req.session.student?.std_name,
      email: req.session.student?.std_email,
      enrollmentNumber: req.session.student?.std_enrol,
      university: req.session.university
    };

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

  res.json(result);
});

// Auth routes
app.use("/auth", authRoutes);

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
