import { Colors, EmbedBuilder, Message } from "discord.js";
import { db_add_casino_top, db_plr_add, db_plr_get } from "../../db/db.js";
import { SET } from "../../settings.js";
import {
	addCasinoStat,
	calcMoneyLevelsGain,
	createSimpleMessage,
	formatDoler,
	checkAndNotifyIfOnCooldown,
	parseNumberSuffix,
	randomFromArray,
	sendSimpleMessage,
	showCasinoTopWins,
	nowSeconds
} from "../../utils.js";
import { Cooldowns, Players_in_collector } from "../../volatile.js";

type SlotWinningsTable = { [element: string]: { pay2: number; pay3: number } };
export const slot_pay: SlotWinningsTable = {
	"<:adam:1007621226379886652>": { pay2: 100, pay3: 1000 },
	"💎": { pay2: 50, pay3: 333 }, // great
	"7️⃣": { pay2: 25, pay3: 150 },
	"⚜️": { pay2: 15, pay3: 100 },
	"💰": { pay2: 15, pay3: 75 },
	"🪙": { pay2: 15, pay3: 50 },
	"⭐": { pay2: 15, pay3: 40 }, // good
	"🔱": { pay2: 10, pay3: 30 },
	"🇱🇻": { pay2: 5, pay3: 20 },
	"🍒": { pay2: 5, pay3: 15 },
	"🍊": { pay2: 5, pay3: 10 },
	"🍑": { pay2: 2, pay3: 5 }, // bad
	"🐟": { pay2: 1, pay3: 3 },
	"🥔": { pay2: 1, pay3: 2 },
	"🧀": { pay2: 0, pay3: 1 },
	"🆓": { pay2: 0, pay3: 1 }
};

export const name = "slot";
export const alias = ["slut"];
export const description = "🎰 Spinny numbers to distract from your debt";
export const usage = '<Bet amount (5-1M/3M 💵) OR "All" OR "Top">';

const BET_RANGES = { def: { min: 5, max: 1000000 }, vip: { min: 10, max: 3000000 } } as const;
const BIG_BET_PERCENT = 0.35; // need confirmation if bet amount is at least this fraction of user's money

const separator = "--------------";

const jackpot = "<:adam:1007621226379886652>" as const;
const great = ["🪙", "💰", "⚜️", "7️⃣", "💎"] as const;
const good = ["🍊", "🍒", "🇱🇻", "🔱", "⭐"] as const;
const bad = ["🆓", "🧀", "🥔", "🐟", "🍑"] as const;

export function oneElement() {
	const rand = Math.random();
	if (rand < 0.522) return randomFromArray(bad);
	if (rand < 0.8975) return randomFromArray(good);
	if (rand < 0.981) return randomFromArray(great);
	return jackpot;
}

function runSlot(msg: okbot.Message, bet: number) {
	const mainSlotRow = [oneElement(), oneElement(), oneElement()];
	const { element, count } = findMostPrevalentRowElement(mainSlotRow);

	let pay = 0;
	if (count === 2) pay = slot_pay[element].pay2;
	else if (count === 3) pay = slot_pay[element].pay3;
	const winnings = bet * pay;

	const allPossibleElements: SlotWinningsTable = JSON.parse(JSON.stringify(slot_pay));
	delete allPossibleElements[mainSlotRow[0]];
	delete allPossibleElements[mainSlotRow[1]];
	delete allPossibleElements[mainSlotRow[2]];
	const otherPossibleElements = Object.keys(allPossibleElements);

	const topSlotRow = `${randomFromArray(otherPossibleElements)} ${randomFromArray(otherPossibleElements)} ${randomFromArray(otherPossibleElements)}`;
	const bottomSlotRow = `${randomFromArray(otherPossibleElements)} ${randomFromArray(otherPossibleElements)} ${randomFromArray(otherPossibleElements)}`;

	msg.reply({
		embeds: [buildSlotResultEmbed({ mainSlotRow, topSlotRow, bottomSlotRow, bet, pay, winnings, element, count })],
		allowedMentions: { repliedUser: false }
	});

	return { winnings, payoutMulti: pay };
}

export function findMostPrevalentRowElement(slotRow: string[]) {
	let element = slotRow[0];
	let count: 1 | 2 | 3 = 1;

	if (element === slotRow[1]) {
		count = element === slotRow[2] ? 3 : 2;
	} else if (element === slotRow[2]) {
		count = 2;
	} else {
		element = slotRow[1];
		if (element === slotRow[2]) count = 2;
	}

	return { element, count };
}

