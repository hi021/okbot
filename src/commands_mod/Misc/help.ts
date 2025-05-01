import { Colors, EmbedBuilder } from 'discord.js';
import { SET } from '../../settings.js';
import { sendSimpleMessage } from '../../utils.js';

export const name = 'help';
export const alias = ['commands'];
export const description = 'he needs some milk but moderation';
export const usage = '<Command Name>';
export const hidden = true;

export function displayAllCommands(
	commandType: 'commands' | 'commands_mod',
	prefix: string,
	msg: okbot.Message
) {
	const bot = msg.client as okbot.Client<true>;

	const msge = new EmbedBuilder()
		.setColor(Colors.LightGrey)
		.setTitle('ok mod commands')
		.setDescription(`Use \`${prefix}${name} <command name>\` to view command details.`)
		.setFooter({
			text: `okbot ${SET.BOT_VER} ● shout @hiihailey if I break something`,
			iconURL: bot.user!.displayAvatarURL({ size: 32 })
		});

	const cmds: { [category: string]: okbot.Command[] } = {};
	for (const [_, cmd] of bot[commandType]) {
		if (!cmd.hidden) cmds[cmd.category] = [...(cmds[cmd.category] ?? []), cmd];
	}

	for (const category in cmds) {
		let cmdString = '';
		for (const name in cmds[category]) {
			const cmd = cmds[category][name];
			cmdString += `\`${cmd.name}\`${cmd.description ? ' - ' + cmd.description : ''}\n`;
		}

		msge.addFields({ name: category, value: cmdString });
	}

	msg.channel.send({ embeds: [msge] });
}

export function buildCommandEmbed(prefix: string, cmd: okbot.Command, avatarUrl?: string) {
	const msge = new EmbedBuilder()
		.setColor(Colors.LightGrey)
		.setTitle(cmd.name)
		.setFooter({
			text: 'okbot ' + SET.BOT_VER,
			iconURL: avatarUrl
		});

	if (cmd.category) msge.setAuthor({ name: cmd.category });
	if (cmd.description) msge.setDescription(cmd.description);
	if (cmd.alias) msge.addFields({ name: 'Aliases', value: cmd.alias.join(', ') });
	if (cmd.usage || cmd.usageDetail)
		msge.addFields({
			name: 'Usage',
			value: `\`${prefix}${cmd.name} ${cmd.usage}${cmd.usageDetail ? '\n' + cmd.usageDetail : ''}\``
		});
	if (cmd.restrict) msge.addFields({ name: 'Required Permissions', value: cmd.restrict });

	return msge;
}

export function execute(msg: okbot.Message, args: string[]) {
	const prefix = SET.PREFIX_MOD;
	const commandType = 'commands_mod';
	if (!args.length) return displayAllCommands(commandType, prefix, msg);

	const bot = msg.client as okbot.Client<true>;
	const cmdName = args.join(' ').toLowerCase();
	const cmd = bot[commandType].get(cmdName) || bot[commandType].find(c => c.alias?.includes(cmdName));

	if (!cmd)
		return sendSimpleMessage<okbot.Message>(
			msg,
			`\`${cmdName}\` is not a valid command.\nUse \`${prefix + name}\` to view a list of all commands.`
		);

	msg.channel.send({ embeds: [buildCommandEmbed(prefix, cmd, bot.user!.displayAvatarURL({ size: 32 }))] });
}
