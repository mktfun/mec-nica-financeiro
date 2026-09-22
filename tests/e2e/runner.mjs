#!/usr/bin/env node
// tests/e2e/runner.mjs
// Centralized CLI E2E Test Runner for SSOT Database Reconciliation Refactor

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const SUITES = [
  // Tier 1: Features
  {
    tier: 1,
    name: 'M1: SSOT Calculator (Features 1–5)',
    file: 'tests/e2e/tier1_features/m1_ssot_calculator.test.mjs',
    features: [1, 2, 3, 4, 5]
  },
  {
    tier: 1,
    name: 'M2: Frontend SSOT Hook & Math Purge (Features 6–9)',
    file: 'tests/e2e/tier1_features/m2_frontend_ssot.test.mjs',
    features: [6, 7, 8, 9]
  },
  {
    tier: 1,
    name: 'M3: Backend-First Fechamento (Features 10–13)',
    file: 'tests/e2e/tier1_features/m3_backend_closing.test.mjs',
    features: [10, 11, 12, 13]
  },
  {
    tier: 1,
    name: 'M4: Status Standardization (Features 14–17)',
    file: 'tests/e2e/tier1_features/m4_status_standards.test.mjs',
    features: [14, 15, 16, 17]
  },
  {
    tier: 1,
    name: 'M5: Real Table Write Paths (Features 18–20)',
    file: 'tests/e2e/tier1_features/m5_write_paths.test.mjs',
    features: [18, 19, 20]
  },
  {
    tier: 1,
    name: 'M6: User Flow Simplification (Features 21–22)',
    file: 'tests/e2e/tier1_features/m6_user_flow.test.mjs',
    features: [21, 22]
  },

  // Tier 2: Boundary & Corner Cases
  {
    tier: 2,
    name: 'M1 Boundary: Calculator & Invariants (Features 1–5)',
    file: 'tests/e2e/tier2_boundary/m1_calculator_boundary.test.mjs',
    features: [1, 2, 3, 4, 5]
  },
  {
    tier: 2,
    name: 'M2 Boundary: Frontend Hook & Math (Features 6–9)',
    file: 'tests/e2e/tier2_boundary/m2_frontend_boundary.test.mjs',
    features: [6, 7, 8, 9]
  },
  {
    tier: 2,
    name: 'M3 Boundary: Closing & Protection (Features 10–13)',
    file: 'tests/e2e/tier2_boundary/m3_closing_boundary.test.mjs',
    features: [10, 11, 12, 13]
  },
  {
    tier: 2,
    name: 'M4 Boundary: Status Constraints (Features 14–17)',
    file: 'tests/e2e/tier2_boundary/m4_status_boundary.test.mjs',
    features: [14, 15, 16, 17]
  },
  {
    tier: 2,
    name: 'M5 Boundary: Physical Writes & Views (Features 18–20)',
    file: 'tests/e2e/tier2_boundary/m5_write_boundary.test.mjs',
    features: [18, 19, 20]
  },
  {
    tier: 2,
    name: 'M6 Boundary: Wizard Flow & Invariants (Features 21–22)',
    file: 'tests/e2e/tier2_boundary/m6_flow_boundary.test.mjs',
    features: [21, 22]
  },

  // Tier 3: Pairwise Combinations
  {
    tier: 3,
    name: 'Pairwise M1 ↔ M2: DB Summary ↔ Frontend Hook',
    file: 'tests/e2e/tier3_combinations/pairwise_m1_m2.test.mjs',
    features: [1, 6]
  },
  {
    tier: 3,
    name: 'Pairwise M1 ↔ M3: SSOT Calculator ↔ Closing Snapshot',
    file: 'tests/e2e/tier3_combinations/pairwise_m1_m3.test.mjs',
    features: [1, 2, 10, 11]
  },
  {
    tier: 3,
    name: 'Pairwise M3 ↔ M4: Closing Pipeline ↔ Status Enums',
    file: 'tests/e2e/tier3_combinations/pairwise_m3_m4.test.mjs',
    features: [10, 14]
  },
  {
    tier: 3,
    name: 'Pairwise M4 ↔ M5: Status Standards ↔ Physical Writes',
    file: 'tests/e2e/tier3_combinations/pairwise_m4_m5.test.mjs',
    features: [14, 18]
  },
  {
    tier: 3,
    name: 'Pairwise M2 ↔ M6: Frontend SSOT ↔ Wizard Step 4',
    file: 'tests/e2e/tier3_combinations/pairwise_m2_m6.test.mjs',
    features: [6, 9, 21]
  },

  // Tier 4: Real-World Scenarios
  {
    tier: 4,
    name: 'Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09)',
    file: 'tests/e2e/tier4_real_world/real_dates_audit.test.mjs',
    features: [1, 2, 3, 5, 22]
  },
  {
    tier: 4,
    name: 'Frozen Closed Snapshot Audit & Immutability',
    file: 'tests/e2e/tier4_real_world/closed_snapshot_audit.test.mjs',
    features: [2, 10, 11, 12]
  }
];

