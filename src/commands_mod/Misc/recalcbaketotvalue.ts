import { BakeryCookies } from "../../commands/Business/bakery.js";
import { db_recalc_bakery_total_value } from "../../db/db.js";

export const name = "recalcbaketotvalue";
export const restrict = "BOT_OWNER";
export const hidden = true;

export async function execute(msg: okbot.Message, _: string[]) {
	await db_recalc_bakery_total_value(BakeryCookies);
	msg.react("✅");
}
