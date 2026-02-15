import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';

// Simpler approach given common issues with typing for these plugins:
const chromiumAny: any = chromium;
chromiumAny.use(stealth());

export class BrowserManager {
    private context: any = null;
    private page: any = null;
    private userDataDir: string;

    constructor() {
        this.userDataDir = path.resolve(__dirname, '../user_data');
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }
    }

    async launch() {
        if (this.context) return; // Already running

        console.log('[BrowserManager] Launching Real Chrome...');
        
        // Path to Google Chrome on Windows
        // Check standard locations
        const possiblePaths = [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
        ];
        
        let executablePath = possiblePaths.find(p => fs.existsSync(p));
        
        if (!executablePath) {
             console.log("[BrowserManager] Chrome not found in standard locations. Falling back to bundled Chromium.");
             // Fallback to bundled if not found (or throw error if strictly required)
             executablePath = undefined; 
        } else {
            console.log(`[BrowserManager] Found Chrome at: ${executablePath}`);
        }

        try {
            // launchPersistentContext allows saving cookies/session to userDataDir
            this.context = await chromiumAny.launchPersistentContext(this.userDataDir, {
                executablePath: executablePath, // Use real Chrome
                headless: false,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled', // Hide automation
                    '--start-maximized'
                ],
                viewport: null, // Let browser handle viewport for "real" feels
                
                // Chrome specific args to look more "real"
                ignoreDefaultArgs: ['--enable-automation'],
            });

            const pages = await this.context.pages();
            this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
            
            console.log('[BrowserManager] Navigating to omegleweb.io...');
            await this.page.goto('https://omegleweb.io', { waitUntil: 'domcontentloaded' });
        } catch (e) {
            console.error("[BrowserManager] Failed to launch browser:", e);
            throw e;
        }
    }

    async getCookieString(): Promise<string | null> {
        if (!this.context) return null;

        const cookies = await this.context.cookies();
        
        const cfClearance = cookies.find((c: any) => c.name === 'cf_clearance');
        
        // Also capture randid if set by the site (it might be!)
        // But mainly we return all relevant ones.
        if (cfClearance) {
            // Filter important ones or just send all that don't look huge
            return cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
        }
        
        return null;
    }

    async waitForCookies(timeout: number = 600000): Promise<string> {
        console.log('[BrowserManager] Waiting for cookies (solve CAPTCHA now if present)...');
        
        return new Promise(async (resolve, reject) => {
            const start = Date.now();
            
            const check = async () => {
                // Check if browser was closed manually by user
                if (!this.context) {
                    reject(new Error('Browser closed'));
                    return;
                }
                
                // If the pages are all closed, context might still be "open" but not useful
                if (this.context.pages().length === 0) {
                     reject(new Error('Browser pages closed'));
                     return;
                }

                if (Date.now() - start > timeout) {
                    reject(new Error('Timeout waiting for cookies'));
                    return;
                }

                const cookieStr = await this.getCookieString();
                if (cookieStr && cookieStr.includes('cf_clearance')) {
                    console.log('[BrowserManager] Cookies retrieved!');
                    resolve(cookieStr);
                    return;
                }

                setTimeout(check, 1000);
            };

            check();
        });
    }

    async close() {
        if (this.context) {
            console.log('[BrowserManager] Closing browser...');
            try {
                await this.context.close();
            } catch (e) {
                // ignore
            }
            this.context = null;
            this.page = null;
        }
    }
}
