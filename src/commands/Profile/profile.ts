import { EmbedBuilder } from 'discord.js';
import { db_plr_get } from '../../db/db.js';
import { formatNumber, getUserFromMsg } from '../../utils.js';

export const name = 'profile';
export const alias = ['balance'];
export const description = "🕵️‍♀️ view your profile's profile";
export const usage = '<Username OR Mention>';

export async function execute(msg: okbot.Message, args: string[]) {
	const user = args.length ? ((await getUserFromMsg(msg, args)) ?? msg.author) : msg.author;

	const plrdat =
		(await db_plr_get({
			_id: user.id,
			mon: 1,
			rep: { v: 1 },
			color: 1,
			title: 1,
			badge: 1
		})) || {};

	const profileMsg = new EmbedBuilder()
		.setTitle(`${plrdat.badge ? plrdat.badge + ' ' : ''}${user.displayName}`)
		.setThumbnail(user.displayAvatarURL({ size: 128 }))
		.setFooter({ text: 'ok' });

	if (plrdat.mon == null) plrdat.mon = 0;
	const rep = plrdat?.rep?.v ?? 0;

	profileMsg.addFields(
		{ name: 'doler', value: formatNumber(plrdat.mon) + ' 💵 ', inline: true },
		{ name: 'rapes', value: rep + ' o.o ', inline: true }
	);

	if (plrdat.title) profileMsg.setDescription(plrdat.title);
	if (plrdat.color) profileMsg.setColor(plrdat.color as `#${string}`);

	msg.reply({ embeds: [profileMsg] });
}
