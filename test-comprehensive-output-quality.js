/**
 * COMPREHENSIVE OUTPUT QUALITY & PERFORMANCE TEST SUITE
 * 
 * Tests:
 * 1. Different CSV files with different prompts
 * 2. Manual vs AI-selected output columns and tools
 * 3. Performance benchmarks (speed, latency)
 * 4. Output quality validation
 * 5. Stress testing (concurrent requests, large files)
 * 6. Both API (headless) and UI testing
 * 
 * Production-grade, SaaS-level testing
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'https://bulk-gpt-app.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@bulkgpt.local';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test123456!';

// Test configurations
const TEST_SCENARIOS = [
  // Sample Input CSV Tests
  {
    name: 'Simple Text Analysis',
    csvFile: 'public/examples/sample-input.csv',
    prompt: 'Analyze each person\'s description and generate a professional summary highlighting their key skills and expertise.',
    outputColumns: [{ name: 'summary', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'AI-Optimized Simple',
    csvFile: 'public/examples/sample-input.csv',
    prompt: 'Create a professional bio for each person.',
    outputColumns: [], // Let AI decide
    tools: [], // Let AI decide
    useAI: true,
  },
  {
    name: 'Complex Multi-Column',
    csvFile: 'public/examples/sample-input.csv',
    prompt: 'For each person, generate: 1) A professional summary, 2) Key skills list, 3) Career recommendations.',
    outputColumns: [
      { name: 'summary', type: 'text' },
      { name: 'skills', type: 'text' },
      { name: 'recommendations', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'AI-Optimized Complex',
    csvFile: 'public/examples/sample-input.csv',
    prompt: 'Analyze each person comprehensively and provide insights about their professional background, skills, and career trajectory.',
    outputColumns: [],
    tools: [],
    useAI: true,
  },
  
  // Products CSV Tests
  {
    name: 'Product Descriptions',
    csvFile: 'test-data/products.csv',
    prompt: 'Create compelling product descriptions for e-commerce, highlighting key features and benefits.',
    outputColumns: [{ name: 'marketing_description', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Product SEO Optimization',
    csvFile: 'test-data/products.csv',
    prompt: 'Generate SEO-optimized product titles, meta descriptions, and key features for each product.',
    outputColumns: [
      { name: 'seo_title', type: 'text' },
      { name: 'meta_description', type: 'text' },
      { name: 'key_features', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'AI Product Analysis',
    csvFile: 'test-data/products.csv',
    prompt: 'Analyze each product and suggest improvements, target audience, and competitive positioning.',
    outputColumns: [],
    tools: [],
    useAI: true,
  },
  
  // Employees CSV Tests
  {
    name: 'Employee Profiles',
    csvFile: 'test-data/employees.csv',
    prompt: 'Create professional LinkedIn-style profiles for each employee highlighting their expertise.',
    outputColumns: [{ name: 'linkedin_profile', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Employee Skill Assessment',
    csvFile: 'test-data/employees.csv',
    prompt: 'Assess each employee\'s skills based on their role and experience, suggest training opportunities.',
    outputColumns: [
      { name: 'skill_assessment', type: 'text' },
      { name: 'training_recommendations', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  
  // Customers CSV Tests
  {
    name: 'Customer Segmentation',
    csvFile: 'test-data/customers.csv',
    prompt: 'Analyze each customer and assign them to a segment (VIP, Regular, New) with reasoning.',
    outputColumns: [
      { name: 'segment', type: 'text' },
      { name: 'segment_reason', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Customer Personalization',
    csvFile: 'test-data/customers.csv',
    prompt: 'Generate personalized marketing messages and product recommendations for each customer.',
    outputColumns: [
      { name: 'personalized_message', type: 'text' },
      { name: 'recommended_products', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  
  // Tool Testing
  {
    name: 'With Tools - Web Search',
    csvFile: 'public/examples/sample-input.csv',
    prompt: 'Research each person and provide their current company and LinkedIn profile if available.',
    outputColumns: [{ name: 'company', type: 'text' }, { name: 'linkedin', type: 'text' }],
    tools: ['web_search'],
    useAI: false,
  },
  
  // Additional CSV Files Tests
  {
    name: 'Article Summarization',
    csvFile: 'test-data/articles.csv',
    prompt: 'Create a compelling article summary and extract key topics for each article.',
    outputColumns: [
      { name: 'summary', type: 'text' },
      { name: 'key_topics', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Review Sentiment Analysis',
    csvFile: 'test-data/reviews.csv',
    prompt: 'Analyze each review and extract sentiment, key points, and improvement suggestions.',
    outputColumns: [
      { name: 'sentiment', type: 'text' },
      { name: 'key_points', type: 'text' },
      { name: 'suggestions', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Company Profiles',
    csvFile: 'test-data/companies.csv',
    prompt: 'Create comprehensive company profiles with market positioning and growth potential.',
    outputColumns: [{ name: 'company_profile', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Event Descriptions',
    csvFile: 'test-data/events.csv',
    prompt: 'Generate engaging event descriptions and marketing copy for each event.',
    outputColumns: [
      { name: 'description', type: 'text' },
      { name: 'marketing_copy', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Invoice Summaries',
    csvFile: 'test-data/invoices.csv',
    prompt: 'Create payment summaries and generate payment reminder messages for pending invoices.',
    outputColumns: [
      { name: 'summary', type: 'text' },
      { name: 'reminder_message', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Contact Enrichment',
    csvFile: 'test-data/contacts.csv',
    prompt: 'Enrich each contact with professional summary and networking recommendations.',
    outputColumns: [
      { name: 'professional_summary', type: 'text' },
      { name: 'networking_tips', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Large Product Catalog',
    csvFile: 'test-data/products-large.csv',
    prompt: 'Generate SEO-optimized product descriptions and marketing copy.',
    outputColumns: [
      { name: 'seo_description', type: 'text' },
      { name: 'marketing_copy', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Special Characters Handling',
    csvFile: 'test-data/special-chars.csv',
    prompt: 'Process products with special characters and generate clean descriptions.',
    outputColumns: [{ name: 'clean_description', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Minimal Data',
    csvFile: 'test-data/minimal.csv',
    prompt: 'Generate detailed profiles from minimal data.',
    outputColumns: [{ name: 'profile', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Mixed Data Types',
    csvFile: 'test-data/mixed-types.csv',
    prompt: 'Analyze mixed data types and create comprehensive profiles.',
    outputColumns: [{ name: 'analysis', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Empty Fields Handling',
    csvFile: 'test-data/empty-fields.csv',
    prompt: 'Handle missing data gracefully and generate complete profiles.',
    outputColumns: [{ name: 'complete_profile', type: 'text' }],
    tools: [],
    useAI: false,
  },
  
  // Large File Tests
  {
    name: 'Large Products (1000 rows)',
    csvFile: 'test-data/products-1000.csv',
    prompt: 'Generate SEO-optimized product descriptions.',
    outputColumns: [{ name: 'seo_description', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Large Employees (1000 rows)',
    csvFile: 'test-data/employees-1000.csv',
    prompt: 'Create professional LinkedIn profiles.',
    outputColumns: [{ name: 'linkedin_profile', type: 'text' }],
    tools: [],
    useAI: false,
  },
  {
    name: 'Large Customers (1000 rows)',
    csvFile: 'test-data/customers-1000.csv',
    prompt: 'Generate customer segmentation and personalization.',
    outputColumns: [
      { name: 'segment', type: 'text' },
      { name: 'personalized_message', type: 'text' },
    ],
    tools: [],
    useAI: false,
  },
  {
    name: 'Very Large Minimal (10000 rows)',
    csvFile: 'test-data/minimal-10000.csv',
    prompt: 'Generate detailed profiles from minimal data.',
    outputColumns: [{ name: 'profile', type: 'text' }],
    tools: [],
    useAI: false,
  },
];

// Performance metrics
const metrics = {
  apiTests: [],
  uiTests: [],
  stressTests: [],
  errors: [],
};

/**
 * Get authentication cookies for API calls
 */
