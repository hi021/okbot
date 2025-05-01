import {
	ButtonInteraction,
	ColorResolvable,
	Colors,
	EmbedBuilder,
	GuildMember,
	Interaction,
	Message,
	MessageFlags,
	MessageFlagsBitField,
	MessageType,
	SendableChannels,
	Snowflake,
	User
} from 'discord.js';
import { db_get_casino_top, db_plr_get, db_plr_set } from './db/db.js';
import { SET } from './settings.js';
import { Casino_tops, Cooldowns, Guilds, Players_in_collector } from './volatile.js';

export const e_blank = '<:blank:986204417512575036>';

//UTIL
export function randomFromArray<T>(arr: Array<T>): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffleArray<T>(array: Array<T>) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

export function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

export const objLength = (obj: Record<string, any>) => {
	let s = 0;
	for (const _ in obj) ++s;
	return s;
};

export const capitalizeFirstLetter = (str?: string) =>
	str ? str[0].toUpperCase() + str.slice(1).toLowerCase() : '';

export const isVowel = (letter: string) => ['a', 'e', 'i', 'o', 'u', 'y'].includes(letter.toLowerCase());
//UTIL

//FORMAT
export const formatNumber = (num: number | string, delimiter = '\u00A0') =>
	num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, delimiter);

export const formatDoler = (num: number | string, bolded = true) =>
	bolded ? `**${formatNumber(num, '\u00A0')}** 💵` : `${formatNumber(num, '\u00A0')} 💵`;

export function formatMilliseconds(ms: number) {
	const dat = new Date(ms);
	const d = dat.getUTCDate() - 1;
	const h = dat.getUTCHours();
	const m = dat.getUTCMinutes();
	const s = dat.getUTCSeconds();
	let str = '';

	if (d) {
		str += d + ' day';
		if (d > 1) str += 's';
	}
	if (h) {
		str += ' ' + h + ' hour';
		if (h > 1) str += 's';
	}
	if (m) {
		str += ' ' + m + ' minute';
		if (m > 1) str += 's';
	}
	if (s) {
		str += ' ' + s + ' second';
		if (s > 1) str += 's';
	}
	return str ? str.trim() : '< 1 second';
}

/**
 * @param month 0 - 11
 * @returns 3 letter short name or `null`
 */
export function monthToShortString(month: number) {
	switch (month) {
		case 0:
			return 'Jan';
		case 1:
			return 'Feb';
		case 2:
			return 'Mar';
		case 3:
			return 'Apr';
		case 4:
			return 'May';
		case 5:
			return 'Jun';
		case 6:
			return 'Jul';
		case 7:
			return 'Aug';
		case 8:
			return 'Sep';
		case 9:
			return 'Oct';
		case 10:
			return 'Nov';
		case 11:
			return 'Dec';
		default:
			return null;
	}
}

export function formatDate(
	dat: Date,
	format: 'user' | 'alphabetical' = 'user',
	compareToday?: string,
	time?: boolean
) {
	let formatted;
	if (format === 'user') {
		formatted = `${dat.getUTCDate()} ${monthToShortString(dat.getUTCMonth())}, ${dat.getUTCFullYear()}`;

		if (time)
			formatted += ` at ${dat.getUTCHours()}:${dat.getUTCMinutes().toString().padStart(2, '0')}:${dat
				.getUTCSeconds()
				.toString()
				.padStart(2, '0')}`;
	} else {
		formatted = `${dat.getUTCFullYear()}-${(dat.getUTCMonth() + 1).toString().padStart(2, '0')}-${dat
			.getUTCDate()
			.toString()
			.padStart(2, '0')}`;

		if (time)
			formatted += `-${dat.getUTCHours().toString().padStart(2, '0')}-${dat.getUTCMinutes().toString().padStart(2, '0')}-${dat
				.getUTCSeconds()
				.toString()
				.padStart(2, '0')}`;
	}

	if (compareToday) return compareToday == formatted ? 'today' : formatted;
	return formatted;
}

export const showItemName = (itm: { nam: string; emoji?: string }, bold = true) =>
	`${itm.emoji ? itm.emoji + ' ' : ''}${bold ? `**${itm.nam}**` : itm.nam}`;
//FORMAT

export const drawProgressBar = (len: number, maxLen: number, activeSquare = '🟩', inactiveSquare = '⬛') => {
	len = Math.max(0, len);
	return `${activeSquare.repeat(len) + inactiveSquare.repeat(maxLen - len)}`;
};

/**
 * Supports digits and sort of works with numbers 10 - 12, otherwise returns *️⃣
 */
