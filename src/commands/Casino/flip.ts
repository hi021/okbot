import { Colors, Message } from "discord.js";
import { db_add_casino_top, db_plr_add, db_plr_get } from "../../db/db.js";
import { SET } from "../../settings.js";
import {
	addCasinoStat,
	calcMoneyLevelsGain,
	createSimpleMessage,
	createUserMsgEmbed,
	formatDoler,
	parseNumberSuffix,
	randomInt,
	sendSimpleMessage,
	showCasinoTopWins
} from "../../utils.js";
import { Players_in_collector } from "../../volatile.js";
const BET_RANGES = { def: { min: 0, max: 10000000 }, vip: { min: 0, max: 50000000 } }; // min bet doesn't do anything - allow for no bet rolling
const BIG_BET_PERCENT = 0.45; // need confirmation from user if bet amount is at least this fraction of user's money

async function runFlip(
	msg: okbot.Message,
	odds: number,
	bet: number,
	plrdat: { monLv?: number; monTot?: number }
) {
	const res = randomInt(1, 100);
	let msgR;

	if (res >= odds) {
		const desc = `Rolled a **${res}** and landed within ${odds} and 100!`;
		msgR = createUserMsgEmbed(msg.author, Colors.DarkGreen);

		let win = 0;
		if (bet) {
			win = Math.round(bet * (100 / (100 - odds)) - bet);
			msgR.addFields({ name: `Won ${formatDoler(win, false)}!`, value: desc });

			const addMonLv = calcMoneyLevelsGain(plrdat.monLv ?? 0, (plrdat.monTot ?? 0) + win, msg);
			await db_plr_add({
				_id: msg.author.id,
				mon: win,
				monTot: win,
				monLv: addMonLv,
				income: { flip: win + bet },
				expense: { flip: bet }
			});

			await db_add_casino_top("flip", msg.author.id, msg.author.tag, bet, win + bet);
		} else msgR.setDescription(desc);

		await addCasinoStat(msg.author.id, "flip", "win", bet, win);
	} else {
		const desc = `Rolled a **${res}** which is not within ${odds} and 100.`;
		msgR = createUserMsgEmbed(msg.author, Colors.Red);

		if (bet) {
			await db_plr_add({
				_id: msg.author.id,
				mon: -bet,
				expense: { flip: bet }
			});
			msgR.addFields({ name: `Lost ${formatDoler(bet, false)}!`, value: desc });
		} else msgR.setDescription(desc);

		await addCasinoStat(msg.author.id, "flip", "lose", bet, -bet);
	}
	return msg.reply({ embeds: [msgR] });
}

export const name = "flip";
export const alias = ["bet", "coin"];
export const description = ":coin: Flip a coin and lose";
export const usage = '<Bet amount (0-10M/50M 💵) OR "All" OR "Top"> <Odds (5-95%)>';

export async function execute(msg: okbot.Message, args: string[]) {
	if (Players_in_collector[msg.author.id])
		return sendSimpleMessage(msg, "A different activity requires your attention first!");
	const plrdat = (await db_plr_get({
		_id: msg.author.id,
		mon: 1,
		monLv: 1,
		monTot: 1,
		itms: 1
	})) || { mon: 0, monLv: 0, monTot: 0 };
	const mon = plrdat.mon ?? 0;

	let bet = 0,
		odds = 50;
	if (args.length >= 1) {
		const action = args[0].toLowerCase();
		if (action === "top")
			return msg.reply({
				embeds: [await showCasinoTopWins("flip", false)],
				allowedMentions: { repliedUser: false }
			});

		const MAX_BET = BET_RANGES[plrdat.itms?.BOS0010 ? "vip" : "def"].max;
		if (action === "all") bet = Math.min(Math.max(mon, 0), MAX_BET);
		else {
			const betTmp = parseNumberSuffix(args[0]);
			if (betTmp == null || isNaN(betTmp) || betTmp < 0) bet = 0;
			else if (betTmp > MAX_BET) bet = MAX_BET;
			else bet = betTmp;
		}

		if (args.length >= 2) {
			odds = parseInt(args[1]);
			if (isNaN(odds) || odds < 5 || odds > 95) odds = 50;
			else odds = 100 - odds;
		}
	}

	if (bet > mon) return sendSimpleMessage(msg, `You only have ${formatDoler(mon)}.`);

	const betPercent = bet / mon;
	if (betPercent >= BIG_BET_PERCENT) {
		msg.reply({
			embeds: [
				createSimpleMessage(
					`That is a huge large bet of ${formatDoler(bet)} 😱!\n\n*Type (y)es or (n)o*.`,
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

		collector.on("collect", async m => {
			const mc = m.content.toLowerCase();
			if (mc === "n" || mc === "no" || mc === "cancel") {
				collector.stop();
			} else if (mc === "y" || mc === "yes" || mc === "ok") {
				collector.stop("confirm");
				// avoid going into the negative in case user spent money before confirming the bet
				const plrdat_2 = await db_plr_get({ _id: msg.author.id, mon: 1 });
				const mon = plrdat_2?.mon ?? 0;
				plrdat.mon = mon;
				if (bet > mon) bet = Math.max(mon, 0);

				runFlip(msg, odds, bet, plrdat);
			}
		});

		collector.on("end", (_collected, reason) => {
			delete Players_in_collector[msg.author.id];
			if (reason !== "confirm") {
				msg.reply("Canceled your bet.");
				return;
			}
		});
	} else {
		// no need to confirm bet
		runFlip(msg, odds, bet, plrdat);
	}
}
