import { EmbedBuilder } from "discord.js";
import { slot_pay } from "../../commands/Casino/slot.js";
import { formatDoler, randomFromArray } from "../../utils.js";

export const name = "slottest";
export const description = "how slutty is it?";
export const usage = "[Repetitions] <Bet amount>";
export const restrict = "BOT_OWNER";

// from slot.ts
const jackpot = "<:adam:1007621226379886652>";
const great = [":coin:", "💰", "⚜️", ":seven:", "💎"];
const good = ["🍊", "🍒", ":flag_lv:", "🔱", "⭐"];
const bad = ["🆓", "🧀", "🥔", "🍪", "🍑"];

function oneElement() {
	let rand = Math.random() * 10000;
	if (rand < 5400) return randomFromArray(bad);
	if (rand < 8400) return randomFromArray(good);
	if (rand < 9825) return randomFromArray(great);
	return jackpot; // ((10000-9825)/10000) ^ 3
}

function runSlot() {
	const row = [oneElement(), oneElement(), oneElement()];
	let element = row[0];
	let num = 1;
	if (element === row[1]) {
		num = element === row[2] ? 3 : 2;
	} else if (element === row[2]) {
		num = 2;
	} else {
		element = row[1];
		if (element === row[2]) num = 2;
	}

	return num >= 2 ? slot_pay[element][`pay${num}` as "pay2" | "pay3"] : 0;
}

export function execute(msg: okbot.Message, args: string[]) {
	const v: { [multiplier: number]: number } = {};
	const t = parseInt(args[0]) || 100;
	const bet = parseInt(args[1]) || 100;
	console.time("slots");

	for (let i = 0; i < t; i++) {
		const a = runSlot();
		if (v[a]) ++v[a];
		else v[a] = 1;
	}

	let desc = "";
	let net = 0;
	for (const i in v) {
		desc += `**x${i}**: ${v[i]} (${Math.round((v[i] / t) * 100000) / 1000}%)\n`;
		net += bet * (v[i] * (Number(i) - 1));
	}

	console.timeEnd("slots");
	msg.reply({
		embeds: [
			new EmbedBuilder()
				.setDescription(desc)
				.addFields({ name: "Profit", value: `${formatDoler(net)} from ${formatDoler(bet * t, false)}` })
		]
	});
}
