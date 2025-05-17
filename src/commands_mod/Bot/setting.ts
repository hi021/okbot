import { Colors } from "discord.js";
import { SET } from "../../settings.js";
import { createSimpleMessage } from "../../utils.js";

export const name = "setting";
export const alias = ["set"];
export const description = "set given variable";
export const usage =
	"<Setting name> [Flag - use _UNDEF to set undefined value, use _NUM to set numeric value, use _F to set undefined settings] <Setting value, defaults to empty string>";
export const restrict = "BOT_ADMIN";

function settingVal(args: string[]) {
	if (args[0] == "_NUM") return Number(args[1]);
	if (args[0] == "_UNDEF") return undefined;
	if (args[0]) return args.join(" ");

	return "";
}

function displaySettings(msg: okbot.Message) {
	let str = "";
	for (const i in SET) str += `\`${i.toUpperCase()}\`: ${(SET as any)[i]}\n`;

	msg.reply({ embeds: [createSimpleMessage(str, Colors.White, "Current settings")] });
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (!args.length) return displaySettings(msg);

	const setting = args.shift()!.toUpperCase();
	let force = false;
	if (args[0] == "_F") {
		force = true;
		args.shift();
	}

	if (force || (SET as any)[setting]) {
		const target = settingVal(args);
		(SET as any)[setting] = target;

		return msg.reply(`Set \`${setting}\` to \`${target}\``);
	} else {
		return msg.reply(`\`${setting}\` is not a valid setting. Use _F flag to set undefined fields.`);
	}
}
