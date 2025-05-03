import { buildCommandEmbed, displayAllCommands } from "../../commands_mod/Misc/help.js";
import { getGuildPrefix, sendSimpleMessage } from "../../utils.js";

export const name = "help";
export const alias = ["commands"];
export const description = "he needs some milk";
export const usage = "<Command Name>";
export const hidden = true;

export function execute(msg: okbot.Message, args: string[]) {
	const prefix = getGuildPrefix(msg.guildId);
	const commandType = "commands";
	if (!args.length) return displayAllCommands(commandType, prefix, msg);

	const bot = msg.client as okbot.Client<true>;
	const cmdName = args.join(" ").toLowerCase();
	const cmd = bot[commandType].get(cmdName) || bot[commandType].find(c => c.alias?.includes(cmdName));

	if (!cmd)
		return sendSimpleMessage<okbot.Message>(
			msg,
			`\`${cmdName}\` is not a valid command.\nUse \`${prefix + name}\` to view a list of all commands.`
		);

	msg.channel.send({ embeds: [buildCommandEmbed(prefix, cmd, bot.user!.displayAvatarURL({ size: 32 }))] });
}
