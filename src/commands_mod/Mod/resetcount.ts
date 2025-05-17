import { sendSimpleMessage } from "../../utils.js";
import { db_ok_prune } from "../../db/db.js";
import { Colors } from "discord.js";

export const name = "resetcount";
export const description =
	"You monster... Beware for there is no confirmation or undo button. Deletes all saved okays";
export const restrict = "BOT_OWNER";

export async function execute(msg: okbot.Message, args: string[]) {
	const arg1 = args[0]?.toLowerCase();
	const guild = arg1 == "global" || arg1 == "g" ? "_GLOBAL" : msg.guildId;
	if (!guild) return;

	await db_ok_prune(guild);
	sendSimpleMessage(msg, "What have you done...", Colors.DarkOrange);
}
