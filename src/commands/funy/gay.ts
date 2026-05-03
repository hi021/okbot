import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ColorResolvable,
	EmbedBuilder,
	Events,
	MessageFlags
} from "discord.js";
import { db_gay_add, db_gay_toggle_vote, db_get_gay, db_get_gays_from_collection_by_field } from "../../db/gay.js";
import { createSimpleMessage, DbLeastOrMost, e_blank, sendSimpleMessage } from "../../utils.js";
import { db_get, db_plr_add } from "../../db/db.js";
import { bot } from "../../okbot.js";

const COLORS: { [type in okbot.GayType]: ColorResolvable } = Object.freeze({ Girls: "#fd8ba8", Silly: "#ca8bfd" });
const EMOJI: Record<keyof okbot.GayObjectStats | "score", Record<okbot.GayType | "top", string>> = Object.freeze({
	downvote: { Girls: "🤢", Silly: "😐", top: "downvoted" },
	upvote: { Girls: "💜", Silly: "🙂", top: "upvoted" },
	impressions: { Girls: "👁️", Silly: "👁️", top: "shown" },
	score: { Girls: "🏆", Silly: "🏆", top: "scored" } // TODO: add top score, though should probably say Highest/Lowest instead of Most/Least
});

bot.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (split[0] !== "gay") return;

	const _id = +split[1];
	const type = split[2] as okbot.GayType;
	const impressionId = +split[3];
	const voteType = split[4];
	if (voteType !== "upvote" && voteType !== "downvote") return;

	const gay = await db_get_gay(type, _id);
	if (!gay) return;

	const userId = interaction.user.id;
	const hasUpvoted = gay.upvote?.includes(userId) ?? false;
	const hasDownvoted = gay.downvote?.includes(userId) ?? false;
	const removing = voteType === "upvote" ? hasUpvoted : hasDownvoted;

	await db_gay_toggle_vote(_id, type, voteType, userId, removing);

	let upvotes = gay.upvote?.length ?? 0;
	let downvotes = gay.downvote?.length ?? 0;

	if (voteType === "upvote") {
		if (removing) upvotes -= 1;
		else {
			upvotes += 1;
			if (hasDownvoted) downvotes -= 1;
		}
	} else {
		if (removing) downvotes -= 1;
		else {
			downvotes += 1;
			if (hasUpvoted) upvotes -= 1;
		}
	}

	// TODO probably some confirmation before just removing vote
	if (removing)
		interaction.reply({
			content: `You have already voted - removed your ${EMOJI[voteType][type]}`,
			flags: [MessageFlags.Ephemeral]
		});

	const msge = EmbedBuilder.from(interaction.message.embeds[0]);
	msge.setFooter({ text: buildFooter(type, impressionId, upvotes, downvotes) });

	if (removing) interaction.message.edit({ embeds: [msge] });
	else interaction.update({ embeds: [msge] });
});

export const name = "gay";
export const alias = ["lesbian", "kiss"];
export const description = "👉👈";
export const usage =
	'<"Girls" OR "Silly" OR "Top" (anything else defaults to random)> <Numeric image id (1-indexed) OR "Girls" OR "Silly"> <"impressions" OR "upvotes" OR "downvotes"> <"least" OR "most">';
export const usageDetail =
	"E.g. 'Girls 5' will show an image with the id of 5, 'Silly' will show a random silly image\n'Top Girls impressions' will show a list of the most frequently shown girl images";

function buildGayEmbed(gay: okbot.GayObject, type: okbot.GayType) {
	const impressions = (gay.impressions ?? 0) + 1;
	const upvotes = gay.upvote?.length ?? 0;
	const downvotes = gay.downvote?.length ?? 0;
	const msge = new EmbedBuilder()
		.setTitle(`${type} #${gay._id}`)
		.setImage(gay.url)
		.setDescription(gay.source || null)
		.setFooter({ text: buildFooter(type, impressions, upvotes, downvotes) })
		.setColor(COLORS[type]);

	const idPrefix = `gay-${gay._id}-${type}-${impressions}`;
	const voteButtons = new ActionRowBuilder<ButtonBuilder>().setComponents(
		new ButtonBuilder()
			.setCustomId(`${idPrefix}-upvote`)
			.setEmoji(EMOJI.upvote[type])
			.setLabel("Yee")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId(`${idPrefix}-downvote`)
			.setEmoji(EMOJI.downvote[type])
			.setLabel("Eww")
			.setStyle(ButtonStyle.Secondary)
	);

	return { msge, voteButtons };
}

