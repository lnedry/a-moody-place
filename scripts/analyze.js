#!/usr/bin/env node

/**
 * Performance Analysis Script for A Moody Place
 * Validates performance optimizations and provides detailed metrics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceAnalyzer {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.publicDir = path.join(this.rootDir, 'public');
        this.distDir = path.join(this.rootDir, 'dist');
        
        console.log('📊 Starting A Moody Place performance analysis...\n');
    }
    
    /**
     * Run complete performance analysis
     */
    async analyze() {
        try {
            await this.analyzeAssets();
            await this.analyzePageLoad();
            await this.analyzeCacheStrategy();
            await this.analyzeCoreWebVitalsReadiness();
            await this.generateReport();
            
            console.log('✅ Performance analysis completed!\n');
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            process.exit(1);
        }
    }
    
    /**
     * Analyze static assets
     */
    async analyzeAssets() {
        console.log('🔍 Analyzing static assets...');
        
        const assets = {
            css: [],
            js: [],
            images: [],
            audio: []
        };
        
        // Analyze CSS files
        const cssDir = path.join(this.publicDir, 'css');
        if (fs.existsSync(cssDir)) {
            const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
            for (const file of cssFiles) {
                const filePath = path.join(cssDir, file);
                const stats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                
                assets.css.push({
                    name: file,
                    size: stats.size,
                    gzipSize: await this.getGzipSize(content),
                    lines: content.split('\n').length,
                    minified: this.isMinified(content)
                });
            }
        }
        
        // Analyze JavaScript files
        const jsDir = path.join(this.publicDir, 'js');
        if (fs.existsSync(jsDir)) {
            const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
            for (const file of jsFiles) {
                const filePath = path.join(jsDir, file);
                const stats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                
                assets.js.push({
                    name: file,
                    size: stats.size,
                    gzipSize: await this.getGzipSize(content),
                    lines: content.split('\n').length,
                    minified: this.isMinified(content)
                });
            }
        }
        
        // Analyze images
        const imagesDir = path.join(this.publicDir, 'images');
        if (fs.existsSync(imagesDir)) {
            const imageFiles = fs.readdirSync(imagesDir)
                .filter(f => /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(f));
            for (const file of imageFiles) {
                const filePath = path.join(imagesDir, file);
                const stats = fs.statSync(filePath);
                
                assets.images.push({
                    name: file,
                    size: stats.size,
                    type: path.extname(file).toLowerCase(),
                    optimized: this.isImageOptimized(file, stats.size)
                });
            }
        }
        
        // Print asset analysis
        this.printAssetAnalysis(assets);
    }
    
    /**
     * Analyze page load performance
     */
    async analyzePageLoad() {
        console.log('⚡ Analyzing page load performance...');
        
        const pages = [
            { name: 'Home', url: '/' },
            { name: 'Music', url: '/music' },
            { name: 'About', url: '/about' },
            { name: 'Contact', url: '/contact' }
        ];
        
        for (const page of pages) {
            await this.analyzePage(page);
        }
    }
    
    /**
     * Analyze individual page
     */
    async analyzePage(page) {
        try {
            const htmlPath = path.join(this.rootDir, 'views', 
                page.url === '/' ? 'home.html' : `${page.url.substring(1)}.html`);
            
            if (!fs.existsSync(htmlPath)) {
                console.warn(`⚠️  Page not found: ${page.name}`);
                return;
            }
            
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            const analysis = {
                name: page.name,
                size: htmlContent.length,
                gzipSize: await this.getGzipSize(htmlContent),
                resources: this.extractResources(htmlContent),
                performance: this.analyzePagePerformance(htmlContent)
            };
            
            console.log(`  📄 ${analysis.name}:`);
            console.log(`    HTML Size: ${this.formatSize(analysis.size)}`);
            console.log(`    Gzipped: ${this.formatSize(analysis.gzipSize)}`);
            console.log(`    External Resources: ${analysis.resources.external.length}`);
            console.log(`    Critical Resources: ${analysis.resources.critical.length}`);
            console.log(`    Performance Score: ${analysis.performance.score}/100`);
            
            if (analysis.performance.issues.length > 0) {
                console.log(`    ⚠️  Issues: ${analysis.performance.issues.join(', ')}`);
            }
        } catch (error) {
            console.error(`❌ Failed to analyze ${page.name}:`, error.message);
        }
    }
    
    /**
     * Analyze caching strategy
     */
    async analyzeCacheStrategy() {
        console.log('💾 Analyzing caching strategy...');
        
        const serviceWorkerPath = path.join(this.publicDir, 'sw.js');
        if (fs.existsSync(serviceWorkerPath)) {
            const swContent = fs.readFileSync(serviceWorkerPath, 'utf8');
            const cacheConfig = this.extractCacheConfig(swContent);
            
            console.log('  ✅ Service Worker detected');
            console.log(`  📦 Cache Names: ${cacheConfig.cacheNames.length}`);
            console.log(`  🎯 Caching Strategies: ${cacheConfig.strategies.length}`);
            console.log(`  📋 Critical Resources: ${cacheConfig.criticalResources.length}`);
        } else {
            console.log('  ❌ Service Worker not found');
        }
        
        // Check server caching configuration
        const serverPath = path.join(this.rootDir, 'server.js');
        if (fs.existsSync(serverPath)) {
            const serverContent = fs.readFileSync(serverPath, 'utf8');
            const serverCache = this.analyzeServerCache(serverContent);
            
            console.log('  🖥️  Server caching:');
            console.log(`    Static files: ${serverCache.staticFiles ? '✅' : '❌'}`);
            console.log(`    Compression: ${serverCache.compression ? '✅' : '❌'}`);
            console.log(`    Cache headers: ${serverCache.cacheHeaders ? '✅' : '❌'}`);
        }
    }
    
    /**
     * Analyze Core Web Vitals readiness
     */
    async analyzeCoreWebVitalsReadiness() {
        console.log('🎯 Analyzing Core Web Vitals readiness...');
        
        const readiness = {
            lcp: { ready: false, score: 0, issues: [] },
            fid: { ready: false, score: 0, issues: [] },
            cls: { ready: false, score: 0, issues: [] }
        };
        
        // Check LCP optimization
        const images = this.getImageAssets();
        const largestImage = images.reduce((max, img) => 
            img.size > (max?.size || 0) ? img : max, null);
        
        if (largestImage) {
            readiness.lcp.ready = largestImage.size < 100000; // < 100KB
            readiness.lcp.score = Math.max(0, 100 - (largestImage.size / 1000));
            if (!readiness.lcp.ready) {
                readiness.lcp.issues.push(`Large LCP image: ${largestImage.name} (${this.formatSize(largestImage.size)})`);
            }
        }
        
        // Check FID optimization
        const jsAssets = this.getJavaScriptAssets();
        const totalJsSize = jsAssets.reduce((sum, js) => sum + js.size, 0);
        
        readiness.fid.ready = totalJsSize < 150000; // < 150KB
        readiness.fid.score = Math.max(0, 100 - (totalJsSize / 1500));
        if (!readiness.fid.ready) {
            readiness.fid.issues.push(`Large JS bundle: ${this.formatSize(totalJsSize)}`);
        }
        
        // Check CLS optimization
        const hasLazyLoading = fs.existsSync(path.join(this.publicDir, 'js', 'lazy-loading.js'));
        const hasPreloads = await this.checkPreloads();
        
        readiness.cls.ready = hasLazyLoading && hasPreloads;
        readiness.cls.score = (hasLazyLoading ? 50 : 0) + (hasPreloads ? 50 : 0);
        if (!hasLazyLoading) {
            readiness.cls.issues.push('No lazy loading implementation');
        }
        if (!hasPreloads) {
            readiness.cls.issues.push('Missing critical resource preloads');
        }
        
        // Print results
        console.log('  📊 Core Web Vitals Readiness:');
        console.log(`    LCP: ${readiness.lcp.ready ? '✅' : '❌'} (Score: ${Math.round(readiness.lcp.score)}/100)`);
        if (readiness.lcp.issues.length > 0) {
            readiness.lcp.issues.forEach(issue => console.log(`      - ${issue}`));
        }
        
        console.log(`    FID: ${readiness.fid.ready ? '✅' : '❌'} (Score: ${Math.round(readiness.fid.score)}/100)`);
        if (readiness.fid.issues.length > 0) {
            readiness.fid.issues.forEach(issue => console.log(`      - ${issue}`));
        }
        
        console.log(`    CLS: ${readiness.cls.ready ? '✅' : '❌'} (Score: ${Math.round(readiness.cls.score)}/100)`);
        if (readiness.cls.issues.length > 0) {
            readiness.cls.issues.forEach(issue => console.log(`      - ${issue}`));
        }
    }
    
    /**
     * Generate comprehensive performance report
     */
    async generateReport() {
        console.log('📋 Generating performance report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalAssets: this.getTotalAssetCount(),
                totalSize: this.getTotalAssetSize(),
                optimizationsApplied: this.getOptimizationsApplied(),
                performanceScore: this.calculateOverallScore()
            },
            recommendations: this.getRecommendations()
        };
        
        // Save report to file
        const reportPath = path.join(this.rootDir, 'performance-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('  📄 Performance Report:');
        console.log(`    Overall Score: ${report.summary.performanceScore}/100`);
        console.log(`    Total Assets: ${report.summary.totalAssets}`);
        console.log(`    Total Size: ${this.formatSize(report.summary.totalSize)}`);
        console.log(`    Optimizations: ${report.summary.optimizationsApplied.length}`);
        
        if (report.recommendations.length > 0) {
            console.log('  💡 Recommendations:');
            report.recommendations.forEach((rec, i) => {
                console.log(`    ${i + 1}. ${rec}`);
            });
        }
        
        console.log(`  📊 Full report saved to: ${reportPath}`);
    }
    
    /**
     * Helper methods
     */
    async getGzipSize(content) {
        try {
            const zlib = require('zlib');
            const buffer = Buffer.from(content);
            const compressed = zlib.gzipSync(buffer);
            return compressed.length;
        } catch (error) {
            return content.length; // Fallback
        }
    }
    
    isMinified(content) {
        const lines = content.split('\n');
        const avgLineLength = content.length / lines.length;
        return avgLineLength > 80 && lines.length < 50; // Heuristic
    }
    
    isImageOptimized(filename, size) {
        const ext = path.extname(filename).toLowerCase();
        const sizeThresholds = {
            '.jpg': 100000,  // 100KB
            '.jpeg': 100000,
            '.png': 150000,  // 150KB
            '.webp': 80000,  // 80KB
            '.svg': 20000    // 20KB
        };
        
        return size < (sizeThresholds[ext] || 100000);
    }
    
    extractResources(htmlContent) {
        const external = [];
        const critical = [];
        
        // Extract CSS links
        const cssMatches = htmlContent.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/g) || [];
        cssMatches.forEach(match => {
            if (match.includes('http')) external.push('CSS: External');
            else critical.push('CSS: Internal');
        });
        
        // Extract JS scripts
        const jsMatches = htmlContent.match(/<script[^>]*src=[^>]*>/g) || [];
        jsMatches.forEach(match => {
            if (match.includes('http')) external.push('JS: External');
            else critical.push('JS: Internal');
        });
        
        // Extract preloads
        const preloadMatches = htmlContent.match(/<link[^>]*rel=["']preload["'][^>]*>/g) || [];
        preloadMatches.forEach(() => critical.push('Preload'));
        
        return { external, critical };
    }
    
    analyzePagePerformance(htmlContent) {
        let score = 100;
        const issues = [];
        
        // Check for blocking resources
        const blockingScripts = (htmlContent.match(/<script(?![^>]*defer)(?![^>]*async)[^>]*src=/g) || []).length;
        if (blockingScripts > 0) {
            score -= blockingScripts * 10;
            issues.push(`${blockingScripts} blocking scripts`);
        }
        
        // Check for external resources
        const externalResources = (htmlContent.match(/https?:\/\//g) || []).length;
        if (externalResources > 5) {
            score -= (externalResources - 5) * 5;
            issues.push(`${externalResources} external resources`);
        }
        
        // Check for preloads
        const preloads = (htmlContent.match(/rel=["']preload["']/g) || []).length;
        if (preloads === 0) {
            score -= 15;
            issues.push('No critical resource preloads');
        }
        
        return { score: Math.max(0, score), issues };
    }
    
    extractCacheConfig(swContent) {
        const cacheNames = (swContent.match(/['"]\w*cache\w*['"]/g) || []).length;
        const strategies = (swContent.match(/cache-first|network-first|stale-while-revalidate/g) || []).length;
        const criticalResources = (swContent.match(/CRITICAL_RESOURCES.*?\[(.*?)\]/s) || ['', ''])[1]
            .split(',').filter(r => r.trim()).length;
        
        return { cacheNames, strategies, criticalResources };
    }
    
    analyzeServerCache(serverContent) {
        return {
            staticFiles: serverContent.includes('express.static'),
            compression: serverContent.includes('compression'),
            cacheHeaders: serverContent.includes('maxAge') || serverContent.includes('Cache-Control')
        };
    }
    
    getImageAssets() {
        const imagesDir = path.join(this.publicDir, 'images');
        if (!fs.existsSync(imagesDir)) return [];
        
        return fs.readdirSync(imagesDir)
            .filter(f => /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(f))
            .map(f => {
                const stats = fs.statSync(path.join(imagesDir, f));
                return { name: f, size: stats.size };
            });
    }
    
    getJavaScriptAssets() {
        const jsDir = path.join(this.publicDir, 'js');
        if (!fs.existsSync(jsDir)) return [];
        
        return fs.readdirSync(jsDir)
            .filter(f => f.endsWith('.js'))
            .map(f => {
                const stats = fs.statSync(path.join(jsDir, f));
                return { name: f, size: stats.size };
            });
    }
    
    async checkPreloads() {
        const htmlFiles = ['home.html', 'music.html', 'about.html', 'contact.html'];
        
        for (const file of htmlFiles) {
            const htmlPath = path.join(this.rootDir, 'views', file);
            if (fs.existsSync(htmlPath)) {
                const content = fs.readFileSync(htmlPath, 'utf8');
                if (content.includes('rel="preload"')) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    getTotalAssetCount() {
        const images = this.getImageAssets().length;
        const js = this.getJavaScriptAssets().length;
        const css = fs.existsSync(path.join(this.publicDir, 'css')) ? 
            fs.readdirSync(path.join(this.publicDir, 'css')).filter(f => f.endsWith('.css')).length : 0;
        
        return images + js + css;
    }
    
    getTotalAssetSize() {
        let total = 0;
        
        // Images
        this.getImageAssets().forEach(img => total += img.size);
        
        // JavaScript
        this.getJavaScriptAssets().forEach(js => total += js.size);
        
        // CSS
        const cssDir = path.join(this.publicDir, 'css');
        if (fs.existsSync(cssDir)) {
            fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).forEach(f => {
                const stats = fs.statSync(path.join(cssDir, f));
                total += stats.size;
            });
        }
        
        return total;
    }
    
    getOptimizationsApplied() {
        const optimizations = [];
        
        if (fs.existsSync(path.join(this.publicDir, 'sw.js'))) {
            optimizations.push('Service Worker');
        }
        
        if (fs.existsSync(path.join(this.publicDir, 'js', 'lazy-loading.js'))) {
            optimizations.push('Lazy Loading');
        }
        
        if (fs.existsSync(path.join(this.publicDir, 'js', 'performance-monitor.js'))) {
            optimizations.push('Performance Monitoring');
        }
        
        const serverPath = path.join(this.rootDir, 'server.js');
        if (fs.existsSync(serverPath)) {
            const content = fs.readFileSync(serverPath, 'utf8');
            if (content.includes('compression')) optimizations.push('Server Compression');
            if (content.includes('maxAge')) optimizations.push('Cache Headers');
        }
        
        return optimizations;
    }
    
    calculateOverallScore() {
        const optimizations = this.getOptimizationsApplied();
        const totalSize = this.getTotalAssetSize();
        
        let score = 70; // Base score
        
        // Bonus for optimizations
        score += optimizations.length * 5;
        
        // Penalty for large assets
        if (totalSize > 1000000) score -= 20; // > 1MB
        else if (totalSize > 500000) score -= 10; // > 500KB
        
        return Math.min(100, Math.max(0, score));
    }
    
    getRecommendations() {
        const recommendations = [];
        const totalSize = this.getTotalAssetSize();
        const images = this.getImageAssets();
        const optimizations = this.getOptimizationsApplied();
        
        if (totalSize > 1000000) {
            recommendations.push('Reduce total asset size to under 1MB');
        }
        
        const largeImages = images.filter(img => img.size > 100000);
        if (largeImages.length > 0) {
            recommendations.push(`Optimize ${largeImages.length} large image(s)`);
        }
        
        if (!optimizations.includes('Service Worker')) {
            recommendations.push('Implement service worker for caching');
        }
        
        if (!optimizations.includes('Lazy Loading')) {
            recommendations.push('Add lazy loading for images');
        }
        
        if (!optimizations.includes('Performance Monitoring')) {
            recommendations.push('Add Core Web Vitals monitoring');
        }
        
        return recommendations;
    }
    
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    printAssetAnalysis(assets) {
        console.log('  📁 Asset Analysis:');
        
        // CSS Analysis
        if (assets.css.length > 0) {
            console.log('    🎨 CSS Files:');
            assets.css.forEach(file => {
                console.log(`      ${file.name}: ${this.formatSize(file.size)} (gzip: ${this.formatSize(file.gzipSize)}) ${file.minified ? '✅' : '❌'}`);
            });
        }
        
        // JavaScript Analysis
        if (assets.js.length > 0) {
            console.log('    📜 JavaScript Files:');
            assets.js.forEach(file => {
                console.log(`      ${file.name}: ${this.formatSize(file.size)} (gzip: ${this.formatSize(file.gzipSize)}) ${file.minified ? '✅' : '❌'}`);
            });
        }
        
        // Image Analysis
        if (assets.images.length > 0) {
            console.log('    🖼️  Image Files:');
            assets.images.forEach(file => {
                console.log(`      ${file.name}: ${this.formatSize(file.size)} ${file.optimized ? '✅' : '❌'}`);
            });
        }
    }
}

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new PerformanceAnalyzer();
    analyzer.analyze().catch(console.error);
}

module.exports = PerformanceAnalyzer;