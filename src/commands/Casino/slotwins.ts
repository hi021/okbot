import { Colors, EmbedBuilder } from "discord.js";
import { slot_pay } from "../../commands/Casino/slot.js";
import { e_blank } from "../../utils.js";

export const name = "slotwins";
export const alias = ["slotodds"];
export const description = "💰 Peek at the potential winnings";
//TODO?: move to slot.ts

export function execute(msg: okbot.Message, _args: string[]) {
	let d = "";
	for (const i in slot_pay)
		d += `${i} 2x: \`${slot_pay[i].pay2.toString().padStart(3, " ")}\`${e_blank}3x: \`${slot_pay[i].pay3
			.toString()
			.padStart(4, " ")}\`\n`;

	msg.reply({
		embeds: [
			new EmbedBuilder().setColor(Colors.White).setTitle("Bet multipliers for each symbol").setDescription(d)
		],
		allowedMentions: {
			repliedUser: false
		}
	});
}
