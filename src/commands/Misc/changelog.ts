import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from "discord.js";
import { bot } from "../../okbot.js";
import { SET } from "../../settings.js";
import { sendSimpleMessage } from "../../utils.js";

export const name = "changelog";
export const alias = ["changes", "update"];
export const description = "📋 View the bot's changelog";
export const usage = "<Version string>";
export const usageDetail =
	"Version strings look like '0.17.2', '1.2.3', etc.\nTracked since 0.10.2 (June 2022).";
const perPage = 7;

// pagination
bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (split[0] !== "changelog_prev" && split[0] !== "changelog_next") return;

	const page = parseInt(split[1]);
	if (page <= 0) return interaction.update({});

	const changelog = showChangelog(page);
	interaction.update({ embeds: [changelog.msge], components: changelog.components });
});

const versions: Readonly<{ [ver: string]: string }> = Object.freeze({
	"1.11.0": "2025-05-18",
	"1.10.4": "2025-01-29",
	"1.10.3": "2025-01-23",
	"1.10.2": "2024-08-10",
	"1.10.1": "2024-07-28",
	"1.10.0": "2024-07-06",
	"1.9.2": "2024-02-05",
	"1.9.1": "2024-01-28",
	"1.9.0": "2023-12-11",
	"1.8.8": "2023-11-27",
	"1.8.7": "2023-08-08",
	"1.8.6": "2023-07-17",
	"1.8.5": "2023-06-17",
	"1.8.4": "2023-05-24",
	"1.8.3": "2023-03-27",
	"1.8.2": "2023-03-19",
	"1.8.1": "2023-03-07",
	"1.8.0": "2023-02-27",
	"1.7.3": "2023-01-19",
	"1.7.2": "2023-01-18",
	"1.7.1": "2023-01-17",
	"1.7.0": "2023-01-15",
	"1.6.9": "2023-01-11",
	"1.6.8": "2022-12-16",
	"1.6.7": "2022-12-11",
	"1.6.6": "2022-12-05",
	"1.6.5": "2022-12-04",
	"1.6.4": "2022-12-01",
	"1.6.3": "2022-11-17",
	"1.6.2": "2022-11-11",
	"1.6.1": "2022-09-27",
	"1.6.0": "2022-09-24",
	"1.5.0": "2022-09-19",
	"1.4.1": "2022-09-14",
	"1.4.0": "2022-09-11",
	"1.3.0": "2022-08-23",
	"1.2.1": "2022-08-16",
	"1.2.0": "2022-08-14",
	"1.1.2": "2022-08-13",
	"1.1.1": "2022-08-12",
	"1.1.0": "2022-08-12",
	"1.0.2": "2022-07-21",
	"1.0.1": "2022-07-20",
	"1.0.0": "2022-07-15",
	"0.20.1": "2022-07-14",
	"0.20.0": "2022-07-13",
	"0.19.0": "2022-06-27",
	"0.18.0": "2022-06-14",
	"0.17.4": "2022-06-12",
	"0.17.3": "2022-06-12",
	"0.17.2": "2022-06-11",
	"0.17.1": "2022-06-11",
	"0.17.0": "2022-06-10",
	"0.16.2": "2022-06-09",
	"0.16.1": "2022-06-09",
	"0.16.0": "2022-06-09",
	"0.15.1": "2022-06-08",
	"0.15.0": "2022-06-06",
	"0.14.0": "2022-06-06",
	"0.13.2": "2022-06-05",
	"0.13.1": "2022-06-05",
	"0.13.0": "2022-06-05",
	"0.12.0": "2022-06-05",
	"0.11.0": "2022-06-04",
	"0.10.5": "2022-06-03",
	"0.10.4": "2022-06-02",
	"0.10.3": "2022-06-02",
	"0.10.2": "2022-06-02"
});

