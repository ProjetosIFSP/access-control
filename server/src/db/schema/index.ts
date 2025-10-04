import * as access from "./access";
import * as auth from "./auth";
import * as door from "./door";
import * as enums from "./enums";
import * as room from "./room";

export const schema = {
	...enums,
	...auth,
	...door,
	...room,
	...access,
};
