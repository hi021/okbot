import { e_blank } from "../../utils.js";

export const name = "boop";
export const description = "🐑 Horizontal sqwuish";
export const usage = "<Any emoji or text or mention>";
const BOOP_TIME_MS = 900;

export async function execute(msg: okbot.Message, args: string[]) {
	const toBoop = args?.length ? args.join(" ") : "🐑";
	const msgSent = await msg.channel.send(`👉${e_blank}${toBoop}${e_blank}👈`);

	await new Promise(resolve => setTimeout(() => resolve(true), BOOP_TIME_MS));
	msgSent.edit(`${e_blank}👉${toBoop}👈`);
}