const changes: Readonly<{ [ver: string]: string[] }> = Object.freeze({
	"1.11.0": [
		"**Major refactor**",
		"Linked public GitHub repository",
		"Added 'bakery' rare bundles",
		"Added 'daily' streak multipliers",
		"Improved 'flag' quiz",
		"Revamped ok counting, adding many more variants",
		"Added 'changelog' release dates (hi!)",
		"Brought down 'flip' win odds from 51% to even 50%",
		"Improved a few mod commands",
		"Tweaked the visuals and put some thought into uniformity",
		"Improved 'roulette' argument parsing allowing any argument order",
		"Fixed 'bank' counting interest before first deposit",
		"Fixed ok count not saving for guilds with no prior records",
		"Fixed garbled text at the top of 'lyrics'",
		"Fixed 'store' allowing duplicate item orders",
		"Fixed minor 'ranking' pagination issues",
		"Fixed 'slot' forcing bet amounts when user provided amount is invalid",
		"Added more gay",
		"Made error messages and logs easier to understand",
		"Updated dependencies",
		"Miscellaneous fixes all over the place"
	],
	"1.10.4": ["Fixed 'top50' charts not rendering", "Aded new 'bakery' levels up to 23"],
	"1.10.3": ["Updated genius API fetcher to bring lyrics back", "Updated dependencies"],
	"1.10.2": ["Fixed 'song' auto spotify queries"],
	"1.10.1": [
		"Tweaked 'bakery sell all' to not sell rare cookies unless explicitly stated",
		"Improved the 'jackpot' experience by fixing its jerky message updates",
		"Added 'changelog' pagination (that's me!)",
		"Added rare cookies to 'bake explain'",
		"Highlight upgraded stats before purchasing business upgrades & minor improvements",
		"Minor fixes & more tooltips"
	],
	"1.10.0": [
		"Implemented basic 'collection' forging and related rewards",
		"Added 'bake explain'",
		"Added new 'bake' levels & minor fix",
		"Added casino High Roller card booster",
		"Added 'aqua' storage capacity boosters",
		"Improved 'ok' presentation",
		"Updated dependencies & refactoring"
	],
	"1.9.2": [
		"Cleaned up 'store' and added indication for purchased items",
		"Added new 'bake' levels",
		"Slightly decreased bake times for most 'bake' cookies",
		"Small fixes to 'daily' and 'casinostats'"
	],
	"1.9.1": ["Slight 'bank' buff & fixed duplicated membership", "Other minor fixes"],
	"1.9.0": [
		"Added 'bank'",
		"Added more 'bake' levels",
		"'bake' hourly income",
		"Minor fixes & general improvements",
		"Fixed 'help' to use custom guild prefixes"
	],
	"1.8.8": [
		"Money-level-dependent 'daily' reward",
		"Minor economy balances",
		"Ubiquitous visual clarification & unification",
		"Minor fixes",
		"Updated dependencies"
	],
	"1.8.7": [
		"Added 'bake' lv 11 cookie requirements and levels 12-13",
		"Replaced usernames with display names",
		"Increased maximum bets",
		"Small tweaks",
		"Updated libraries"
	],
	"1.8.6": ["Cleaned out broken images in 'gay' again", "Added more emoji to 'bake' cookies"],
	"1.8.5": [
		"Fixed 'slot' crash if no arguments provided",
		"Minor fixes to 'bake'",
		"Removed user discriminators where possible"
	],
	"1.8.4": ["Minor fixes to 'bake'", "Fixed 'fish stats'", "Cleaned out broken images in 'gay'"],
	"1.8.3": ["Fixed and improved 'jackpot'", "Minor fixes to 'lyrics' and 'bakery'"],
	"1.8.2": [
		"Add Spotify presence and .fmbot .fm command support to 'lyrics'",
		"Fixed 'ranking' pagination not working for some categories"
	],
	"1.8.1": ["Minor fixes to 'bakery'", "Added 'lyrics'"],
	"1.8.0": [
		"Added 'bake'",
		"Added the ability to use 'k' and 'M' suffixes for casino bets",
		"Slightly improved 'emoji'",
		"Minor visual tweaks"
	],
	"1.7.3": ["Small 'casinostats' tweaks and fixes"],
	"1.7.2": ["Added the ability to purchase multiple items at once", "Tweaks to slot symbols"],
	"1.7.1": [
		"Added 'casinostats'",
		"Added top wins leaderboards for all casino games",
		"Improved top wins leaderboard for slots"
	],
	"1.7.0": [
		"Improved 'store' (category browsing, purchasing from item info screen)",
		"Added a notification when catching multiple fish of the same kind",
		"Started counting detailed gambling stats"
	],
	"1.6.9": ["Trimming reaction messages", "More profile badges and price adjustments", "More gay"],
	"1.6.8": ["Fixes related to reactions", "Pagination in 'deletereaction'", "Small refactor"],
	"1.6.7": [
		"Improved 'avatar' and added support for server avatars",
		"Added support for embed images in 'pinkify'",
		"Small tweaks and improvements"
	],
	"1.6.6": ["Much improved handling of null values in 'top50' charts", "More accurate 'moon' I thinkk"],
	"1.6.5": ["Added 'moon'", "Refactored 'pinkify' and added support for image grabbing from replies"],
	"1.6.4": ["Fixed bet amount not refreshing after confirmation", "More gay"],
	"1.6.3": ["Added 'boop'", "More gay"],
	"1.6.2": [
		"Increased max bets and made bet comfirmations less annoying for gambling commands",
		"Slightly better pagination with disabled buttons",
		"More gay",
		"Small, mostly visual, tweaks and fixes",
		"Some refactoring"
	],
	"1.6.1": [
		"Detailed fish prices in fish inventory",
		"Added wealth titles to 'worth'",
		"Added cached users count to 'status'",
		"Minor tweaks and fixes"
	],
	"1.6.0": [
		"Added 3 new boosters including new booster cooldown decrease type",
		"Added 'describe'",
		"Improved 'blackjack' responsiveness",
		"Fixed 'pinkify' avatar format",
		"Added capitals to countries' data"
	],
	"1.5.0": [
		"Updated to discord.js v14",
		"Ranking and store pagination",
		"Fixed badges with upper case names not working in 'edit'",
		"Added purchase cooldown to timed boosters",
		"Added 'clearreaction'",
		"Fixed 'deletereaction' permissions",
		"Fixed purchasing multiple timed boosters (and wasting money)",
		"Finished fixing argument parsing in 'flag'",
		"Changed pagination arrows so they show up on mobile",
		"Replaced the Perfect black profile color + 3 new colors",
		"Small tweaks and lots of refactoring"
	],
	"1.4.1": [
		"Added ranking by flag stats",
		"Fixed 'worth'",
		"Added 'listreactions' pagination",
		"Formatting and naming adjustments"
	],
	"1.4.0": [
		"Added 'flag' quiz",
		"Added 'country'",
		"Added timed boosters and 'boosters'",
		"Added 'worth'",
		"Added ability to check the prefix by mentioning the bot",
		"Added days until player overtaken in 'top50'",
		"Started sorting fish by rarity in ponds",
		"Refactoring, tweaks, and small fixes"
	],
	"1.3.0": [
		"Added 'diceduel'",
		"Added 'aquarium' upgrade confirmation",
		"Added 'pond fill'",
		"Added loading reactions from memory instead of querying the database every time",
		"Fixed aces in blackjack always counting as 11 (sorry)",
		"Fixed collectors' items not being added after being fished",
		"Tweaks"
	],
	"1.2.1": ["Merged fish stats and fish global stats", "Added purchasable aquarium income multipliers"],
	"1.2.0": ["Added fishing rod upgrades", "Shop visual adjustments + colors preview"],
	"1.1.2": ["Added 'id'", "Added 'addmoney'"],
	"1.1.1": ["Emergency pond schema fix"],
	"1.1.0": [
		"Added more 'pond' and 'aquarium' levels",
		"Added 'pond budget max'",
		"Added 'aqua levels'",
		"Various tweaks and refactoring"
	],
	"1.0.2": ["Added pond ranking", "Added 'pinkify' hex color validation", "More gay"],
	"1.0.1": ["Minor tweaks and fixes to 'fish', 'aquarium', and 'pond'", "Added 'pond' levels up to 15"],
	"1.0.0": [
		"Added guild preferences (custom prefix, blacklisted channels, level up message visibility)",
		"Added 'pond name'",
		"Added GUILD_ADMIN restricted commands",
		"Small overall tweaks"
	],
	"0.20.1": ["Added 'pond sell'", "Small 'pond' tweaks"],
	"0.20.0": ["Added 'pond'", "More gay", "Small refactoring"],
	"0.19.0": [
		"Added 'inventory'",
		"Added aquarium income ranking",
		"More gay",
		"Slightly improved edit and store commands",
		"Small tweaks and improvements"
	],
	"0.18.0": ["Added 'roulette'"],
	"0.17.4": ["Tweaks and refactoring in 'top50 compare'"],
	"0.17.3": ["Added chart to 'top50 compare'", "Improved 'fish sell'"],
	"0.17.2": ["Changed 'blackjack' button colors", "Added 'aquarium' income multipliers"],
	"0.17.1": [
		"Added ability to double the bet in 'blackjack'",
		"Fixed some interaction replies",
		"Added the ability to go all in in 'slots'"
	],
	"0.17.0": [
		"Added 'blackjack'",
		"Added 'fliptest'",
		"Nicer 'aquarium' income change message + ability to view others' income",
		"Improved 'query'"
	],
	"0.16.2": [
		"Added 'aquarium reset'",
		"Added fish aquarium income to fish list and fish info",
		"'stimulus' now shows time remaining first",
		"Aquarium & fish tweaks"
	],
	"0.16.1": ["Aquarium hotfixes"],
	"0.16.0": ["Added 'aquarium'", "Fixed long cooldown times display"],
	"0.15.1": ["Improved 'pinkify'", "Add diagonal numbers as valid bingo win condition"],
	"0.15.0": ["k!pinkify command", "Different prefix for test instance of the bot"],
	"0.14.0": ["k@query command", "Edit message on bingo end", "Limit changelog length", "Small tweaks"],
	"0.13.2": ["Jackpot countdown", "Display money in k!income"],
	"0.13.1": ["Hotfix flip income", "'All' in k!flip", "Nicer k!fish list style"],
	"0.13.0": ["Bingo fixes and improvements", "Income and expenses tracking with k!income", "Small tweaks"],
	"0.12.0": ["Added 'bingo' casino game"],
	"0.11.0": ["Added 'jackpot' casino game", "More gay"],
	"0.10.5": ["Aded 'daily' streaks", "Added 'income' stats", "Tweaked fish stats", "Added 'setstatus'"],
	"0.10.4": ["Fixes", "Added more profile badges and colors", "Added current bot settings list - 'setting'"],
	"0.10.3": [
		"Added country positions in 'top50'",
		"Added player avatars in 'top50'",
		"Added 'changelog' (that's me!)",
		"Fixed 'stimulus' error messages",
		"Reduced minimum money level for stimulus",
		"Updated dependencies"
	],
	"0.10.2": [
		"Added basic comparison between two players in 'top50'",
		"Added inventory value display to 'fish'",
		"Improved 'top50' argument parsing",
		"Reformatted 'help'"
	]
});
const changeEntries = Object.entries(changes);

