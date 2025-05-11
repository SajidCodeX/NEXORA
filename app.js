// Import core modules and dependencies
const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const session = require("express-session");

// Import local modules and configurations
const { university_parse_map, university_code_map } = require("./parsers/uni_list");
const connectDB = require("./db/connection");
const authRoutes = require("./routes/auth");

// Import MongoDB models
const User = require("./db/models/user");
const Students = require("./db/models/student");
const College = require("./db/models/selectCollege");
const Files = require("./db/models/Files");

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Set up middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure session middleware
app.use(session({
  secret: "nexora-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Use true if HTTPS is enabled
}));

// Make user info available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Set up EJS view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, "result-" + Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdf = ext === ".pdf" && file.mimetype === "application/pdf";
  cb(null, isPdf);
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB file size limit
  fileFilter
});

const uploadMiddleware = upload.single("file");

// Mount auth and admin routes
app.use('/', authRoutes);
app.use('/admin', require('./routes/admin'));

// Routes
// Home page
app.get("/home", (req, res) => {
  res.render("pages/home", { session: req.session });
});

// College selection
app.get("/choose_college", (req, res) => {
  res.render("pages/categories/education/college");
});

// Student info form (GET)
app.get("/std_info", async (req, res) => {
  const selectedCollegeName = req.query.college_selection;
  req.session.university = selectedCollegeName;
  try {
    const newCollege = new College({ college_name: selectedCollegeName });
    await newCollege.save();
    res.render("pages/categories/education/std_info", { university: selectedCollegeName });
  } catch (error) {
    res.status(500).send("Failed to save selected college.");
  }
});

// Student info form (POST)
app.post("/std_info", async (req, res) => {
  try {
    const student = new Students({
      std_name: req.body.std_name,
      std_enrol: req.body.std_enrol,
      std_email: req.body.std_email
    });
    await student.save();
    res.redirect(`/uploadResult`);
  } catch (error) {
    res.status(500).send("Failed to save student data.");
  }
});

// Redirect to upload result page with session data
app.post("/upload", (req, res) => {
  const { std_name, std_email, std_enrol } = req.body;
  if (!std_name || !std_email || !std_enrol) {
    return res.status(400).send("❌ All fields are required!");
  }
  req.session.student = { std_name, std_email, std_enrol };
  res.redirect("/uploadResult");
});

// Render upload result page
app.get("/uploadResult", (req, res) => {
  res.render("pages/categories/education/uploadResult", {
    errorMessage: null,
    parsedResult: null,
    filePreview: null
  });
});

// Handle file upload and parsing
app.post("/uploadResult", (req, res, next) => {
  // Handle file upload validation
  uploadMiddleware(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).render("pages/categories/education/uploadResult", {
        errorMessage: err.message || "File upload failed!",
        parsedResult: null,
        filePreview: null,
        uploadedFilePath: null
      });
    }

    if (!req.file) {
      return res.status(400).render("pages/categories/education/uploadResult", {
        errorMessage: "Invalid file type! Only PDF files are allowed.",
        parsedResult: null,
        filePreview: null,
        uploadedFilePath: null
      });
    }

    next();  // Proceed to the next middleware after upload validation
  });
}, async (req, res) => {
  try {
    const filePath = req.file.path;
    const filePreview = `/uploads/${req.file.filename}`;
    const selectedUniversityFullName = req.session.university;

    // Check if the university code and parser are available
    const universityCode = university_code_map[selectedUniversityFullName];
    const parser = university_parse_map[universityCode];

    if (!universityCode || !parser) {
      return res.status(400).render("pages/categories/education/uploadResult", {
        errorMessage: "No parser found for the selected university.",
        parsedResult: null,
        filePreview,
        uploadedFilePath: filePreview
      });
    }

    // Attempt to parse the file
    const result = await parser.parse(filePath);
    result.userInfo = {
      name: req.session.student?.std_name,
      email: req.session.student?.std_email,
      enrollmentNumber: req.session.student?.std_enrol,
      university: selectedUniversityFullName
    };

    // Save the parsed file info in the database
    if (req.session.userId) {
      const fileDoc = new Files({
        userId: req.session.userId,
        filePath: filePreview,
        uploadDate: new Date(),
        university: selectedUniversityFullName,
        parsedData: result,
        status: 'success'
      });
      await fileDoc.save();
    }

    // Store parsed data in session and render success
    req.session.latestParsedResult = result;

    res.render("pages/categories/education/uploadResult", {
      errorMessage: null,
      parsedResult: result,
      filePreview,
      uploadedFilePath: filePreview
    });

  } catch (err) {
    console.error("❌ PDF parsing error:", err);

    // Save failure entry in the database for tracking failed files
    if (req.session.userId && req.file) {
      const failedFile = new Files({
        userId: req.session.userId,
        filePath: `/uploads/${req.file.filename}`,
        uploadDate: new Date(),
        university: req.session.university || "Unknown",
        status: 'failed'
      });
      await failedFile.save();
    }

    // Render error message for failed parsing
    res.status(500).render("pages/categories/education/uploadResult", {
      errorMessage: "Failed to parse the PDF. Please ensure it's a valid university result PDF.",
      parsedResult: null,
      filePreview: null,
      uploadedFilePath: null
    });
  }
});


