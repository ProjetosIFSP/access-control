import { expect, test } from "@playwright/test";

test.describe("Permissions API", () => {
	test("POST /permissions/verify retorna negação para sala inexistente", async ({
		request,
	}) => {
		const res = await request.post("/permissions/verify", {
			data: {
				roomId: "00000000-0000-0000-0000-000000000099",
				credentialValue: "missing-credential",
				type: "FINGERPRINT",
			},
		});

		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.granted).toBe(false);
		expect(body.reason).toBe("ROOM_NOT_FOUND");
	});
});
