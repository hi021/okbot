import { Colors, userMention } from "discord.js";
import { db_plr_set } from "../../db/db.js";
import {
	createSimpleMessage,
	formatDoler,
	getUserFromMsg,
	parseNumberSuffix,
	sendSimpleMessage
} from "../../utils.js";

export const name = "setmoney";
export const alias = ["mon"];
export const description = "steal their money";
export const restrict = "BOT_OWNER";

export async function execute(msg: okbot.Message, args: string[]) {
	if (args.length < 2) return;

	const mon = parseNumberSuffix(args.pop() as string);
	if (mon == null) return sendSimpleMessage(msg, "NaN is not actually a number...");

	const usr = await getUserFromMsg(msg, args);
	if (!usr) return sendSimpleMessage(msg, "User not found.");

	await db_plr_set({ _id: usr.id, mon });
	const msge = createSimpleMessage(
		`Set ${userMention(usr.id)}'s money to ${formatDoler(mon)}.`,
		Colors.DarkGreen
	);
	msg.reply({ embeds: [msge] });
}
