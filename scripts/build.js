#!/usr/bin/env node

/**
 * Build Script for A Moody Place
 * Optimizes CSS, JavaScript, and images for production performance
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execSync } = require('child_process');

// Async file system operations
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

class BuildOptimizer {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.publicDir = path.join(this.rootDir, 'public');
        this.distDir = path.join(this.rootDir, 'dist');
        this.stats = {
            files: 0,
            originalSize: 0,
            optimizedSize: 0,
            compressionRatio: 0
        };
        
        console.log('🚀 Starting A Moody Place build optimization...\n');
    }
    
    /**
     * Run the complete build process
     */
    async build() {
        try {
            await this.setupDirectories();
            await this.optimizeCSS();
            await this.optimizeJavaScript();
            await this.optimizeImages();
            await this.generateManifest();
            await this.createServiceWorker();
            this.printStats();
            
            console.log('✅ Build optimization completed successfully!\n');
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }
    
    /**
     * Setup output directories
     */
    async setupDirectories() {
        const dirs = [
            this.distDir,
            path.join(this.distDir, 'css'),
            path.join(this.distDir, 'js'),
            path.join(this.distDir, 'images')
        ];
        
        for (const dir of dirs) {
            try {
                await mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            }
        }
        
        console.log('📁 Created output directories');
    }
    
    /**
     * Optimize CSS files
     */
    async optimizeCSS() {
        console.log('🎨 Optimizing CSS files...');
        
        const cssFiles = ['main.css'];
        
        for (const filename of cssFiles) {
            const inputPath = path.join(this.publicDir, 'css', filename);
            const outputPath = path.join(this.distDir, 'css', filename);
            
            if (!fs.existsSync(inputPath)) {
                console.warn(`⚠️  CSS file not found: ${filename}`);
                continue;
            }
            
            try {
                const originalCSS = await readFile(inputPath, 'utf8');
                const originalSize = Buffer.byteLength(originalCSS, 'utf8');
                
                // Use cssnano for optimization
                const cssnano = require('cssnano');
                const postcss = require('postcss');
                
                const result = await postcss([
                    cssnano({
                        preset: ['default', {
                            discardComments: {
                                removeAll: true
                            },
                            normalizeWhitespace: true,
                            minifySelectors: true,
                            minifyParams: true,
                            mergeRules: true,
                            autoprefixer: false // We'll handle this separately if needed
                        }]
                    })
                ]).process(originalCSS, { from: inputPath });
                
                const optimizedCSS = result.css;
                const optimizedSize = Buffer.byteLength(optimizedCSS, 'utf8');
                
                await writeFile(outputPath, optimizedCSS);
                
                this.updateStats(originalSize, optimizedSize);
                
                console.log(`  ✅ ${filename}: ${this.formatSize(originalSize)} → ${this.formatSize(optimizedSize)} (${Math.round((1 - optimizedSize/originalSize) * 100)}% smaller)`);
                
            } catch (error) {
                console.error(`❌ Failed to optimize ${filename}:`, error.message);
            }
        }
    }
    
    /**
     * Optimize JavaScript files
     */
    async optimizeJavaScript() {
        console.log('📜 Optimizing JavaScript files...');
        
        const jsFiles = [
            'main.js',
            'music-player.js',
            'contact-form.js',
            'gallery-lightbox.js',
            'lazy-loading.js',
            'performance-monitor.js'
        ];
        
        for (const filename of jsFiles) {
            const inputPath = path.join(this.publicDir, 'js', filename);
            const outputPath = path.join(this.distDir, 'js', filename);
            
            if (!fs.existsSync(inputPath)) {
                console.warn(`⚠️  JavaScript file not found: ${filename}`);
                continue;
            }
            
            try {
                const originalJS = await readFile(inputPath, 'utf8');
                const originalSize = Buffer.byteLength(originalJS, 'utf8');
                
                // Use Terser for minification
                const { minify } = require('terser');
                
                const result = await minify(originalJS, {
                    compress: {
                        drop_console: false, // Keep console.log for debugging
                        drop_debugger: true,
                        pure_funcs: ['console.debug'],
                        passes: 2
                    },
                    mangle: {
                        toplevel: false,
                        reserved: ['performanceMonitor', 'lazyLoader', 'musicPlayer'] // Preserve global objects
                    },
                    format: {
                        comments: false
                    },
                    sourceMap: false
                });
                
                if (result.error) {
                    throw result.error;
                }
                
                const optimizedJS = result.code;
                const optimizedSize = Buffer.byteLength(optimizedJS, 'utf8');
                
                await writeFile(outputPath, optimizedJS);
                
                this.updateStats(originalSize, optimizedSize);
                
                console.log(`  ✅ ${filename}: ${this.formatSize(originalSize)} → ${this.formatSize(optimizedSize)} (${Math.round((1 - optimizedSize/originalSize) * 100)}% smaller)`);
                
            } catch (error) {
                console.error(`❌ Failed to optimize ${filename}:`, error.message);
            }
        }
    }
    
    /**
     * Optimize images
     */
    async optimizeImages() {
        console.log('🖼️  Optimizing images...');
        
        const imageFiles = fs.readdirSync(path.join(this.publicDir, 'images'))
            .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
        
        for (const filename of imageFiles) {
            const inputPath = path.join(this.publicDir, 'images', filename);
            const outputPath = path.join(this.distDir, 'images', filename);
            
            try {
                const originalStats = fs.statSync(inputPath);
                const originalSize = originalStats.size;
                
                // Use Sharp for image optimization
                const sharp = require('sharp');
                
                let pipeline = sharp(inputPath);
                
                // Optimize based on file type
                const ext = path.extname(filename).toLowerCase();
                
                if (ext === '.jpg' || ext === '.jpeg') {
                    pipeline = pipeline.jpeg({
                        quality: 85,
                        progressive: true,
                        mozjpeg: true
                    });
                } else if (ext === '.png') {
                    pipeline = pipeline.png({
                        quality: 90,
                        progressive: true,
                        compressionLevel: 9
                    });
                } else if (ext === '.webp') {
                    pipeline = pipeline.webp({
                        quality: 85,
                        progressive: true
                    });
                }
                
                await pipeline.toFile(outputPath);
                
                const optimizedStats = fs.statSync(outputPath);
                const optimizedSize = optimizedStats.size;
                
                this.updateStats(originalSize, optimizedSize);
                
                console.log(`  ✅ ${filename}: ${this.formatSize(originalSize)} → ${this.formatSize(optimizedSize)} (${Math.round((1 - optimizedSize/originalSize) * 100)}% smaller)`);
                
            } catch (error) {
                console.error(`❌ Failed to optimize ${filename}:`, error.message);
                // Fallback: copy original file
                await copyFile(inputPath, outputPath);
            }
        }
    }
    
    /**
     * Generate web app manifest
     */
    async generateManifest() {
        console.log('📱 Generating web app manifest...');
        
        const manifest = {
            name: "A Moody Place",
            short_name: "Mood",
            description: "Official website of artist Mood - songwriter, artist, and topliner",
            start_url: "/",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#2c3e50",
            orientation: "portrait-primary",
            icons: [
                {
                    src: "/images/icon-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                    purpose: "any maskable"
                },
                {
                    src: "/images/icon-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "any maskable"
                }
            ],
            categories: ["music", "entertainment", "lifestyle"],
            lang: "en-US",
            dir: "ltr"
        };
        
        const manifestPath = path.join(this.distDir, 'manifest.json');
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('  ✅ Web app manifest generated');
    }
    
    /**
     * Create optimized service worker
     */
    async createServiceWorker() {
        console.log('⚙️  Creating optimized service worker...');
        
        const swPath = path.join(this.publicDir, 'sw.js');
        const distSwPath = path.join(this.distDir, 'sw.js');
        
        if (fs.existsSync(swPath)) {
            const swContent = await readFile(swPath, 'utf8');
            
            // Minify service worker
            const { minify } = require('terser');
            const result = await minify(swContent, {
                compress: {
                    drop_console: false,
                    passes: 2
                },
                mangle: false, // Don't mangle service worker code
                format: {
                    comments: /^\**!|@preserve|@license|@cc_on/i
                }
            });
            
            await writeFile(distSwPath, result.code);
            console.log('  ✅ Service worker optimized');
        }
    }
    
    /**
     * Update build statistics
     */
    updateStats(originalSize, optimizedSize) {
        this.stats.files++;
        this.stats.originalSize += originalSize;
        this.stats.optimizedSize += optimizedSize;
    }
    
    /**
     * Format file size for display
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Print build statistics
     */
    printStats() {
        const compressionRatio = Math.round((1 - this.stats.optimizedSize / this.stats.originalSize) * 100);
        
        console.log('\n📊 Build Statistics:');
        console.log(`   Files optimized: ${this.stats.files}`);
        console.log(`   Original size: ${this.formatSize(this.stats.originalSize)}`);
        console.log(`   Optimized size: ${this.formatSize(this.stats.optimizedSize)}`);
        console.log(`   Compression ratio: ${compressionRatio}%`);
        console.log(`   Bytes saved: ${this.formatSize(this.stats.originalSize - this.stats.optimizedSize)}`);
        
        // Calculate estimated performance impact
        const estimatedSpeedImprovement = Math.round(compressionRatio * 0.8); // Conservative estimate
        console.log(`   Estimated load time improvement: ~${estimatedSpeedImprovement}%`);
    }
}

// Run build if called directly
if (require.main === module) {
    const optimizer = new BuildOptimizer();
    optimizer.build().catch(console.error);
}

module.exports = BuildOptimizer;