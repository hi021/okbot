import { Colors, EmbedBuilder, Snowflake, userMention } from "discord.js";
import {
	countries,
	countries_common,
	countries_us_states,
	CountryRegion,
	CountryType
} from "../../countries.js";
import { db_plr_add } from "../../db/db.js";
import { SET } from "../../settings.js";
import {
	formatMilliseconds,
	formatTimer,
	nowSeconds,
	randomFromArray,
	sendSimpleMessage
} from "../../utils.js";
import { Flag_games } from "../../volatile.js";

export const name = "flags";
export const alias = ["flag", "flagquiz"];
export const description = "🏳️ Boast your highly sought after geography skills";
export const usage =
	'<Flag Category> <"Territories" (Only includes sovereign countries by default)> <Rounds (2-50, limited by category)> <Round Time (3-60 seconds)> <"Cancel">';
const categories =
	"- All (default)\n- Common\n- Europe\n- Asia\n- Americas\n- Africa\n- Oceania\n- US_States";
export const usageDetail = "Categories:\n" + categories;

type FlagArguments = {
	categoryName: string;
	countryCodes: Set<string>;
	countriesOnly: boolean;
	rounds: number;
	roundTime: number;
};
const ROUND_INTERVAL_MS = 4000;

async function sendFlagEmbed(game: okbot.FlagGame, countryCode: string) {
	const msge = new EmbedBuilder()
		.setImage(`https://flagcdn.com/w320/${countryCode}.jpg`)
		.setColor(Colors.DarkerGrey)
		.setAuthor({ name: `Round ${game.round}/${game.rounds}` })
		.setDescription(
			`Ends <t:${game.roundStartTime + Math.floor(game.roundTime / 1000) + 1 /* 1s magic constant to make up for the delay */}:R>`
		)
		.setFooter({ text: `${game.category} flags ● Images from flagpedia` });
	const flagMsg = (await game.channel.send({ embeds: [msge] })) as okbot.Message;
	game.flagMsg = flagMsg;
}

function chooseAndShowFlag(game: okbot.FlagGame) {
	const flag = randomFromArray([...game.flags]);
	game.curFlag = flag;
	sendFlagEmbed(game, flag);
	game.flags.delete(flag);
}

function roundPrepare(channelId: string) {
	const game = Flag_games[channelId];
	clearInterval(game.time);
	game.time = setInterval(() => roundStart(channelId), ROUND_INTERVAL_MS);
}

function roundStart(channelId: string) {
	const game = Flag_games[channelId];
	clearInterval(game.time);
	++game.round;
	game.roundStartTime = nowSeconds();
	chooseAndShowFlag(game);
	game.time = setInterval(() => roundFinish(channelId), game.roundTime);
}

function gameStart(channelId: string) {
	const game = Flag_games[channelId];
	game.gameStartTime = Date.now();
	roundPrepare(channelId);
}

function stopFlagEmbedTimer(game: okbot.FlagGame) {
	const msge = game.flagMsg.embeds[0];
	game.flagMsg.edit({ embeds: [EmbedBuilder.from(msge).setDescription(null)] });
}

function roundFinish(channelId: string) {
	const game = Flag_games[channelId];
	if (game.curFlag) {
		const gameCountries = game.category === "US States" ? countries_us_states : countries;
		const country = gameCountries[game.curFlag];
		stopFlagEmbedTimer(game);

		sendSimpleMessage<okbot.Message>(
			game.flagMsg,
			`The answer was **${country.nam[0]}**!`,
			Colors.DarkOrange,
			false
		);
	}
	if (game.round >= game.rounds) {
		gameEnd(channelId);
		return;
	}

	roundPrepare(channelId);
}

async function gameEnd(channelId: string) {
	const game = Flag_games[channelId];
	if (!game) return;

	clearInterval(game.time);
	game.round && stopFlagEmbedTimer(game);

	let desc = "";
	const scores: Array<{ usrId: Snowflake; points: number }> = [];
	for (const usrId in game.points) scores.push({ usrId, points: game.points[usrId] });

	if (!scores.length) {
		desc = "🕸️ *No one guessed any flags...*\n";
	} else if (scores[0].points >= game.rounds) {
		desc = `👑 ${userMention(scores[0].usrId)} got the perfect ${scores[0].points}/${game.rounds} game! 👑\n`;
		await db_plr_add({ _id: scores[0].usrId, flags: scores[0].points });
	} else {
		scores.sort((a, b) => (a.points < b.points ? 1 : -1));
		const promises = [];
		for (const i in scores) {
			if (i == "0") desc += "👑";
			else desc += `**#${Number(i) + 1}**`;
			desc += ` ${userMention(scores[i].usrId)}: ${scores[i].points}\n`;

			promises.push(
				new Promise(async resolve => {
					await db_plr_add({ _id: scores[i].usrId, flags: scores[i].points });
					resolve(1);
				})
			);
		}

		await Promise.all(promises);
	}

	const msge = new EmbedBuilder()
		.setTitle("Quiz results 🏁")
		.setDescription(desc)
		.setColor(Colors.DarkGrey)
		.setFooter({
			text: `${game.round} of ${game.category} flags ● Took ${formatTimer(Date.now() - game.gameStartTime - ROUND_INTERVAL_MS * game.round)} ⏱️`
		});
	game.channel.send({ embeds: [msge] });

	delete Flag_games[channelId];
}

