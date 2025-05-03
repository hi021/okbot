import { Colors } from "discord.js";
import { createSimpleMessage, getUserFromMsg } from "../../utils.js";

export const name = "id";
export const alias = ["user"];
export const description = "ℹ️ Steal somebody's social security number";
export const usage = "<Username OR Mention>";

export async function execute(msg: okbot.Message, args: string[]) {
	const usr = (await getUserFromMsg(msg, args)) ?? msg.author;

	const msge = createSimpleMessage(`<@${usr.id}>'s id is **${usr.id}**`, Colors.White);
	return msg.reply({ content: "> " + usr.id, embeds: [msge], allowedMentions: { repliedUser: false } });
}
