import { test, expect } from "@playwright/test";

test("RSS 输出 Atom feed", async ({ request }) => {
  const res = await request.get("/feed.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/atom+xml");

  const body = await res.text();
  expect(body).toContain('<?xml version="1.0"');
  expect(body).toContain("<feed");
  expect(body).toContain("<entry>");
});
