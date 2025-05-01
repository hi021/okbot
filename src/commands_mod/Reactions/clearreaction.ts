import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } from 'discord.js';
import { db_guild_clear_reactions } from '../../db/guild.js';
import { bot } from '../../okbot.js';
import { SET } from '../../settings.js';
import { createSimpleMessage, sendEphemeralReply, sendSimpleMessage } from '../../utils.js';
import { Guilds } from '../../volatile.js';

export const name = 'clearreaction';
export const alias = ['cr'];
export const description = 'just delete all reactions';
export const usage = '<"Global">';
export const restrict = 'GUILD_ADMIN';

bot.on('interactionCreate', async interaction => {
	if (interaction.isButton() && interaction.guild) {
		const split = interaction.customId.split('-');
		if (split[0] !== 'clear_reaction') return;

		const action = split[1];
		const guildId = split[2];
		const usrId = split[3];

		if (interaction.user.id !== usrId)
			return sendEphemeralReply(interaction, "I'm asking someone else, sorry...");

		if (action === 'confirm') {
			await db_guild_clear_reactions(guildId);
			const msge = createSimpleMessage(
				`Removed all ${guildId === '_GLOBAL' ? 'global' : 'guild'} reactions.`,
				Colors.DarkGreen
			);
			interaction.message.edit({ components: [] });
			interaction.reply({ embeds: [msge] });
			return;
		} else if (action === 'cancel') {
			// TODO?: maybe delete the message instead..?
			interaction.update({ components: [] });
			return;
		}
	}
});

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild()) return;

	let guildId = msg.guild.id;
	const arg0 = args.shift()?.toLowerCase();
	if (arg0 === 'g' || arg0 === 'global') {
		if (!SET.BOT_ADMIN?.includes(msg.author.id))
			return msg.reply('You do not have the required permissions to use this command (BOT_ADMIN).');
		guildId = '_GLOBAL';
	}

	const reactions = Guilds[guildId]?.cr;
	const numReactions = Object.keys(reactions || {}).length;
	if (!numReactions)
		return sendSimpleMessage(
			msg,
			'🕸️ One step ahead! No custom reactions in this guild.',
			Colors.DarkOrange,
			false
		);

	const msge = createSimpleMessage(
		`Are you sure you wish to delete **${numReactions}** ${guildId === '_GLOBAL' ? 'global' : 'guild'} reactions?`,
		Colors.White
	);
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`clear_reaction-confirm-${guildId}-${msg.author.id}`)
			.setStyle(ButtonStyle.Success)
			.setLabel('Confirm'),
		new ButtonBuilder()
			.setCustomId(`clear_reaction-cancel-${guildId}-${msg.author.id}`)
			.setStyle(ButtonStyle.Danger)
			.setLabel('Cancel')
	);

	return msg.reply({ embeds: [msge], components: [row] });
}
