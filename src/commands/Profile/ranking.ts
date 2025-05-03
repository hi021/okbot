import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, Guild, User } from "discord.js";
import { db_ranking_get, db_ranking_get_guild_ok } from "../../db/db.js";
import { bot } from "../../okbot.js";
import { createSimpleMessage, formatNumber, getUserFromMsg, sendSimpleMessage } from "../../utils.js";
import { RARE_ID } from "../Business/bakery.js";

const categories =
	"- total_money\n- ok\n- ok_guild\n- rep\n- rep_given\n- fish\n- aquarium_income\n- pond_caught\n- flags\n- bakery_value\n- baked\n- bakery_rares\n- gay\n- bottom";
const perPage = 20;
export const name = "ranking";
export const alias = ["top", "leaderboard"];
export const description = "🏆 higher = better";
export const usage = "<Category> <Page number> <Username OR Mention>";
export const usageDetail = "Categories:\n" + categories;

// pagination
bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (split[0] !== "ranking_prev" && split[0] !== "ranking_next") return;

	const category = split[1] as okbot.RankingField | "okGuild";
	const usrId = split[2];
	const page = parseInt(split[3]);

	const startRank = (page - 1) * perPage + 1;
	const ranking =
		category == "okGuild"
			? await db_ranking_get_guild_ok(startRank - 1, perPage, true)
			: await db_ranking_get(category, startRank - 1, perPage, true);
	if (!ranking?.length) {
		interaction.reply({
			embeds: [createSimpleMessage("🕸️ No matches for the given criteria.", Colors.Orange)]
		});
		return;
	}

	const nextPageAvailable = ranking.length > perPage;
	if (nextPageAvailable) ranking.pop();

	const categoryFormat = getCategoryFormat(category);
	const categoryTitle = categoryFormat!.categoryTitle;
	const valueFormatter = categoryFormat!.valueFormatter;

	const msge = createRankingEmbed(category, categoryTitle, ranking, startRank, page, usrId, valueFormatter);
	const row = new ActionRowBuilder<ButtonBuilder>();

	if (split[0] === "ranking_prev") {
		if (page <= 0) {
			interaction.update({});
			return;
		}

		row.setComponents(
			new ButtonBuilder()
				.setCustomId(`ranking_prev-${category}-${usrId}-${page - 1}`)
				.setEmoji("⬅️")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page <= 1),
			new ButtonBuilder()
				.setCustomId(`ranking_next-${category}-${usrId}-${page + 1}`)
				.setEmoji("➡️")
				.setStyle(ButtonStyle.Primary)
		);
	} else {
		//ranking_next
		row.setComponents(
			new ButtonBuilder()
				.setCustomId(`ranking_prev-${category}-${usrId}-${page - 1}`)
				.setEmoji("⬅️")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`ranking_next-${category}-${usrId}-${page + 1}`)
				.setEmoji("➡️")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(!nextPageAvailable)
		);
	}

	console.log("BEFORE UODATE"); //
	interaction.update({ content: "WAAA" });
});

function getCategoryFormat(category: string, usr?: User | Guild | null, guild?: Guild | null) {
	let categoryTitle;
	let valueFormatter = (val: string | number) => formatNumber(val);

	switch (category.toLowerCase()) {
		case "montot":
		case "totalmoney":
		case "total_money":
		case "moneytotal":
		case "money_total":
		case "":
			category = "monTot";
			categoryTitle = "💵 Highest total money earned";
			valueFormatter = (val: string | number) => `$${formatNumber(val)}`;
			break;
		case "rep.v":
		case "rep":
		case "rep_received":
		case "repreceived":
		case "rape":
		case "rapes":
			category = "rep.v";
			categoryTitle = "♂️ Most frequently raped";
			break;
		case "rep.am":
		case "rep_given":
		case "repgiven":
		case "rape_given":
		case "given_rep":
		case "givenrep":
			category = "rep.am";
			categoryTitle = "♂️ Most frequent raper";
			break;
		case "fishtotc":
		case "fish":
		case "fish_total":
			category = "fishTotC";
			categoryTitle = "🎣 Biggest baiters";
			break;
		case "gay":
			category = "gay";
			categoryTitle = "🐸 Gayest people";
			break;
		case "oktot":
		case "ok":
		case "okays":
			category = "okTot";
			categoryTitle = "🆗 Most okay people";
			break;
		case "okguild":
		case "ok_guild":
		case "okserver":
		case "ok_server":
		case "server_ok":
			category = "okGuild";
			categoryTitle = "🆗 Most okay servers";
			usr = guild;
			break;
		case "aqua.colltot":
		case "aquarium_income":
		case "aqua_income":
		case "aquarium":
		case "aqua":
			category = "aqua.collTot";
			categoryTitle = "💰 Aquariums closest to holding monopoly";
			valueFormatter = (val: string | number) =>
				`$${formatNumber(Math.round((val as number) * 100) / 100)}/h`;
			break;
		case "pond.fishtot":
		case "pond_caught":
		case "pond":
			category = "pond.fishTot";
			categoryTitle = "🎣 Biggest threats to fish populace";
			break;
		case "bottom":
			category = "bottom";
			categoryTitle = "👉👈 Biggest bottoms";
			valueFormatter = (val: string | number) => `${val}%`;
			break;
		case "flags":
		case "flag":
			category = "flags";
			categoryTitle = "🏳️ Biggest geography nerds";
			break;
		case "bakery.tot":
		case "bake":
		case "bakery":
		case "baked":
		case "cookies":
			category = "bakery.tot";
			categoryTitle = "🍪 Most dough used";
			break;
		case "bakery.totval":
		case "bakery_val":
		case "bakeryval":
		case "bakery_value":
		case "bake_val":
		case "bakeval":
			category = "bakery.totVal";
			categoryTitle = "🍪 Most dough earned";
			valueFormatter = (val: string | number) => `$${formatNumber(val)}`;
			break;
		case "bakery.stat.99":
		case "bakery_rare":
		case "bakery_rares":
		case "bake_rare":
		case "bake_rares":
		case "bakerare":
			category = "bakery.stat.99";
			categoryTitle = "<:adam:1007621226379886652> Most RNG luck";
			break;
		default:
			return;
	}

	return { category, categoryTitle, valueFormatter, usr };
}

