// parsers/extractTextFromImage.js
const Tesseract = require('tesseract.js');
const { createWorker } = require('tesseract.js');
const preprocessImage = require('./preprocessImage');
const fs = require('fs').promises;
const path = require('path');

async function extractTextFromImage(imagePath) {
  let processedPath;

  try {
    // Preprocess the image
    processedPath = await preprocessImage(imagePath);

    // Ensure the processed image exists
    try {
      await fs.access(processedPath);
    } catch (err) {
      throw new Error('Preprocessed image is not accessible');
    }

    let text = '';

    // Try using the createWorker API (Tesseract.js v5+)
    const worker = await createWorker({
      logger: m => console.log(`[Tesseract Worker] ${m.status}: ${Math.round(m.progress * 100)}%`)
    });

    try {
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      const { data: { text: workerText } } = await worker.recognize(processedPath);
      text = workerText;

      await worker.terminate();
    } catch (workerError) {
      console.warn('[Fallback] Worker failed, using legacy API:', workerError.message);

      // Use the older recognize() method
      const { data: { text: legacyText } } = await Tesseract.recognize(
        processedPath,
        'eng',
        { logger: m => console.log(`[Tesseract Legacy] ${m.status}: ${Math.round(m.progress * 100)}%`) }
      );

      text = legacyText;
    }

    return text;
  } catch (error) {
    console.error('❌ Error extracting text:', error.message);
    throw new Error(`Failed to extract text: ${error.message}`);
  } finally {
    // Cleanup the preprocessed file if it’s different from the original
    if (processedPath && processedPath !== imagePath) {
      try {
        await fs.unlink(processedPath);
        console.log(`🧹 Cleaned up: ${path.basename(processedPath)}`);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to delete preprocessed image:', cleanupError.message);
      }
    }
  }
}

module.exports = extractTextFromImage;
