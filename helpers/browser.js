const puppeteer = require("puppeteer");

//create instatances for reuse browser
let browserInstance = null;
let pageInstance = null;

//create reusable browser and page
const getBrowserPage = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: "new",
      slowMo: 50,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure",
      ],
    });
  }

  if (!pageInstance) {
    pageInstance = await browserInstance.newPage();

    //use user agent
    await pageInstance.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114 Safari/537.36"
    );

    //block unnecessary contents on loaded page
    await pageInstance.setRequestInterception(true);
    pageInstance.on("request", (req) => {
      const block = ["image", "stylesheet", "font", "media"];
      if (block.includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  return { browser: browserInstance, page: pageInstance };
};

//create function for load protected pages using given session cookie
const fetchPageContentUsingCookie = async (url, cookie) => {
  //open the browser page
  const { page } = await getBrowserPage();

  //define url
  const u = new URL(url);
  const base = `${u.protocol}//${u.hostname}`;

  //load base url to set cookie
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 30000 });

  //set the session cookie in oulms base domain
  await page.setCookie({
    name: "MoodleSession",
    value: cookie,
    domain: u.hostname,
    path: "/",
    httpOnly: true,
    secure: u.protocol === "https:",
  });

  //load the given url
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  console.log("Current URL:", page.url());
  if (page.url().includes("login")) {
    throw new Error("Invalid or expired MoodleSession cookie");
  }

  //wait for courses to load
  await page.waitForSelector("a.coursename", { timeout: 20000 });

  //get the HTML content from loaded url and return
  return await page.content();
};

//create funtion to close browser
const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    pageInstance = null;
  }
};

module.exports = { getBrowserPage, fetchPageContentUsingCookie, closeBrowser };
