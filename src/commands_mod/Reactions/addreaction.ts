import { Colors, EmbedBuilder, userMention } from "discord.js";
import { db_guild_add_reaction } from "../../db/guild.js";
import { bot } from "../../okbot.js";
import { parseReaction, sendSimpleMessage } from "../../utils.js";

export const name = "addreaction";
export const alias = ["ar"];
export const description = "just add it";
export const usage = "[Reaction message]||<Response message>";
export const restrict = "GUILD_ADMIN";

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild() || args.length < 2) return;
	const { reaction, response } = parseReaction(args);
	if (!reaction || !response) return;

	if (reaction == userMention(bot.user!.id))
		return sendSimpleMessage(msg, "I'm afraid I can't do that.");

	if (await db_guild_add_reaction(reaction, response, msg.guildId))
		msg.reply({
			embeds: [
				new EmbedBuilder()
					.setColor(Colors.DarkGreen)
					.setTitle(`Added guild reaction`)
					.addFields(
						{ name: "Message", value: reaction.length > 1024 ? "`<Too long to display>`" : reaction },
						{ name: "Response", value: response.length > 1024 ? "`<Too long to display>`" : response }
					)
			],
			allowedMentions: {
				repliedUser: false
			}
		});
}
