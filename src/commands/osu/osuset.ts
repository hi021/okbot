import { db_plr_set } from "../../db/db.js";
import { osu_getId } from "../../utilsOsu.js";

export const name = "osuset";
export const alias = ["setosu"];
export const description = "Assign yourself an osu! profile";
export const usage = "<osu! username (blank to unlink)>";

export async function execute(msg: okbot.Message, args: string[]) {
	const nam = args.join(" ");
	if (!nam) {
		await db_plr_set({ _id: msg.author.id, osu: undefined });
		return msg.reply(`> Reset your osu! username.`);
	}

	try {
		const res = await osu_getId(nam);
		if (!res)
			return msg.reply(
				`> \`${nam}\` is not in poggers database.\n> Only people with at least **1000** top 50s in osu!standard are tracked.`
			);

		await db_plr_set({ _id: msg.author.id, osu: res });
		return msg.reply(`> Set your account to \`${nam}\`.`);
	} catch (e) {
		throw e;
	}
}
