import { ActivityType, Colors } from "discord.js";
import { SET } from "../../settings.js";
import { sendSimpleMessage } from "../../utils.js";

export const name = "setstatus";
export const alias = ["statusset", "activity"];
export const description = "Set status text";
export const usage = "<Activity type (number 0 - 5, default is 4)> <Activity name (status text)>";
export const restrict = "BOT_ADMIN";

export function execute(msg: okbot.Message, args: string[]) {
	try {
		if (args.length < 2) {
			msg.client.user.setActivity({ name: SET.STATUS_TEXT ?? "", type: ActivityType.Custom });
			return sendSimpleMessage(msg, "Reset activity.", Colors.DarkGreen);
		}

		const type = Number(args.shift());
		if (!(type in ActivityType))
			return sendSimpleMessage(msg, "Invalid activity type!\nShould be a number between **0** and **5**.");
		const name = args.join(" ");

		msg.client.user.setActivity({ name, type });
		return sendSimpleMessage(msg, `Set activity to \`${name}\`.`, Colors.DarkGreen);
	} catch (e) {
		return sendSimpleMessage(msg, "Error:\n```" + e + "```");
	}
}
