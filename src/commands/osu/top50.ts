import { AttachmentBuilder, EmbedBuilder, User } from "discord.js";
import { db_plr_get } from "../../db/db.js";
import { db_osu_find_players } from "../../db/osu.js";
import { SET } from "../../settings.js";
import { formatDate, formatNumber, getUsersFromMsg, sendSimpleMessage } from "../../utils.js";
import {
	getOsuAvatar,
	merge_avatars,
	merged_avatars_get,
	osu_getId,
	osu_getT50,
	top50_chart_generate,
	top50_chart_get
} from "../../utilsOsu.js";

export const name = "top50";
export const alias = ["t50", "osu"];
export const description = "🟣 View osu! top 50 stats from poggers.ltd";
export const usage =
	"<osu! username OR Discord nickname OR Mention> <, Second player for comparison> (-id, -pos, -noDiscord)";
export const usageDetail =
	"E.g.\n 'Rafis, WubWoofWolf' or '2558286, 39828 -id' to show comparison between those two players\n '150 -pos' to show stats for the person with rank #150\n '1, 2 -pos' to show a comparison between two highest ranked players\n 'DE 4, US 4 -pos' to show a comparison between DE#4 and US#4 players";

const msgNoUsr =
	"**Please provide a user** (osu! username, or osu! id appending `-id` flag, or top 50 position appending `-pos` flag)\nYou can use the `osuset` command to have this command default to the given username.";
const msgNotEnoughUsr =
	"No players match your query.\nOnly people with at least **1000** top 50s in osu!standard are tracked.";
const clr1 = "#AD1457";
const clr2 = "#283593";

/* parser unit test :)
["",
"Jeff",
"Jeff Seven",
"Jeff Seven Eleven Two",
"Jeff Seven Eleven Two, Jeffrey 2 and yeah",
"Jeff Seven Eleven Two, Jeffrey 2 and yeah -noDiscord",
" Jeff  -noDiscord",
"Jeff, Jeff2",
"Jeff,Jeff2",
"Jeff ,Jeff2",
"Jeff , Jeff2",
"Jeff    ,       Jeff2",
"1234567 -id",
"1234567 -id -noDiscord",
"1234567, 12345678 -id",
"1234567, 12345678 -id -noDiscord",
"1234567, 12345678 -noDiscord -id",
"123 -pos",
"123 -pos -noDiscord",
"123, 3 -pos",
"DE 2 -pos",
"US 120 -pos",
"US 120, 10 -pos",
"US 1, US 10 -pos",
"PL 199, US 200 -pos",
"1, US 20 -pos",
]
*/

//THIS IS SUCH A MESS URGHH

//TODO?: auto set -post flag if Number(nick) < 10000 but what if someone sets nick as numbers
function parseArgs(args: string[]) {
	if (!args) return null;

	let argsString = args.join(" ");
	let splitByFlag = argsString.split("-");

	const nicks = [];
	const flags = [];
	let nicksRaw = splitByFlag.shift()!.split(",");

	for (const j of splitByFlag) flags.push(j.trim().toLowerCase());
	let flagsParsed: { id?: boolean; pos?: boolean; nodiscord?: boolean } = {
		nodiscord: flags.includes("nodiscord")
	};

	//-id takes precedence, then -pos, then -noDiscord
	if (flags.includes("id")) {
		flagsParsed = { id: true };
		//convert ids to numbers
		for (const j of nicksRaw) {
			let k = Number(j);
			if (isNaN(k)) return null;
			nicks.push(k);
		}
	} else if (flags.includes("pos")) {
		//split to {cntr?, pos}
		flagsParsed = { pos: true };
		for (const j of nicksRaw) {
			let k = j.trim().split(" ");

			if (k.length == 1) {
				let pos = Number(j);
				if (isNaN(pos)) return null;
				nicks.push({ pos });
			} else {
				let cntr = k[0];
				if (cntr.length != 2) return null;
				let pos = Number(k[1]);
				if (isNaN(pos)) return null;
				nicks.push({ cntr, pos });
			}
		}
	} else {
		//plaintext discord or osu usernames
		for (const j of nicksRaw) nicks.push(j.trim());
	}

	return { nicks, flags: flagsParsed };
}

