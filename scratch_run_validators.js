require('dotenv').config();
const qualityMatrixValidator = require('./server/services/qualityMatrixValidator');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Starting Quality Matrix Evaluation script...');
  try {
    const report = await qualityMatrixValidator.runMatrixQualityEvaluation();
    console.log('Evaluation finished successfully!');
    console.log('====================================');
    console.log(`Total Attempts: ${report.totalAttempts}`);
    console.log(`Successes: ${report.successes}`);
    console.log(`Failures Count: ${report.failuresCount}`);
    console.log(`Success Rate: ${report.successRate}%`);
    console.log(`Script Match Rate: ${report.scriptMatchRate}%`);
    console.log(`Avg Similarity Score: ${report.avgSimilarityScore}%`);
    console.log(`Avg Latency: ${report.avgLatencyMs}ms`);
    console.log(`Live Calls Count: ${report.liveCallsCount}`);
    console.log(`Fallback Calls Count: ${report.fallbackCallsCount}`);
    console.log(`Providers Tested: ${report.providersTested.join(', ')}`);
    console.log('====================================');
    
    // Save report to a JSON file
    const reportPath = path.join(__dirname, 'quality_matrix_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Full report saved to ${reportPath}`);
  } catch (err) {
    console.error('Error during quality matrix evaluation:', err);
  }
}

run();
