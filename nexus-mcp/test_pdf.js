const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, 'generated_documents');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sampleVerdict = `## Executive Summary\n\nThis report presents the findings of the NEXUS AI Tribunal.\n\n- Point one of analysis\n- Point two of analysis\n- Point three of analysis\n\n**Important**: This is a binding verdict.\n\n## Legal Analysis\n\nThe Companies Act 2013 governs incorporation in India.`;

// Test English
console.log("\\n=== TEST: English PDF ===");
try {
  const r = cp.execSync('python lib/pdf_generator.py', { 
    input: JSON.stringify({ sessionId: "test-en-01", verdict: sampleVerdict, confidence: 92, riskLevel: "low", outputPath: path.join(dir, "Test_EN.pdf"), language: "en" }), 
    encoding: 'utf-8', timeout: 30000
  });
  console.log(r.trim());
  console.log("Size:", (fs.statSync(path.join(dir, "Test_EN.pdf")).size / 1024).toFixed(1), "KB");
} catch(e) { console.log("FAIL:", e.stdout || e.message); }

// Test Hindi
console.log("\\n=== TEST: Hindi PDF ===");
try {
  const r = cp.execSync('python lib/pdf_generator.py', { 
    input: JSON.stringify({ sessionId: "test-hi-01", verdict: sampleVerdict, confidence: 85, riskLevel: "medium", outputPath: path.join(dir, "Test_HI.pdf"), language: "hi" }), 
    encoding: 'utf-8', timeout: 30000
  });
  console.log(r.trim());
  console.log("Size:", (fs.statSync(path.join(dir, "Test_HI.pdf")).size / 1024).toFixed(1), "KB");
} catch(e) { console.log("FAIL:", e.stdout || e.message); }

// Test Kannada
console.log("\\n=== TEST: Kannada PDF ===");
try {
  const r = cp.execSync('python lib/pdf_generator.py', { 
    input: JSON.stringify({ sessionId: "test-kn-01", verdict: sampleVerdict, confidence: 78, riskLevel: "high", outputPath: path.join(dir, "Test_KN.pdf"), language: "kn" }), 
    encoding: 'utf-8', timeout: 30000
  });
  console.log(r.trim());
  console.log("Size:", (fs.statSync(path.join(dir, "Test_KN.pdf")).size / 1024).toFixed(1), "KB");
} catch(e) { console.log("FAIL:", e.stdout || e.message); }

console.log("\\n=== ALL TESTS DONE ===");
