import { EmbedBuilder } from "discord.js";
import { db_plr_get, db_plr_set } from "../../db/db.js";
import { e_blank, formatDoler, formatNumber, getUserFromMsg } from "../../utils.js";

export const name = "casinostats";
export const alias = ["cs", "cstat"];
export const description = ":face_holding_back_tears: casino states";
export const usage = "<Username OR Mention> <Casino game>";
export const usageDetail =
	"Stats tracked since v1.7.0 (Jan 15, 2023)\nList of available casino games:\n- bingo\n- blackjack\n- dice\n- flip\n- jackpot\n- roulette\n- slot";

const gameDetails: { [game in okbot.CasinoGame]: { emoji: string; name: string } } = {
	bingo: { emoji: "🔢", name: "Bingo" },
	bj: { emoji: "♦️", name: "Blackjack" },
	dice: { emoji: "🎲", name: "Dice duel" },
	flip: { emoji: ":coin:", name: "Flip" },
	jackpot: { emoji: "⚜️", name: "Jackpot" },
	rl: { emoji: "🟥", name: "Roulette" },
	slot: { emoji: "🎰", name: "Slots" },
	poker: { emoji: "🃏", name: "Poker" }
};

function showGeneral(
	stat: okbot.CasinoStat,
	msge: EmbedBuilder,
	income?: okbot.UserIncome,
	expense?: okbot.UserExpense
) {
	if (income && expense) {
		const totalIncome =
			(income.bingo ?? 0) +
			(income.bj ?? 0) +
			(income.dice ?? 0) +
			(income.flip ?? 0) +
			(income.jackpot ?? 0) +
			(income.rl ?? 0) +
			(income.slot ?? 0);
		const totalExpense =
			(expense.bingo ?? 0) +
			(expense.bj ?? 0) +
			(expense.dice ?? 0) +
			(expense.flip ?? 0) +
			(expense.jackpot ?? 0) +
			(expense.rl ?? 0) +
			(expense.slot ?? 0);
		msge.setDescription(`Spent ${formatDoler(totalExpense)}
      Gained ${formatDoler(totalIncome)}\n\u200b`);
	}

	let totalPlayed = 0;
	for (const i in stat) {
		const curS = stat[i as okbot.CasinoGame];
		const curD = gameDetails[i as okbot.CasinoGame];

		const played = curS?.am ?? 0;
		if (!played) continue; //should never happen;
		const won = curS?.win ?? 0;
		const rate = Math.round((won / played) * 10000) / 100;

		msge.addFields({
			name: `${curD.emoji} ${curD.name}`,
			value: `⚪ \`${formatNumber(played).padStart(4, " ")}\` played${e_blank}${e_blank}🟢 \`${formatNumber(
				won
			).padStart(4, " ")}\` won (${rate}%)`
		});

		totalPlayed += played;
	}

	return msge.addFields({ name: "\u200b", value: `⚪ **${formatNumber(totalPlayed)}** played in total` });
}

function showDefaultStat(
	game: okbot.CasinoGame,
	stat: okbot.CasinoStat,
	msge: EmbedBuilder,
	income: number,
	expense: number
) {
	if (!stat[game]?.am) return msge.setDescription("There are no stats for this game.");

	const played = stat[game]!.am;
	const won = stat[game]?.win ?? 0;
	const draw = (stat[game] as okbot.CasinoStatDefaultWithDraw)?.draw ?? 0;
	const lost = played - won - draw;
	const rate = Math.round((won / played) * 10000) / 100;
	const highestWin = stat[game]?.highestWin?.v ?? 0;

	const blank = { name: "\u200b", value: "\u200b", inline: true };

	msge.addFields(
		{
			name: `${formatNumber(played)} Game${played === 1 ? "" : "s"} played`,
			value: `**${formatNumber(won)}** wins/${draw ? "**" + formatNumber(draw) + "** draws/" : ""}**${formatNumber(
				lost
			)}** loses (${rate}% win rate)`,
			inline: false
		},
		{ name: "Highest bet", value: formatNumber(stat[game]!.highestBet) + " 💵", inline: true }
	);
	if (highestWin)
		msge.addFields({
			name: "Highest win",
			value: formatNumber(highestWin) + ` 💵 <t:${stat[game]!.highestWin!.date}:R>`,
			inline: true
		});
	else msge.addFields(blank);

	msge.addFields(
		blank,
		{ name: "Spent", value: `${formatNumber(expense)} 💵`, inline: true },
		{ name: "Gained", value: `${formatNumber(income)} 💵`, inline: true },
		blank
	);

	return msge;
}

