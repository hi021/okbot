import { EmbedBuilder } from 'discord.js';
import { db_plr_get, db_plr_set } from '../../db/db.js';
import { formatDoler, formatNumber, getUserFromMsg } from '../../utils.js';

export const name = 'income';
export const alias = ['expenses', 'money'];
export const description = '📉 money states';
export const usage = '<Username OR Mention>';

export async function execute(msg: okbot.Message, args: string[]) {
	const user = (await getUserFromMsg(msg, args)) || msg.author;
	const plrdat = await db_plr_get({
		_id: user.id,
		mon: 1,
		monTot: 1,
		monLv: 1,
		income: 1,
		expense: 1,
		color: 1,
		badge: 1
	});

	const msge = new EmbedBuilder()
		.setAuthor({
			name: user.displayName,
			iconURL: user.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setFooter({ text: 'ok money stats' });

	if (!plrdat?.expense) {
		db_plr_set({
			_id: user.id,
			expense: {}
		});

		msge.setDescription('🕸️ *There are no stats for this user...*');
		return msg.reply({ embeds: [msge] });
	}

	msge.addFields([
		{
			name: 'doler',
			value: `${formatNumber(plrdat.mon ?? 0)} 💵
      ${formatDoler(plrdat.monTot ?? 0, false)} total`
		},
		{
			name: 'income',
			value: `\`fish     \`: ${formatDoler(plrdat.income?.fish ?? 0, false)}
      \`flip     \`: ${formatDoler(plrdat.income?.flip ?? 0, false)}
      \`slots    \`: ${formatDoler(plrdat.income?.slot ?? 0, false)}
      \`jackpot  \`: ${formatDoler(plrdat.income?.jackpot ?? 0, false)}
      \`bingo    \`: ${formatDoler(plrdat.income?.bingo ?? 0, false)}
      \`aquarium \`: ${formatDoler(plrdat.income?.aqua ?? 0, false)}
      \`blackjack\`: ${formatDoler(plrdat.income?.bj ?? 0, false)}
      \`roulette \`: ${formatDoler(plrdat.income?.rl ?? 0, false)}
      \`dice     \`: ${formatDoler(plrdat.income?.dice ?? 0, false)}
      \`poker    \`: ${formatDoler(plrdat.income?.poker ?? 0, false)}
      \`bakery   \`: ${formatDoler(plrdat.income?.bakery ?? 0, false)}
      \`bank     \`: ${formatDoler(plrdat.income?.bank ?? 0, false)}`,
			inline: true
		},
		{
			name: 'expenses',
			value: `\`fish     \`: ${formatDoler(plrdat.expense.fish ?? 0, false)}
      \`flip     \`: ${formatDoler(plrdat.expense.flip ?? 0, false)}
      \`slots    \`: ${formatDoler(plrdat.expense.slot ?? 0, false)}
      \`jackpot  \`: ${formatDoler(plrdat.expense.jackpot ?? 0, false)}
      \`bingo    \`: ${formatDoler(plrdat.expense.bingo ?? 0, false)}
      \`aquarium \`: ${formatDoler(plrdat.expense.aqua ?? 0, false)}
      \`blackjack\`: ${formatDoler(plrdat.expense.bj ?? 0, false)}
      \`roulette \`: ${formatDoler(plrdat.expense.rl ?? 0, false)}
      \`dice     \`: ${formatDoler(plrdat.expense.dice ?? 0, false)}
      \`poker    \`: ${formatDoler(plrdat.expense.poker ?? 0, false)}
      \`bakery   \`: ${formatDoler(plrdat.expense.bakery ?? 0, false)}
		\`bank     \`: ${formatDoler(plrdat.expense?.bank ?? 0, false)}
      \`shop     \`: ${formatDoler(plrdat.expense.shop ?? 0, false)}
      \`pond     \`: ${formatDoler(plrdat.expense.pond ?? 0, false)}`,
			inline: true
		}
	]);

	if (plrdat.color) msge.setColor(plrdat.color);
	if (plrdat.badge) msge.setTitle(plrdat.badge);

	msg.reply({ embeds: [msge] });
}
