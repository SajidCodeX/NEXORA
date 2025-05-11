# 📄 NEXORA - Document Parser & Analyzer

NEXORA is a powerful, modular document parsing and analytics platform built with Node.js, Express, and MongoDB. It allows users to upload result PDFs or screenshots (e.g., from universities like Ganpat University, GMERS, etc.) and extracts structured, machine-readable JSON data using OCR and parsing techniques. An admin panel enables oversight of uploaded documents, parsed results, and user management.

---

## 🚀 Features

- 📤 **PDF/PNG Upload**: Users can upload university result files.
- 🧠 **Smart Parsing**: Custom parsers using Tesseract OCR + Tabula for text and table extraction.
- 📊 **Result Viewer**: Display parsed results cleanly on the frontend.
- 🛡 **Admin Panel**:
  - Manage all uploaded documents.
  - View parsed results (JSON/Table view).
  - Delete faulty records.
  - Track analytics (university-wise stats, success/failure charts).
  - Manage users (upload count, future block/unblock).
- 🧩 **Modular Parser System**: Easily extendable to support new universities/doc formats.

---

## 🏗 Project Structure

NEXORA/
├── config/ # DB and environment configs
├── controllers/ # Route logic
├── models/ # Mongoose models (User, File, etc.)
├── parsers/ # University-specific parsers
├── public/ # Static files (CSS, JS)
├── routes/ # Express routes
├── views/ # EJS frontend templates
├── utils/ # Utility helpers (e.g., file handling)
├── app.js # Entry point
└── README.md # You are here

---

## ⚙️ Technologies Used

- **Node.js** + **Express.js** – Backend framework
- **MongoDB Atlas** – Database for storing user and file data
- **Tesseract.js** – OCR engine for reading image/PDF content
- **pdf-parse** / **Tabula** – Extract tabular data from PDFs
- **EJS** – Templating engine for rendering UI
- **Multer** – File upload handling

---

## 🔐 User Roles

- **User**: Can upload files and view their parsed results.
- **Admin**: Can access admin dashboard for document management, analytics, and user controls.

---

## 🧪 How to Run Locally

1. **Clone the repo**  
   ```bash
   git clone https://github.com/SajidCodeX/NEXORA.git
   cd NEXORA
2. Install dependencies
3. Set up environment variables
Create a .env file with the following:
MONGO_URI=your_mongodb_connection
SESSION_SECRET=your_secret
4. Start the server
5. Visit http://localhost:9999

📸 Screenshot Preview
NEXORA Admin Panel
![Screenshot 2025-05-08 122328](https://github.com/user-attachments/assets/d3929d92-618b-481d-8097-26b513e8718c)

NEXORA Upload Interface
![Screenshot 2025-05-08 131439](https://github.com/user-attachments/assets/6f614c03-7074-48af-89c2-208812aae3c4)

👤 Author
SajidCodeX
GitHub