function showBingo(stat: okbot.CasinoStat, msge: EmbedBuilder, income: number, expense: number) {
	const msgeDef = showDefaultStat("bingo", stat, msge, income, expense);
	return msgeDef;
}

function showBj(stat: okbot.CasinoStat, msge: EmbedBuilder, income: number, expense: number) {
	const msgeDef = showDefaultStat("bj", stat, msge, income, expense);
	if (msgeDef.data.description) return msgeDef; //means there are no stats

	const played = stat.bj!.am;
	const bj = stat.bj!.bj ?? 0;
	const double = stat.bj!.double ?? 0;
	const doubleWin = stat.bj!.doubleWin ?? 0;

	if (double)
		msgeDef.addFields({
			name: "Times doubled",
			value: `${formatNumber(double)} (${formatNumber(doubleWin)} won)`,
			inline: true
		});
	if (bj)
		msgeDef.addFields({
			name: "Times hit blackjack",
			value: `${formatNumber(bj)} (${Math.round((bj / played) * 10000) / 100}%)`,
			inline: true
		});

	return msgeDef;
}

function showDice(stat: okbot.CasinoStat, msge: EmbedBuilder, income: number, expense: number) {
	const msgeDef = showDefaultStat("dice", stat, msge, income, expense);
	if (msgeDef.data.description) return msgeDef; //means there are no stats

	const totalScore = stat.dice?.totalScore ?? 0;
	const am = stat.dice?.am ?? 1;
	msgeDef.addFields({
		name: "Total score",
		value: `${formatNumber(totalScore)} (${Math.round((totalScore / am) * 100) / 100} average)`
	});

	return msgeDef;
}

function showFlip(stat: okbot.CasinoStat, msge: EmbedBuilder, income: number, expense: number) {
	const msgeDef = showDefaultStat("flip", stat, msge, income, expense);
	return msgeDef;
}

function showJackpot(stat: okbot.CasinoStat, msge: EmbedBuilder, income: number, expense: number) {
	const msgeDef = showDefaultStat("jackpot", stat, msge, income, expense);
	return msgeDef;
}

function showRl(stat: okbot.CasinoStat, msge: EmbedBuilder, income: number, expense: number) {
	const msgeDef = showDefaultStat("rl", stat, msge, income, expense);
	if (msgeDef.data.description) return msgeDef; //means there are no stats

	const red = stat.rl?.red ?? 0;
	const redWin = stat.rl?.redWin ?? 0;
	const black = stat.rl?.black ?? 0;
	const blackWin = stat.rl?.blackWin ?? 0;
	const green = stat.rl?.green ?? 0;
	const greenWin = stat.rl?.greenWin ?? 0;

	if (red)
		msgeDef.addFields({
			name: "🟥 Red",
			value: `${formatNumber(red)} (${Math.round((redWin / red) * 10000) / 100}% won)`,
			inline: true
		});
	if (black)
		msgeDef.addFields({
			name: "⬛ Black",
			value: `${formatNumber(black)} (${Math.round((blackWin / black) * 10000) / 100}% won)`,
			inline: true
		});
	if (green)
		msgeDef.addFields({
			name: "🟩 Green",
			value: `${formatNumber(green)} (${Math.round((greenWin / green) * 10000) / 100}% won)`,
			inline: true
		});

	return msgeDef;
}