function buildSlotResultEmbed(params: {
	mainSlotRow: string[];
	topSlotRow: string;
	bottomSlotRow: string;
	bet: number;
	pay: number;
	winnings: number;
	element: string;
	count: number;
}) {
	const msge = new EmbedBuilder()
		.setDescription(
			`${separator}\n${params.topSlotRow}\n\n${params.mainSlotRow[0]} ${params.mainSlotRow[1]} ${params.mainSlotRow[2]} **<**\n\n${params.bottomSlotRow}\n${separator}`
		)
		.addFields({ name: `Won ${formatDoler(params.winnings, false)}`, value: `${params.count}x ${params.element}` })
		.setFooter({ text: `bet ${formatDoler(params.bet, false)}` });

	if (params.pay >= 15) msge.setColor(Colors.Gold);
	else if (params.pay >= 3) msge.setColor(Colors.Green);
	else if (params.pay >= 1) msge.setColor(Colors.LightGrey);

	return msge;
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

	const resultName = result.payoutMulti > 1 ? "win" : result.payoutMulti === 1 ? "draw" : "lose";
	addCasinoStat(msg.author.id, "slot", resultName, bet, won, {
		countDraws: true,
		slotIsBigWin: result.payoutMulti >= 10
	});
	db_add_casino_top("slot", msg.author.id, msg.author.tag, bet, won);
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (Players_in_collector[msg.author.id])
		return sendSimpleMessage(msg, "A different activity requires your attention first!");
	if (!args?.length) return sendSimpleMessage(msg, "The usage for this command is\n`" + usage + "`", Colors.White);

	const action = args[0].toLowerCase();
	if (action === "top")
		return msg.reply({
			embeds: [await showCasinoTopWins("slot")],
			allowedMentions: { repliedUser: false }
		});

	if (checkAndNotifyIfOnCooldown("slot", msg.author.id, msg, "before turning the lever again.", false)) return;

	const plrdat = await db_plr_get({
		_id: msg.author.id,
		mon: 1,
		monLv: 1,
		monTot: 1,
		itms: 1
	});
	const mon = plrdat?.mon ?? 0;
	const betRange = plrdat?.itms?.BOS0010 /*high roller card id*/ ? BET_RANGES.vip : BET_RANGES.def;
	const MIN_BET = betRange.min;
	const MAX_BET = betRange.max;
	let bet: number;

	if (action === "all") bet = mon;
	else bet = parseNumberSuffix(args[0]) ?? 0;

	if (bet == null || isNaN(bet) || bet < MIN_BET || bet > MAX_BET)
		return sendSimpleMessage(msg, `Bet amount must be within ${formatDoler(MIN_BET)} and ${formatDoler(MAX_BET)}.`);
	if (bet > mon) return sendSimpleMessage(msg, `You only have ${formatDoler(mon)}.`);

	Cooldowns["slot"][msg.author.id] = nowSeconds();

	const betPercent = bet / mon;
	if (action !== "all" && betPercent >= BIG_BET_PERCENT) {
		msg.reply({
			embeds: [
				createSimpleMessage(
					`That is a huge large bet of ${formatDoler(bet)} 😱!\n\nType (y)es or (n)o.`,
					Colors.DarkOrange,
					"Are you sure?"
				)
			]
		});

		Players_in_collector[msg.author.id] = true;
		const collector = msg.channel.createMessageCollector({
			filter: (m: Message) => m.author.id === msg.author.id,
			time: SET.DEF_COLLECTOR_TIMEOUT || 30000
		});

		collector.on("collect", m => {
			const mc = m.content.toLowerCase();
			if (mc === "n" || mc === "no" || mc === "cancel") {
				collector.stop();
			} else if (mc === "y" || mc === "yes" || mc === "ok") {
				collector.stop("confirm");
				finalizeSlot(msg, bet, plrdat);
			}
		});

		collector.on("end", (_collected, reason) => {
			delete Players_in_collector[msg.author.id];
			if (reason !== "confirm")
				return msg.reply({ content: "Canceled your bet.", allowedMentions: { repliedUser: false } });
		});
	} else {
		finalizeSlot(msg, bet, plrdat);
	}
}