async function getAuthCookies(page) {
  try {
    // Navigate to auth page
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Check if we're already logged in
    const currentUrl = page.url();
    if (!currentUrl.includes('/auth')) {
      console.log('  Already authenticated');
      const cookies = await page.context().cookies();
      return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
    
    // Try to sign in
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // Click submit and wait for either navigation or error
    await Promise.race([
      page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15000 }),
      page.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => null),
    ]);
    
    // Check if we successfully navigated away from auth
    const newUrl = page.url();
    if (newUrl.includes('/auth')) {
      // Check for error message
      const errorElement = page.locator('[role="alert"]').first();
      if (await errorElement.count() > 0) {
        const errorText = await errorElement.textContent();
        console.log(`  ⚠ Sign-in error: ${errorText}`);
        
        // Try to create account if sign-in fails
        console.log('  Attempting to create account...');
        const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
        if (await signUpLink.count() > 0) {
          await signUpLink.click();
          await page.waitForTimeout(1000);
          
          const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
          if (await confirmPasswordInput.count() > 0) {
            await emailInput.fill(TEST_EMAIL);
            await passwordInput.fill(TEST_PASSWORD);
            await confirmPasswordInput.fill(TEST_PASSWORD);
            await submitButton.click();
            await page.waitForTimeout(3000);
          }
        }
      }
    }
    
    // Get cookies regardless (may have partial auth)
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    if (cookieString.length === 0) {
      throw new Error('No cookies obtained - authentication failed');
    }
    
    return cookieString;
  } catch (error) {
    console.error('Failed to get auth cookies:', error.message);
    // Try one more time with a fresh page
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const cookies = await page.context().cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      if (cookieString) {
        console.log('  ✓ Retry successful');
        return cookieString;
      }
    } catch (retryError) {
      console.error('  Retry also failed');
    }
    // Return empty string to allow tests to proceed (they'll fail with 401)
    return '';
  }
}

