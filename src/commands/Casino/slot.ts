import { Colors, EmbedBuilder, Message } from 'discord.js';
import { db_add_casino_top, db_plr_add, db_plr_get } from '../../db/db.js';
import { SET } from '../../settings.js';
import {
	addCasinoStat,
	calcMoneyLevelsGain,
	createSimpleMessage,
	formatDoler,
	isOnCooldown,
	parseNumberSuffix,
	randomFromArray,
	sendSimpleMessage,
	showCasinoTopWins
} from '../../utils.js';
import { Players_in_collector } from '../../volatile.js';

export const slot_pay: { [element: string]: { pay2: number; pay3: number } } = {
	'<:adam:1007621226379886652>': { pay2: 100, pay3: 1000 },
	'💎': { pay2: 50, pay3: 120 }, // great
	':seven:': { pay2: 25, pay3: 75 },
	'⚜️': { pay2: 15, pay3: 75 },
	'💰': { pay2: 15, pay3: 50 },
	':coin:': { pay2: 15, pay3: 30 },
	'⭐': { pay2: 15, pay3: 25 }, // good
	'🔱': { pay2: 10, pay3: 25 },
	':flag_lv:': { pay2: 5, pay3: 20 },
	'🍒': { pay2: 5, pay3: 15 },
	'🍊': { pay2: 5, pay3: 10 },
	'🍑': { pay2: 2, pay3: 5 }, // bad
	'🍪': { pay2: 1, pay3: 3 },
	'🥔': { pay2: 1, pay3: 2 },
	'🧀': { pay2: 0, pay3: 1 },
	'🆓': { pay2: 0, pay3: 1 }
};

export const name = 'slot';
export const alias = ['slut'];
export const description = '🎰 Spinny numbers to distract you from your debt';
export const usage = '<Bet amount (5-1M/3M 💵) OR "All" OR "Top">';

const BET_RANGES = { def: { min: 5, max: 1000000 }, vip: { min: 10, max: 3000000 } };
const BIG_BET_PERCENT = 0.35; // need confirmation if bet amount is at least this fraction of user's money

const separator = '--------------';

// TODO?: prettier emojis
const jackpot = '<:adam:1007621226379886652>';
const great = [':coin:', '💰', '⚜️', ':seven:', '💎'];
const good = ['🍊', '🍒', ':flag_lv:', '🔱', '⭐'];
const bad = ['🆓', '🧀', '🥔', '🍪', '🍑'];

function oneElement() {
	const rand = Math.random() * 10000;
	if (rand < 5300) return randomFromArray(bad);
	if (rand < 8340) return randomFromArray(good);
	if (rand < 9805) return randomFromArray(great);
	return jackpot;
}

function runSlot(msg: okbot.Message, bet: number) {
	const row = [oneElement(), oneElement(), oneElement()];
	let element = row[0]; //most prevalent element
	let num = 1; //how many times it repeats
	if (element === row[1]) {
		num = element === row[2] ? 3 : 2;
	} else if (element === row[2]) {
		num = 2;
	} else {
		element = row[1];
		if (element === row[2]) num = 2;
	}

	let pay = 0;
	if (num >= 2) pay = slot_pay[element][`pay${num}` as 'pay2' | 'pay3'];
	const win = bet * pay;

	let otherPossible: any = JSON.parse(JSON.stringify(slot_pay));
	delete otherPossible[row[0]];
	delete otherPossible[row[1]];
	delete otherPossible[row[2]];
	otherPossible = Object.keys(otherPossible);

	const rowtop = `${randomFromArray(otherPossible)} ${randomFromArray(otherPossible)} ${randomFromArray(otherPossible)}`;
	const rowbot = `${randomFromArray(otherPossible)} ${randomFromArray(otherPossible)} ${randomFromArray(otherPossible)}`;

	const msge = new EmbedBuilder()
		.setDescription(
			`${separator}\n${rowtop}\n\n${row[0]} ${row[1]} ${row[2]} **<**\n\n${rowbot}\n${separator}`
		)
		.addFields({ name: `Won ${formatDoler(win, false)}`, value: `${num}x ${element}` })
		.setFooter({ text: `bet ${formatDoler(bet, false)}` });
	if (pay >= 15) msge.setColor(Colors.Gold);
	else if (pay >= 3) msge.setColor(Colors.Green);
	else if (pay >= 1) msge.setColor(Colors.LightGrey);

	msg.reply({
		embeds: [msge],
		allowedMentions: {
			repliedUser: false
		}
	});

	return { winnings: win, payoutMulti: pay };
}

