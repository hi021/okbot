import { db_fix_pond } from "../../db/db.js";

export const name = "fixpond";
export const restrict = "BOT_OWNER";
export const hidden = true;

export async function execute(_: okbot.Message, __: string[]) {
	await db_fix_pond();
}
