import { Colors, EmbedBuilder } from 'discord.js';
import { bot } from '../../okbot.js';
import { db_guild_add_reaction } from '../../db/guild.js';
import { SET } from '../../settings.js';
import { getGuildPrefix, parseReaction, sendSimpleMessage } from '../../utils.js';

export const name = 'addglobalreaction';
export const alias = ['agr'];
export const description = 'just add it but _GLOBAL';
export const usage = '[Reaction message]||<Response message>';
export const restrict = 'BOT_ADMIN';

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild() || args.length < 2) return;
	const { reaction, response } = parseReaction(args);
	if (!reaction || !response) return;

	if (
		reaction.startsWith(getGuildPrefix(msg.guildId)) ||
		reaction.startsWith(SET.PREFIX_MOD) ||
		reaction == `<@${bot.user!.id}>`
	)
		return sendSimpleMessage(msg, "Reactions mustn't begin with the bot's prefix.");

	if (await db_guild_add_reaction(reaction, response, '_GLOBAL'))
		msg.reply({
			embeds: [
				new EmbedBuilder()
					.setColor(Colors.DarkGreen)
					.setTitle('Added global reaction')
					.addFields(
						{ name: 'Message', value: reaction.length > 1024 ? '`<Too long to display>`' : reaction },
						{ name: 'Response', value: response.length > 1024 ? '`<Too long to display>`' : response }
					)
			],
			allowedMentions: {
				repliedUser: false
			}
		});
}
