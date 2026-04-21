import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder } from "discord.js";
import { db_plr_add } from "../../db/db.js";
import { db_gay_add, db_get_gay } from "../../db/gay.js";
import { sendSimpleMessage } from "../../utils.js";
import { bot } from "../../okbot.js";

const COLORS: { [type in okbot.GayType]: ColorResolvable } = Object.freeze({ Girls: "#fd8ba8", Silly: "#ca8bfd" });
const EMOJI: {
	[k in keyof Pick<okbot.GayObject, "downvotes" | "upvotes" | "impressions">]: { [type in okbot.GayType]: string };
} = Object.freeze({
	downvotes: { Girls: "🤢", Silly: "😐" },
	upvotes: { Girls: "💜", Silly: "🙂" },
	impressions: { Girls: "👁️", Silly: "👁️" }
});

// pagination
bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (split[0] !== "gay") return;

	const _id = +split[1];
	const type = split[2] as okbot.GayType;
	const impressions = +split[3];
	const voteType = split[4];

	const gay = await db_get_gay(type, _id);
	if (!gay) return;

	// TODO hide component row after like a minute
	// TODO validate if not upvoted by user already idk how
	db_gay_add({ _id, [voteType]: 1 }, type);

	let upvotes = gay.upvotes;
	let downvotes = gay.downvotes;
	voteType == "upvote" ? ++upvotes : ++downvotes;

	const msge = EmbedBuilder.from(interaction.message.embeds[0]);
	msge.setFooter({ text: buildFooter(type, impressions, upvotes, downvotes) });
	interaction.update({ embeds: [msge] });
});

export const name = "gay";
export const alias = ["lesbian", "kiss"];
export const description = "👉👈";
export const usage = '<"Girls" OR "Silly"> <Numeric image id (1-indexed)>';

// TODO maybe only show the score & engagement (like score/impression - idk impressions kinda fake cuz it's 1 per entire channel of people)
function buildFooter(type: okbot.GayType, impressions?: number, upvotes?: number, downvotes?: number) {
	return `${EMOJI.impressions[type]} ${impressions}${upvotes ? ` ● ${EMOJI.upvotes[type]} ${upvotes}` : ""}${downvotes ? ` ● ${EMOJI.downvotes[type]} ${downvotes}` : ""}`;
}

export async function execute(msg: okbot.Message, args: string[]) {
	const typeArg = args[0]?.toLowerCase();
	const r = Math.random();
	let type: okbot.GayType = "Girls";
	let id;

	if (!typeArg) {
		if (r > 0.9) type = "Silly";
	} else {
		if (typeArg === "silly" || typeArg === "funny" || typeArg === "meme") type = "Silly";
		const indexArg = parseInt(args[1]);
		if (!isNaN(indexArg)) id = indexArg;
	}

	const gay = await db_get_gay(type, id);
	if (!gay) return sendSimpleMessage(msg, "**No gay found!**\n*You feel the world burst into total despair...*");

	const impressions = (gay.impressions ?? 0) + 1;
	const upvotes = gay.upvotes ?? 0;
	const downvotes = gay.downvotes ?? 0;
	const msge = new EmbedBuilder()
		.setTitle(`${type} #${gay._id}`)
		.setImage(gay.url)
		.setDescription(gay.source || null)
		.setFooter({ text: buildFooter(type, impressions, upvotes, downvotes) })
		.setColor(COLORS[type]);

	const idPrefix = `gay-${id}-${type}-${impressions}-${upvotes}-${downvotes}`;
	const voteButtons = new ActionRowBuilder<ButtonBuilder>().setComponents(
		new ButtonBuilder()
			.setCustomId(`${idPrefix}-upvote`)
			.setEmoji(EMOJI.upvotes[type])
			.setLabel("Yee")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId(`${idPrefix}-downvote`)
			.setEmoji(EMOJI.downvotes[type])
			.setLabel("Eww")
			.setStyle(ButtonStyle.Secondary)
	);

	const msgSent = await msg.reply({
		embeds: [msge],
		allowedMentions: { repliedUser: false },
		components: [voteButtons]
	});

	if (type == "Girls" && r < 0.1667) msgSent.react("🥺");
	db_plr_add({ _id: msg.author.id, gay: 1 });
	db_gay_add({ _id: gay._id, impressions: 1 }, type);
}
