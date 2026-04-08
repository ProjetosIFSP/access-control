import { db } from "./src/db/index.ts";
async function test() {
  const accs = await db.query.account.findMany({ limit: 1 });
  console.log(accs);
}
test();
