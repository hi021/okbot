import { Colors, EmbedBuilder } from 'discord.js';
import { db_plr_get } from '../../db/db.js';
import { db_store_get_category, db_store_get_item } from '../../db/store.js';
import { formatNumber, getUserFromMsg, sendSimpleMessage, storeCategoryToId } from '../../utils.js';

export const name = 'inventory';
export const alias = ['inv'];
export const description = "📦 View items you've purchased";
export const usage = '<Username OR Mention> <Category (spaces replaced with _)>';

export async function execute(msg: okbot.Message, args: string[]) {
	let usr;
	let cat;
	if (args.length) {
		const catResult = await db_store_get_category(new RegExp(args[args.length - 1].replace(/_/g, ' '), 'i'));

		if (catResult?.length) {
			cat = catResult[0].cat;
			if (args.length > 1) usr = await getUserFromMsg(msg, args);
		} else {
			usr = await getUserFromMsg(msg, args);
		}
	}

	if (!usr) usr = msg.author;
	const plrdat = await db_plr_get({ _id: usr.id, itms: 1 });
	if (!plrdat?.itms) return sendSimpleMessage(msg, `\`${usr.displayName}\` has no items in inventory.`);

	const idPrefix = cat ? storeCategoryToId(cat) : '';
	const promises = [];
	const items: { [category: string]: Array<okbot.Item & { am: number }> } = {};
	for (const i in plrdat.itms) {
		if (i.startsWith(idPrefix) && plrdat.itms[i]) {
			promises.push(
				new Promise(async (resolve, reject) => {
					const itm = await db_store_get_item({ id: i });
					if (!itm) return reject();

					if (!items[itm.cat]) items[itm.cat] = [];
					items[itm.cat].push({ ...itm, am: plrdat!.itms![i] });
					resolve(1);
				})
			);
		}
	}

	await Promise.allSettled(promises);
	let total = 0,
		value = 0;
	const fields = [];

	for (const i in items) {
		let s = '';
		for (const j of items[i]) {
			total += j.am;
			value += j.am * j.price;
			s += `${j.emoji ? j.emoji + ' ' : ''}\`${j.nam}\` x**${j.am}**\n`;
		}
		fields.push({ name: cat ? '\u200b' : i, value: s });
	}
	if (total <= 0)
		return sendSimpleMessage(msg, `\`${usr.displayName}\` has no \`${cat}\` items in inventory.`);

	const msge = new EmbedBuilder()
		.setAuthor({
			name: `${usr.displayName}'s ${cat ? cat + ' ' : ''}clutter (${total})`,
			iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.addFields(fields)
		.addFields({ name: 'Total value', value: `${formatNumber(value)} 💵` })
		.setColor(Colors.White)
		.setFooter({ text: 'Page 1' });
	return msg.reply({ embeds: [msge] });
}
