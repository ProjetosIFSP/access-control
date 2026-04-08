import { hashPassword, verifyPassword } from "better-auth/crypto"
async function test() {
  const h = await hashPassword("123");
  console.log("h", h);
  const ok = await verifyPassword({ hash: h, password: "123" });
  console.log("ok", ok);
}
test();
