import { Colors } from 'discord.js';
import { randomInt, sendSimpleMessage } from '../../utils.js';

function runFlipSimulation(iterations: number, odds: number) {
	let won = 0,
		lost = 0;

	for (let i = 0; i < iterations; i++) {
		const res = randomInt(1, 100);

		if (res >= odds) ++won;
		else ++lost;
	}

	return { won, lost };
}

export const name = 'flipsimulation';
export const alias = ['fliptest', 'bettest'];
export const usage = '[Iteration count] <Odds (0-100)>';
export const description = 'see how rigged this is';

export function execute(msg: okbot.Message, args: string[]) {
	if (!args.length) return;
	const iterations = Number(args.shift()) || 1;
	let odds = Number(args.shift());
	if (isNaN(odds) || odds < 0 || odds > 100) odds = 50;

	const sim = runFlipSimulation(Math.min(100_000_000, iterations), 100 - odds);
	const wtl = sim.won / iterations;
	sendSimpleMessage(
		msg,
		`Won **${sim.won}** (${(wtl * 100).toFixed(3)}%) and lost **${sim.lost}**\ngames over ${iterations} iterations with ${odds}% chance`,
		Colors.White
	);
}
