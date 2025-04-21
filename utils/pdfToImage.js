const pdf = require("pdf-poppler");
const path = require("path");

async function convertPDFToImage(pdfPath) {
    const outputDir = path.dirname(pdfPath);
    const opts = {
        format: "jpeg",
        out_dir: outputDir,
        out_prefix: "page",
        page: null,
    };

    try {
        await pdf.convert(pdfPath, opts);
        return path.join(outputDir, "page-1.jpg"); // assuming page-1
    } catch (err) {
        console.error("❌ PDF to image conversion failed:", err);
        throw err;
    }
}

module.exports = convertPDFToImage;