export async function execute(msg: okbot.Message, args: string[]) {
	let ids;
	if (!args.length) {
		//self
		const plrdat = await db_plr_get({ _id: msg.author.id, osu: 1 });
		if (!plrdat?.osu) return sendSimpleMessage(msg, msgNoUsr);

		ids = [plrdat.osu] as number[];
	} else {
		let argsParsed = parseArgs(args);

		if (!argsParsed)
			return sendSimpleMessage(msg, `Invalid arguments.\nUse \`${SET.PREFIX}help ${name}\` to view help.`);
		if (!argsParsed?.nicks?.length) return sendSimpleMessage(msg, msgNoUsr);

		//-id takes precedence, then -pos, then -noDiscord
		if (argsParsed.flags.id) {
			ids = argsParsed.nicks as number[];
		} else if (argsParsed.flags.pos) {
			let posFull = argsParsed.nicks as Array<{ pos: number; cntr?: string }>;
			let positions = [
				posFull[0]?.cntr ? { cntrPos: posFull[0].pos, cntr: posFull[0].cntr } : { pos: posFull[0]?.pos },
				posFull[1]?.cntr ? { cntrPos: posFull[1].pos, cntr: posFull[1].cntr } : { pos: posFull[1]?.pos }
			];

			const players = await db_osu_find_players({ $or: positions, cur: true }, { _id: 1 });

			if (!players || argsParsed.nicks.length > players.length)
				return sendSimpleMessage(msg, msgNotEnoughUsr);

			ids = new Array(players.length);
			for (const i in players) ids[i] = players[i]._id;
		} else if (argsParsed.flags.nodiscord) {
			ids = await idsFromOsu(argsParsed.nicks as string[]);
		} else {
			//look for discord users first
			const dscRaw = await getUsersFromMsg(msg, argsParsed.nicks as string[]);
			if (dscRaw?.length == argsParsed.nicks.length) {
				ids = await idsFromDiscord(dscRaw);
				if (!ids?.length) ids = await idsFromOsu(argsParsed.nicks as string[]);
			} else {
				ids = await idsFromOsu(argsParsed.nicks as string[]);
			}
		}
	}

	let len = 0;
	if (ids) for (const i of ids) if (i) ++len;

	if (!len) return sendSimpleMessage(msg, msgNotEnoughUsr);
	if (len == 1) return await sendT50(msg, (ids![0] ?? ids![1]) as number);
	else return await sendT50Compare(msg, ids as number[]);
}

function formatPlayerData(stats: any, nlDelimiter = "\n", spaceDelimiter = " ", pOpen = "", pClose = "") {
	if (!stats?.stats?.[1]?.nam) return null;
	const dateToday = formatDate(new Date(), "user");

	const gained = stats.stats[1].last - stats.stats[1].first;
	const gainedBeginning = `${formatNumber(gained, "\u00A0")}${nlDelimiter}(${
		Math.round((gained / stats.stats[1].days) * 100) / 100
	}/day)`;
	const gained3Weeks =
		stats.last?.gainedAvg == null
			? "-"
			: `${formatNumber(stats.last.gained, "\u00A0")}${nlDelimiter}(${stats.last.gainedAvg.toFixed(2)}/day)`;
	const t503Weeks = stats.last?.t50;

	const date = stats.info?.date || stats.date;
	const isUpToDate = stats.info.cur;
	const mainInfo = stats.info
		? `${stats.info.nam} - ${formatNumber(stats.info.t50, "\u00A0")} top 50s (#${stats.info.pos} | ${stats.info.cntr}#${
				stats.info.cntrPos
			})`
		: `${stats.stats[1].nam} - ${formatNumber(stats.stats[1].last, "\u00A0")} top 50s`;
	const countryFlag = stats.info.cntr && "https://assets.ppy.sh/old-flags/" + stats.info.cntr + ".png";

	const peak = `${formatNumber(stats.stats[1].max.val, "\u00A0")}${nlDelimiter}${pOpen}${formatDate(
		new Date(stats.stats[1].max.d),
		"user",
		dateToday
	)}${pClose}`;
	const lowest = `${formatNumber(stats.stats[1].min.val, "\u00A0")}${nlDelimiter}${pOpen}${formatDate(
		new Date(stats.stats[1].min.d),
		"user",
		dateToday
	)}${pClose}`;
	const gained1Day = stats.topGain?.g50
		? `${stats.topGain.g50}${nlDelimiter}${pOpen}${stats.topGain.d.join("," + spaceDelimiter)}${pClose}`
		: "-";

	return {
		date,
		gainedBeginning,
		gained3Weeks,
		mainInfo,
		t503Weeks,
		countryFlag,
		peak,
		lowest,
		gained1Day,
		isUpToDate
	};
}