export const numberToEmoji = (a: number) => {
	switch (a) {
		case 0:
			return ':zero:';
		case 1:
			return ':one:';
		case 2:
			return ':two:';
		case 3:
			return ':three:';
		case 4:
			return ':four:';
		case 5:
			return ':five:';
		case 6:
			return ':six:';
		case 7:
			return ':seven:';
		case 8:
			return ':eight:';
		case 9:
			return ':nine:';
		case 10:
			return '🔟';
		case 11:
			return '**11**';
		case 12:
			return '**12**';
		default:
			return ':asterisk:';
	}
};

/**
 * @param num e.g. 10k, 23.5M, or 2500
 */
export function parseNumberSuffix(num: string) {
	if (num.length <= 1) return parseInt(num); // no suffix

	const suffix = num.slice(-1).toLowerCase();
	if (!isNaN(parseInt(suffix))) return parseInt(num); // no suffix
	const value = num.slice(0, -1);
	switch (suffix) {
		case 'k':
			return Math.floor(parseFloat(value) * 1_000);
		case 'm':
			return Math.floor(parseFloat(value) * 1_000_000);
		default:
			return null; // invalid suffix
	}
}

//DISCORD
export async function getUserFromMsg(msg: okbot.Message, args?: string[]) {
	const userMentioned = msg.mentions.users?.first();
	if (userMentioned) return userMentioned;

	if (!args?.length || !msg.inGuild()) return undefined;
	const query = args.join(' ');
	const userFetched = await msg.guild.members.fetch({ query, limit: 1 });
	return userFetched?.first()?.user;
}

export async function getUsersFromMsg(msg: okbot.Message, usernames: string[]) {
	if (!usernames?.length) return undefined;

	const usersMentioned: Array<User> = msg.mentions.users.first(usernames.length);
	if (usersMentioned?.length) return usersMentioned;
	if (!msg.guild) return undefined;

	const usersFetched = new Array<GuildMember | undefined>(usernames.length);
	const promises = new Array<Promise<boolean>>(usernames.length);

	for (const i in usernames) {
		const query = usernames[i];
		promises[i] = new Promise(async resolve => {
			usersFetched[i] = (await msg.guild!.members.fetch({ query, limit: 1 }))?.first();
			resolve(true);
		});
	}

	await Promise.all(promises);
	return usersFetched?.length ? usersFetched.filter(u => u != undefined).map(u => u.user) : undefined;
}

/**
 * @returns an {@link EmbedBuilder} with a user-specific footer and given color
 */
export function createUserMsgEmbed(user?: User, color?: ColorResolvable) {
	const msg = new EmbedBuilder();
	if (user) {
		msg.setFooter({
			text: user.username,
			iconURL: user.displayAvatarURL({ forceStatic: true, size: 32 })
		});
	}
	if (color) msg.setColor(color);

	return msg;
}

export function createSimpleMessage(
	description: string,
	color: ColorResolvable = Colors.Red,
	title?: string
) {
	const msge = new EmbedBuilder().setColor(color).setDescription(description);
	if (title) msge.setTitle(title);
	return msge;
}

/**
 * Replies with a simple embed using given description (e.g. for error messages)
 */
export function sendSimpleMessage<T>(
	msg: okbot.MessageOrInteraction<T>,
	text: string,
	color: ColorResolvable = Colors.Red,
	mention = true,
	flags: MessageFlags[] = []
) {
	return msg.reply({
		embeds: [createSimpleMessage(text, color)],
		allowedMentions: { repliedUser: mention },
		flags: MessageFlagsBitField.resolve(flags)
	});
}

export function sendEphemeralReply(interaction: ButtonInteraction, text: string, color?: ColorResolvable) {
	sendSimpleMessage<ButtonInteraction>(interaction, text, color, true, [MessageFlags.Ephemeral]);
}

/**
 * @returns `null` if author already in a collector
 */
export function createCollector(playerId: string, channel: SendableChannels, timeout?: number) {
	if (Players_in_collector[playerId]) return null;

	Players_in_collector[playerId] = true;
	const collector = channel.createMessageCollector({
		filter: (m: Message) => m.author.id === playerId,
		time: timeout || Number(SET.DEF_COLLECTOR_TIMEOUT) || 30000
	});

	return collector;
}

/**
 * @returns the amount of money needed to reach given money level
 */
export function calcMoneyTotNeeded(lv: number | undefined) {
	if (!lv || lv < 1) return 0;
	return Math.round(1000 * lv + Math.pow(150, lv / 28));
}

/**
 * @param winnings net win (excluding bet)
 */