// CLI Args parsing
const args = process.argv.slice(2);
const tierArg = args.find(a => a.startsWith('--tier='));
const featureArg = args.find(a => a.startsWith('--feature='));
const reportArg = args.find(a => a.startsWith('--report=') || a === '--report');
const verboseArg = args.includes('--verbose') || args.includes('-v');

const targetTier = tierArg ? parseInt(tierArg.split('=')[1], 10) : null;
const targetFeature = featureArg ? parseInt(featureArg.split('=')[1], 10) : null;
const reportPath = reportArg
  ? (reportArg.includes('=') ? reportArg.split('=')[1] : 'tests/e2e/report.md')
  : null;

function runSuite(suite) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn('node', ['--test', suite.file], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const passMatch = stdout.match(/ℹ pass (\d+)/);
      const failMatch = stdout.match(/ℹ fail (\d+)/);
      const passCount = passMatch ? parseInt(passMatch[1], 10) : 0;
      const failCount = failMatch ? parseInt(failMatch[1], 10) : (code === 0 ? 0 : 1);

      // Extract failing test details
      const failures = [];
      const failBlocks = stdout.split('✖ failing tests:')[1] || '';
      if (failBlocks) {
        const lines = failBlocks.split('\n');
        let currentFail = null;
        for (const line of lines) {
          if (line.includes('✖ ') && !line.includes('failing tests:')) {
            if (currentFail) failures.push(currentFail);
            currentFail = { title: line.replace(/.*✖\s+/, '').trim(), details: [] };
          } else if (currentFail && line.trim()) {
            currentFail.details.push(line.trim());
          }
        }
        if (currentFail) failures.push(currentFail);
      }

      resolve({
        ...suite,
        code,
        duration,
        passCount,
        failCount,
        failures,
        rawOutput: stdout,
        errorOutput: stderr
      });
    });
  });
}

