import { randomInt } from "../../utils.js";

export const name = "roll";
export const description = "🎲 Roll a numbe (this is a very old command shush)";
export const usage = "<Min> <Max> <Repetitions>";

export function execute(msg: okbot.Message, args: string[]) {
	let min = 1,
		max = 6,
		reps = 1;
	if (args.length == 1) {
		max = parseInt(args[0]);
	} else if (args.length == 2) {
		min = parseInt(args[0]);
		max = parseInt(args[1]);
	} else if (args.length >= 3) {
		min = parseInt(args[0]);
		max = parseInt(args[1]);
		reps = parseInt(args[2]);
		if (reps > 150) {
			msg.reply("> o nono that is too many reps e");
			return;
		}
	}

	if (isNaN(min)) min = 1;
	if (isNaN(max)) max = 6;
	if (isNaN(reps)) reps = 1;
	if (min > max) {
		min = min ^ max;
		max = min ^ max;
		min = min ^ max;
	}

	let sum = 0,
		n = randomInt(min, max);

	if (reps <= 1) {
		let msgsend = "🎲 Rolled a **" + n + "**";
		if (n < 1) msgsend += " how did you do thajt";
		return msg.channel.send(msgsend);
	}

	let msgsend = `🎲 ${reps} rolls [${min}-${max}]\`\`\``;
	for (let i = 0; i < reps; i++) {
		if (!(i % 10)) msgsend += "\n";
		msgsend += n + " ";
		sum += n;
		n = randomInt(min, max);
	}

	msgsend += "```";
	if (reps >= 5) msgsend += "\nAverage of " + Math.round((sum / reps) * 100) / 100;

	msg.channel.send(msgsend);
}
