import { Colors } from "discord.js";
import { db_plr_add, db_plr_get } from "../../db/db.js";
import { formatDoler, getUserFromMsg, sendSimpleMessage } from "../../utils.js";

export const name = "addmoney";
export const description = "steal their money +";
export const restrict = "BOT_OWNER";

export async function execute(msg: okbot.Message, args: string[]) {
	if (args.length < 2) return;
	const mon = Number(args.splice(-1));
	if (isNaN(mon) || !mon) return sendSimpleMessage(msg, "Invalid money amount.");

	const usr = await getUserFromMsg(msg, args);
	if (!usr) return sendSimpleMessage(msg, "User not found.");

	const plrdat = await db_plr_get({ _id: usr.id, mon: 1 });
	await db_plr_add({ _id: usr.id, mon });
	return sendSimpleMessage(
		msg,
		`Changed <@${usr.id}>'s money from ${formatDoler(plrdat?.mon ?? 0, false)} to ${formatDoler((plrdat?.mon ?? 0) + mon)}.`,
		Colors.DarkGreen
	);
}
