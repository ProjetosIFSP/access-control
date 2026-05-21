import { db } from "../src/db";
import { accessCredential } from "../src/db/schema/access";
import { user } from "../src/db/schema/auth";

async function main() {
  const creds = await db.select().from(accessCredential);
  console.log("Credentials in DB:");
  for (const c of creds) {
    console.log(`- ID: ${c.id}, User: ${c.userId}, Finger: ${c.finger}, Active: ${c.isActive}`);
  }
  process.exit(0);
}
main().catch(console.error);
