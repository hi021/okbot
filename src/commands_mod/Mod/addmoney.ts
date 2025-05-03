import { Colors, userMention } from "discord.js";
import { db_plr_add, db_plr_get } from "../../db/db.js";
import { formatDoler, getUserFromMsg, parseNumberSuffix, sendSimpleMessage } from "../../utils.js";

export const name = "addmoney";
export const description = "steal their money +";
export const restrict = "BOT_OWNER";

export async function execute(msg: okbot.Message, args: string[]) {
	if (args.length < 2) return;
	const mon = parseNumberSuffix(args[1]);
	if (!mon) return sendSimpleMessage(msg, "Invalid amount.");

	const usr = await getUserFromMsg(msg, args);
	if (!usr) return sendSimpleMessage(msg, "User not found.");

	const plrdat = await db_plr_get({ _id: usr.id, mon: 1 });
	const currentMoney = plrdat?.mon ?? 0;
	await db_plr_add({ _id: usr.id, mon });
	return sendSimpleMessage(
		msg,
		`Changed ${userMention(usr.id)}'s money from ${formatDoler(currentMoney, false)} to ${formatDoler(currentMoney + mon)}.`,
		Colors.DarkGreen
	);
}
