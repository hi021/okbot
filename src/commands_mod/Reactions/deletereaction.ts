import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, Message } from "discord.js";
import { db_guild_delete_reaction } from "../../db/guild.js";
import { bot } from "../../okbot.js";
import { SET } from "../../settings.js";
import { createSimpleMessage, sendSimpleMessage } from "../../utils.js";
import { Guilds, Players_in_collector } from "../../volatile.js";

export const name = "deletereaction";
export const alias = ["dr"];
export const description = "just delete the reaction";
export const usage = '<"Global">';
export const restrict = "GUILD_ADMIN";
const perPage = 20;

type FormattedReactions = Array<{ rea: string; res: string }>;

function formatReactions(reactions: { [reactionText: string]: string[] }) {
	const reactionsFormatted: FormattedReactions = [];
	for (const i in reactions) {
		for (const j in reactions[i]) reactionsFormatted.push({ rea: i, res: reactions[i][j] });
	}
	return reactionsFormatted;
}

// pagination
bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (split[0] !== "delReaction_prev" && split[0] !== "delReaction_next") return;

	const msge = interaction.message.embeds[0];
	const msgeEdit = EmbedBuilder.from(msge);

	const guildId = split[1];
	const page = parseInt(split[2]);

	const reactions = Guilds[guildId]?.cr;
	if (!reactions || Object.keys(reactions).length === 0) {
		interaction.reply({
			embeds: [createSimpleMessage("🕸️ *No custom reactions in this guild...*", Colors.DarkOrange)]
		});
		return;
	}
	const reactionEntries = formatReactions(reactions);

	if (split[0] === "delReaction_prev") {
		if (page <= 0) {
			interaction.update({});
			return;
		}

		addReactionsToMsgEmbed(msgeEdit, reactionEntries, page);
		msgeEdit.setFooter({ text: `Page ${page}\nSend 'no' to cancel.` });

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`delReaction_prev-${guildId}-${page - 1}`)
				.setEmoji("⬅️")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page <= 1),
			new ButtonBuilder()
				.setCustomId(`delReaction_next-${guildId}-${page + 1}`)
				.setEmoji("➡️")
				.setStyle(ButtonStyle.Primary)
		);

		interaction.update({ embeds: [msgeEdit], components: [row] });
		return;
	} else if (split[0] === "delReaction_next") {
		const maxPage = Math.ceil(reactionEntries.length / perPage);
		if (page > maxPage) {
			interaction.update({});
			return;
		}

		addReactionsToMsgEmbed(msgeEdit, reactionEntries, page);
		msgeEdit.setFooter({ text: `Page ${page}\nSend 'no' to cancel.` });

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`delReaction_prev-${guildId}-${page - 1}`)
				.setEmoji("⬅️")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`delReaction_next-${guildId}-${page + 1}`)
				.setEmoji("➡️")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page >= maxPage)
		);

		interaction.update({ embeds: [msgeEdit], components: [row] });
		return;
	}
});

function addReactionsToMsgEmbed(msge: EmbedBuilder, reactionEntries: FormattedReactions, page = 1) {
	let desc = "";
	for (let i = perPage * (page - 1); i < perPage * page; i++) {
		const react = reactionEntries[i];
		if (!react) break;

		const descTmp = `\`${i}\` **${react.rea}**:\n${react.res}\n\n`;
		if (desc.length + descTmp.length > 4096) {
			// TODO: handle description being over character limit
			break;
		}
		desc += descTmp;
	}

	return msge.setDescription(desc);
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild()) return;
	if (Players_in_collector[msg.author.id])
		return msg.reply("A different activity requires your attention first!");

	let guildId = msg.guildId;
	const arg0 = args.shift()?.toLowerCase();
	if (arg0 === "g" || arg0 === "global") {
		if (!SET.BOT_ADMIN?.includes(msg.author.id))
			return msg.reply("You do not have the required permissions to use this command (BOT_ADMIN).");

		guildId = "_GLOBAL";
	}

	const reactions = Guilds[guildId]?.cr;
	if (!reactions || Object.keys(reactions).length === 0)
		return sendSimpleMessage(msg, "🕸️ *No custom reactions in this guild...*", Colors.DarkRed, false);
	const reactionsFormatted = formatReactions(reactions);

	const msge = new EmbedBuilder()
		.setColor(Colors.White)
		.setTitle("Send the number next to the reaction you wish to remove")
		.setFooter({ text: "Page 1\nSend 'no' to cancel." });

	addReactionsToMsgEmbed(msge, reactionsFormatted);

	const components =
		reactionsFormatted.length > perPage
			? [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`delReaction_prev-${guildId}-0`)
							.setEmoji("⬅️")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId(`delReaction_next-${guildId}-2`)
							.setEmoji("➡️")
							.setStyle(ButtonStyle.Primary)
					)
				]
			: [];

	// send reaction list
	msg.reply({
		embeds: [msge],
		components,
		allowedMentions: {
			repliedUser: false
		}
	});

	Players_in_collector[msg.author.id] = true;
	const collector = msg.channel.createMessageCollector({
		filter: (m: Message) => m.author.id === msg.author.id,
		time: 90000
	});

	collector.on("collect", async m => {
		const mc = m.content.toLowerCase();
		if (mc === "n" || mc === "no" || mc === "cancel") return collector.stop();

		const n = parseInt(mc);
		if (!isNaN(n) && n >= 0 && n < reactionsFormatted.length) {
			collector.stop("confirm");

			const r = await db_guild_delete_reaction(reactionsFormatted[n].rea, reactionsFormatted[n].res, guildId);
			if (!r?.modifiedCount) return sendSimpleMessage(msg, "Reaction not found.") as unknown as undefined;

			msg.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(Colors.DarkGreen)
						.setTitle("Removed reaction")
						.addFields({
							name: "Message",
							value:
								reactionsFormatted[n].rea.length > 1024
									? "`<Too long to display>`"
									: reactionsFormatted[n].rea
						})
						.addFields({
							name: "Response",
							value:
								reactionsFormatted[n].res.length > 1024
									? "`<Too long to display>`"
									: reactionsFormatted[n].res
						})
				],
				allowedMentions: {
					repliedUser: false
				}
			});
		}
	});

	collector.on("end", (_collected, reason) => {
		delete Players_in_collector[msg.author.id];
		if (reason !== "confirm") {
			sendSimpleMessage(msg, "Canceled reaction deletion.", Colors.Orange, false);
			return;
		}
	});
}
