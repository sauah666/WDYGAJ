
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { chromium } = require('playwright');

let mainWindow;
let browser;
let page;

// --- WINDOW MANAGEMENT ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0a0503',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading external resources (CDN) for this prototype
    }
  });

  // In a real build, this would point to 'dist/index.html'
  // For this dev setup, we load the local index.html
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- NATIVE NETWORK PROXY (Bypass CORS) ---

ipcMain.handle('llm:request', async (event, { url, method, headers, body }) => {
  console.log(`[Main] Proxying LLM Request to: ${url}`);
  try {
    // Node 18+ has native fetch. Electron 28 uses Node 18.x.
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    
    return {
      ok: response.ok,
      status: response.status,
      text: text
    };
  } catch (e) {
    console.error(`[Main] LLM Request Failed:`, e);
    return { 
      ok: false, 
      status: 0, 
      text: null,
      error: e.message 
    };
  }
});

// --- PLAYWRIGHT HANDLERS (The "Hands") ---

ipcMain.handle('browser:launch', async (event, { headless } = { headless: true }) => {
  console.log(`[Main] Launching Playwright (Headless: ${headless})...`);
  if (browser) {
      // If browser exists but configs differ (e.g. was visible, now hidden), close and reopen?
      // For simplicity, reuse if exists, but log warning.
      // Ideally we should close and reopen.
      await browser.close();
  }
  browser = await chromium.launch({ headless: headless });
  const context = await browser.newContext();
  page = await context.newPage();
  return true;
});

ipcMain.handle('browser:navigateTo', async (event, { url }) => {
  console.log(`[Main] Navigating to ${url}`);
  if (!page) throw new Error('Browser not started');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return true;
});

ipcMain.handle('browser:captureScreenshot', async () => {
    if (!page) return null;
    try {
        const buffer = await page.screenshot({ type: 'jpeg', quality: 50 });
        return "data:image/jpeg;base64," + buffer.toString('base64');
    } catch (e) {
        console.error('[Main] Screenshot failed:', e);
        return null;
    }
});

ipcMain.handle('browser:getCurrentUrl', async () => {
  return page ? page.url() : '';
});

ipcMain.handle('browser:getDomSnapshot', async () => {
  return page ? await page.content() : '';
});

ipcMain.handle('browser:scanPageInteractionElements', async () => {
  if (!page) return [];
  // Basic heuristic scan
  return await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, button, textarea'));
    return inputs.map((el, idx) => {
      return {
        id: el.id || `gen-${idx}`,
        tag: el.tagName.toLowerCase(),
        label: el.innerText || el.getAttribute('aria-label') || '',
        attributes: {
          name: el.getAttribute('name') || '',
          class: el.className,
          'data-qa': el.getAttribute('data-qa') || ''
        },
        isVisible: true
      };
    });
  });
});

// --- VACANCY EXTRACTION HANDLERS ---

ipcMain.handle('browser:scanVacancyCards', async (event, { limit }) => {
  if (!page) return { cards: [] };
  // HH.ru specific selector (example)
  const cards = await page.evaluate((l) => {
    const nodes = Array.from(document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]')).slice(0, l);
    return nodes.map(n => {
      const titleEl = n.querySelector('[data-qa="serp-item__title"]');
      const link = titleEl?.getAttribute('href') || '';
      const compEl = n.querySelector('[data-qa="vacancy-serp__vacancy-employer"]');
      const salEl = n.querySelector('[data-qa="vacancy-serp__vacancy-compensation"]');
      
      return {
        url: link,
        title: titleEl?.innerText || 'Unknown',
        company: compEl?.innerText || null,
        salaryText: salEl?.innerText || null,
        externalId: link.split('/vacancy/')[1]?.split('?')[0] || Math.random().toString()
      };
    });
  }, limit);
  return { cards };
});

ipcMain.handle('browser:extractVacancyPage', async () => {
  if (!page) return null;
  const data = await page.evaluate(() => {
    const desc = document.querySelector('[data-qa="vacancy-description"]')?.innerText || '';
    return { desc };
  });
  return {
    requirements: [data.desc], // Simplified for prototype
    responsibilities: [],
    conditions: []
  };
});

// --- ACTION HANDLERS ---

ipcMain.handle('browser:clickElement', async (event, { selector }) => {
  if (!page) return false;
  try {
    // Try data-qa first as it's common in hh.ru
    const finalSelector = selector.startsWith('mock://') ? 'body' : selector; 
    await page.click(finalSelector);
    return true;
  } catch (e) {
    console.error('Click failed', e);
    return false;
  }
});
