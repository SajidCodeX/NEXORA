const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const session = require("express-session");
const { university_parse_map, university_code_map } = require("./parsers/uni_list");
const connectDB = require("./db/connection");
const authRoutes = require("./routes/auth");
const app = express();
const Students = require("./db/models/student");
const College = require("./db/models/selectCollege");
const Files = require("./db/models/Files");

connectDB();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log(path.join(__dirname, "uploads"));

// Setup session
app.use(session({
  secret: "nexora-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Auth routes
app.use('/', authRoutes);

// View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Multer setup
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

app.get("/choose_college", (req, res) => {
  res.render("pages/categories/education/college");
});

app.get("/std_info", async (req, res) => {
  const selectedCollegeName = req.query.college_selection;
  console.log("Selected College Name:", selectedCollegeName);

  // Store selected college in session
  req.session.university = selectedCollegeName;

  try {
    const newCollege = new College({
      college_name: selectedCollegeName,
    });

    await newCollege.save();
    console.log("✅ College saved successfully!");

    res.render("pages/categories/education/std_info", { university: selectedCollegeName });
  } catch (error) {
    console.error("Error saving college:", error);
    res.status(500).send("Failed to save selected college.");
  }
});

app.post("/std_info", async (req, res) => {
  try {
    const student = new Students({
      std_name: req.body.std_name,
      std_enrol: req.body.std_enrol,
      std_email: req.body.std_email
    });
    console.log(req.body.std_name, req.body.std_enrol, req.body.std_email);
    await student.save();
    console.log("✅ Student saved successfully!");

    res.redirect(`/uploadResult`);
  } catch (error) {
    console.error("Error saving student:", error);
    res.status(500).send("Failed to save student data.");
  }
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
  res.render("pages/categories/education/uploadResult", {
    errorMessage: null,
    parsedResult: null,
    filePreview: null
  });
});

app.post("/uploadResult", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.render("pages/categories/education/uploadResult", {
        errorMessage: "No file uploaded.",
        parsedResult: null,
        filePreview: null,
        uploadedFilePath: null
      });
    }

    const filePath = req.file.path;
    const filePreview = `/uploads/${req.file.filename}`;
    console.log("✅ File uploaded successfully:", filePath);

    // Save file info to DB with userId (history tracking)
    if (req.session.userId) {
      const newFile = new Files({
        userId: req.session.userId,
        filePath: filePreview,
        uploadDate: new Date()
      });
      await newFile.save();
      console.log("✅ File saved to DB!");
    } else {
      console.warn("⚠️ No userId in session, skipping file history save.");
    }

    const selectedUniversityFullName = req.session.university;
    const universityCode = university_code_map[selectedUniversityFullName];

    if (!universityCode) {
      return res.status(400).send("No parser found for the selected university.");
    }

    const parser = university_parse_map[universityCode];
    if (!parser) {
      return res.status(400).send("No parser found for the selected university.");
    }

    const result = await parser.parse(filePath);
    result.userInfo = {
      name: req.session.student?.std_name,
      email: req.session.student?.std_email,
      enrollmentNumber: req.session.student?.std_enrol,
      university: selectedUniversityFullName
    };

    req.session.latestParsedResult = result;

    res.render("pages/categories/education/uploadResult", {
      errorMessage: null,
      parsedResult: result,
      filePreview,
      uploadedFilePath: filePreview
    });

  } catch (err) {
    console.error("❌ PDF parsing error:", err);
    res.render("pages/categories/education/uploadResult", {
      errorMessage: "Failed to parse the PDF. Please ensure it's a valid university result PDF.",
      parsedResult: null,
      filePreview: null,
      uploadedFilePath: null
    });
  }
});

app.get("/viewItems", async (req, res) => {
  try {
    const userFiles = await Files.find({ userId: req.session.userId }).sort({ uploadDate: -1 });
    console.log("User files:", userFiles);
    res.render("pages/categories/education/viewItems", {
      files: userFiles
    });
  } catch (err) {
    console.error("Error fetching files:", err);
    res.render("pages/categories/education/viewItems", {
      files: [],
      errorMessage: "Failed to fetch uploaded files."
    });
  }
});

app.get('/about', (req, res) => {
  res.render('pages/categories/aboutServices/about');
});

app.get("/insurance", (req, res) => {
  res.render("pages/categories/insurance/insurance")
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`Something broke! Error: ${err.message}`);
});

app.get("/", (req, res) => {
  res.redirect("/home");
});

app.listen(2105, () => {
  console.log("🚀 Server running on port 2105");
});