const parseVersionNumber = (input: string) => {
	const verNum = input.replace("v", "");
	return verNum.split(".").length == 2 ? verNum + ".0" : verNum;
};

const buildChangesString = (versionNumber: string, changesArray?: string[]) => {
	if (!changesArray) changesArray = changes[versionNumber];
	const dateString = "-# " + versions[versionNumber];
	return dateString + "\n- " + changesArray.join("\n- ");
};

const buildEmbedBase = (page?: number) =>
	new EmbedBuilder().setColor(Colors.White).setFooter({
		text: (page == null ? "" : `Page ${page}\n`) + "okbot " + SET.BOT_VER,
		iconURL: bot.user!.displayAvatarURL({ size: 32, forceStatic: true })
	});

function showChangelog(page = 1) {
	const msge = buildEmbedBase(page);

	let totalLen = 0;
	const entryStartIndex = perPage * (page - 1);
	let entryCurrentIndex = entryStartIndex;
	for (; entryCurrentIndex < entryStartIndex + perPage; entryCurrentIndex++) {
		const currentEntry = changeEntries[entryCurrentIndex];
		if (!currentEntry) break;

		const versionNumber = currentEntry[0],
			changes = currentEntry[1];
		const changesString = buildChangesString(versionNumber, changes);
		totalLen += changesString.length;
		if (totalLen > 2048) break;

		// adds sparkles for new minor versions (where patch version is 0)
		const versionDecorator = versionNumber.split(".")[2] == "0" ? " ✨" : "";
		const name = "v" + versionNumber + versionDecorator;
		msge.addFields({ name, value: changesString });
	}

	const components =
		changeEntries.length > perPage
			? [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`changelog_prev-${page - 1}`)
							.setEmoji("⬅️")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(page <= 1),
						new ButtonBuilder()
							.setCustomId(`changelog_next-${page + 1}`)
							.setEmoji("➡️")
							.setStyle(ButtonStyle.Primary)
							.setDisabled(changeEntries[entryCurrentIndex] == null)
					)
				]
			: [];

	return { msge, components };
}

export function execute(msg: okbot.Message, args: string[]) {
	if (!args?.length) {
		const res = showChangelog();
		return msg.reply({
			embeds: [res.msge],
			components: res.components,
			allowedMentions: { repliedUser: false }
		});
	}

	const versionNumber = parseVersionNumber(args[0]);
	if (!changes[versionNumber])
		return sendSimpleMessage(
			msg,
			`\`${versionNumber}\` isn't a valid version. Version numbers look like \`1.7.2\` and range from \`${changeEntries[changeEntries.length - 1][0]}\` to \`${changeEntries[0][0]}\`.
Run this command with no arguments to view the full changelog.`
		);

	const msge = buildEmbedBase()
		.setTitle(`Changes in v${versionNumber}`)
		.setDescription(buildChangesString(versionNumber));
	return msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}