function finalizeSlot(msg: okbot.Message, bet: number, plrdat: any) {
	const result = runSlot(msg, bet);
	const won = result.winnings;
	const net = won - bet;
	const addTot = net > 0 ? net : 0;

	db_plr_add({
		_id: msg.author.id,
		mon: net,
		monTot: addTot,
		monLv: calcMoneyLevelsGain(plrdat.monLv || 1, plrdat.monTot + addTot || addTot, msg),
		income: { slot: won },
		expense: { slot: bet }
	});

	const resultName = result.payoutMulti > 1 ? 'win' : result.payoutMulti === 1 ? 'draw' : 'lose';
	addCasinoStat(msg.author.id, 'slot', resultName, bet, won, {
		countDraws: true,
		slotIsBigWin: result.payoutMulti >= 10
	});
	db_add_casino_top('slot', msg.author.id, msg.author.tag, bet, won);
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (Players_in_collector[msg.author.id])
		return sendSimpleMessage(msg, 'A different activity requires your attention first!');
	if (isOnCooldown('slot', msg.author.id, msg, 'before gambling again.')) return;
	if (!args?.length)
		return sendSimpleMessage(msg, 'The usage for this command is\n`' + usage + '`', Colors.White);

	const action = args[0].toLowerCase();
	if (action === 'top')
		return msg.reply({
			embeds: [await showCasinoTopWins('slot')],
			allowedMentions: { repliedUser: false }
		});

	// run slot
	const plrdat = await db_plr_get({
		_id: msg.author.id,
		mon: 1,
		monLv: 1,
		monTot: 1,
		itms: 1
	});
	const mon = plrdat?.mon ?? 0;
	const MIN_BET = BET_RANGES[plrdat?.itms?.BOS0010 ? 'vip' : 'def'].min;
	const MAX_BET = BET_RANGES[plrdat?.itms?.BOS0010 ? 'vip' : 'def'].max;
	let bet: number;

	if (action === 'all') bet = mon;
	else bet = parseNumberSuffix(args[0]) ?? 0;

	if (bet == null || isNaN(bet) || bet < MIN_BET) bet = MIN_BET;
	else if (bet > MAX_BET) bet = MAX_BET;
	if (bet > mon) return sendSimpleMessage(msg, `You only have ${formatDoler(mon)}.`);

	const betPercent = bet / mon;
	if (action !== 'all' && betPercent >= BIG_BET_PERCENT) {
		msg.reply({
			embeds: [
				createSimpleMessage(
					`That is a huge large bet of ${formatDoler(bet)} 😱!\n\nType (y)es or (n)o.`,
					Colors.DarkOrange,
					'Are you sure?'
				)
			]
		});

		Players_in_collector[msg.author.id] = true;
		const collector = msg.channel.createMessageCollector({
			filter: (m: Message) => m.author.id === msg.author.id,
			time: SET.DEF_COLLECTOR_TIMEOUT || 30000
		});

		collector.on('collect', m => {
			const mc = m.content.toLowerCase();
			if (mc === 'n' || mc === 'no' || mc === 'cancel') {
				collector.stop();
			} else if (mc === 'y' || mc === 'yes' || mc === 'ok') {
				collector.stop('confirm');
				finalizeSlot(msg, bet, plrdat);
			}
		});

		collector.on('end', (_collected, reason) => {
			delete Players_in_collector[msg.author.id];
			if (reason !== 'confirm') {
				msg.reply({ content: 'Canceled your bet.', allowedMentions: { repliedUser: false } });
				return;
			}
		});
	} else {
		finalizeSlot(msg, bet, plrdat);
	}
}
