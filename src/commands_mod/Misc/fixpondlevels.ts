import { PondLevels } from "../../commands/Fish/pond.js";
import { db_fix_pond_levels } from "../../db/db.js";

export const name = "fixpondlevels";
export const restrict = "BOT_OWNER";
export const hidden = true;

export async function execute(_: okbot.Message, __: string[]) {
	await db_fix_pond_levels(PondLevels);
}
