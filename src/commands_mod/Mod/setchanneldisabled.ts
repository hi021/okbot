import { Colors } from 'discord.js';
import { db_guild_set } from '../../db/guild.js';
import { sendSimpleMessage } from '../../utils.js';
import { Guilds } from '../../volatile.js';

export const name = 'setchanneldisabled';
export const alias = ['channel', 'blacklist'];
export const description = 'Toggle whether bot actions are ignored in the current channel';
export const usage = '<"True" (ignored) OR "False" (enabled)>';
export const restrict = 'GUILD_ADMIN';

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild())
		return sendSimpleMessage(
			msg,
			'Use this command in the channel you wish to toggle blacklist on.',
			Colors.DarkOrange
		);

	const guildId = msg.guild.id;
	const channelId = msg.channel.id;
	const givenValue = args[0]?.toLowerCase();
	let newValue;
	let blacklist = Guilds[guildId]?.blacklist ?? [];
	const isDisabled = blacklist.includes(channelId);

	if (givenValue === 'true') {
		newValue = true;
	} else if (givenValue === 'false') {
		newValue = false;
	} else {
		newValue = !isDisabled;
	}

	if (newValue && !isDisabled) {
		blacklist.push(channelId); // disable
	} else if (!newValue && isDisabled) {
		blacklist = blacklist.filter(a => a !== channelId); // enable
	}

	Guilds[guildId] = { ...Guilds[guildId], blacklist };
	await db_guild_set({ _id: guildId, blacklist });

	sendSimpleMessage(
		msg,
		`Messages in this channel will \`${newValue ? 'be ignored' : 'not be ignored'}\`.\nThis setting does not apply to mod commands.`,
		Colors.DarkGreen
	);
}
