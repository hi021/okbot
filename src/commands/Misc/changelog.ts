import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from 'discord.js';
import { bot } from '../../okbot.js';
import { SET } from '../../settings.js';
import { sendSimpleMessage } from '../../utils.js';

export const name = 'changelog';
export const alias = ['changes', 'update'];
export const description = "📋 View the bot's changelog";
export const usage = '<Version string>';
export const usageDetail =
	"Version strings look like '0.17.2', '1.2.3', etc.\nTracked since 0.10.2 (June 2022).";
const perPage = 7;

// pagination
bot.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split('-');
	if (split[0] !== 'changelog_prev' && split[0] !== 'changelog_next') return;

	const page = parseInt(split[1]);
	if (page <= 0) return interaction.update({});

	const changelog = showChangelog(page);
	interaction.update({ embeds: [changelog.msge], components: changelog.components });
});

const changes: Readonly<{ [ver: string]: string[] }> = Object.freeze({
	'1.11.0': [''],
	'1.10.4': ['Fix osu! top50 charts not rendering', 'New bakery levels up to 23'],
	'1.10.3': ['Update genius API fetcher to bring back the lyrics', 'Updated dependencies'],
	'1.10.2': ['Fixed k!song auto spotify queries'],
	'1.10.1': [
		"k!bakery 'sell all' won't sell rare cookies unless explicitly stated",
		'Improved the k!jackpot experience by removing the jerky updates',
		"Added pagination to the changelog (that's me!)",
		'Added rare cookies to k!bake explain',
		'Highlight upgraded stats before purchasing business upgrades & minor improvements',
		'Minor fixes & more tooltips'
	],
	'1.10.0': [
		'Implemented basic k!collection forging and related rewards',
		'Added k!bake explain',
		'Added new k!bake levels and a minor fix',
		'Added casino High Roller card booster',
		'Added k!aqua storage capacity boosters',
		'Improved k!ok presentation',
		'Updated dependencies & refactoring'
	],
	'1.9.2': [
		'Cleaned up k!store and added indication for purchased items',
		'New k!bake levels',
		'Slightly decreased bake times for most cookies in k!bake',
		'Small fixes to dailies and casinostats'
	],
	'1.9.1': ['Slight k!bank buff & fixed duplicated membership', 'Minor fixes'],
	'1.9.0': [
		'k!bank',
		'More bakery levels',
		'Bakery hourly income',
		'Minor fixes & general improvements',
		'Use custom prefixes in k!help'
	],
	'1.8.8': [
		'Money-level-dependent k!daily',
		'Minor economy balances',
		'Ubiquitous visual clarification & unification',
		'Minor fixes',
		'Updated dependencies'
	],
	'1.8.7': [
		'Added bakery lv 11 cookie requirements and levels 12-13',
		'Replaced usernames with display names',
		'Increased maximum bets',
		'Small tweaks',
		'Updated libraries'
	],
	'1.8.6': ['Cleaned out broken images in k!gay again', 'More bakery cookies emoji'],
	'1.8.5': [
		'Fixed k!slot crashing without arguments',
		'Minor fixes to k!bakery',
		'Remove user discriminators where possible'
	],
	'1.8.4': ['Minor fixes to k!bakery', 'Fixed k!fish stats', 'Cleaned out broken images in k!gay'],
	'1.8.3': ['Fixes and improvements to k!jackpot', 'Minor fixes to k!lyrics and bakery'],
	'1.8.2': [
		'Add Spotify presence and .fmbot .fm command support to k!lyrics',
		'Fixed k!ranking pagination not working for some categories'
	],
	'1.8.1': ['Minor fixes to k!bakery', 'k!lyrics'],
	'1.8.0': [
		'k!bakery',
		"Ability to use 'k' and 'M' suffixes for casino bets",
		'Slightly improved k!emoji',
		'Minor visual tweaks'
	],
	'1.7.3': ['Small casino stats tweaks and fixes'],
	'1.7.2': ['Added the ability to purchase multiple items at once', 'Tweaks to slot symbols'],
	'1.7.1': [
		'Improved top wins leaderboard for slots and added it to the rest of casino games',
		'Added k!casinostats'
	],
	'1.7.0': [
		'Improved k!store (category browsing, purchasing from item info screen)',
		'Added a notification when catching multiple fish of the same kind',
		'Started counting detailed gambling stats'
	],
	'1.6.9': ['Trimming reaction messages', 'More profile badges and price adjustments', 'More gay'],
	'1.6.8': ['Fixes related to reactions', 'Pagination in k@dr', 'Small refactor'],
	'1.6.7': [
		'Improved k!avatar and added support for server avatars',
		'Added support for embed images in k!pinkify',
		'Small tweaks and improvements'
	],
	'1.6.6': ['Much improved handling of null values in k!osu charts', 'more accurate k!moon I thinkk'],
	'1.6.5': ['k!moon', 'k!pinkify refactor and support for image grabbing by replies'],
	'1.6.4': ['Fixed bet amount not refreshing after confirmation', 'More gay'],
	'1.6.3': ['k!boop', 'More gay'],
	'1.6.2': [
		'Increased max bets and made bet comfirmations less annoying for gambling commands',
		'Slightly better pagination with disabled buttons',
		'More gay',
		'Small, mostly visual, tweaks and fixes',
		'Some refactoring'
	],
	'1.6.1': [
		'Detailed fish prices in fish inventory',
		'k!worth titles',
		'Cached users count in k@status',
		'Minor tweaks and fixes'
	],
	'1.6.0': [
		'Added 3 new boosters including new booster cooldown decrease type',
		'k!describe',
		'Improved blackjack responsiveness',
		'Fixed k!pinkify avatar format',
		"Added capitals to countries' data"
	],
	'1.5.0': [
		'Updated to discord.js v14',
		'Ranking and store pagination',
		'Fixed badges with upper case names not working in k!edit',
		'Timed boosters purchase cooldown',
		'k@clearreaction',
		'Fixed k@deletereaction permissions',
		'Fixed being able to buy multiple timed boosters (and waste money)',
		'Finished fixing argument parsing in k!flag',
		'Changed pagination arrows so they work on mobile',
		'Replaced the Perfect black profile color + 3 new colors',
		'Small tweaks and lots of refactoring'
	],
	'1.4.1': [
		'Flag ranking',
		'k!worth fixes',
		'Pagination in k@listreactions',
		'Formatting and naming adjustments'
	],
	'1.4.0': [
		'k!flag',
		'k!country',
		'Timed boosters and k!boosters',
		'k!worth',
		'Sorting fish by rarity in ponds',
		'Ability to check the prefix by mentioning the bot',
		'Days until overtaken in k!top50',
		'Refactoring, tweaks, and small fixes'
	],
	'1.3.0': [
		'k!diceduel',
		'Aquarium upgrade confirmation',
		'k!pond fill',
		'Fixed aces in blackjack always counting as 11 (sorry)',
		"Fixed collectors' items not being added after being fished",
		'Load reactions from memory instead of querying the database every time',
		'Tweaks'
	],
	'1.2.1': ['Merged fish stats and fish global stats', 'Added purchasable aquarium income multipliers'],
	'1.2.0': ['Fishing rod upgrades', 'Shop visual adjustments + colors preview'],
	'1.1.2': ['k!id', 'k@addmoney'],
	'1.1.1': ['Emergency pond schema fix'],
	'1.1.0': [
		'More pond and aquarium levels',
		'k!pond budget max',
		'k!aqua levels',
		'Various tweaks and refactoring'
	],
	'1.0.2': ['Pond ranking', 'Pinkify hex color validation', 'More gay'],
	'1.0.1': ['Minor tweaks and fixes to fish, aquarium, and pond', 'Pond level 15'],
	'1.0.0': [
		'Added guild preferences (custom prefix, blacklisted channels, level up message visibility)',
		'k!pond name',
		'Added GUILD_ADMIN restricted commands',
		'Small overall tweaks'
	],
	'0.20.1': ['k!pond sell', 'Small k!pond tweaks'],
	'0.20.0': ['k!pond', 'More gay', 'Small refactoring'],
	'0.19.0': [
		'k!inventory',
		'Aquarium income ranking',
		'More gay',
		'Slightly improved edit and store commands',
		'Small tweaks and improvements'
	],
	'0.18.0': ['k!roulette'],
	'0.17.4': ['Tweaks and refactoring in k!osu compare'],
	'0.17.3': ['Chart in k!osu compare', 'Better fish selling'],
	'0.17.2': ['Change blackjack button colors', 'Aquarium income multipliers'],
	'0.17.1': ['Blackjack double', 'Fix some interaction replies', 'Ability to go all in in slots'],
	'0.17.0': [
		'k!blackjack',
		'k@fliptest',
		"Nicer aquarium income change message + view others' income",
		'Better k@query'
	],
	'0.16.2': [
		'Aquarium & fish tweaks',
		'k!aquarium reset',
		'Added fish aquarium income to fish list and fish info',
		'k!stimulus now shows time remaining first'
	],
	'0.16.1': ['Aquarium hotfixes'],
	'0.16.0': ['k!aquarium', 'Fixed long cooldown times display'],
	'0.15.1': ['Improved k!pinkify', 'Add diagonal numbers as valid bingo win condition'],
	'0.15.0': ['k!pinkify command', 'Different prefix for test instance of the bot'],
	'0.14.0': ['k@query command', 'Edit message on bingo end', 'Limit changelog length', 'Small tweaks'],
	'0.13.2': ['Jackpot countdown', 'Display money in k!income'],
	'0.13.1': ['Hotfix flip income', "'All' in k!flip", 'Nicer k!fish list style'],
	'0.13.0': ['Bingo fixes and improvements', 'Income and expenses tracking with k!income', 'Small tweaks'],
	'0.12.0': ['Bingo casino game'],
	'0.11.0': ['Jackpot casino game', 'More gay'],
	'0.10.5': ['Daily streaks', 'Income stats', 'Fish stats tweaks', 'Add setstatus command'],
	'0.10.4': ['Fixes', 'More profile badges and colors', 'Add current bot settings list'],
	'0.10.3': [
		'Country positions in k!t50',
		'Avatars in k!t50',
		'Fixed k!stimulus error messages',
		'Reduced minimum money level for stimulus',
		'Add k!changelog',
		'Update discord.js'
	],
	'0.10.2': [
		'Better argument parser for k!t50',
		'Basic comparison between two players in k!t50',
		'Inventory value in k!fish inventory',
		'Reformatted k!help'
	]
});
const changeEntries = Object.entries(changes);

