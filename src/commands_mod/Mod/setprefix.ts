import { Colors } from "discord.js";
import { db_guild_set } from "../../db/guild.js";
import { sendSimpleMessage } from "../../utils.js";
import { Guilds } from "../../volatile.js";

export const name = "setprefix";
export const alias = ["prefix"];
export const description = "Set a custom prefix for this guild";
export const restrict = "GUILD_ADMIN";

const MAX_PREFIX_LENGTH = 80;

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild())
		return sendSimpleMessage(
			msg,
			"Use this command in the guild you wish to edit the prefix for.",
			Colors.DarkOrange
		);
	const guildId = msg.guild.id;

	if (!args.length) {
		if (Guilds[guildId]) Guilds[guildId].pre = undefined;
		await db_guild_set({ _id: guildId, pre: undefined });
		return sendSimpleMessage(msg, "Removed this guild's custom prefix.", Colors.DarkGreen);
	}

	const prefix = args.join(" ");
	if (prefix.length > MAX_PREFIX_LENGTH)
		return sendSimpleMessage(
			msg,
			`Why would you wish for a prefix over **${MAX_PREFIX_LENGTH}** characters long...`
		);

	Guilds[guildId] = { ...Guilds[guildId], pre: prefix };
	await db_guild_set({ _id: guildId, pre: prefix });
	return sendSimpleMessage(msg, `Set this guild's prefix to \`${prefix}\`.`, Colors.DarkGreen);
}
