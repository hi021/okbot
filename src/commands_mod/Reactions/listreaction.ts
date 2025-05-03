import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from "discord.js";
import { bot } from "../../okbot.js";
import { e_blank, sendSimpleMessage } from "../../utils.js";
import { Guilds } from "../../volatile.js";

export const name = "listreaction";
export const alias = ["lr"];
export const description = "just list the reactions";
export const usage = '<"Global">';
const perPage = 20;

// pagination
bot.on("interactionCreate", async interaction => {
	if (interaction.isButton()) {
		const split = interaction.customId.split("-");
		if (split[0] !== "listReaction_prev" && split[0] !== "listReaction_next") return;

		const msge = interaction.message.embeds[0];
		const msgeEdit = EmbedBuilder.from(msge);
		let page = Number(msge.footer?.text?.split(" ")?.[1] || 1); // footers look like Page <page> ● ...

		const guildId = split[1];
		const reactionEntries = Object.entries(Guilds[guildId]?.cr || {});

		if (split[0] === "listReaction_prev") {
			--page;
			if (page <= 0) {
				interaction.update({});
				return;
			}

			addReactionsToMsgEmbed(msgeEdit.spliceFields(0, perPage), reactionEntries, page);
			msgeEdit.setFooter({ text: `Page ${page} ● Every 🔹 marks a separate response` });

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("listReaction_prev-" + guildId)
					.setEmoji("⬅️")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page <= 1),
				new ButtonBuilder()
					.setCustomId("listReaction_next-" + guildId)
					.setEmoji("➡️")
					.setStyle(ButtonStyle.Primary)
			);

			interaction.update({ embeds: [msgeEdit], components: [row] });
			return;
		} else if (split[0] === "listReaction_next") {
			++page;
			const maxPage = Math.ceil(reactionEntries.length / perPage);
			if (page > maxPage) {
				interaction.update({});
				return;
			}

			addReactionsToMsgEmbed(msgeEdit.spliceFields(0, perPage), reactionEntries, page);
			msgeEdit.setFooter({ text: `Page ${page} ● Every 🔹 marks a separate response` });

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("listReaction_prev-" + guildId)
					.setEmoji("⬅️")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("listReaction_next-" + guildId)
					.setEmoji("➡️")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(page >= maxPage)
			);

			interaction.update({ embeds: [msgeEdit], components: [row] });
			return;
		}
	}
});

function addReactionsToMsgEmbed(msge: EmbedBuilder, reactionEntries: [string, string[]][], page = 1) {
	let desc = "";
	for (let i = perPage * (page - 1); i < perPage * page; i++) {
		const react = reactionEntries[i]; //[trigger, reactions[]]
		if (!react) break;
		if (!react[1].length) continue;

		desc += `**${react[0]}**:\n`;
		for (const j in react[1]) {
			const response = react[1][j];
			const descTmp = `🔹 ${response.split("\n").join("\n" + e_blank + " ")}\n`;

			if (descTmp.length + desc.length > 4096) {
				const missingResponses = react[1].length - Number(j);
				const lengthDisclaimer = `...\n\`<Truncated ${missingResponses} response${missingResponses == 1 ? "" : "s"}>\``;

				desc = desc.slice(0, 4096 - lengthDisclaimer.length - 2) + lengthDisclaimer;
				return msge.setDescription(desc);
			}
			desc += descTmp;
		}
		desc += "\n";
	}

	return msge.setDescription(desc);
}

export async function execute(msg: okbot.Message, args: string[]) {
	const arg0 = args.shift()?.toLowerCase();
	const guildId = arg0 === "g" || arg0 === "global" ? "_GLOBAL" : msg.guildId;
	if (!guildId) return;

	const reactions = Guilds[guildId]?.cr || {};
	const reactionEntries = Object.entries(reactions);
	if (!reactionEntries?.length)
		return sendSimpleMessage(
			msg,
			guildId == "_GLOBAL"
				? "🕸️ *No global custom reactions...*"
				: "🕸️ *No custom reactions in this guild...*",
			Colors.DarkOrange,
			false
		);

	const msge = new EmbedBuilder()
		.setTitle(`${guildId === "_GLOBAL" ? "Global" : "Guild"} reactions (${reactionEntries.length})`)
		.setFooter({ text: "Page 1 ● Every 🔹 marks a separate response" })
		.setColor(Colors.White);

	const components =
		reactionEntries.length > perPage
			? [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId("listReaction_prev-" + guildId)
							.setEmoji("⬅️")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("listReaction_next-" + guildId)
							.setEmoji("➡️")
							.setStyle(ButtonStyle.Primary)
					)
				]
			: [];

	addReactionsToMsgEmbed(msge, reactionEntries);

	return msg.reply({
		embeds: [msge],
		components,
		allowedMentions: {
			repliedUser: false
		}
	});
}
