import { randomInt } from "../../utils.js";

export const name = "randtest";
export const description = "see how rigged this is";

export async function execute(msg: okbot.Message, args: string[]) {
	const reps = Number(args[0]) || 100_000;
	if (reps <= 0) return;
	const res: number[] = [];

	const addToRes = (a: number) => (res[a] ? ++res[a] : (res[a] = 1));

	const t0 = Date.now();
	for (let i = 0; i < reps; i++) addToRes(randomInt(0, 500));

	const initialMessage = await msg.channel.send(
		`Took \`${Date.now() - t0}\` ms.\n\`\`\`${res.slice(0, 250)}\`\`\``
	);
	initialMessage.reply(`\`\`\`${res.slice(250)}\`\`\``);
}
