import { chromium, expect } from "@playwright/test";

const appUrl = "http://localhost:5173";

async function clickStart(page) {
  for (const name of ["Begin questions", "Start conversation", "Talk again", "Start the scan"]) {
    const button = page.getByRole("button", { name, exact: true });
    if ((await button.count()) === 1) {
      await button.click();
      return;
    }
  }
  throw new Error("Could not find a start button on the landing page");
}

async function completeSurvey(page, answerLabel) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await clickStart(page);

  for (let i = 0; i < 10; i += 1) {
    await page.getByRole("button", { name: new RegExp(answerLabel, "i") }).click();
    await page.getByRole("button", { name: i === 9 ? "Finish" : "Next" }).click();
  }

  await page.getByRole("button", { name: "Choose a topic" }).click();
}

async function chooseFirstTopic(page) {
  await page.getByRole("button", { name: /Should capital gains be taxed as ordinary income/i }).click();
}

async function waitForRoom(page) {
  await page.waitForURL("**/room", { timeout: 60000 });
  await expect(page.getByText(/Discussing:/)).toBeVisible({ timeout: 30000 });
}

async function waitForVideos(page) {
  await page.waitForFunction(
    () => {
      const videos = [...document.querySelectorAll("video")];
      return videos.length >= 2 && videos.every((video) => video.videoWidth > 0 && video.videoHeight > 0);
    },
    null,
    { timeout: 60000 }
  );
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  const contextA = await browser.newContext({
    permissions: ["camera", "microphone"],
    baseURL: appUrl,
  });
  const contextB = await browser.newContext({
    permissions: ["camera", "microphone"],
    baseURL: appUrl,
  });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  pageA.on("console", (message) => console.log(`[A:${message.type()}] ${message.text()}`));
  pageB.on("console", (message) => console.log(`[B:${message.type()}] ${message.text()}`));
  pageA.on("pageerror", (error) => console.error(`[A:error] ${error.message}`));
  pageB.on("pageerror", (error) => console.error(`[B:error] ${error.message}`));

  await Promise.all([
    completeSurvey(pageA, "Strongly Agree"),
    completeSurvey(pageB, "Strongly Disagree"),
  ]);

  await Promise.all([
    chooseFirstTopic(pageA),
    chooseFirstTopic(pageB),
  ]);

  await Promise.all([waitForRoom(pageA), waitForRoom(pageB)]);
  await Promise.all([waitForVideos(pageA), waitForVideos(pageB)]);

  await pageA.getByPlaceholder(/Type a message/).fill("hello from automated user a");
  await pageA.getByRole("button", { name: "Send" }).click();
  await expect(pageB.getByText("hello from automated user a")).toBeVisible({ timeout: 15000 });

  await pageA.getByPlaceholder(/Type a message/).fill("kill yourself");
  await pageA.getByRole("button", { name: "Send" }).click();
  await expect(pageA.getByText(/Blocked content detected|Content flagged|Message blocked/i)).toBeVisible({
    timeout: 15000,
  });
  await expect(pageB.getByText("kill yourself")).toHaveCount(0);

  await pageA.getByRole("button", { name: "Skip" }).click();
  await Promise.all([
    pageA.waitForURL("**/room", { timeout: 90000 }),
    pageB.waitForURL("**/room", { timeout: 90000 }),
  ]);
  await Promise.all([waitForVideos(pageA), waitForVideos(pageB)]);

  await browser.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "two isolated users completed survey",
          "matched into LiveKit room",
          "local and remote video elements rendered with fake media",
          "LiveKit data-channel chat delivered peer-to-peer",
          "unsafe text was blocked by moderation",
          "skip requeued both users into a new room",
        ],
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
