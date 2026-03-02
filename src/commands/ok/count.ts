import { Colors, EmbedBuilder } from "discord.js";
import { db_ok_get } from "../../db/db.js";
import { e_blank, formatNumber, sendSimpleMessage } from "../../utils.js";

export const name = "count";
export const alias = ["okcount", "ok", "oks"];
export const description = "🆗 get okays";
export const usage = '<Guild id OR "global">';

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild()) return;
	let guildId = args[0]?.toLowerCase() || msg.guildId;

	let title;
	const msge = new EmbedBuilder().setColor(Colors.White);

	if (guildId == "global" || guildId == "g") {
		guildId = "_GLOBAL";
		title = `global 🆗 count${e_blank}🌎`;
	} else {
		title = "🆗 count for " + msg.guild.name;
		const icon = msg.guild.iconURL();
		icon && msge.setThumbnail(icon);
	}

	const okarr = await db_ok_get(guildId);
	if (!okarr) return sendSimpleMessage(msg, "🕸️ *This place is not ok :(*", Colors.White);

	let typeColumn = "",
		countColumn = "",
		typeCount = 0;
	for (const ok of okarr.detail) {
		++typeCount;
		typeColumn += `**${ok.type}**\n`;
		countColumn += formatNumber(ok.count) + "\n";
	}

	// TODO pagination
	msge
		.setTitle(title)
		.addFields(
			{ name: "", value: typeColumn, inline: true },
			{ name: "", value: countColumn, inline: true },
			{ name: "", value: "\u200b", inline: true },
			{ name: "Unique", value: typeCount.toString(), inline: true },
			{ name: "Total", value: formatNumber(okarr.total), inline: true }
		);

	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}
