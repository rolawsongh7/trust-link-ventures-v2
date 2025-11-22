#!/usr/bin/env node

/**
 * Production Build Validation Script
 * Scans build output for security issues and sensitive data
 */

const fs = require('fs');
const path = require('path');

// Sensitive patterns to check for
const SENSITIVE_PATTERNS = [
  { pattern: /console\.log/gi, name: 'console.log', severity: 'HIGH' },
  { pattern: /console\.debug/gi, name: 'console.debug', severity: 'HIGH' },
  { pattern: /debugger;/gi, name: 'debugger statement', severity: 'CRITICAL' },
  { pattern: /password.*=.*['"][^'"]+['"]/gi, name: 'hardcoded password', severity: 'CRITICAL' },
  { pattern: /api[_-]?key.*=.*['"][^'"]+['"]/gi, name: 'hardcoded API key', severity: 'CRITICAL' },
  { pattern: /secret.*=.*['"][^'"]+['"]/gi, name: 'hardcoded secret', severity: 'CRITICAL' },
  { pattern: /token.*=.*['"][^'"]+['"]/gi, name: 'hardcoded token', severity: 'HIGH' },
  { pattern: /TODO:/gi, name: 'TODO comment', severity: 'LOW' },
  { pattern: /FIXME:/gi, name: 'FIXME comment', severity: 'MEDIUM' },
];

// Files to scan
const DIST_DIR = path.join(__dirname, '..', 'dist');

let hasErrors = false;
let hasWarnings = false;
const findings = [];

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      scanFile(filePath);
    }
  });
}

/**
 * Scan individual file for sensitive patterns
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(DIST_DIR, filePath);
  
  SENSITIVE_PATTERNS.forEach(({ pattern, name, severity }) => {
    const matches = content.match(pattern);
    
    if (matches) {
      const finding = {
        file: relativePath,
        issue: name,
        severity,
        count: matches.length,
      };
      
      findings.push(finding);
      
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        hasErrors = true;
      } else {
        hasWarnings = true;
      }
    }
  });
}

/**
 * Print validation report
 */
function printReport() {
  console.log('\n🔍 Production Build Validation Report\n');
  console.log('='.repeat(80));
  
  if (findings.length === 0) {
    console.log('\n✅ All checks passed! Build is production-ready.\n');
    return;
  }
  
  // Group by severity
  const critical = findings.filter(f => f.severity === 'CRITICAL');
  const high = findings.filter(f => f.severity === 'HIGH');
  const medium = findings.filter(f => f.severity === 'MEDIUM');
  const low = findings.filter(f => f.severity === 'LOW');
  
  if (critical.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:\n');
    critical.forEach(f => {
      console.log(`  ❌ ${f.issue} found ${f.count}x in ${f.file}`);
    });
  }
  
  if (high.length > 0) {
    console.log('\n⚠️  HIGH PRIORITY:\n');
    high.forEach(f => {
      console.log(`  ⚠️  ${f.issue} found ${f.count}x in ${f.file}`);
    });
  }
  
  if (medium.length > 0) {
    console.log('\n⚡ MEDIUM PRIORITY:\n');
    medium.forEach(f => {
      console.log(`  ⚡ ${f.issue} found ${f.count}x in ${f.file}`);
    });
  }
  
  if (low.length > 0) {
    console.log('\n💡 LOW PRIORITY:\n');
    low.forEach(f => {
      console.log(`  💡 ${f.issue} found ${f.count}x in ${f.file}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal Issues: ${findings.length}`);
  console.log(`  Critical: ${critical.length}`);
  console.log(`  High: ${high.length}`);
  console.log(`  Medium: ${medium.length}`);
  console.log(`  Low: ${low.length}\n`);
}

// Run validation
console.log('Starting production build validation...');

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Error: dist/ directory not found. Please run build first.');
  process.exit(1);
}

scanDirectory(DIST_DIR);
printReport();

// Exit with error if critical/high issues found
if (hasErrors) {
  console.error('❌ Production validation FAILED. Please fix errors before deploying.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Production validation passed with warnings.\n');
  process.exit(0);
} else {
  console.log('✅ Production validation PASSED.\n');
  process.exit(0);
}
