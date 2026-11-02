import { expect, test, type Page } from "@playwright/test";

// Unique titles per run, because the store is shared across tests.
const suffix = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function createTask(page: Page, title: string, description = "") {
  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(title);
  if (description) await page.getByLabel(/Description/).fill(description);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("SSR and security headers", () => {
  test("the list is present in the initial HTML", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain("Explore the challenge");
  });

  test("responses include security headers", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

test.describe("tRPC API", () => {
  test("rejects creation with an unexpected field (mass assignment)", async ({ request }) => {
    const response = await request.post("/api/trpc/tasks.create", {
      data: { json: { title: "ok", id: "00000000-0000-4000-8000-000000000000" } },
    });
    expect(response.status()).toBe(400);
  });

  test("rejects a malicious ID in get", async ({ request }) => {
    const response = await request.get(`/api/trpc/tasks.get?input=${encodeURIComponent('{"json":{"id":"x"}}')}`);
    expect(response.status()).toBe(400);
  });

  test("does not accept mutations over GET", async ({ request }) => {
    const response = await request.get(
      `/api/trpc/tasks.create?input=${encodeURIComponent('{"json":{"title":"via get"}}')}`,
    );
    expect(response.status()).toBe(405);
  });
});

test.describe("task flows", () => {
  test("creates a task and shows it in the list", async ({ page }) => {
    const title = `Created ${suffix()}`;
    await createTask(page, title, "Test description");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Task created")).toBeVisible();
  });

  test("validation blocks submitting an empty title", async ({ page }) => {
    await page.goto("/tasks/new");
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByText("Title is required")).toBeVisible();
    await expect(page).toHaveURL("/tasks/new");
  });

  test("edits a task title", async ({ page }) => {
    const original = `Edit ${suffix()}`;
    await createTask(page, original);
    await page.getByRole("link", { name: `Edit "${original}"` }).click();
    await page.getByLabel("Title").fill(`${original} (edited)`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: `${original} (edited)` })).toBeVisible();
  });

  test("requires confirmation before deleting", async ({ page }) => {
    const title = `Delete ${suffix()}`;
    await createTask(page, title);
    await page.getByRole("button", { name: `Delete "${title}"` }).click();
    await expect(page.getByText("Delete?")).toBeVisible();

    await page.getByRole("button", { name: "No", exact: true }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByRole("button", { name: `Delete "${title}"` }).click();
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(page.getByText("Task deleted")).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  });

  test("marks a task as completed and filters by status", async ({ page }) => {
    const title = `Complete ${suffix()}`;
    await createTask(page, title);
    await page.getByLabel(`Mark "${title}" as completed`).check();
    await expect(page.getByLabel(`Mark "${title}" as completed`)).toBeChecked();

    await page.getByRole("radio", { name: "Completed" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByRole("radio", { name: "Pending" }).click();
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  });

  test("search filters the list by term", async ({ page }) => {
    const term = `unique-${suffix()}`;
    await createTask(page, `Target ${term}`);
    await createTask(page, `Other ${suffix()}`);
    await page.goto("/");
    await page.getByLabel("Search tasks").fill(term);
    await expect(page.getByRole("heading", { name: `Target ${term}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Other/ })).toHaveCount(0);
  });

  test("sorting by date reverses the order of the list", async ({ page }) => {
    const term = `sort-${suffix()}`;
    const older = `${term} older`;
    const newer = `${term} newer`;
    await createTask(page, older);
    await createTask(page, newer);
    await page.goto("/");
    await page.getByLabel("Search tasks").fill(term);

    const titles = () => page.locator("ul > li h3").allTextContents();
    await expect(page.getByRole("heading", { name: newer })).toBeVisible();
    expect((await titles()).indexOf(newer)).toBeLessThan((await titles()).indexOf(older));

    await page.getByLabel("Sort by creation date").selectOption("oldest");
    await expect
      .poll(async () => {
        const list = await titles();
        return list.indexOf(older) >= 0 && list.indexOf(older) < list.indexOf(newer);
      })
      .toBe(true);
  });

  test("HTML in a title is rendered as text and never executed", async ({ page }) => {
    let dialogShown = false;
    page.on("dialog", (dialog) => {
      dialogShown = true;
      void dialog.dismiss();
    });
    const payload = `<img src=x onerror="alert(1)"><b>bold</b>`;
    await createTask(page, payload);
    await expect(page.getByRole("heading", { name: payload })).toBeVisible();
    expect(dialogShown).toBe(false);
    expect(await page.locator("h3 b").count()).toBe(0);
  });

  test("editing a missing task shows 404", async ({ page }) => {
    const response = await page.goto("/tasks/00000000-0000-4000-8000-000000000000/edit");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Task not found" })).toBeVisible();
  });
});

test.describe("debug menu", () => {
  test("generates the requested number of random tasks", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Debug" }).click();
    await page.getByLabel("Quantity").fill("5");
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await expect(page.getByText("Generated 5 tasks")).toBeVisible();
  });

  test("infinite scroll loads the next page when the list reaches the bottom", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Debug" }).click();
    await page.getByLabel("Quantity").fill("25");
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await expect(page.getByText("Generated 25 tasks")).toBeVisible();

    await page.reload();
    const items = page.locator("ul > li");
    await expect(items).toHaveCount(10);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => items.count()).toBeGreaterThan(10);
  });
});