const buildDefaultEmbed = (page?: number) =>
	new EmbedBuilder().setColor(Colors.White).setFooter({
		text: (page == null ? '' : 'Page ' + page + '\n') + 'okbot ' + SET.BOT_VER,
		iconURL: bot.user?.displayAvatarURL({ size: 32, forceStatic: true })
	});

function showChangelog(page = 1) {
	const msge = buildDefaultEmbed(page);

	let totalLen = 0;
	const entryStartIndex = perPage * (page - 1);
	let entryCurrentIndex = entryStartIndex;
	for (; entryCurrentIndex < entryStartIndex + perPage; entryCurrentIndex++) {
		const ver = changeEntries[entryCurrentIndex];
		if (!ver) break;

		const verString = ver[1].join('\n- ');
		totalLen += 3 + verString.length;
		if (totalLen > 2048) break;
		const name = 'v' + ver[0] + (ver[0].split('.')[2] == '0' ? ' ✨' : '');
		msge.addFields({ name, value: '- ' + verString });
	}

	const components =
		changeEntries.length > perPage
			? [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`changelog_prev-${page - 1}`)
							.setEmoji('⬅️')
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(page <= 1),
						new ButtonBuilder()
							.setCustomId(`changelog_next-${page + 1}`)
							.setEmoji('➡️')
							.setStyle(ButtonStyle.Primary)
							.setDisabled(changeEntries[entryCurrentIndex] == null)
					)
				]
			: [];

	return { msge, components };
}

export function execute(msg: okbot.Message, args: string[]) {
	// Full changelog
	if (!args?.length) {
		const res = showChangelog();
		return msg.reply({
			embeds: [res.msge],
			components: res.components,
			allowedMentions: { repliedUser: false }
		});
	}

	// Only changes for one update
	const ver = args[0].replace('v', '');
	if (!changes[ver])
		return sendSimpleMessage(
			msg,
			`\`${ver}\` isn't a valid version. Version numbers look like 1.7.2 for example.\nRun this command with no arguments to view the full changelog.`
		);

	const msge = buildDefaultEmbed();
	msge.addFields({ name: 'Changes in v' + ver, value: '- ' + changes[ver].join('\n- ') });
	return msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}
