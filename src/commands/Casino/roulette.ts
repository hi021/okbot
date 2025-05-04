import { Colors, EmbedBuilder, User } from "discord.js";
import { db_add_casino_top, db_plr_add, db_plr_get } from "../../db/db.js";
import {
	addCasinoStat,
	calcMoneyLevelsGain,
	e_blank,
	formatDoler,
	parseNumberSuffix,
	randomInt,
	sendSimpleMessage,
	showCasinoTopWins
} from "../../utils.js";

export const name = "roulette";
export const alias = ["rl"];
export const description = "🟥 Makes you wish you played the russian kind instead";
export const usage = '[Bet color (red, black, or green) OR "Top"] [Bet amount (10-10M/50M 💵 OR "All")]';
export const usageDetail =
	"Winning on a red or black field multiplies your bet 2-fold, green multiplies it 14-fold.";

type BetArguments = { bet: number };

const BET_RANGES = { def: { min: 10, max: 10000000 }, vip: { min: 25000, max: 50000000 } };
const rouletteWheel = [
	"🟥",
	"⬛",
	"🟥",
	"⬛",
	"🟥",
	"⬛",
	"🟥",
	"⬛",
	"🟩",
	"🟥",
	"⬛",
	"🟥",
	"⬛",
	"🟥",
	"⬛",
	"🟥",
	"⬛",
	"🟥",
	"⬛"
];

function runRoulette(color: "red" | "black" | "green", multi: number, bet: number, usr: User) {
	let r = randomInt(1, rouletteWheel.length);
	let colorGot;
	switch (rouletteWheel[r - 1]) {
		case "🟥":
			colorGot = "red";
			break;
		case "⬛":
			colorGot = "black";
			break;
		case "🟩":
			colorGot = "green";
			break;
	}

	let rouletteWheelToDisplay = rouletteWheel;
	if (r < 5) {
		// pad start
		rouletteWheelToDisplay = JSON.parse(JSON.stringify(rouletteWheelToDisplay));
		for (let i = 0; i < 5 - r; i++) {
			if (i % 2) rouletteWheelToDisplay.unshift("🟥");
			else rouletteWheelToDisplay.unshift("⬛");
		}
		r = 5;
	} else if (r > rouletteWheel.length - 4) {
		// pad end
		rouletteWheelToDisplay = JSON.parse(JSON.stringify(rouletteWheelToDisplay));
		rouletteWheelToDisplay.push("🟥", "⬛", "🟥", "⬛");
	}

	// show 9 closest tiles
	const landedWheel = rouletteWheelToDisplay.slice(r - 5, r + 4);
	const ballString = e_blank.repeat(1) + "\n" + e_blank.repeat(4) + "▫️" + e_blank.repeat(4);

	// u200b space to make emoji small for mobile
	const msge = new EmbedBuilder().setDescription(`${ballString}\n${landedWheel.join("")}\u200b`).setAuthor({
		name: `${usr.displayName}'s roulette wheel`,
		iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
	});

	let won;
	if (color === colorGot) {
		won = bet * (multi - 1);
		msge.setTitle(`Won ${formatDoler(won, false)}!`).setColor(Colors.DarkGreen);
	} else {
		won = -bet;
		msge.setTitle(`Lost ${formatDoler(bet, false)}!`).setColor(Colors.DarkRed);
	}

	return { msge, won };
}

async function parseArguments(msg: okbot.Message, args: string[]) {
	if (args[0]?.toLowerCase() === "top") {
		msg.reply({
			embeds: [await showCasinoTopWins("rl", true)],
			allowedMentions: { repliedUser: false }
		});
		return null;
	}
	if (args.length < 2) {
		sendSimpleMessage(msg, "The usage for this command is:\n`" + usage + "`", Colors.White);
		return null;
	}

	const parsedColorTmpArg1 = parseColor(args[0]);
	if (parsedColorTmpArg1) args.shift();
	const parsedColor = parsedColorTmpArg1 ?? parseColor(args[1]);
	if (!parsedColor) {
		sendSimpleMessage(msg, "Color must be `red`, `black`, or `green`.");
		return null;
	}

	const plrdat = await db_plr_get({ _id: msg.author.id, mon: 1, monLv: 1, monTot: 1, itms: 1 });
	const parsedBet = parseBet(args[0], plrdat);
	if (isErrorResponse(parsedBet)) {
		sendSimpleMessage(msg, parsedBet.error);
		return null;
	}

	return {
		...parsedColor,
		bet: parsedBet.bet,
		monLv: plrdat?.monLv ?? 0,
		monTot: plrdat?.monTot ?? 0
	};
}

function parseColor(input: string) {
	const color = input.toLowerCase();
	if (color === "red" || color === "black")
		return { color, multi: 2 } as { color: okbot.RouletteColor; multi: number };
	else if (color === "green") return { color, multi: 14 } as { color: okbot.RouletteColor; multi: number };
	else return null;
}

function parseBet(input: string, plrdat: okbot.User | null): BetArguments | okbot.ErrorWithMessageResponse {
	const mon = plrdat?.mon ?? 0;
	const action = input.toLowerCase();
	const MIN_BET = BET_RANGES[plrdat?.itms?.BOS0010 ? "vip" : "def"].min;
	const MAX_BET = BET_RANGES[plrdat?.itms?.BOS0010 ? "vip" : "def"].max;

	const bet = action === "all" ? Math.min(mon, MAX_BET) : parseNumberSuffix(action);
	if (bet == null || isNaN(bet) || bet < MIN_BET || bet > MAX_BET)
		return {
			error: `Bet amount must be between ${formatDoler(MIN_BET)} and ${formatDoler(MAX_BET)}.`
		};
	if (bet > mon) return { error: `You only have ${formatDoler(mon)}.` };

	return { bet };
}

const isErrorResponse = (
	result: BetArguments | okbot.ErrorWithMessageResponse
): result is okbot.ErrorWithMessageResponse => (result as { error: string }).error !== undefined;

export async function execute(msg: okbot.Message, args: string[]) {
	const parsedArgs = await parseArguments(msg, args);
	if (!parsedArgs) return;

	const { color, multi, bet, monLv, monTot } = parsedArgs;

	const res = runRoulette(color, multi, bet, msg.author);
	if (res.won > 0) {
		const newMonLv = calcMoneyLevelsGain(monLv, monTot + res.won, msg);
		await addCasinoStat(msg.author.id, "rl", "win", bet, res.won, { rlColor: color });
		await db_add_casino_top("rl", msg.author.id, msg.author.tag, bet, res.won + bet);

		await db_plr_add({
			_id: msg.author.id,
			mon: res.won,
			monLv: newMonLv,
			monTot: res.won,
			expense: { rl: bet },
			income: { rl: res.won + bet }
		});
	} else {
		await addCasinoStat(msg.author.id, "rl", "lose", bet, -bet, { rlColor: color });
		await db_plr_add({ _id: msg.author.id, mon: -bet, expense: { rl: bet } });
	}

	return msg.reply({ embeds: [res.msge], allowedMentions: { repliedUser: false } });
}
