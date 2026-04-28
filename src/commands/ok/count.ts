import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, Events } from "discord.js";
import { bot } from "../../okbot.js";
import { db_ok_get } from "../../db/db.js";
import { e_blank, formatNumber, sendSimpleMessage } from "../../utils.js";

// pagination
bot.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (split[0] !== "okcount_prev" && split[0] !== "okcount_next") return;

	const page = parseInt(split[1]);
	if (page <= 0) return interaction.update({});

	const guildId = split[2] || "_GLOBAL";
	const okStats = await db_ok_get(guildId);
	if (!okStats) return interaction.update({ content: "🕸️ *This place is not ok :(*", embeds: [], components: [] });

	const result = buildOkCountEmbed(guildId, okStats, page);
	interaction.update({ embeds: [result.msge], components: result.components });
});

export const name = "count";
export const alias = ["okcount", "ok", "oks"];
export const description = "🆗 get okays";
export const usage = '<Guild id OR "global">';

const perPage = 15;

function buildOkCountEmbed(
	guildId: string,
	okStats: { total: number; unique: number; detail: Array<{ type: string; count: number }> },
	page = 1
) {
	const totalPages = Math.max(1, Math.ceil(okStats.detail.length / perPage));
	const safePage = Math.min(Math.max(1, page), totalPages);
	const startIndex = (safePage - 1) * perPage;
	const pageItems = okStats.detail.slice(startIndex, startIndex + perPage);

	const msge = new EmbedBuilder().setColor(Colors.White);
	if (guildId === "_GLOBAL") {
		msge.setTitle(`global 🆗 count${e_blank}🌎`);
	} else {
		const guild = bot.guilds.cache.get(guildId);
		if (guild) {
			msge.setTitle("🆗 count for " + guild.name);
			msge.setThumbnail(guild.iconURL());
		} else {
			msge.setTitle("🆗 count");
		}
	}

	let typeColumn = "",
		countColumn = "";
	for (const ok of pageItems) {
		typeColumn += `**${ok.type}**\n`;
		countColumn += formatNumber(ok.count) + "\n";
	}

	msge
		.setFooter({ text: `Page ${safePage}/${totalPages}` })
		.addFields(
			{ name: "", value: typeColumn, inline: true },
			{ name: "", value: countColumn, inline: true },
			{ name: "", value: "", inline: true },
			{ name: "Unique", value: okStats.unique.toString(), inline: true },
			{ name: "Total", value: formatNumber(okStats.total), inline: true }
		);

	const components =
		totalPages > 1
			? [
					new ActionRowBuilder<ButtonBuilder>().setComponents(
						new ButtonBuilder()
							.setCustomId(`okcount_prev-${safePage - 1}-${guildId}`)
							.setEmoji("⬅️")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(safePage <= 1),
						new ButtonBuilder()
							.setCustomId(`okcount_next-${safePage + 1}-${guildId}`)
							.setEmoji("➡️")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(safePage >= totalPages)
					)
				]
			: [];

	return { msge, components };
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild()) return;

	let guildId = args[0]?.toLowerCase() || msg.guildId;
	if (guildId == "global" || guildId == "g") guildId = "_GLOBAL";

	const okStats = await db_ok_get(guildId);
	if (!okStats) return sendSimpleMessage(msg, "🕸️ *This place is not ok :(*", Colors.White);

	const result = buildOkCountEmbed(guildId, okStats);
	msg.reply({ embeds: [result.msge], components: result.components, allowedMentions: { repliedUser: false } });
}
