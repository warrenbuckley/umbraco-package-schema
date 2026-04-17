import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Umbraco Package Schema Worker", () => {
	it("returns 404 with usage hint for unknown path", async () => {
		const response = await SELF.fetch("http://example.com/something-else");
		expect(response.status).toBe(404);
		const text = await response.text();
		expect(text).toContain("/umbraco-package/");
	});

	it("returns 400 for invalid version format", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/notaversion");
		expect(response.status).toBe(400);
	});

	it("returns 404 for pre-v14 version with helpful message", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/13.5.0");
		expect(response.status).toBe(404);
		const text = await response.text();
		expect(text).toContain("v14.0.0");
	});

	it("returns schema for a specific version using new root path (v17.2+)", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/17.2.2");
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/schema+json");
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("returns schema for an older version using dist-cms fallback path (v14-v17.1)", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/17.0.0");
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/schema+json");
	});

	it("returns schema for latest", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/latest");
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/schema+json");
	});

	it("returns schema for v17/latest (major version resolution)", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/v17/latest");
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/schema+json");
	});

	it("response body is valid parseable JSON", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/17.2.2");
		const body = await response.json() as Record<string, unknown>;
		expect(body).toBeTruthy();
		expect(typeof body).toBe("object");
	});

	it("returns 404 for a non-existent major version", async () => {
		const response = await SELF.fetch("http://example.com/umbraco-package/v999/latest");
		expect(response.status).toBe(404);
	});
});
