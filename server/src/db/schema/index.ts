import * as access from "./access";
import * as auth from "./auth";
import * as door from "./door";
import * as enums from "./enums";
import * as room from "./room";
import * as profile from "./profile";

export const schema = {
	...enums,
	...auth,
	...door,
	...room,
	...access,
	...profile,
};
