import { Colors, EmbedBuilder } from "discord.js";
import { e_blank, formatDate, sendSimpleMessage } from "../../utils.js";

export const name = "moon";
export const alias = ["phase"];
export const description = "🌚 Schedule your full moon rituals";
export const usage = "<Date and optionally time (YYYY-MM-DD HH:mm:ss)>";

const avgCycleLength = 29.5305888531;
const epoch = 1669244220000; // new moon 2022-11-23 22:57 UTC in ms

// function getJulianDay(ms: number) {
// 	return ms / 86400000 + 2440587.5;
// }

// function getCycleLengthEstimate(julianDay: number) {
// 	const T = (julianDay - 2451545) / 36525;
// 	return avgCycleLength + 0.00000021621 * T - 3.64 * 0.0000000001 * T * T;
// }

// not an accurate estimation by any means but it's neat simple
function moonPhase(date: Date) {
	let totalDays = (date.getTime() - epoch) / 86400000;
	totalDays /= avgCycleLength;

	let phase = Math.floor(totalDays);
	totalDays -= phase; // subtract integer part to leave the fraction
	const cyclePercent = totalDays * 100; // 0-100
	const phaseDegrees = 360 * totalDays; // 0-360
	phase = Math.round(totalDays * 8) + 1; // phases are 1-8 (New - Waning Crescent)
	if (phase > 8) phase = 1;

	let phaseName = "Unknown";
	let phaseEmoji = "";
	switch (phase) {
		case 1:
			phaseName = "New";
			phaseEmoji = "🌑";
			break;
		case 2:
			phaseName = "Waxing Crescent";
			phaseEmoji = "🌒";
			break;
		case 3:
			phaseName = "First Quarter";
			phaseEmoji = "🌓";
			break;
		case 4:
			phaseName = "Waxing Gibbous";
			phaseEmoji = "🌔";
			break;
		case 5:
			phaseName = "Full";
			phaseEmoji = "🌕";
			break;
		case 6:
			phaseName = "Waning Gibbous";
			phaseEmoji = "🌖";
			break;
		case 7:
			phaseName = "Last Quarter";
			phaseEmoji = "🌗";
			break;
		case 8:
			phaseName = "Waning Crescent";
			phaseEmoji = "🌘";
			break;
	}

	return { phase, cycle: cyclePercent, phaseDegrees, name: phaseName, emoji: phaseEmoji };
}

export async function execute(msg: okbot.Message, args: string[]) {
	const date = args.length ? new Date(args[0] + " " + (args[1] || "")) : new Date();
	if (isNaN(date.getTime())) return sendSimpleMessage(msg, "Invalid date provided");

	const moon = moonPhase(date);
	const phaseDegrees = Math.floor(moon.phaseDegrees);
	const phaseMinutes = Math.round((moon.phaseDegrees - phaseDegrees) * 60);

	const msge = new EmbedBuilder();
	msge
		.setColor(moon.phase < 4 ? Colors.DarkerGrey : Colors.Yellow)
		.setDescription(`**${moon.emoji}${e_blank}${moon.name} Moon**\n\u200b`)
		.addFields(
			{
				name: "Moon age",
				value: `${(avgCycleLength * (moon.cycle / 100)).toFixed(2)} days`,
				inline: true
			},
			{
				name: "Lunar cycle",
				value: `${moon.cycle.toFixed(2)}% (${phaseDegrees}°${phaseMinutes}')`,
				inline: true
			}
		)
		.setFooter({ text: "Estimate for " + formatDate(date, "user", undefined, true) + " UTC" });

	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}
