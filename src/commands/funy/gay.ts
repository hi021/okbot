import { ColorResolvable, EmbedBuilder } from "discord.js";
import { db_plr_add } from "../../db/db.js";
import { db_gay_add, db_get_gay } from "../../db/gay.js";
import { sendSimpleMessage } from "../../utils.js";

const colors: { [typde in okbot.GayType]: ColorResolvable } = { Girls: "#fd8ba8", Silly: "#ca8bfd" };

export const name = "gay";
export const alias = ["lesbian", "kiss"];
export const description = "👉👈";
export const usage = '<"Girls" OR "Silly"> <Numeric image id (1-indexed)>';

export async function execute(msg: okbot.Message, args: string[]) {
	const typeArg = args[0]?.toLowerCase();
	let type: okbot.GayType = "Girls";
	let id;

	if (!typeArg) {
		if (Math.random() > 0.9) type = "Silly";
	} else {
		if (typeArg === "fun" || typeArg === "funny" || typeArg === "meme" || typeArg === "silly") type = "Silly";
		const indexArg = parseInt(args[1]);
		if (!isNaN(indexArg)) id = indexArg;
	}

	const gay = await db_get_gay(type, id);
	if (!gay) return sendSimpleMessage(msg, "**No gay found!**\n*You feel the world burst into total despair...*");

	const msge = new EmbedBuilder()
		.setTitle(`${type} #${gay._id}`)
		.setImage(gay.url)
		.setDescription(gay.source || null)
		.setColor(colors[type]);

	// const msgSent =
	await msg.reply({
		embeds: [msge],
		allowedMentions: { repliedUser: false }
	});

	db_plr_add({ _id: msg.author.id, gay: 1 });
	db_gay_add({ ...gay, impressions: 1 }, type);
}