const normalizeCountryName = (name: string) =>
	name
		.replaceAll(/[,\(\)-\.']/g, "")
		.replaceAll(/(\s+?|^)(the|of|and|saint|st)/gi, "")
		.normalize("NFD")
		.replaceAll(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();

const isAnswerCorrect = (name: string, answer: string) =>
	normalizeCountryName(name) == normalizeCountryName(answer);

export function roundAnswer(channelId: string, answer: string, userId: string) {
	const game = Flag_games[channelId];
	if (!game?.curFlag) return;

	const gameCountries = game.category === "US States" ? countries_us_states : countries;
	const country = gameCountries[game.curFlag];
	for (const name of country.nam) {
		if (!isAnswerCorrect(name, answer)) continue;

		game.points[userId] = (game.points[userId] ?? 0) + 1;
		game.curFlag = "";
		stopFlagEmbedTimer(game);
		sendSimpleMessage<okbot.Message>(
			game.flagMsg,
			`${userMention(userId)} is correct!\nThe answer was **${country.nam[0]}**.`,
			Colors.DarkGreen,
			false
		);

		game.round >= game.rounds ? gameEnd(channelId) : roundPrepare(channelId);
		break;
	}
}

function findCountryCodes(regions: CountryRegion[] = [], countriesOnly = true) {
	const countryCodes = new Set<string>();
	for (const countryCode in countries) {
		const country = countries[countryCode];
		const isInRegion = !regions.length || (country.region && regions.includes(country.region));
		const isRightType = !countriesOnly || country.type == CountryType.COUNTRY;
		if (isInRegion && isRightType) countryCodes.add(countryCode);
	}
	return countryCodes;
}

function setCategory(regionQuery: string, countriesOnly: boolean) {
	let countryCodes = new Set<string>();
	let categoryName: string;
	switch (regionQuery) {
		case "all":
		case "all_country":
		case "all_countries":
			categoryName = "All";
			if (!countriesOnly) countryCodes = new Set(Object.keys(countries));
			break;
		case "us":
		case "usa":
		case "us_states":
		case "usa_states":
		case "states": {
			categoryName = "US States";
			countryCodes = new Set(Object.keys(countries_us_states));
			break;
		}
		case "basic":
		case "easy":
		case "common": {
			categoryName = "Common";
			countryCodes = new Set(countries_common);
			break;
		}
		case "eu":
		case "europe":
		case "european": {
			categoryName = "European";
			countryCodes = findCountryCodes([CountryRegion.EUROPE], countriesOnly);
			break;
		}
		case "africa":
		case "african": {
			categoryName = "African";
			countryCodes = findCountryCodes([CountryRegion.AFRICA], countriesOnly);
			break;
		}
		case "asia":
		case "asian": {
			categoryName = "Asian";
			countryCodes = findCountryCodes([CountryRegion.ASIA], countriesOnly);
			break;
		}
		case "oceania":
		case "oceanian":
		case "australia":
		case "australian": {
			categoryName = "Oceania";
			countryCodes = findCountryCodes([CountryRegion.OCEANIA], countriesOnly);
			break;
		}
		case "america":
		case "american":
		case "americas": {
			categoryName = "American";
			countryCodes = findCountryCodes(
				[CountryRegion.NORTH_AMERICA, CountryRegion.SOUTH_AMERICA],
				countriesOnly
			);
			break;
		}
		default: {
			return null;
		}
	}

	return { countryCodes, categoryName };
}

// TODO?: This could do with a little refactor..
function parseArguments(args: string[]): FlagArguments | okbot.ErrorWithMessageResponse {
	let categoryName = "All";
	let countryCodes = findCountryCodes();
	let countriesOnly = true; // if false means the argument was read
	let roundTime = SET.FLAG_TIME || 20000;
	let rounds = 10;
	let roundsSet = false; // whether the argument for rounds was read

	if (args.length) {
		//1st argument
		const arg = args.shift() as string;
		const argNum = Number(arg);
		const firstArgLower = arg.toLowerCase();

		if (isNaN(argNum)) {
			if (firstArgLower === "t" || firstArgLower === "territory" || firstArgLower === "territories") {
				//default category + !countriesOnly [2]
				countriesOnly = false;
			} else {
				//chosen category [1]
				const categorySet = setCategory(firstArgLower, countriesOnly);
				if (!categorySet) return { error: "**Invalid category**.\nAvailable options are:\n" + categories };
				countryCodes = categorySet.countryCodes;
				categoryName = categorySet.categoryName;
			}
		} else {
			//if argument is numeric
			//default category + rounds [3]
			if (argNum < 2 || argNum > 50) return { error: "Number of rounds must be between **2** and **50**." };
			rounds = Math.min(argNum, countryCodes.size);
			roundsSet = true;
		}

		if (args.length) {
			//2nd argument
			const arg = args.shift() as string;
			const argNum = Number(arg);

			if (isNaN(argNum)) {
				//rounds + roundTime [4]
				if (roundsSet) return { error: "Round time must be between **3** and **60** seconds." };

				const argLower = arg.toLowerCase();
				if (argLower === "t" || argLower === "territory" || argLower === "territories") {
					//chosen category + countriesOnly [2]
					countriesOnly = false;
					const categorySet = setCategory(firstArgLower, countriesOnly);
					if (!categorySet) return { error: "**Invalid category**.\nAvailable options are:\n" + categories };
					countryCodes = categorySet.countryCodes;
					categoryName = categorySet.categoryName;
				} else {
					//chosen category or !countriesOnly + rounds [3]
					return { error: "Number of rounds must be between **2** and **50**." };
				}
			} else {
				//if argument is numeric
				if (roundsSet) {
					//rounds + roundTime [4]
					if (argNum < 3 || argNum > 60)
						return { error: "Round time must be between **3** and **60** seconds." };
					roundTime = argNum * 1000;
				} else {
					//chosen category or !countriesOnly + rounds [3]
					if (argNum < 2 || argNum > 50)
						return { error: "Number of rounds must be between **2** and **50**." };
					rounds = Math.min(argNum, countryCodes.size);
					roundsSet = true;
				}
			}

			if (args.length) {
				// 3rd argument
				const arg = args.shift() as string;
				const argNum = Number(arg);

				if (roundsSet) {
					// chosen category or !countriesOnly + rounds + roundTime [4]
					if (isNaN(argNum) || argNum < 3 || argNum > 60)
						return { error: "Round time must be between **3** and **60** seconds." };
					roundTime = argNum * 1000;
				} else {
					// chosen category + !countriesOnly + rounds [3]
					if (isNaN(argNum) || argNum < 2 || argNum > 50)
						return { error: "Number of rounds must be between **2** and **50**." };
					rounds = Math.min(argNum, countryCodes.size);
					roundsSet = true;
				}

				if (args.length) {
					// 4th argument
					const arg = args.shift() as string;
					const argNum = Number(arg);

					// chosen category + !countriesOnly + rounds + roundTime [4]
					if (isNaN(argNum) || argNum < 3 || argNum > 60)
						return { error: "Round time must be between **3** and **60** seconds." };
					roundTime = argNum * 1000;
				}
			}
		}
	}

	return { categoryName, countryCodes, countriesOnly, rounds, roundTime };
}

const isErrorResponse = (
	result: FlagArguments | okbot.ErrorWithMessageResponse
): result is okbot.ErrorWithMessageResponse => (result as { error: string }).error !== undefined;

export async function execute(msg: okbot.Message, args: string[]) {
	const channelId = msg.channel.id;
	const arg1 = args[0]?.toLowerCase();
	if (arg1 === "cancel" || arg1 === "stop") return gameEnd(channelId);
	if (!msg.channel.isTextBased()) return sendSimpleMessage(msg, "Must start game in a text-based channel!");
	if (Flag_games[channelId])
		return sendSimpleMessage(msg, "There's already a game in progress in this channel!");

	const parsedArgs = parseArguments(args);
	if (isErrorResponse(parsedArgs)) return sendSimpleMessage(msg, parsedArgs.error);

	const { categoryName, countryCodes, countriesOnly, rounds, roundTime } = parsedArgs;

	const flagMsg = await sendSimpleMessage<okbot.Message>(
		msg,
		`Flag quiz will start in **${formatMilliseconds(ROUND_INTERVAL_MS)}**!
- **${rounds}** rounds,
- Up to **${formatMilliseconds(roundTime)}** per round,
- ${
			countriesOnly
				? "Only regions recognized as **countries**"
				: "**All regions**, including dependent territories,"
		} in play.

        Use \`${name} cancel\` to stop the game at any time.`,
		Colors.DarkGrey
	);

	Flag_games[channelId] = {
		category: categoryName,
		channel: msg.channel,
		flagMsg,
		flags: countryCodes,
		curFlag: "",
		points: {},
		round: 0,
		rounds,
		roundStartTime: 0,
		roundTime,
		gameStartTime: 0
	};
	gameStart(channelId);
}
