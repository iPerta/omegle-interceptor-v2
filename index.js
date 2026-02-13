const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const stateFile = path.join(__dirname, 'state.json');

// --- SETTINGS ---
const GENDER_INVERSION = false; // Set to true to swap 'm' -> 'f' and 'f' -> 'm'
const NUMBER_OFFSET = 0;      // Increase/decrease numbers by this value (e.g., 2 or -2)
// ----------------

(async () => {
    console.log(`Launching MITM INTERCEPTOR (Dual Chrome Windows)...`);

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-infobars',
            '--window-size=600,800' // Half-screen width
        ]
    });

    async function setupStranger(id, xOffset) {
        const stateSuffix = `_s${id}`;
        const specificStateFile = stateFile; // We'll read from common but not save to avoid races for now

        const context = await browser.newContext({
            viewport: { width: 600, height: 800 },
            storageState: fs.existsSync(specificStateFile) ? specificStateFile : undefined
        });

        const page = await context.newPage();

        // Position windows side by side
        await page.setViewportSize({ width: 600, height: 800 });
        // Note: Playwright can't easily set window position once browser is launched with args, 
        // but it'll open in the same instance.

        return { page, context, id, lastMessages: [] };
    }

    const s1 = await setupStranger(1, 0);
    const s2 = await setupStranger(2, 600);

    async function handleInteraction(stranger) {
        const { page, id } = stranger;
        console.log(`[S${id}] Navigating...`);
        await page.goto('https://omegleweb.io', { waitUntil: 'load', timeout: 60000 });

        try {
            await page.waitForSelector('#textbtn', { timeout: 30000 });
            await page.click('#textbtn');
            await page.waitForTimeout(5000);

            const checkboxes = await page.$$('input[type="checkbox"]');
            if (checkboxes.length >= 3) {
                await checkboxes[1].click();
                await page.waitForTimeout(300);
                await checkboxes[2].click();
            }

            await page.waitForTimeout(5000);

            await page.evaluate(() => {
                setTimeout(() => {
                let acceptConditionsBtn = document.querySelector(`input[value="Confirm & continue"]`)
                acceptConditionsBtn.click();
                }, 2000)
            });

            try {
                await page.waitForSelector('#agree-btn', { timeout: 5000, state: 'visible' });
                await page.waitForTimeout(500);
                await page.click('#agree-btn');
            } catch (e) { }

            console.log(`\x1b[36m[S${id} STATUS]\x1b[0m Ready!`);
        } catch (e) {
            console.error(e)
            console.log(`\x1b[31m[S${id} ERROR]\x1b[0m Interaction failed. Solve captcha manually.`);
        }
    }

    await Promise.all([handleInteraction(s1), handleInteraction(s2)]);

    // Relayer Logic
    async function relay(source, target) {
        try {
            if (source.page.isClosed() || target.page.isClosed()) return;

            const currentMessages = await source.page.evaluate(() => {
                const messageElements = document.querySelectorAll(".message");
                return Array.from(messageElements)
                    .map(el => el.textContent)
                    .filter(text => text && !text.includes("is typing..."));
            });

            if (currentMessages.length > source.lastMessages.length) {
                const newMessages = currentMessages.slice(source.lastMessages.length);

                for (const msg of newMessages) {
                    // We only relay what the OTHER stranger sends
                    if (msg.toLowerCase().startsWith('stranger:')) {
                        let actualText = msg.replace(/^stranger:/i, '').trim();

                        // Apply Gender Inversion if flag is on
                        if (GENDER_INVERSION) {
                            const trimmedMatch = actualText.trim().toLowerCase();
                            if (trimmedMatch === 'm') {
                                actualText = actualText.replace(/m/i, 'f');
                                console.log(`\x1b[33m[GENDER SWAP]\x1b[0m Inverted 'm' to 'f'`);
                            } else if (trimmedMatch === 'f') {
                                actualText = actualText.replace(/f/i, 'm');
                                console.log(`\x1b[33m[GENDER SWAP]\x1b[0m Inverted 'f' to 'm'`);
                            }
                        }

                        // Apply Number Offset
                        if (NUMBER_OFFSET !== 0) {
                            const original = actualText;
                            actualText = actualText.replace(/-?\d+/g, (match) => {
                                return parseInt(match) + NUMBER_OFFSET;
                            });
                            if (original !== actualText) {
                                console.log(`\x1b[34m[NUMBER OFFSET]\x1b[0m Adjusted numbers by ${NUMBER_OFFSET} (${original} -> ${actualText})`);
                            }
                        }

                        console.log(`\x1b[32m[STRANGER ${source.id} -> STRANGER ${target.id}]\x1b[0m ${actualText}`);

                        // Type into target
                        try {
                            await target.page.fill('#message-input', actualText);
                            await target.page.keyboard.press('Enter');
                        } catch (err) {
                            console.log(`Failed to relay to S${target.id}`);
                        }
                    } else if (msg.toLowerCase().startsWith('you:')) {
                        // This is our own relayed message being seen by the observer
                    }
                }
                source.lastMessages = currentMessages;
            } else if (currentMessages.length < source.lastMessages.length) {
                source.lastMessages = currentMessages;
            }

            // Sync Disconnects
            const isDisconnected = await source.page.evaluate(() => {
                return document.querySelector(".message-status.disconnect-notice") !== null;
            });

            if (isDisconnected) {
                console.log(`\x1b[31m[S${source.id} LOST]\x1b[0m Stranger ${source.id} disconnected. Reconnecting BOTH...`);

                // Reset both
                for (const s of [s1, s2]) {
                    await s.page.keyboard.press('Escape');
                    await s.page.waitForTimeout(200);
                    await s.page.keyboard.press('Escape');
                    s.lastMessages = [];
                }
            }
        } catch (e) {
            // Context likely closed
        }
    }

    // Main Loop
    const relayInterval = setInterval(async () => {
        await relay(s1, s2);
        await relay(s2, s1);
    }, 1000);

    console.log(`\x1b[35m[SYSTEM]\x1b[0m Interceptor active. Watching both windows...`);

    s1.page.on('close', () => process.exit(0));
    s2.page.on('close', () => process.exit(0));

})();