export async function addCasinoStat(
	plrId: string,
	game: okbot.CasinoGame,
	result: 'win' | 'lose' | 'draw',
	bet: number,
	winnings: number,
	additional?: {
		countDraws?: boolean;
		bjDoubled?: boolean;
		is21?: boolean;
		rlColor?: okbot.RouletteColor;
		diceScore?: number;
		slotIsBigWin?: boolean;
	}
) {
	const plrdat = await db_plr_get({ _id: plrId, casinoStat: 1 });
	const stat = plrdat?.casinoStat?.[game] || {
		am: 0,
		win: 0,
		highestBet: 0,
		highestWin: { v: 0 }
	};

	++stat.am;
	if (bet > stat.highestBet) stat.highestBet = bet;

	const rl = additional?.rlColor;
	if (rl) {
		(stat as any)[rl] == undefined ? ((stat as any)[rl] = 1) : (stat as any)[rl]++;
		if (result == 'win') {
			const rlWin = rl + 'Win';
			(stat as any)[rlWin] == undefined ? ((stat as any)[rlWin] = 1) : (stat as any)[rlWin]++;
		}
	}

	if (result == 'win') stat.win == undefined ? (stat.win = 1) : ++stat.win;
	else if (result == 'draw' && additional?.countDraws)
		(stat as any).draw == undefined ? ((stat as any).draw = 1) : (stat as any).draw++;

	if (result != 'lose' && (stat.highestWin?.v == undefined || winnings > stat.highestWin.v))
		stat.highestWin = {
			v: winnings,
			date: Math.floor(new Date().getTime() / 1000)
		};

	if (additional?.is21) (stat as any).bj == undefined ? ((stat as any).bj = 1) : (stat as any).bj++;
	if (additional?.bjDoubled) {
		(stat as any).double == undefined ? ((stat as any).double = 1) : (stat as any).double++;
		if (result == 'win')
			(stat as any).doubleWin == undefined ? ((stat as any).doubleWin = 1) : (stat as any).doubleWin++;
	}

	if (additional?.slotIsBigWin)
		(stat as any).bigWin == undefined ? ((stat as any).bigWin = 1) : (stat as any).bigWin++;
	if (additional?.diceScore)
		(stat as any).totalScore == undefined
			? ((stat as any).totalScore = additional.diceScore)
			: ((stat as any).totalScore += additional.diceScore);

	const statName = 'casinoStat.' + game;
	await db_plr_set({ _id: plrId, [statName]: stat });
}

export async function showCasinoTopWins(game: okbot.CasinoGame, showBets = true) {
	let lb = Casino_tops[game] as okbot.CasinoTopStat[];
	if (!lb?.length) {
		await db_get_casino_top(game);
		lb = Casino_tops[game] as okbot.CasinoTopStat[];
	}

	let description = '';
	if (!lb.length) description = '🕸️ *No wins yet...*';
	else {
		for (const i in lb) {
			const bet = showBets ? ` (**${Math.round((lb[i].won / lb[i].bet) * 100) / 100}**x bet)` : '';

			description += `\`${('#' + (Number(i) + 1)).padStart(3, ' ')}\` ${lb[i].usernameDiscrim} won ${formatDoler(lb[i].won)}${bet} <t:${
				lb[i].date
			}:R>\n`;
		}
	}

	return createSimpleMessage(description, Colors.White, `💰 Largest ${game} wins`);
}

export async function getImageUrlFromMsg(msg: okbot.Message, args?: string[]) {
	//1. check if uploaded an image
	const files = msg.attachments.values();
	for (const i of files) {
		if (i?.contentType?.startsWith('image/')) return i.url;
	}

	//2. check if mentions user (will force static avatar)
	const usr = await getUserFromMsg(msg, args?.length ? [args[0].replace(/_/g, ' ')] : undefined);
	if (usr) {
		args?.shift();
		const userGuild = await msg.guild!.members.fetch(usr); //to get server avatar
		return userGuild.displayAvatarURL({
			forceStatic: true,
			size: 4096,
			extension: 'png'
		});
	}

	//3. check if a reply to a message with an image
	if (msg.type === MessageType.Reply) {
		const reference = await msg.fetchReference();

		//check if replied to has an image
		const filesReference = reference.attachments.values();
		for (const i of filesReference) {
			if (i?.contentType?.startsWith('image/')) return i.url;
		}

		//check if any of the embeds have an image
		for (let i = 0; i < reference.embeds.length; i++) {
			if (reference.embeds[i].image) return reference.embeds[i].image!.url;
		}

		//TODO?: check if message content has a usable link (regex link parsing?)
	}

	//4. default to returning args that hopefully have an url
	return args?.shift();
}
// DISCORD