async function main() {
  console.log('\n================================================================');
  console.log('🚀 E2E SSOT FINANCIAL RECONCILIATION TEST RUNNER');
  console.log('================================================================');
  console.log(`Environment: Supabase DB + TanStack Start Frontend`);
  console.log(`Timestamp:   ${new Date().toISOString()}`);

  let filteredSuites = SUITES;
  if (targetTier) {
    filteredSuites = filteredSuites.filter(s => s.tier === targetTier);
    console.log(`Filter:      Tier ${targetTier} only`);
  }
  if (targetFeature) {
    filteredSuites = filteredSuites.filter(s => s.features.includes(targetFeature));
    console.log(`Filter:      Feature ${targetFeature} only`);
  }
  console.log(`Suites to execute: ${filteredSuites.length}`);
  console.log('----------------------------------------------------------------\n');

  const results = [];
  let totalPass = 0;
  let totalFail = 0;
  let totalDuration = 0;

  for (let i = 0; i < filteredSuites.length; i++) {
    const suite = filteredSuites[i];
    process.stdout.write(`[${i + 1}/${filteredSuites.length}] Running Tier ${suite.tier}: ${suite.name} ... `);
    const res = await runSuite(suite);
    results.push(res);
    totalPass += res.passCount;
    totalFail += res.failCount;
    totalDuration += res.duration;

    if (res.code === 0 && res.failCount === 0) {
      console.log(`\x1b[32mPASS\x1b[0m (${res.passCount} passed, ${res.duration}ms)`);
    } else {
      console.log(`\x1b[31mFAIL\x1b[0m (${res.passCount} passed, ${res.failCount} failed, ${res.duration}ms)`);
      if (verboseArg && res.failures.length > 0) {
        for (const f of res.failures) {
          console.log(`    \x1b[33m✖ ${f.title}\x1b[0m`);
          if (f.details.length > 0) {
            console.log(`      ${f.details.slice(0, 2).join('\n      ')}`);
          }
        }
      }
    }
  }

  // Summary Table
  console.log('\n================================================================');
  console.log('📊 EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`Total Test Suites: ${results.length}`);
  console.log(`Total Tests Executed: ${totalPass + totalFail}`);
  console.log(`Passed:            \x1b[32m${totalPass}\x1b[0m`);
  console.log(`Failed / Pending:  \x1b[31m${totalFail}\x1b[0m`);
  console.log(`Duration:          ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('----------------------------------------------------------------');

  // Tier Breakdown
  const tiers = [1, 2, 3, 4];
  for (const t of tiers) {
    const tierResults = results.filter(r => r.tier === t);
    if (tierResults.length > 0) {
      const p = tierResults.reduce((acc, r) => acc + r.passCount, 0);
      const f = tierResults.reduce((acc, r) => acc + r.failCount, 0);
      const pct = (p + f) > 0 ? ((p / (p + f)) * 100).toFixed(1) : '0.0';
      console.log(`Tier ${t} Summary: ${p} passed, ${f} failed (${pct}% passing)`);
    }
  }
  console.log('================================================================');

  // Defect Escalation / Pending Milestones Summary
  const allFailures = results.flatMap(r => r.failures.map(f => ({ ...f, suite: r.name, tier: r.tier, file: r.file })));
  if (allFailures.length > 0) {
    console.log('\n🚨 IMPLEMENTATION GAPS & DEFECT ESCALATIONS DETECTED:');
    console.log('The following tests failed due to pending milestone code/migrations:');
    allFailures.slice(0, 15).forEach((f, idx) => {
      console.log(`\n  ${idx + 1}. [Tier ${f.tier}] ${f.title}`);
      console.log(`     Suite: ${f.suite}`);
      if (f.details.length > 0) {
        console.log(`     RCA:   ${f.details[0]}`);
      }
    });
    if (allFailures.length > 15) {
      console.log(`\n  ... and ${allFailures.length - 15} more failures.`);
    }
  }

  // Generate Markdown Report if requested
  if (reportPath) {
    let md = `# E2E Test Execution Report\n\n`;
    md += `**Date**: ${new Date().toISOString()}\n`;
    md += `**Total Tests**: ${totalPass + totalFail} | **Passed**: ${totalPass} | **Failed**: ${totalFail}\n`;
    md += `**Duration**: ${(totalDuration / 1000).toFixed(2)}s\n\n`;
    md += `## Tier Summary\n\n| Tier | Description | Suites | Passed | Failed | Pass Rate |\n|---|---|---|---|---|---|\n`;

    const tierDesc = {
      1: 'Tier 1: Feature Coverage (Features 1–22)',
      2: 'Tier 2: Boundary & Corner Cases',
      3: 'Tier 3: Pairwise Cross-Feature Combinations',
      4: 'Tier 4: Real-World Dates & Snapshots'
    };

    for (const t of tiers) {
      const tierResults = results.filter(r => r.tier === t);
      if (tierResults.length > 0) {
        const p = tierResults.reduce((acc, r) => acc + r.passCount, 0);
        const f = tierResults.reduce((acc, r) => acc + r.failCount, 0);
        const rate = (p + f) > 0 ? ((p / (p + f)) * 100).toFixed(1) : '0.0';
        md += `| Tier ${t} | ${tierDesc[t]} | ${tierResults.length} | ${p} | ${f} | ${rate}% |\n`;
      }
    }

    md += `\n## Suite Details\n\n| Suite | Tier | File | Passed | Failed | Status |\n|---|---|---|---|---|---|\n`;
    for (const r of results) {
      const status = r.failCount === 0 ? '✅ PASS' : '❌ FAIL (Pending)';
      md += `| ${r.name} | Tier ${r.tier} | \`${r.file}\` | ${r.passCount} | ${r.failCount} | ${status} |\n`;
    }

    if (allFailures.length > 0) {
      md += `\n## Defect Escalation & Pending Implementation Gaps\n\n`;
      allFailures.forEach((f, idx) => {
        md += `### ${idx + 1}. ${f.title}\n`;
        md += `- **Suite**: ${f.suite} (Tier ${f.tier})\n`;
        md += `- **File**: \`${f.file}\`\n`;
        if (f.details.length > 0) {
          md += `- **Error**: \`${f.details[0]}\`\n`;
        }
        md += `\n`;
      });
    }

    fs.writeFileSync(path.resolve(process.cwd(), reportPath), md, 'utf8');
    console.log(`\n📄 Detailed markdown report saved to: ${reportPath}`);
  }

  console.log('\n================================================================\n');
  process.exit(totalFail > 0 ? 1 : 0);
}

main();
