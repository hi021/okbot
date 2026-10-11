import { EmbedBuilder } from "discord.js";
import { findMostPrevalentRowElement, oneElement, slot_pay } from "../../commands/Casino/slot.js";
import { formatDoler } from "../../utils.js";

export const name = "slottest";
export const description = "how slutty is it?";
export const usage = "[Repetitions] <Bet amount>";
export const restrict = "BOT_OWNER";

function runSlot() {
	const mainSlotRow = [oneElement(), oneElement(), oneElement()];
	const { element, count } = findMostPrevalentRowElement(mainSlotRow);

	return count >= 2 ? slot_pay[element][`pay${count}` as "pay2" | "pay3"] : 0;
}

export function execute(msg: okbot.Message, args: string[]) {
	const res: { [multiplier: number]: number } = {};
	const reps = parseInt(args[0]) || 100;
	const bet = parseInt(args[1]) || 100;
	const totalBet = bet * reps;
	console.time("slots");

	for (let i = 0; i < reps; i++) {
		const a = runSlot();
		if (res[a]) ++res[a];
		else res[a] = 1;
	}

	let desc = "";
	let net = 0;
	for (const i in res) {
		desc += `**x${i}**: ${res[i]} (${Math.round((res[i] / reps) * 100000) / 1000}%)\n`;
		net += bet * (res[i] * (Number(i) - 1));
	}

	console.timeEnd("slots");

	const retPercent = 100 + Math.round((net / totalBet) * 100000) / 1000;
	msg.reply({
		embeds: [
			new EmbedBuilder().setDescription(desc).addFields({
				name: "Return",
				value: `**${retPercent}**%
${formatDoler(net, false)}
from ${formatDoler(totalBet, false)}`,
				inline: false
			})
		]
	});
}