//BOT
export function checkBoosterValidity(
	plr: {
		boosters?: { [itemId: string]: okbot.TimedBooster };
		boosterCd?: number;
	} | null,
	boosterItemId: string
) {
	const booster = plr?.boosters?.[boosterItemId];
	//no booster
	if (!booster) return null;

	const now = new Date().getTime();
	const cooldown = (SET.BOOSTER_COOLDOWN ?? 57600) - (plr.boosterCd ?? 0);
	const cooldownRemaining = cooldown - (Math.round(now / 1000) - booster.start);
	const timeRemaining = booster.start * 1000 + booster.time - now;

	//outdated booster
	if (timeRemaining <= 0)
		return {
			name: booster.name as string,
			start: booster.start as number,
			cooldownRemaining
		} as okbot.ExpiredBooster;
	//active booster
	return { ...booster, timeRemaining } as okbot.TimedBooster & {
		timeRemaining: number;
	};
}

/**
 * @returns the amount of money levels gained, where `lv` is the current level and `monTot` is the future total amount.
 * Optionally sends a message about the level up.
 */
export function calcMoneyLevelsGain<T>(lv: number, monTot: number, msg?: okbot.MessageOrInteraction<T>) {
	let addLv = 0;
	while (calcMoneyTotNeeded(lv + addLv + 1) <= monTot) ++addLv;

	if (addLv && msg && msg.channel?.isSendable()) {
		const user = msg instanceof ButtonInteraction ? msg.user : msg.author;
		if (!msg.guildId || Guilds[msg.guildId]?.lvl === false) return addLv;

		const msgEm = createUserMsgEmbed(user, Colors.Green);
		msgEm.setDescription(`Money Level 🆙\n${lv} → **${lv + addLv}**`);
		msg.channel.send({ embeds: [msgEm] });
	}

	return addLv;
}

export function showUpgradeCost(cost: number, money: number) {
	return `Cost: ${formatDoler(cost)}\n-# ${
		money < cost
			? `_ _ need ${formatDoler(cost - money)} more`
			: `your balance will be ${formatDoler(money - cost, false)}`
	}`;
}

export function showUpgradeStat(
	statLevels: Record<string, any>,
	lv: number,
	fieldName: string,
	fieldTitle: string,
	formatter = (v: any) => formatNumber(v)
) {
	const statCur = statLevels[lv - 1][fieldName];
	const statNew = statLevels[lv][fieldName];

	return {
		name: fieldTitle,
		value:
			statCur != statNew
				? `${formatter(statCur)} → **${formatter(statNew)}**`
				: `${formatter(statCur)} → ${formatter(statNew)}`
	};
}

export const isStoreIdFormat = (txt: string) => /^([A-Z]|_){3}\d{4}$/.test(txt);

export function storeCategoryToId(cat: string) {
	cat = cat.toLowerCase();
	switch (cat) {
		case 'booster':
			return 'BOS';
		case 'profile badge':
			return 'BDG';
		case 'profile color':
			return 'CLR';
		case 'fishing accessory':
			return 'FIS';
		default:
			return '';
	}
}

/**
 *Used format: `reaction||response` OR count first word as reaction and rest as response.
 *
 *Used in Mod command custom reactions
 */
export function parseReaction(args: string[]) {
	const reactionArr = args.join(' ');
	let reaction, response;
	if (reactionArr.indexOf('||') >= 0) {
		const reactionTmp = reactionArr.split('||');
		reaction = reactionTmp.shift();
		response = reactionTmp.join('||');
	} else {
		reaction = args.shift();
		response = args.join(' ');
	}

	return { reaction: reaction?.trim(), response: response?.trim() };
}

export const getGuildPrefix = (guildId?: string | null) => (guildId && Guilds[guildId]?.pre) || SET.PREFIX;

export function isOnCooldown(
	activity: okbot.CooldownActivity,
	usrId: Snowflake,
	msg?: okbot.Message,
	customMessage = '',
	now = Math.floor(Date.now() / 1000)
) {
	const cooldown = SET[`${activity.toUpperCase() as Uppercase<okbot.CooldownActivity>}_COOLDOWN`] ?? 0;
	const lastTimestamp = Cooldowns[activity][usrId];

	if (cooldown && lastTimestamp) {
		const sinceLast = now - lastTimestamp;
		if (sinceLast < cooldown)
			return msg
				? sendSimpleMessage<okbot.Message>(
						msg,
						`Please wait \`${formatMilliseconds((cooldown - sinceLast) * 1000)}\` ${customMessage}`
					)
				: true;
	}
	Cooldowns[activity][usrId] = now;
	return false;
}