function showSlot(stat: okbot.CasinoStat, msge: EmbedBuilder, income: number, expense: number) {
	const msgeDef = showDefaultStat("slot", stat, msge, income, expense);
	if (msgeDef.data.description) return msgeDef; //means there are no stats

	const bigWin = stat.slot?.bigWin ?? 0;
	const win = stat.slot?.win ?? 0;
	if (win)
		msgeDef.addFields({
			name: "Big wins (10x+)",
			value: `${formatNumber(bigWin)} (${Math.round((bigWin / win) * 10000) / 100}% of wins)`
		});

	return msgeDef;
}

export async function execute(msg: okbot.Message, args: string[]) {
	let game;
	let user;
	//parse arguments
	if (args.length) {
		const gameTmp = args[args.length - 1].toLowerCase();
		if (
			[
				"bingo",
				"bj",
				"21",
				"blackjack",
				"dice",
				"diceduel",
				"flip",
				"bet",
				"jackpot",
				"rl",
				"roulette",
				"slot"
			].includes(gameTmp)
		) {
			game = gameTmp;
			args.pop();
		}

		if (args.length) user = await getUserFromMsg(msg, args);
	}
	if (!user) user = msg.author;

	const plrdat = await db_plr_get({
		_id: user.id,
		casinoStat: 1,
		income: 1,
		expense: 1,
		color: 1,
		badge: 1
	});

	let statMsg = new EmbedBuilder().setAuthor({
		name: user.displayName,
		iconURL: user.displayAvatarURL({ forceStatic: true, size: 32 })
	});

	if (plrdat === null) db_plr_set({ _id: user.id, mon: 0 });
	if (!plrdat?.casinoStat) {
		statMsg.setDescription("There are no stats for this user.");
		return msg.reply({ embeds: [statMsg] });
	}

	if (plrdat.color) statMsg.setColor(plrdat.color);
	if (plrdat.badge) statMsg.setTitle(plrdat.badge);

	switch (game) {
		case "bingo":
			statMsg = showBingo(plrdat.casinoStat, statMsg, plrdat.income?.bingo ?? 0, plrdat.expense?.bingo ?? 0);
			break;
		case "bj":
		case "21":
		case "blackjack":
			statMsg = showBj(plrdat.casinoStat, statMsg, plrdat.income?.bj ?? 0, plrdat.expense?.bj ?? 0);
			game = "bj";
			break;
		case "dice":
		case "diceduel":
			statMsg = showDice(plrdat.casinoStat, statMsg, plrdat.income?.dice ?? 0, plrdat.expense?.dice ?? 0);
			game = "dice";
			break;
		case "flip":
		case "bet":
			game = "flip";
			statMsg = showFlip(plrdat.casinoStat, statMsg, plrdat.income?.flip ?? 0, plrdat.expense?.flip ?? 0);
			break;
		case "jackpot":
			statMsg = showJackpot(
				plrdat.casinoStat,
				statMsg,
				plrdat.income?.jackpot ?? 0,
				plrdat.expense?.jackpot ?? 0
			);
			break;
		case "rl":
		case "roulette":
			game = "rl";
			statMsg = showRl(plrdat.casinoStat, statMsg, plrdat.income?.rl ?? 0, plrdat.expense?.rl ?? 0);
			break;
		case "slot":
			statMsg = showSlot(plrdat.casinoStat, statMsg, plrdat.income?.slot ?? 0, plrdat.expense?.slot ?? 0);
			break;
		default:
			statMsg = showGeneral(plrdat.casinoStat, statMsg, plrdat.income, plrdat.expense);
			break;
	}

	statMsg.setFooter({
		text: game
			? `${gameDetails[game as okbot.CasinoGame].name} stats`
			: `Use '${name} <game name>' to view detailed stats`
	});
	msg.reply({ embeds: [statMsg] });
}