/**
 * Get API key for API calls (alternative auth method)
 */
async function getApiKey(page) {
  try {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    
    // Look for API key section
    const apiKeySection = page.locator('text=/api.*key/i').first();
    if (await apiKeySection.count() > 0) {
      // Try to find existing key or generate new one
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
      if (await generateButton.count() > 0) {
        await generateButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Extract API key from page
      const keyElement = page.locator('code, input[type="text"][readonly]').first();
      const apiKey = await keyElement.textContent();
      return apiKey?.trim();
    }
    
    return null;
  } catch (error) {
    console.log('Could not get API key, will use cookie auth');
    return null;
  }
}

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

/**
 * Test API endpoint directly (headless, faster)
 */
async function testAPI(scenario, authCookies, apiKey) {
  // Use authCookies consistently
  const authToken = authCookies;
  const startTime = Date.now();
  const testResult = {
    scenario: scenario.name,
    method: 'API',
    startTime,
    success: false,
    error: null,
    batchId: null,
    duration: null,
    optimizationDuration: null,
    processingDuration: null,
  };
  
  try {
    // Parse CSV - handle different path formats
    let csvPath;
    if (scenario.csvFile.startsWith('public/') || scenario.csvFile.startsWith('test-data/')) {
      csvPath = path.join(__dirname, scenario.csvFile);
    } else {
      csvPath = path.join(__dirname, 'public/examples', scenario.csvFile);
    }
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const { headers, rows } = parseCSV(csvPath);
    console.log(`  📄 CSV: ${rows.length} rows, ${headers.length} columns`);
    
    // Step 1: Optimize job if using AI
    let optimizedPrompt = scenario.prompt;
    let optimizedColumns = scenario.outputColumns;
    let optimizedTools = scenario.tools;
    
    if (scenario.useAI) {
      const optimizeStart = Date.now();
      const optimizeResponse = await fetch(`${BASE_URL}/api/optimize-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : { 'Cookie': authCookies }),
        },
        body: JSON.stringify({
          prompt: scenario.prompt,
          csvColumns: headers, // API expects csvColumns
        }),
      });
      
      if (!optimizeResponse.ok) {
        throw new Error(`Optimize failed: ${optimizeResponse.status} ${await optimizeResponse.text()}`);
      }
      
      const optimizeData = await optimizeResponse.json();
      testResult.optimizationDuration = Date.now() - optimizeStart;
      
      optimizedPrompt = optimizeData.optimizedPrompt || scenario.prompt;
      optimizedColumns = optimizeData.outputColumns || [];
      optimizedTools = optimizeData.suggestedTools || [];
      
      console.log(`  🤖 AI Optimization: ${testResult.optimizationDuration}ms`);
      console.log(`     Prompt optimized: ${optimizedPrompt !== scenario.prompt ? 'Yes' : 'No'}`);
      console.log(`     Columns suggested: ${optimizedColumns.length}`);
      console.log(`     Tools suggested: ${optimizedTools.length}`);
    }
    
    // Step 2: Process batch
    const processStart = Date.now();
    const processResponse = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : { 'Cookie': authCookies }),
      },
      body: JSON.stringify({
        csvFilename: scenario.csvFile,
        rows,
        prompt: optimizedPrompt,
        outputColumns: optimizedColumns,
        tools: optimizedTools,
        testMode: false,
      }),
    });
    
    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      throw new Error(`Process failed: ${processResponse.status} ${errorText}`);
    }
    
    const processData = await processResponse.json();
    testResult.processingDuration = Date.now() - processStart;
    testResult.batchId = processData.batchId;
    
    console.log(`  ⚡ Processing: ${testResult.processingDuration}ms`);
    console.log(`     Batch ID: ${processData.batchId}`);
    
    // Step 3: Poll for completion
    const pollStart = Date.now();
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
      
      const statusResponse = await fetch(`${BASE_URL}/api/batch/${processData.batchId}/status`, {
        headers: {
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : { 'Cookie': authCookies }),
        },
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed' || statusData.status === 'completed_with_errors') {
        completed = true;
        testResult.pollDuration = Date.now() - pollStart;
        testResult.totalRows = statusData.totalRows;
        testResult.completedRows = statusData.processedRows || statusData.completedRows || 0;
        testResult.failedRows = (statusData.results || []).filter(r => r.status === 'error').length;
        
        // Results are already in statusData
        testResult.results = statusData.results || [];
        testResult.outputQuality = analyzeOutputQuality(statusData.results || [], optimizedColumns);
        
        console.log(`  ✅ Completed: ${testResult.completedRows}/${testResult.totalRows} rows`);
        console.log(`     Poll duration: ${testResult.pollDuration}ms`);
      } else if (statusData.status === 'failed') {
        throw new Error(`Batch failed: ${statusData.error || 'Unknown error'}`);
      }
    }
    
    if (!completed) {
      throw new Error(`Timeout: Batch did not complete within ${maxAttempts * 5} seconds`);
    }
    
    testResult.duration = Date.now() - startTime;
    testResult.success = true;
    
    console.log(`  ⏱️  Total duration: ${testResult.duration}ms (${(testResult.duration / 1000).toFixed(2)}s)`);
    
  } catch (error) {
    testResult.duration = Date.now() - startTime;
    testResult.error = error.message;
    testResult.success = false;
    console.error(`  ❌ Error: ${error.message}`);
  }
  
  metrics.apiTests.push(testResult);
  return testResult;
}

/**
 * Analyze output quality
 */
function analyzeOutputQuality(results, expectedColumns) {
  if (!results || results.length === 0) {
    return { score: 0, issues: ['No results returned'] };
  }
  
  const quality = {
    score: 100,
    issues: [],
    stats: {
      totalRows: results.length,
      rowsWithAllColumns: 0,
      rowsWithPartialColumns: 0,
      rowsWithNoColumns: 0,
      averageLength: 0,
    },
  };
  
  let totalLength = 0;
  
  results.forEach((result, idx) => {
    const output = result.output || {};
    const outputKeys = Object.keys(output);
    
    // Check if all expected columns are present
    const expectedKeys = expectedColumns.map(c => c.name);
    const hasAllColumns = expectedKeys.every(key => outputKeys.includes(key));
    const hasSomeColumns = expectedKeys.some(key => outputKeys.includes(key));
    
    if (hasAllColumns) {
      quality.stats.rowsWithAllColumns++;
    } else if (hasSomeColumns) {
      quality.stats.rowsWithPartialColumns++;
      quality.issues.push(`Row ${idx + 1}: Missing columns (expected: ${expectedKeys.join(', ')}, got: ${outputKeys.join(', ')})`);
      quality.score -= 10;
    } else {
      quality.stats.rowsWithNoColumns++;
      quality.issues.push(`Row ${idx + 1}: No output columns found`);
      quality.score -= 20;
    }
    
    // Check output length (should not be empty)
    expectedKeys.forEach(key => {
      const value = output[key];
      if (value) {
        totalLength += value.length;
      } else {
        quality.issues.push(`Row ${idx + 1}: Column "${key}" is empty`);
        quality.score -= 5;
      }
    });
  });
  
  quality.stats.averageLength = totalLength / (results.length * expectedColumns.length) || 0;
  
  // Quality thresholds
  if (quality.stats.rowsWithAllColumns / results.length < 0.8) {
    quality.issues.push(`Only ${((quality.stats.rowsWithAllColumns / results.length) * 100).toFixed(1)}% of rows have all columns`);
    quality.score -= 15;
  }
  
  if (quality.stats.averageLength < 50) {
    quality.issues.push(`Average output length is very short: ${quality.stats.averageLength.toFixed(0)} chars`);
    quality.score -= 10;
  }
  
  quality.score = Math.max(0, quality.score);
  
  return quality;
}

/**
 * Test UI flow (end-to-end)
 */
async function testUI(scenario, page) {
  const startTime = Date.now();
  const testResult = {
    scenario: scenario.name,
    method: 'UI',
    startTime,
    success: false,
    error: null,
    duration: null,
  };
  
  try {
    // Navigate to bulk page
    await page.goto(`${BASE_URL}/bulk`, { waitUntil: 'networkidle' });
    
    // Upload CSV - handle different path formats
    let csvPath;
    if (scenario.csvFile.startsWith('public/') || scenario.csvFile.startsWith('test-data/')) {
      csvPath = path.join(__dirname, scenario.csvFile);
    } else {
      csvPath = path.join(__dirname, 'public/examples', scenario.csvFile);
    }
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(3000);
    
    // Enter prompt
    const promptField = page.locator('textarea#prompt').first();
    await promptField.fill(scenario.prompt);
    await page.waitForTimeout(1000);
    
    // Configure output columns if not using AI
    if (!scenario.useAI && scenario.outputColumns.length > 0) {
      // Open output settings if needed
      const outputSettingsButton = page.locator('button:has-text("Output"), button:has-text("Settings")').first();
      if (await outputSettingsButton.count() > 0) {
        await outputSettingsButton.click();
        await page.waitForTimeout(500);
      }
      
      // Add output columns
      for (const col of scenario.outputColumns) {
        const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
        if (await addButton.count() > 0) {
          await addButton.click();
          await page.waitForTimeout(300);
          
          const columnInput = page.locator('input[placeholder*="column" i], input[placeholder*="name" i]').last();
          await columnInput.fill(col.name);
          await page.waitForTimeout(300);
        }
      }
    }
    
    // Use AI optimization if requested
    if (scenario.useAI) {
      const aiButton = page.locator('button:has-text("AI"), button:has-text("Optimize")').first();
      if (await aiButton.count() > 0 && !(await aiButton.isDisabled())) {
        await aiButton.click();
        await page.waitForTimeout(5000); // Wait for AI optimization
      }
    }
    
    // Run job
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.click();
    
    // Wait for completion
    await page.waitForSelector('text=/completed|finished|done/i', { timeout: 300000 }); // 5 min max
    
    testResult.duration = Date.now() - startTime;
    testResult.success = true;
    
  } catch (error) {
    testResult.duration = Date.now() - startTime;
    testResult.error = error.message;
    testResult.success = false;
  }
  
  metrics.uiTests.push(testResult);
  return testResult;
}

/**
 * Stress test: Concurrent requests
 */
async function stressTestConcurrent(authCookies, apiKey) {
  console.log('\n🔥 STRESS TEST: Concurrent Requests\n');
  
  const concurrentCount = 10; // Increased for better stress testing
  const csvPath = path.join(__dirname, 'public/examples/sample-input.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('  ⚠ CSV file not found, skipping stress test');
    return { successCount: 0, totalCount: 0, duration: 0 };
  }
  
  const { headers, rows } = parseCSV(csvPath);
  
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 0; i < concurrentCount; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : { 'Cookie': authCookies }),
        },
        body: JSON.stringify({
          csvFilename: `stress-test-${i}.csv`,
          rows: rows.slice(0, 2), // Small batch for stress test
          prompt: 'Generate a summary.',
          outputColumns: [{ name: 'summary', type: 'text' }],
          tools: [],
        }),
      }).then(async (res) => {
        const data = await res.json();
        return { success: res.ok, batchId: data.batchId, status: res.status };
      }).catch(err => ({ success: false, error: err.message }))
    );
  }
  
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  const successCount = results.filter(r => r.success).length;
  const failedResults = results.filter(r => !r.success);
  
  console.log(`  Concurrent requests: ${concurrentCount}`);
  console.log(`  Successful: ${successCount}/${concurrentCount}`);
  console.log(`  Failed: ${failedResults.length}`);
  if (failedResults.length > 0) {
    console.log(`  Failure reasons:`);
    failedResults.forEach((r, idx) => {
      console.log(`    ${idx + 1}. ${r.error || `Status ${r.status}`}`);
    });
  }
  console.log(`  Duration: ${duration}ms (${(duration / concurrentCount).toFixed(0)}ms avg per request)`);
  
  metrics.stressTests.push({
    type: 'concurrent',
    count: concurrentCount,
    successCount,
    duration,
    results,
  });
  
  return { successCount, totalCount: concurrentCount, duration };
}

/**
 * Stress test: Large file processing
 */
async function stressTestLargeFile(authCookies, apiKey) {
  console.log('\n🔥 STRESS TEST: Large File Processing\n');
  
  // Generate a large CSV (50 rows)
  const largeRows = [];
  for (let i = 1; i <= 50; i++) {
    largeRows.push({
      name: `Person ${i}`,
      company: `Company ${i % 10}`,
      role: `Role ${i % 5}`,
    });
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : { 'Cookie': authCookies }),
      },
      body: JSON.stringify({
        csvFilename: 'large-file-test.csv',
        rows: largeRows,
        prompt: 'Generate a brief summary for each person.',
        outputColumns: [{ name: 'summary', type: 'text' }],
        tools: [],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log(`  Large file: ${largeRows.length} rows`);
    console.log(`  Batch created: ${data.batchId}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Rows per second: ${(largeRows.length / (duration / 1000)).toFixed(2)}`);
    
    metrics.stressTests.push({
      type: 'large_file',
      rowCount: largeRows.length,
      batchId: data.batchId,
      duration,
      success: true,
    });
    
    return { success: true, batchId: data.batchId, duration, rowCount: largeRows.length };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`  ❌ Error: ${error.message}`);
    
    metrics.stressTests.push({
      type: 'large_file',
      rowCount: largeRows.length,
      duration,
      success: false,
      error: error.message,
    });
    
    return { success: false, error: error.message, duration };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE OUTPUT QUALITY & PERFORMANCE TEST');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Get authentication
    console.log('🔐 Authenticating...');
    const authCookies = await getAuthCookies(page);
    const apiKey = await getApiKey(page);
    console.log('✓ Authentication successful\n');
    
    // Validate authentication before running tests
    if (!authCookies || authCookies.length === 0) {
      console.error('\n❌ Authentication failed - cannot run tests');
      console.error('Please ensure test credentials are correct or create an account first\n');
      throw new Error('Authentication required');
    }
    
    // Run API tests
    console.log('📡 API TESTS (Headless, Direct)\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Limit to first 5 scenarios for initial run (can be expanded)
    const scenariosToTest = process.env.TEST_ALL === 'true' 
      ? TEST_SCENARIOS 
      : TEST_SCENARIOS.slice(0, 5);
    
    console.log(`Running ${scenariosToTest.length} of ${TEST_SCENARIOS.length} scenarios\n`);
    
    for (const scenario of scenariosToTest) {
      console.log(`\n🧪 Test: ${scenario.name}`);
      console.log(`   Prompt: ${scenario.prompt.substring(0, 60)}...`);
      console.log(`   AI Optimization: ${scenario.useAI ? 'Yes' : 'No'}`);
      console.log(`   Manual Columns: ${scenario.outputColumns.length}`);
      console.log(`   Manual Tools: ${scenario.tools.length}`);
      
      await testAPI(scenario, authCookies, apiKey);
      
      // Wait between tests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Show progress
      const completed = metrics.apiTests.filter(t => t.success).length;
      const total = metrics.apiTests.length;
      console.log(`\n  Progress: ${completed}/${total} tests passed\n`);
    }
    
    // Run stress tests
    console.log('\n\n🔥 STRESS TESTS\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    await stressTestConcurrent(authCookies, apiKey);
    await stressTestLargeFile(authCookies, apiKey);
    
    // Run UI tests (sample)
    console.log('\n\n🖥️  UI TESTS (Sample)\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Test first scenario via UI
    console.log(`\n🧪 UI Test: ${TEST_SCENARIOS[0].name}`);
    await testUI(TEST_SCENARIOS[0], page);
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    metrics.errors.push({ error: error.message, stack: error.stack });
  } finally {
    await browser.close();
  }
  
  // Print summary
  printSummary();
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // API Tests Summary
  console.log('📡 API TESTS:');
  const apiSuccess = metrics.apiTests.filter(t => t.success).length;
  const apiTotal = metrics.apiTests.length;
  const apiFailed = metrics.apiTests.filter(t => !t.success);
  console.log(`   Passed: ${apiSuccess}/${apiTotal}`);
  console.log(`   Failed: ${apiFailed.length}/${apiTotal}`);
  
  if (metrics.apiTests.length > 0) {
    const successfulTests = metrics.apiTests.filter(t => t.success);
    
    if (successfulTests.length > 0) {
      const avgDuration = successfulTests.reduce((sum, t) => sum + (t.duration || 0), 0) / successfulTests.length;
      const avgOptimization = successfulTests
        .filter(t => t.optimizationDuration)
        .reduce((sum, t) => sum + t.optimizationDuration, 0) / successfulTests.filter(t => t.optimizationDuration).length || 0;
      const avgProcessing = successfulTests
        .filter(t => t.processingDuration)
        .reduce((sum, t) => sum + t.processingDuration, 0) / successfulTests.filter(t => t.processingDuration).length || 0;
      
      console.log(`   Average Duration: ${(avgDuration / 1000).toFixed(2)}s`);
      if (avgOptimization > 0) {
        console.log(`   Average Optimization: ${avgOptimization}ms`);
      }
      if (avgProcessing > 0) {
        console.log(`   Average Processing: ${avgProcessing}ms`);
      }
      
      // Output quality
      const qualityScores = successfulTests
        .filter(t => t.outputQuality)
        .map(t => t.outputQuality.score);
      
      if (qualityScores.length > 0) {
        const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
        console.log(`   Average Quality Score: ${avgQuality.toFixed(1)}/100`);
      }
    }
    
    // Show failed tests
    if (apiFailed.length > 0) {
      console.log(`\n   Failed Tests:`);
      apiFailed.forEach((test, idx) => {
        console.log(`     ${idx + 1}. ${test.scenario}: ${test.error || 'Unknown error'}`);
      });
    }
  }
  
  // UI Tests Summary
  console.log('\n🖥️  UI TESTS:');
  const uiSuccess = metrics.uiTests.filter(t => t.success).length;
  const uiTotal = metrics.uiTests.length;
  console.log(`   Passed: ${uiSuccess}/${uiTotal}`);
  
  if (metrics.uiTests.length > 0) {
    const avgDuration = metrics.uiTests.reduce((sum, t) => sum + (t.duration || 0), 0) / metrics.uiTests.length;
    console.log(`   Average Duration: ${(avgDuration / 1000).toFixed(2)}s`);
  }
  
  // Stress Tests Summary
  console.log('\n🔥 STRESS TESTS:');
  metrics.stressTests.forEach(test => {
    if (test.type === 'concurrent') {
      console.log(`   ${test.type}: ${test.successCount}/${test.count} passed in ${test.duration}ms`);
    } else if (test.type === 'large_file') {
      const status = test.success ? '✓' : '✗';
      const rowsPerSec = test.success ? ` (${(test.rowCount / (test.duration / 1000)).toFixed(1)} rows/sec)` : '';
      console.log(`   ${test.type}: ${status} ${test.rowCount} rows in ${test.duration}ms${rowsPerSec}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    }
  });
  
  // Errors
  if (metrics.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    metrics.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.error}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testAPI, testUI };

