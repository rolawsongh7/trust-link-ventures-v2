#!/usr/bin/env node

/**
 * Image Optimization Script
 * Converts images to WebP and generates responsive variants
 * 
 * Usage:
 *   node scripts/optimize-images.js
 * 
 * Requirements:
 *   npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp is not installed.');
  console.log('   Install it with: npm install --save-dev sharp');
  process.exit(1);
}

// Configuration
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');
const OUTPUT_DIR = path.join(ASSETS_DIR, 'optimized');
const PLACEHOLDER_DIR = path.join(ASSETS_DIR, 'placeholders');

const QUALITY = {
  high: 80,     // WebP quality for main images
  placeholder: 20, // Low quality for blur placeholders
};

const SIZES = {
  small: 640,   // Mobile
  medium: 1024, // Tablet
  large: 1920,  // Desktop
};

/**
 * Create output directories
 */
function createDirectories() {
  [OUTPUT_DIR, PLACEHOLDER_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Get all image files recursively
 */
function getImageFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip optimized and placeholder directories
        if (item !== 'optimized' && item !== 'placeholders') {
          traverse(fullPath);
        }
      } else if (/\.(jpg|jpeg|png)$/i.test(item)) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

/**
 * Optimize single image
 */
async function optimizeImage(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const relativePath = path.relative(ASSETS_DIR, path.dirname(filePath));
  
  console.log(`\n📸 Processing: ${fileName}...`);
  
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    console.log(`   Original: ${metadata.width}x${metadata.height}, ${(metadata.size / 1024).toFixed(0)}KB`);
    
    // Generate optimized WebP
    const webpPath = path.join(OUTPUT_DIR, relativePath, `${fileName}.webp`);
    fs.mkdirSync(path.dirname(webpPath), { recursive: true });
    
    await image
      .webp({ quality: QUALITY.high })
      .toFile(webpPath);
    
    const webpStats = fs.statSync(webpPath);
    console.log(`   ✅ WebP: ${(webpStats.size / 1024).toFixed(0)}KB (${Math.round((1 - webpStats.size / metadata.size) * 100)}% smaller)`);
    
    // Generate blur placeholder
    const placeholderPath = path.join(PLACEHOLDER_DIR, relativePath, `${fileName}-small.webp`);
    fs.mkdirSync(path.dirname(placeholderPath), { recursive: true });
    
    await sharp(filePath)
      .resize(20, 20, { fit: 'inside' })
      .webp({ quality: QUALITY.placeholder })
      .toFile(placeholderPath);
    
    const placeholderStats = fs.statSync(placeholderPath);
    console.log(`   ✅ Placeholder: ${(placeholderStats.size / 1024).toFixed(0)}KB`);
    
    // Generate responsive variants for large images
    if (metadata.width > 1024) {
      for (const [sizeName, width] of Object.entries(SIZES)) {
        if (width < metadata.width) {
          const variantPath = path.join(OUTPUT_DIR, relativePath, `${fileName}-${sizeName}.webp`);
          
          await sharp(filePath)
            .resize(width, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY.high })
            .toFile(variantPath);
          
          const variantStats = fs.statSync(variantPath);
          console.log(`   ✅ ${sizeName}: ${(variantStats.size / 1024).toFixed(0)}KB`);
        }
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error.message);
  }
}

/**
 * Main optimization process
 */
async function optimize() {
  console.log('🎨 Image Optimization Tool\n');
  console.log('='.repeat(50));
  
  createDirectories();
  
  const imageFiles = getImageFiles(ASSETS_DIR);
  console.log(`\n📁 Found ${imageFiles.length} images to optimize\n`);
  
  let processed = 0;
  for (const filePath of imageFiles) {
    await optimizeImage(filePath);
    processed++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ Optimization complete! Processed ${processed} images.`);
  console.log(`\n📦 Outputs:`);
  console.log(`   - Optimized: ${OUTPUT_DIR}`);
  console.log(`   - Placeholders: ${PLACEHOLDER_DIR}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Update image imports to use optimized versions');
  console.log('   2. Use <OptimizedImage> component instead of <img>');
  console.log('   3. Import placeholders for blur effect\n');
}

// Run optimization
optimize().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
