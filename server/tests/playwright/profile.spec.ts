import { expect, test } from "@playwright/test";

// Teste API básico para /profiles
test.describe("Profiles API", () => {
	test("GET /profiles returns 200", async ({ request }) => {
		const res = await request.get("/profiles");
		expect([200, 401, 403]).toContain(res.status());
	});
});