async function sendT50(msg: okbot.Message, id: string | number) {
	if (!msg.channel.isSendable()) return;
	msg.channel.sendTyping();
	const stats = formatPlayerData(await osu_getT50(id));
	if (!stats)
		return sendSimpleMessage(msg, `> No stats for player with id \`${id}\` (or the database went bobo).`);

	const av = getOsuAvatar(id);
	const filename = `${id}_${stats.date}.png`;
	//check if chart already exists, generate if doesn't
	let chart = top50_chart_get(filename);
	if (!chart && stats.t503Weeks?.length)
		chart = await top50_chart_generate([stats.t503Weeks], [clr1], filename);
	const chartFile = chart && new AttachmentBuilder(chart);
	const files = chartFile ? [chartFile] : [];

	msg.reply({
		embeds: [
			new EmbedBuilder()
				.setAuthor({
					name: stats.mainInfo,
					iconURL: stats.countryFlag || av,
					url: "https://poggers.ltd/player/" + id
				})
				.setColor(clr1)
				.setThumbnail(av)
				.addFields([
					{
						name: "Peak",
						value: stats.peak,
						inline: true
					},
					{
						name: "Lowest",
						value: stats.lowest,
						inline: true
					},
					{
						name: "Gained last 3 weeks",
						value: stats.gained3Weeks,
						inline: true
					},
					{
						name: "Gained since first appearance",
						value: stats.gainedBeginning,
						inline: true
					},
					{
						name: "Most gained in a day",
						value: stats.gained1Day,
						inline: true
					}
				])
				.setFooter({
					text: `poggers.ltd ● ${stats.date}${stats.isUpToDate ? "" : " ● OUTDATED"}`,
					iconURL: "https://poggers.ltd/senkoicon.png"
				})
				.setImage(`attachment://${filename}`)
		],
		files,
		allowedMentions: {
			repliedUser: false
		}
	});
}