// View uploaded files for logged-in user
app.get("/viewItems", async (req, res) => {
  try {
    const userFiles = await Files.find({ userId: req.session.userId }).sort({ uploadDate: -1 });
    res.render("pages/categories/education/viewItems", { files: userFiles });
  } catch (err) {
    res.render("pages/categories/education/viewItems", {
      files: [],
      errorMessage: "Failed to fetch uploaded files."
    });
  }
});

// Static info pages
app.get('/about', (req, res) => res.render('pages/categories/aboutServices/about'));
app.get("/insurance", (req, res) => res.render("pages/categories/insurance/insurance"));
app.get("/edu_about", (req, res) => res.render("pages/categories/education/about"));
app.get("/ins_about", (req, res) => res.render("pages/categories/insurance/insurance"));

// Admin dashboard with analytics
app.get('/admin/dashboard', async (req, res) => {
  try {
    const totalUploads = await Files.countDocuments();
    const successfulParses = await Files.countDocuments({ status: 'success' });
    const failedParses = await Files.countDocuments({ status: 'failed' });
    const universityWiseStats = await Files.aggregate([
      { $group: { _id: "$university", count: { $sum: 1 } } }
    ]);

    res.render('pages/admin/dashboard', {
      totalUploads,
      successfulParses,
      failedParses,
      universityWiseStats
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).send('Error fetching analytics');
  }
});

// Admin manage users
app.get('/admin/manage-users', async (req, res) => {
  try {
    const users = await User.find();
    res.render('pages/admin/manageUsers', { users });
  } catch (error) {
    res.status(500).send('Error fetching users');
  }
});

// Admin manage uploaded documents
app.get('/admin/manage-documents', async (req, res) => {
  try {
    const files = await Files.find().populate('userId', 'email name');
    res.render('pages/admin/manageDocuments', { files });
  } catch (error) {
    res.status(500).send('Error retrieving documents');
  }
});

// Admin view parsed result data
app.get('/admin/view-parsed/:fileId', async (req, res) => {
  try {
    const file = await Files.findById(req.params.fileId);
    res.render('pages/admin/viewParsed', { parsedData: file.parsedData });
  } catch (error) {
    res.status(500).send('Error viewing parsed data');
  }
});

// Admin delete document entry
app.get('/admin/delete-file/:fileId', async (req, res) => {
  try {
    await Files.findByIdAndDelete(req.params.fileId);
    res.redirect('/admin/manage-documents');
  } catch (error) {
    res.status(500).send('Error deleting file');
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`Something broke! Error: ${err.message}`);
});

// Redirect root to /home
app.get("/", (req, res) => res.redirect("/home"));

// Start the server
app.listen(9999, () => {
  console.log("🚀 Server running on port 5904");
});
