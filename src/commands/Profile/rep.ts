import { Colors } from "discord.js";
import { db_plr_add, db_plr_get, db_plr_set } from "../../db/db.js";
import { bot } from "../../okbot.js";
import { SET } from "../../settings.js";
import {
	createSimpleMessage,
	e_blank,
	formatMilliseconds,
	getUserFromMsg,
	sendSimpleMessage
} from "../../utils.js";

export const name = "rep";
export const alias = ["rape"];
export const description = "♂️ give raper";
export const usage = "<Username OR Mention>";

export async function execute(msg: okbot.Message, args: string[]) {
	const cooldown = Number(SET.RAPE_COOLDOWN);
	const plrdat = await db_plr_get({ _id: msg.author.id, rep: 1 });
	const sinceLast = plrdat?.rep?.last ? Date.now() / 1000 - plrdat.rep.last : Infinity;

	if (!args.length) {
		if (sinceLast < cooldown)
			return sendSimpleMessage(
				msg,
				`You have to wait \`${formatMilliseconds((cooldown - sinceLast) * 1000)}\` before raping again.`
			);
		return sendSimpleMessage(
			msg,
			"You can rape someone right now, just mention them!",
			Colors.DarkGreen,
			false
		);
	}

	let am = 1;
	if (plrdat == null) {
		db_plr_set({
			_id: msg.author.id,
			mon: 0,
			monTot: 0,
			rep: { last: Math.floor(Date.now() / 1000), am: 1 }
		});
	}

	const usr = await getUserFromMsg(msg, args);
	if (usr == null) return sendSimpleMessage(msg, "User not found.");
	if (usr == msg.author) return sendSimpleMessage(msg, "Self-rape is strictly prohibited.");

	if (plrdat?.rep) {
		if (sinceLast < cooldown)
			return sendSimpleMessage(
				msg,
				`You have to wait \`${formatMilliseconds((cooldown - sinceLast) * 1000)}\` before raping again.`
			);
		if (plrdat.rep.am) am = plrdat.rep.am + 1;
	}

	db_plr_add({ _id: usr.id, rep: { v: 1 } });
	await db_plr_set({
		_id: msg.author.id,
		rep: { ...plrdat?.rep, last: Math.floor(Date.now() / 1000), am }
	});

	const desc =
		usr.id === bot.user?.id
			? `♂️${e_blank}Oh! Uh... thank you...`
			: `♂️${e_blank}You've raped <@${usr.id}> why would you do that...`;
	const msge = createSimpleMessage(desc, "#226699");
	msge.setFooter({ text: `You have raped ${am} times in total` });
	return msg.reply({ embeds: [msge] });
}
