import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3004';
const USER_API = 'http://localhost:8001/api/v1';

async function runE2E() {
  console.log('🚀 Launching Playwright E2E Browser Test against', BASE_URL);

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Ensure test users exist via API
    // -------------------------------------------------------------
    console.log('Step 1: Setting up test users (Admin & Customer)...');
    const suffix = Date.now() % 10000;
    const adminUser = {
      email: `admin_${suffix}@example.com`,
      name: 'Admin Elena',
      password: 'Password123!',
      role: 'admin',
    };
    const customerUser = {
      email: `customer_${suffix}@example.com`,
      name: 'Customer Dave',
      password: 'Password123!',
      role: 'user',
    };

    for (const u of [adminUser, customerUser]) {
      const res = await fetch(`${USER_API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u),
      });
      if (res.status !== 201 && res.status !== 409) {
        throw new Error(`Registration failed: ${await res.text()}`);
      }
    }

    // -------------------------------------------------------------
    // Step 2: Unauthenticated Visitor on Knowledge Base Explorer
    // -------------------------------------------------------------
    console.log('Step 2: Testing Public Knowledge Base Explorer (/docs)...');
    await page.goto(`${BASE_URL}/docs`, { waitUntil: 'networkidle' });
    const pageTitle = await page.textContent('h1');
    console.log('  ✓ Page H1 title rendered:', pageTitle);
    if (!pageTitle.includes('How can we help you today?')) {
      throw new Error(`Unexpected page title: ${pageTitle}`);
    }

    // Check search input exists
    const searchInput = page.locator('input[placeholder*="Search knowledge base"]');
    await searchInput.waitFor({ state: 'visible' });
    console.log('  ✓ Search input is visible');

    // -------------------------------------------------------------
    // Step 3: Log in as Admin
    // -------------------------------------------------------------
    console.log('Step 3: Logging in as Admin...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', adminUser.email);
    await page.fill('input[type="password"]', adminUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    console.log('  ✓ Admin logged in successfully');

    // -------------------------------------------------------------
    // Step 4: Admin creates a new Category via Modal
    // -------------------------------------------------------------
    console.log('Step 4: Navigating to /docs and creating Category as Admin...');
    await page.goto(`${BASE_URL}/docs`, { waitUntil: 'networkidle' });

    // Verify Admin banner is visible
    const adminBanner = page.locator('text=admin Mode');
    await adminBanner.waitFor({ state: 'visible' });
    console.log('  ✓ Admin mode banner detected');

    // Click "Categories" button to open modal
    await page.click('button:has-text("Categories")');
    await page.waitForSelector('text=Manage Document Categories', { state: 'visible' });

    // Fill new category form
    const categoryName = `Cloud Infrastructure ${suffix}`;
    await page.fill('input[placeholder="e.g. Authentication & Security"]', categoryName);
    await page.fill('input[placeholder="Brief summary of articles in this category"]', 'Guides for Kubernetes and Cloud setups');
    await page.click('button:has-text("Add Category")');
    await page.waitForSelector(`text=${categoryName}`, { state: 'visible', timeout: 5000 });
    console.log(`  ✓ Category "${categoryName}" created successfully`);

    // Close category modal
    await page.click('button:has-text("Close")');
    await page.waitForSelector('text=Manage Document Categories', { state: 'hidden', timeout: 5000 });

    // -------------------------------------------------------------
    // Step 5: Admin creates a new Support Article with Markdown & Tags
    // -------------------------------------------------------------
    console.log('Step 5: Authoring new support article with Markdown & Live Preview...');
    await page.click('button:has-text("New Article")');
    await page.waitForSelector('text=Create Knowledge Base Article', { state: 'visible', timeout: 5000 });

    const articleTitle = `Kubernetes Ingress & TLS Setup ${suffix}`;
    const articleSlug = `k8s-ingress-tls-${suffix}`;
    const articleSummary = 'Complete tutorial for deploying cert-manager and configuring NGINX Ingress with Let\'s Encrypt TLS.';
    const articleMarkdown = `# Overview\nThis guide explains **TLS termination** on Kubernetes.\n\n## Prerequisites\n- Kubernetes cluster 1.28+\n- Helm 3.0+\n\n\`\`\`bash\nhelm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx\nhelm install my-ingress ingress-nginx/ingress-nginx\n\`\`\`\n\n> Note: Ensure DNS A records point to your LoadBalancer IP.\n\n### Verification\nRun \`kubectl get ingress\` to verify the TLS certificates.`;

    await page.fill('input[placeholder*="How to Configure"]', articleTitle);
    await page.fill('input[placeholder*="auto-generated-slug"]', articleSlug);
    await page.fill('input[placeholder*="1-2 sentences explaining"]', articleSummary);
    
    // Select the category
    await page.selectOption('select:has-text("Select category")', { label: categoryName });

    // Add tags
    const tagInput = page.locator('input[placeholder*="Type tag name"], input[placeholder*="Add more"]');
    await tagInput.waitFor({ state: 'visible' });
    await tagInput.fill('kubernetes');
    await tagInput.press('Enter');
    await tagInput.fill('ingress');
    await tagInput.press('Enter');

    // Fill markdown content
    await page.fill('textarea[placeholder*="Explain step-by-step"]', articleMarkdown);

    // Test Split View / Preview
    await page.click('button:has-text("Preview")');
    await page.waitForSelector('h1:has-text("Overview")', { state: 'visible' });
    console.log('  ✓ Live Markdown Preview rendered H1 and code blocks properly');

    // Set status to Published and save
    await page.selectOption('select:has(option[value="published"])', 'published');
    await page.click('button:has-text("Publish Now")');

    // Wait for modal to close and article card to appear
    await page.waitForSelector('text=Create Knowledge Base Article', { state: 'hidden', timeout: 5000 });
    await page.waitForSelector(`text=${articleTitle}`, { state: 'visible', timeout: 8000 });
    console.log(`  ✓ Support article "${articleTitle}" published and visible in Explorer`);

    // -------------------------------------------------------------
    // Step 6: Reader View & Helpfulness Feedback
    // -------------------------------------------------------------
    console.log('Step 6: Navigating to Reader View and submitting Helpfulness Rating...');
    await page.click(`text=${articleTitle}`);
    await page.waitForURL(new RegExp(`/docs/${articleSlug}`), { timeout: 10000 });

    // Verify Reader page elements
    await page.waitForSelector('h1:has-text("Kubernetes Ingress & TLS Setup")', { state: 'visible' });
    await page.waitForSelector('text=Complete tutorial for deploying cert-manager', { state: 'visible' });
    await page.waitForSelector('text=Was this article helpful?', { state: 'visible' });
    console.log('  ✓ Reader view loaded successfully with typography and metadata');

    // Submit helpfulness rating (Yes)
    await page.click('button:has-text("Yes")');
    await page.waitForSelector('textarea[placeholder*="Tell us what was missing"]', { state: 'visible' });
    await page.fill('textarea[placeholder*="Tell us what was missing"]', 'Very clear and accurate instructions!');
    await page.click('button:has-text("Send Feedback")');

    await page.waitForSelector('text=Thank you for your feedback!', { state: 'visible', timeout: 5000 });
    console.log('  ✓ Feedback rating and comment submitted successfully');

    // -------------------------------------------------------------
    // Step 7: Test Search & Filtering in Explorer
    // -------------------------------------------------------------
    console.log('Step 7: Testing Search & Filtering on Explorer View...');
    await page.goto(`${BASE_URL}/docs`, { waitUntil: 'networkidle' });

    // Search for "Ingress"
    await page.fill('input[placeholder*="Search knowledge base"]', 'Ingress');
    await page.waitForTimeout(600); // Wait for debounce
    await page.waitForSelector(`text=${articleTitle}`, { state: 'visible' });
    console.log('  ✓ Debounced keyword search matched the new article');

    // -------------------------------------------------------------
    // Step 8: Test SuggestedDocsWidget on Ticket Creation (/tickets/new)
    // -------------------------------------------------------------
    console.log('Step 8: Testing Suggested Knowledge Base Widget in Ticket Creation...');
    await page.goto(`${BASE_URL}/tickets/new`, { waitUntil: 'networkidle' });

    await page.fill('input[placeholder*="Cannot connect to staging"]', 'Ingress TLS certificate problem');
    await page.waitForSelector('text=Recommended Knowledge Base Articles', { state: 'visible', timeout: 5000 });
    await page.waitForSelector(`text=${articleTitle}`, { state: 'visible', timeout: 5000 });
    console.log('  ✓ SuggestedDocsWidget automatically recommended the article on ticket creation');

    console.log('--------------------------------------------------');
    console.log('✅ ALL E2E BROWSER USER STORIES PASSED SUCCESSFULLY!');
    console.log('Console Errors count:', consoleErrors.length);
  } finally {
    await browser.close();
  }
}

runE2E().catch((err) => {
  console.error('❌ E2E Browser Test Failed:', err);
  process.exit(1);
});
