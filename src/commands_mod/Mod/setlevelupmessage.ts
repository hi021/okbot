import { Colors } from 'discord.js';
import { db_guild_set } from '../../db/guild.js';
import { sendSimpleMessage } from '../../utils.js';
import { Guilds } from '../../volatile.js';

export const name = 'setlevelupmessage';
export const alias = ['setlvlup', 'lvl'];
export const description = 'Toggle the visibility of level up messages for this guild';
export const usage = '<"True" (visible) OR "False" (invisible)>';
export const restrict = 'GUILD_ADMIN';

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild())
		return sendSimpleMessage(
			msg,
			'Use this command in the guild you wish to toggle level up messages for.',
			Colors.DarkOrange
		);

	const guildId = msg.guild.id;
	const givenValue = args[0]?.toLowerCase();
	let newValue;

	if (givenValue === 'true') {
		newValue = true;
	} else if (givenValue === 'false') {
		newValue = false;
	} else {
		newValue = Guilds[guildId]?.lvl === false;
	}

	await db_guild_set({ _id: guildId, lvl: newValue });
	Guilds[guildId] = { ...Guilds[guildId], lvl: newValue };

	sendSimpleMessage(
		msg,
		`Level up messages are now \`${newValue ? 'visible' : 'invisible'}\` in this guild.`,
		Colors.DarkGreen
	);
}
