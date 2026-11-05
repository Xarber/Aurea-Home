// SPDX-License-Identifier: AGPL-3.0-only
import { test, expect } from "@playwright/test";
const nav = (page: import("@playwright/test").Page, id: string) =>
  page.locator(`[data-nav="${id}"]`);
test("developer ideas persist, preserve import conflicts and export portable records", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await nav(page, "dock:inputs").waitFor();
  await page.keyboard.press("c");
  await nav(page, "panel-TV settings").click();
  for (let i = 0; i < 3; i++) await nav(page, "panel-Version 2.1.1").click();
  await nav(page, "panel-Developer options").click();
  await nav(page, "panel-Ideas").click();
  await nav(page, "ideas-new").click();
  await page.getByTestId("ideas-title").fill("Keyboard source labels");
  await page
    .getByTestId("ideas-description")
    .fill("Keep the customized input name");
  await nav(page, "ideas-save").click();
  await expect(
    page.getByText("Keyboard source labels", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("ideas.png") });
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("aurea.developer.ideas.v1")!),
  );
  expect(stored.ideas).toHaveLength(1);
  const downloadPromise = page.waitForEvent("download");
  await nav(page, "ideas-export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("aurea-ideas.json");
  const chooser = page.waitForEvent("filechooser");
  await nav(page, "ideas-import").click();
  const file = await chooser;
  stored.ideas[0].title = "Incoming source name";
  await file.setFiles({
    name: "ideas.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(stored)),
  });
  await expect(page.getByText("Review import", { exact: true })).toBeVisible();
  await nav(page, "ideas-import-confirm").click();
  await expect(
    page.getByText("Keyboard source labels", { exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("aurea.developer.ideas.v1")!).ideas[0]
          .title,
    ),
  ).toBe("Keyboard source labels");
});
