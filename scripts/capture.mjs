import { createRequire } from 'node:module'
import { readFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const runtime = process.env.PLAYWRIGHT_RUNTIME
  || join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')

const config = JSON.parse(readFileSync(
  join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'),
  'utf8'
))
if (process.platform === 'linux') {
  process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()
}

const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR
if (!url || !output) {
  console.error('Set CAPTURE_URL and CAPTURE_DIR.')
  process.exit(1)
}
mkdirSync(output, { recursive: true })

// Navigation/browser infrastructure problems are retryable.
const transient = (error) => {
  error.exitCode = 75
  return error
}

const isTransientStatus = (status) =>
  !status || [408, 429, 500, 502, 503, 504].includes(status)

const pageErrors = []
let browser
try {
  browser = await chromium.launch({
    ...config.browser.launchOptions,
    timeout: 30000
  }).catch(transient)

  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1
    }).catch(transient)
    const page = await context.newPage().catch(transient)
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(45000)

    page.on('pageerror', (error) => {
      console.error(`pageerror (${name}): ${error.message}`)
      pageErrors.push(`${name}: ${error.message}`)
    })

    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout: 45000
    }).catch(transient)
    if (!response || !response.ok()) {
      const status = response?.status()
      throw Object.assign(
        new Error(`HTTP ${status ?? 'unavailable'} loading ${url}`),
        { exitCode: isTransientStatus(status) ? 75 : 1 }
      )
    }

    // Wait for the document, fonts, and actual rendered content.
    await page.locator('body').waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await page.waitForFunction(() => {
      const text = (document.body?.innerText || '').trim()
      const media = document.querySelector('canvas, video, img[src]')
      return text.length >= 40 || Boolean(media)
    }, undefined, { timeout: 20000 }).catch((error) => {
      throw Object.assign(
        new Error(`Preview rendered no meaningful content: ${error.message}`),
        { exitCode: 1 }
      )
    })
    await page.waitForTimeout(1200)

    const file = join(output, `final-${name}.png`)
    await page.screenshot({ path: file, timeout: 30000 }).catch((error) => {
      if (error.name === 'TimeoutError' || !browser.isConnected()) throw transient(error)
      throw error
    })
    if (statSync(file).size < 5000) {
      throw Object.assign(
        new Error(`Captured ${name} screenshot looks blank: ${file}`),
        { exitCode: 1 }
      )
    }
    console.log(`Captured ${name} (${width}x${height}) -> ${file}`)
    await context.close().catch((error) => {
      if (browser.isConnected()) console.error(`close ${name}: ${error.message}`)
    })
  }

  if (pageErrors.length) {
    throw Object.assign(
      new Error(`Uncaught page errors: ${pageErrors.join('; ')}`),
      { exitCode: 1 }
    )
  }
} catch (error) {
  console.error(error?.stack || error)
  process.exitCode = error?.exitCode || 1
} finally {
  await browser?.close().catch((error) => {
    console.error(error)
    process.exitCode ||= 75
  })
}
