import { createAuthClient } from "better-auth/client";
const authClient = createAuthClient();
console.log(Object.keys(authClient).filter(k => k.toLowerCase().includes('password')));