// TODO maybe only show the score & engagement (like score/impression - idk impressions kinda fake cuz it's 1 per entire channel of people)
function buildFooter(type: okbot.GayType, impressions?: number, upvotes?: number, downvotes?: number) {
	return `${EMOJI.impressions[type]} ${impressions}${upvotes ? ` ● ${EMOJI.upvote[type]} ${upvotes}` : ""}${downvotes ? ` ● ${EMOJI.downvote[type]} ${downvotes}` : ""}`;
}

async function doGay(msg: okbot.Message, type?: okbot.GayType, id?: number) {
	const r = Math.random();
	if (!type) type = r < 0.9 ? "Girls" : "Silly";

	const gay = await db_get_gay(type, id);
	if (!gay) return sendSimpleMessage(msg, "**No gay found!**\n*You feel the world burst into total despair 🔥...*");

	const { msge, voteButtons } = buildGayEmbed(gay, type);
	const msgSent = await msg.reply({
		embeds: [msge],
		allowedMentions: { repliedUser: false },
		components: [voteButtons]
	});

	if (type == "Girls" && r < 0.1667) msgSent.react("🥺");
	db_plr_add({ _id: msg.author.id, gay: 1 });
	db_gay_add({ _id: gay._id, impressions: 1 }, type);
}

function buildGayTopEmbed(
	gays: okbot.GayObject[],
	type: okbot.GayType,
	field: keyof okbot.GayObjectStats,
	leastOrMostMode: DbLeastOrMost
) {
	if (!gays?.length) return createSimpleMessage("🕸️ *No gay stats just yet... You gotta pick up the slack*");

	const title = `${leastOrMostMode === "least" ? "Least" : "Most"} ${EMOJI[field].top} ${type.toLowerCase()}`;
	let rankList = "";
	let idList = "";
	let scoreList = "";
	for (let i = 0; i < gays.length; ++i) {
		const gay = gays[i];
		const value = Array.isArray(gay[field]) ? gay[field].length : (gay[field] ?? 0);
		rankList += `**#${i + 1}**\n`;
		idList += `#${gay._id}\n`;
		scoreList += `${EMOJI[field][type]} ${value}\n`;
	}

	const msge = new EmbedBuilder()
		.setTitle(title)
		.setColor(COLORS[type])
		.setFields(
			{ name: "", value: rankList, inline: true },
			{ name: "", value: idList, inline: true },
			{ name: "", value: scoreList, inline: true }
		);

	return msge;
}

async function doGayTop(msg: okbot.Message, args: string[]) {
	const typeArg = args[1]?.toLowerCase();
	const type: okbot.GayType = typeArg === "silly" || typeArg === "funny" || typeArg === "meme" ? "Silly" : "Girls";
	const fieldArg = args[2]?.toLowerCase();
	const field: keyof okbot.GayObject =
		fieldArg === "upvote" || fieldArg === "downvote" || fieldArg === "impressions" ? fieldArg : "impressions";
	const leastOrMostArg = args[3]?.toLowerCase();
	const leastOrMostMode: DbLeastOrMost =
		leastOrMostArg === "least" || leastOrMostArg === "most" ? leastOrMostArg : "most";

	// TODO?: Pagination
	const gays = await db_get_gays_from_collection_by_field(db_get(`gay_${type.toLowerCase()}`), field, leastOrMostMode);

	const msge = buildGayTopEmbed(gays, type, field, leastOrMostMode);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

export async function execute(msg: okbot.Message, args: string[]) {
	const typeArg = args[0]?.toLowerCase();
	let id: number | undefined;

	if (typeArg === "silly" || typeArg === "funny" || typeArg === "meme") {
		const indexArg = parseInt(args[1]);
		if (!isNaN(indexArg)) id = indexArg;

		await doGay(msg, "Silly", id);
	} else if (typeArg === "top") {
		await doGayTop(msg, args);
	} else {
		if (typeArg) {
			const indexArg = parseInt(args[1]);
			if (!isNaN(indexArg)) id = indexArg;
		}

		await doGay(msg, typeArg === "girls" ? "Girls" : undefined, id);
	}
}
