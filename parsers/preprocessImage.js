// preprocessImage.js
const sharp = require('sharp');
async function preprocessImage(imagePath) {
  const img = sharp(imagePath);
  const metadata = await img.metadata();
  return await img
    .resize({
      width: metadata.width * 2, // scale up
      height: metadata.height * 2,
      kernel: sharp.kernel.nearest
    })
    .extend({ // pad to avoid edge cropping
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
      background: '#ffffff'
    })
    .grayscale()
    .normalize()
    .threshold(160)
    .sharpen()
    .toBuffer();
}
module.exports = preprocessImage;