function getFieldValue(category: string, userRanking: okbot.RankingUser) {
	switch (category) {
		case "rep.am":
			return userRanking.rep?.am;
		case "rep.v":
			return userRanking.rep?.v;
		case "aqua.collTot":
			return userRanking.aqua?.collTot;
		case "pond.fishTot":
			return userRanking.pond?.fishTot;
		case "bakery.tot":
			return userRanking.bakery?.tot;
		case "bakery.totVal":
			return userRanking.bakery?.totVal;
		case `bakery.stat.${RARE_ID}`:
			return userRanking.bakery?.stat[RARE_ID];
		case "okGuild":
			return (userRanking as okbot.RankingGuild).all;
		default:
			return userRanking[category as okbot.RankingField];
	}
}

function createRankingEmbed(
	category: string,
	categoryTitle: string,
	ranking: Array<okbot.RankingUser | okbot.RankingGuild>,
	startRank: number,
	page: number,
	usrId: string,
	formatField: (val: string | number) => string
) {
	let rankIndex = 0;
	let rankingStringUser = "";
	let rankingStringVal = "";
	for (const usrRanking of ranking) {
		const rank = startRank + rankIndex;
		const rankString = rank == 1 ? "👑" : `**#${rank}**`;
		const val = getFieldValue(category, usrRanking);
		if (val == null) continue;

		rankingStringUser += `${rankString}\t${usrRanking.nam || `\`<${usrRanking._id}>\``}\n`;
		rankingStringVal += usrRanking._id === usrId ? `**${formatField(val)}**\n` : `${formatField(val)}\n`;
		++rankIndex;
	}

	return new EmbedBuilder()
		.setFooter({
			text: `Page ${page} (${startRank} - ${startRank + (ranking?.length || perPage) - 1})`
		})
		.setColor(Colors.Aqua)
		.setTitle(categoryTitle)
		.addFields(
			{ name: "User", value: rankingStringUser, inline: true },
			{ name: "Value", value: rankingStringVal, inline: true }
		);
}

export async function execute(msg: okbot.Message, args: string[]) {
	let category = args.shift();
	let page = 1;
	let usr: User | Guild | undefined = msg.author;
	if (args?.length) {
		const pageRaw = parseInt(args[0]);
		if (isNaN(pageRaw)) usr = await getUserFromMsg(msg, args);
		else {
			page = pageRaw;
			args.shift();
			if (args.length) usr = await getUserFromMsg(msg, args);
		}

		if (!usr) usr = msg.author;
	}

	if (!category) category = "montot";
	const setCat = getCategoryFormat(category, usr, msg.guild);
	if (!setCat?.categoryTitle)
		return msg.reply({
			embeds: [
				createSimpleMessage(
					"Must be one of the following:\n" + categories,
					Colors.Red,
					"Invalid ranking field"
				)
			]
		});

	category = setCat.category;
	usr = setCat.usr as User;
	const { valueFormatter, categoryTitle } = setCat;

	msg.channel.sendTyping();
	const rankS = (page - 1) * perPage + 1; //start rank
	const ranking =
		category == "okGuild"
			? await db_ranking_get_guild_ok(rankS - 1, perPage, true)
			: await db_ranking_get(category as okbot.RankingField, rankS - 1, perPage, true);

	if (!ranking?.length)
		return sendSimpleMessage(msg, "No matches for the given criteria.", Colors.DarkOrange);

	const nextPageAvailable = ranking.length > perPage;
	if (nextPageAvailable) ranking.pop(); //will get one more result that wouldn't fit on the page to check for next page
	const msge = createRankingEmbed(category, categoryTitle, ranking, rankS, page, usr.id, valueFormatter);

	const components = nextPageAvailable
		? [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(`ranking_prev-${category}-${usr.id}-0`)
						.setEmoji("⬅️")
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(true),
					new ButtonBuilder()
						.setCustomId(`ranking_next-${category}-${usr.id}-2`)
						.setEmoji("➡️")
						.setStyle(ButtonStyle.Primary)
				)
			]
		: [];

	return msg.reply({ embeds: [msge], components, allowedMentions: { repliedUser: false } });
}
