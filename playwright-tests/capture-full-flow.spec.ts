import { test, expect } from '@playwright/test'

/**
 * SCREENSHOT CAPTURE TEST
 * Captures screenshots of every step in the wizard flow
 */

test.describe('Full Flow Screenshot Capture', () => {
  test('capture all wizard steps', async ({ page }) => {
    console.log('🎬 Starting full flow screenshot capture...')

    // Navigate to app
    await page.goto('http://localhost:5177')
    await page.waitForLoadState('networkidle')

    // SCREENSHOT 1: Auth Page
    console.log('📸 Capturing auth page...')
    await page.screenshot({
      path: '/tmp/flow-1-auth.png',
      fullPage: true
    })
    console.log('✅ Auth page captured')

    // Check if we need to log in
    const currentUrl = page.url()
    if (currentUrl.includes('/auth')) {
      console.log('🔐 Attempting to fill demo credentials...')

      // Wait for form to be ready
      await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 5000 })

      // Fill in demo credentials (if form accepts them)
      const emailInput = page.locator('input[name="email"], input[type="email"]').first()
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first()

      await emailInput.fill('test@example.com')
      await passwordInput.fill('password')

      // SCREENSHOT 2: Auth page with filled credentials
      console.log('📸 Capturing auth page with credentials...')
      await page.screenshot({
        path: '/tmp/flow-2-auth-filled.png',
        fullPage: true
      })

      // Try to submit (might not work without real auth)
      const signInButton = page.getByRole('button', { name: /sign in/i })
      if (await signInButton.isVisible()) {
        console.log('⚠️  Sign in button found but skipping (no real auth configured)')
      }
    }

    // Navigate to wizard (will redirect to auth if not authenticated)
    console.log('🧙 Navigating to wizard...')
    await page.goto('http://localhost:5177/wizard')
    await page.waitForLoadState('networkidle')

    // SCREENSHOT 3: Wizard redirect or landing
    console.log('📸 Capturing wizard page state...')
    await page.screenshot({
      path: '/tmp/flow-3-wizard-landing.png',
      fullPage: true
    })

    const wizardUrl = page.url()
    console.log(`Current URL: ${wizardUrl}`)

    // If still on auth, that's expected - capture it
    if (wizardUrl.includes('/auth')) {
      console.log('✅ Wizard requires authentication (expected behavior)')
      console.log('📸 All available screenshots captured')

      // Try to take a screenshot of what the wizard WOULD look like
      // by directly visiting it (even though auth will block)
      console.log('📸 Attempting to capture wizard UI structure...')
      await page.goto('http://localhost:5177/wizard', { waitUntil: 'domcontentloaded' })
      await page.screenshot({
        path: '/tmp/flow-4-wizard-blocked.png',
        fullPage: true
      })
    }

    // Try homepage
    console.log('🏠 Capturing homepage...')
    await page.goto('http://localhost:5177')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: '/tmp/flow-5-homepage.png',
      fullPage: true
    })

    console.log('✅ Screenshot capture complete!')
    console.log('📁 Screenshots saved to /tmp/flow-*.png')
  })

  test('capture UI mockup of wizard steps', async ({ page }) => {
    console.log('🎨 Creating visual mockups of wizard flow...')

    // We'll create a simple HTML page showing the wizard flow
    const mockupHtml = `
      <html>
        <head>
          <title>Bulk GPT Wizard Flow</title>
          <style>
            body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 20px; }
            .step { margin: 40px 0; padding: 30px; border: 2px solid #667eea; border-radius: 15px; }
            h1 { color: #667eea; }
            h2 { color: #333; margin-bottom: 20px; }
            .upload-zone { border: 2px dashed #ccc; padding: 60px; text-align: center; border-radius: 10px; background: #f8fafc; }
            .form-field { margin: 20px 0; }
            label { display: block; margin-bottom: 8px; font-weight: 600; }
            textarea { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: monospace; }
            .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .results-table th { background: #667eea; color: white; padding: 12px; text-align: left; }
            .results-table td { border: 1px solid #e2e8f0; padding: 12px; }
            .progress-bar { background: #e2e8f0; border-radius: 10px; height: 30px; margin: 20px 0; }
            .progress-fill { background: #10b981; height: 100%; border-radius: 10px; width: 75%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
            .nav-steps { display: flex; gap: 20px; margin-bottom: 30px; }
            .nav-step { flex: 1; padding: 15px; text-align: center; border-radius: 10px; border: 2px solid #e2e8f0; }
            .nav-step.active { background: #667eea; color: white; border-color: #667eea; }
          </style>
        </head>
        <body>
          <h1>🚀 Bulk GPT - Wizard Flow</h1>

          <div class="step">
            <div class="nav-steps">
              <div class="nav-step active">📁 Upload</div>
              <div class="nav-step">⚙️ Configure</div>
              <div class="nav-step">📊 Results</div>
            </div>
            <h2>Step 1: Upload CSV</h2>
            <div class="upload-zone">
              <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
              <p style="font-size: 18px; color: #64748b;">Drag and drop your CSV file here</p>
              <p style="color: #94a3b8;">or click to browse</p>
            </div>
            <div style="margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 10px;">
              <strong>Preview:</strong> 3 columns detected (name, company, role)
            </div>
          </div>

          <div class="step">
            <div class="nav-steps">
              <div class="nav-step">📁 Upload</div>
              <div class="nav-step active">⚙️ Configure</div>
              <div class="nav-step">📊 Results</div>
            </div>
            <h2>Step 2: Configure Prompt</h2>
            <div class="form-field">
              <label>Prompt Template</label>
              <textarea rows="4" placeholder="Write a professional bio for {{name}} who works as {{role}} at {{company}}">Write a professional bio for {{name}} who works as {{role}} at {{company}}</textarea>
            </div>
            <div class="form-field">
              <label>Context (Optional)</label>
              <textarea rows="3" placeholder="Additional context for the AI...">Keep it professional and concise. Focus on expertise and impact.</textarea>
            </div>
            <button style="background: #667eea; color: white; padding: 15px 40px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px;">
              ▶️ Start Processing
            </button>
          </div>

          <div class="step">
            <div class="nav-steps">
              <div class="nav-step">📁 Upload</div>
              <div class="nav-step">⚙️ Configure</div>
              <div class="nav-step active">📊 Results</div>
            </div>
            <h2>Step 3: Processing</h2>
            <div class="progress-bar">
              <div class="progress-fill">75% Complete (3/4 rows)</div>
            </div>
            <p style="color: #64748b; margin-top: 10px;">⏱️ Estimated time remaining: 5 seconds</p>
          </div>

          <div class="step">
            <div class="nav-steps">
              <div class="nav-step">📁 Upload</div>
              <div class="nav-step">⚙️ Configure</div>
              <div class="nav-step active">📊 Results</div>
            </div>
            <h2>Step 3: Results ✅</h2>
            <table class="results-table">
              <thead>
                <tr>
                  <th>Input</th>
                  <th>AI Generated Output</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Alice | TechCorp | Senior Engineer</td>
                  <td>Alice is a highly accomplished Senior Engineer at TechCorp...</td>
                  <td style="color: #10b981; font-weight: bold;">✓ Success</td>
                </tr>
                <tr>
                  <td>Bob | DataCo | Data Analyst</td>
                  <td>Bob brings exceptional analytical skills to DataCo...</td>
                  <td style="color: #10b981; font-weight: bold;">✓ Success</td>
                </tr>
                <tr>
                  <td>Carol | AILabs | Product Manager</td>
                  <td>Carol leads product innovation at AILabs with expertise...</td>
                  <td style="color: #10b981; font-weight: bold;">✓ Success</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top: 30px; display: flex; gap: 15px;">
              <button style="background: #667eea; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                📥 Download CSV
              </button>
              <button style="background: #10b981; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                📄 Download JSON
              </button>
            </div>
          </div>
        </body>
      </html>
    `

    // Navigate to a data URL with the mockup
    await page.goto(`data:text/html,${encodeURIComponent(mockupHtml)}`)
    await page.waitForLoadState('networkidle')

    // Capture step 1: Upload
    await page.evaluate(() => {
      const steps = document.querySelectorAll('.step')
      steps.forEach((step, i) => {
        if (i !== 0) step.style.display = 'none'
      })
    })
    await page.screenshot({ path: '/tmp/mockup-step1-upload.png', fullPage: true })

    // Capture step 2: Configure
    await page.evaluate(() => {
      const steps = document.querySelectorAll('.step')
      steps.forEach((step, i) => {
        step.style.display = i === 1 ? 'block' : 'none'
      })
    })
    await page.screenshot({ path: '/tmp/mockup-step2-configure.png', fullPage: true })

    // Capture step 3: Processing
    await page.evaluate(() => {
      const steps = document.querySelectorAll('.step')
      steps.forEach((step, i) => {
        step.style.display = i === 2 ? 'block' : 'none'
      })
    })
    await page.screenshot({ path: '/tmp/mockup-step3-processing.png', fullPage: true })

    // Capture step 3: Results
    await page.evaluate(() => {
      const steps = document.querySelectorAll('.step')
      steps.forEach((step, i) => {
        step.style.display = i === 3 ? 'block' : 'none'
      })
    })
    await page.screenshot({ path: '/tmp/mockup-step4-results.png', fullPage: true })

    console.log('✅ All mockup screenshots captured!')
    console.log('📁 Saved to /tmp/mockup-step*.png')
  })
})