async function sendT50Compare(msg: okbot.Message, id: Array<string | number>) {
	if (!msg.channel.isSendable()) return;
	if (id[0] == id[1]) return sendSimpleMessage(msg, "Cannot compare a player to themselves...");
	msg.channel.sendTyping();

	const stats1 = await osu_getT50(id[0]);
	const stats1Formatted = formatPlayerData(stats1, " ", "\n", "(", ")");
	if (!stats1Formatted)
		return sendSimpleMessage(msg, `> No stats for player with id \`${id[0]}\` (or the database went bobo).`);
	const stats2 = await osu_getT50(id[1]);
	const stats2Formatted = formatPlayerData(stats2, " ", "\n", "(", ")");
	if (!stats2Formatted)
		return sendSimpleMessage(msg, `> No stats for player with id \`${id[1]}\` (or the database went bobo).`);

	//Differences
	let longestDifference = 0;
	//later they become strings if they're positive
	const differences: {
		t50: number;
		peak: number;
		lowest: number;
	} = {
		t50: stats1.stats[1].last - stats2.stats[1].last,
		peak: stats1.stats[1].max.val - stats2.stats[1].max.val,
		lowest: stats1.stats[1].min.val - stats2.stats[1].min.val
	};

	const gainedRelativeDaily =
		stats1.last?.gainedAvg == null || stats2.last?.gainedAvg == null
			? null
			: stats1.last.gainedAvg - stats2.last.gainedAvg;
	const daysUntilOvertake =
		gainedRelativeDaily &&
		((gainedRelativeDaily > 0 && differences.t50 < 0) || (gainedRelativeDaily < 0 && differences.t50 > 0))
			? Math.ceil(differences.t50 / -gainedRelativeDaily)
			: null;

	for (const i in differences) {
		//@ts-ignore
		differences[i] = `${differences[i] > 0 ? "+" : ""}${formatNumber(differences[i])}`;
		//@ts-ignore
		if (differences[i].length > longestDifference) longestDifference = differences[i].length;
	}
	// const differenceSpaces = 8 - longestDifference; //can be used to set fixed width
	const differenceSpaces = 0;
	for (const i in differences) {
		//@ts-ignore
		differences[i] += " ".repeat(differenceSpaces + (longestDifference - differences[i].length));
	}

	const emptyField = { name: "\u200b", value: "\u200b", inline: true };

	const filenameAv = `${id[0]}-${id[1]}-${stats1Formatted.date}.png`;
	const av1 = getOsuAvatar(id[0]);
	const av2 = getOsuAvatar(id[1]);
	let avMerged = merged_avatars_get(filenameAv);
	if (!avMerged) avMerged = await merge_avatars(av1, av2, filenameAv); //local path

	const filenameChart = `${id[0]}_${id[1]}_${stats1Formatted.date}.png`;
	let chart = top50_chart_get(filenameChart); //local path
	if (!chart && (stats1Formatted.t503Weeks?.length || stats2Formatted.t503Weeks?.length))
		chart = await top50_chart_generate(
			[stats1Formatted.t503Weeks, stats2Formatted.t503Weeks],
			[clr1, clr2],
			filenameChart
		);

	const files = [];
	if (avMerged) files.push(new AttachmentBuilder(avMerged));
	if (chart) files.push(new AttachmentBuilder(chart));

	let footerText = `poggers.ltd ● ${stats1.info?.date}`;
	if (!stats1Formatted.isUpToDate || !stats2Formatted.isUpToDate) footerText += " ● OUTDATED";
	if (daysUntilOvertake)
		footerText += `\n${daysUntilOvertake} days until ${
			(gainedRelativeDaily as number) < 0 ? stats1.info.nam : stats2.info.nam
		} is overtaken at current rate`;

	return msg.reply({
		embeds: [
			new EmbedBuilder()
				.setTitle(
					stats1.info && stats2.info
						? `${stats1.info.nam} vs ${stats2.info.nam}`
						: `${stats1.stats[1].nam} vs ${stats2.stats[1].nam}`
				)
				.setURL("https://poggers.ltd/player/" + id[0])
				.setColor(clr1)
				.setThumbnail(avMerged ? `attachment://${filenameAv}` : "")
				.addFields([
					{
						name: `🔴 ${stats1.info.nam} - ${formatNumber(stats1.info.t50)}`.replace(/ /g, "\u00A0"),
						value: `🌍 #${stats1.info.pos}, :flag_${stats1.info.cntr.toLowerCase()}: #${stats1.info.cntrPos}`,
						inline: true
					},
					{
						name: "\u200b",
						value: `\`${differences.t50}\``,
						inline: true
					},
					{
						name: `🔵 ${stats2.info.nam} - ${formatNumber(stats2.info.t50)}`.replace(/ /g, "\u00A0"),
						value: `🌍 #${stats2.info.pos}, :flag_${stats2.info.cntr.toLowerCase()}: #${stats2.info.cntrPos}`,
						inline: true
					},
					{
						name: "Peak",
						value: stats1Formatted.peak,
						inline: true
					},
					{
						name: "\u200b",
						value: `\`${differences.peak}\``,
						inline: true
					},
					{
						name: "\u200b",
						value: stats2Formatted.peak,
						inline: true
					},
					{
						name: "Lowest",
						value: stats1Formatted.lowest,
						inline: true
					},
					{ name: "\u200b", value: `\`${differences.lowest}\``, inline: true },
					{
						name: "\u200b",
						value: stats2Formatted.lowest,
						inline: true
					},
					{
						name: "Gained last 3 weeks",
						value: stats1Formatted.gained3Weeks,
						inline: true
					},
					emptyField,
					{
						name: "\u200b",
						value: stats2Formatted.gained3Weeks,
						inline: true
					},
					{
						name: "Gained since start",
						value: stats1Formatted.gainedBeginning,
						inline: true
					},
					emptyField,
					{
						name: "\u200b",
						value: stats2Formatted.gainedBeginning,
						inline: true
					},
					{
						name: "Most gained day",
						value: stats1Formatted.gained1Day,
						inline: true
					},
					emptyField,
					{
						name: "\u200b",
						value: stats2Formatted.gained1Day,
						inline: true
					}
				])
				.setFooter({
					text: footerText,
					iconURL: "https://poggers.ltd/senkoicon.png"
				})
				.setImage(`attachment://${filenameChart}`)
		],
		files,
		allowedMentions: {
			repliedUser: false
		}
	});
}

async function idsFromOsu(nicks: string[]) {
	if (nicks.length == 1) {
		let id = await osu_getId(nicks[0]);
		return id ? [id] : null;
	}

	try {
		const promises = [];
		for (const i in nicks) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						let n = await osu_getId(nicks[i]);
						resolve(n);
					} catch (e) {
						reject(e);
					}
				})
			);
		}

		return await Promise.all(promises);
	} catch (e) {
		console.error("Failed to get id from osu! username:\n", e);
		return null;
	}
}

async function idsFromDiscord(users: Array<User>) {
	if (users.length == 1) {
		let id = await db_plr_get({ _id: users[0].id, osu: 1 });
		return id?.osu ? [id.osu] : null;
	}

	try {
		const promises = [];
		for (const i in users) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						let id = await db_plr_get({ _id: users[i].id, osu: 1 });
						if (!id?.osu) throw new Error(`No osu! profile for ${users[i].id}`);
						resolve(id.osu);
					} catch (e) {
						reject(e);
					}
				})
			);
		}

		return await Promise.all(promises);
	} catch (e) {
		console.error("Failed to get id from osu! username:\n", e);
		return null;
	}
}
