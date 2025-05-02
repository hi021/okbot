import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    User
} from 'discord.js';
import { db_bakery_get_stats, db_plr_add, db_plr_get, db_plr_set } from '../../db/db.js';
import { bot } from '../../okbot.js';
import {
    calcMoneyLevelsGain,
    createSimpleMessage,
    drawProgressBar,
    e_blank,
    formatDoler,
    formatMilliseconds,
    formatNumber,
    getUserFromMsg,
    sendEphemeralReply,
    sendSimpleMessage,
    showItemName,
    showUpgradeCost,
    showUpgradeStat
} from '../../utils.js';
import { Fish } from '../Fish/fish.js';

export const name = 'bakery';
export const alias = ['bake', 'cookie'];
export const description = '🍪 Roll in dough';
export const usage = '<Username OR Mention> <Action> [Action parameters]';
export const usageDetail =
	'List of actions:\n- inventory\n- stats\n- upgrade\n- sell\n- collect\n- levels\n- ovens\n- staff\n- cookies\n- explain\n- globalstats\n(defaults to viewing)\n\nRare cookies have a chance to generate instead of any baked cookie (chance depends on the oven)';
const usageEdit =
	'The usage for this command is:\n`edit ["Oven" OR "Staff" OR "Name"] [Oven/worker spot OR New bakery name (leave blank to set to default)] [Action ("sell", "buy", "set/cookie", "fire", "hire")] [Oven/worker/cookie name or id]`\nE.g. edit oven 1 buy Old';
const usageSell =
	'The usage for this command is:\n`sell [Comma-separated list of cookies\' names or ids OR "All" OR "Common" (all cookies besides the rares)] <Amount to sell (applies to all cookies, defaults to selling all in inventory)>`\nE.g. sell Butter,Sweet 250\nUse \'bakery inventory\' to view all your stored cookies';

bot.on('interactionCreate', async interaction => {
	if (!interaction.isButton() || !interaction.guild) return;
	const split = interaction.customId.split('-');
	const id = split[1];

	if (split[0] === 'bake_up_confirm') {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, `No, shoo, bad ${interaction.user.displayName}!`);

		const plrdat = await db_plr_get({ _id: id, mon: 1, bakery: 1 });
		const lv = plrdat?.bakery?.lv ?? 0;
		if (lv >= BakeryLevels.length)
			return sendEphemeralReply(interaction, 'Your bakery is already at the maximum level!');

		const cost = BakeryLevels[lv].cost;
		const mon = plrdat?.mon ?? 0;
		if (cost > mon)
			return sendEphemeralReply(
				interaction,
				`You need ${formatDoler(cost - mon)} more to afford this upgrade.`
			);

		const now = Math.floor(new Date().getTime() / 1000);
		if (!plrdat?.bakery) {
			// open new
			await db_plr_set({
				_id: id,
				bakery: {
					lv: 1,
					maxColl: BakeryLevels[0].maxColl,
					multi: BakeryLevels[0].multi,
					ovens: [null],
					staff: [],
					toColl: {},
					inv: {},
					toCollTot: 0,
					stat: {},
					tot: 0,
					totVal: 0,
					lastColl: now,
					created: now,
					lvTime: now
				}
			});
			await db_plr_add({ _id: id, mon: -cost, expense: { bakery: cost } });

			if (!interaction.message.channel.partial)
				sendSimpleMessage<okbot.Message>(
					interaction.message as okbot.Message,
					'Successfully opened your new bakery!',
					Colors.DarkGreen
				);
		} else {
			// upgrade existing
			plrdat.bakery.maxColl = BakeryLevels[lv].maxColl;
			plrdat.bakery.multi = BakeryLevels[lv].multi;
			plrdat.bakery.ovens.length = BakeryLevels[lv].maxOven;
			plrdat.bakery.staff.length = BakeryLevels[lv].maxStaff;
			plrdat.bakery.lvTime = now;
			++plrdat.bakery.lv;

			let unlockedOvens = '';
			for (const i in BakeryOvens) {
				if (BakeryOvens[i].lv === plrdat.bakery.lv) unlockedOvens += `\n- ${BakeryOvens[i].nam} oven`;
				else if (BakeryOvens[i].lv >= plrdat.bakery.lv) break; // assuming ovens are sorted by levels
			}
			let unlockedStaff = '';
			for (const i in BakeryStaff) {
				if (BakeryStaff[i].lv === plrdat.bakery.lv) unlockedStaff += `\n- ${showItemName(BakeryStaff[i])}`;
				else if (BakeryStaff[i].lv >= plrdat.bakery.lv) break;
			}

			await db_plr_set({ _id: id, bakery: plrdat.bakery });
			await db_plr_add({ _id: id, mon: -cost, expense: { bakery: cost } });

			if (!interaction.message.channel.partial)
				sendSimpleMessage<okbot.Message>(
					interaction.message as okbot.Message,
					`Upgraded your bakery to level **${plrdat.bakery.lv}**!${
						unlockedOvens || unlockedStaff ? '\nNewly unlocked:' + unlockedOvens + unlockedStaff : ''
					}`,
					Colors.DarkGreen
				);
		}

		interaction.update({ components: [] });
		return;
	}
	if (split[0] === 'bake_up_cancel') {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, `No, shoo, bad ${interaction.user.displayName}!`);

		interaction.update({ components: [] });
		return;
	}
	if (split[0] === 'bake_collect') {
		if (id !== interaction.user.id)
			return sendEphemeralReply(
				interaction,
				`Don't try to steal others' cookies, ${interaction.user.displayName}!`
			);

		const plrdat = await db_plr_get({ _id: interaction.user.id, bakery: 1 });
		if (!plrdat?.bakery) return;

		const embed = interaction.message.embeds[0];
		const invString = `**0**/${formatNumber(plrdat.bakery.maxColl)} 🍪`;
		const invBar = drawProgressBar(0, 10, '🟨');
		const invName = embed.fields[embed.fields.length - 1].name;
		const msgeE = EmbedBuilder.from(embed);
		msgeE.spliceFields(-1, 1, {
			name: invName,
			value: invString + '\n' + invBar
		});
		interaction.message.edit({ embeds: [msgeE], components: [] });

		const msge = await collect(interaction.user, plrdat.bakery);
		interaction.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
		return;
	}
});

export const RARE_ID = '99';
export const RARE_BUNDLE_ID = '100';
export const BakeryCookies: { [cookieId: string]: okbot.BakeryCookie } = {
	'1': { nam: 'Butter', value: 1, emoji: '<:cookie_plain:1067061379737059328>', time: 15 }, //value per minute: 4
	'2': { nam: 'Crunchy', value: 2, emoji: '<:cookie_plain:1067061379737059328>', time: 24 }, //5
	'3': { nam: 'Sweet', value: 3, emoji: '<:cookie_plain:1067061379737059328>', time: 32 }, //5.625 | lv3
	'4': { nam: 'Choco chip', value: 5, emoji: '🍪', time: 45 }, //6.667 | lv4
	'5': { nam: 'Chocolate', value: 7, emoji: '<:cookie_choco:1067061373059735604>', time: 60 }, //7.636 | lv5
	'6': { nam: 'Double choco', value: 10, emoji: '<:cookie_choco:1067061373059735604>', time: 70 }, //8.571 | lv8
	'7': { nam: 'Vanilla', value: 15, emoji: '<:cookie_vanilla:1067061381507055726>', time: 100 }, //9    | lv10
	'8': { nam: 'Duo', value: 20, emoji: '<:cookie_duo:1067061375773454468>', time: 120 }, //10   | lv10
	'9': { nam: 'Fluffy', value: 25, emoji: '<:cookie_fluffy:1067061377430208572>', time: 135 }, //11.111 | lv12
	'10': { nam: 'Oat', value: 25, emoji: '<:cookie_plain:1067061379737059328>', time: 100 }, //15  | lv16
	'11': { nam: 'Strawberry', value: 40, emoji: '<:cookie_strawberry:1130602583229206549>', time: 120 }, //20  | lv19
	'12': { nam: 'Bread', value: 55, emoji: ':flatbread:', time: 120 }, //22.5 | lv22
	'13': { nam: 'Infinity', value: 144, emoji: '<:cookie_infinity:1130602580821692468>', time: 256 }, //33.75 | lv25?
	[RARE_ID]: { nam: 'Rare', value: 900, emoji: '<:adam:1007621226379886652>', time: 900 },
	[RARE_BUNDLE_ID]: {
		nam: 'Rare Bundle',
		value: 500000,
		emoji: '<:adam_bundle:1347935966286975046>',
		time: 9000
	}
};
export const BakeryOvens: { [ovenId: string]: okbot.BakeryOven } = {
	'1': { nam: 'Crappy', cookie: ['1', '2'], lv: 1, multi: 1.25, cost: 100, rare: 0.00004 },
	'2': { nam: 'Junk', cookie: ['1', '2'], lv: 2, multi: 1.2, cost: 1200, rare: 0.00004 },
	'3': { nam: 'Malfunctioning', cookie: ['1', '2', '3'], lv: 3, multi: 1.2, cost: 2300, rare: 0.00004 },
	'4': { nam: 'Rusty', cookie: ['1', '2', '3', '4', '5'], lv: 5, multi: 1.1, cost: 4000, rare: 0.00004 },
	'5': { nam: 'Old', cookie: ['1', '2', '3', '4', '5'], lv: 6, multi: 1.1, cost: 6500, rare: 0.00004 },
	'6': { nam: 'Cruddy', cookie: ['1', '2', '3', '4', '5', '6'], lv: 8, multi: 1, cost: 8000, rare: 0.00004 },
	'7': {
		nam: 'Refurbished',
		cookie: ['1', '2', '3', '4', '5', '6'],
		lv: 9,
		multi: 1,
		cost: 12000,
		rare: 0.00004
	},
	'8': { nam: 'Compact', cookie: ['1', '2'], lv: 10, multi: 0.5, cost: 25000, costRare: 2, rare: 0.00008 },
	'9': {
		nam: 'Contemporary',
		cookie: ['1', '2', '3', '4', '5', '6', '7', '8'],
		lv: 10,
		multi: 1.1,
		cost: 27500,
		costRare: 2,
		rare: 0.00005
	},
	'10': {
		nam: 'Polished',
		cookie: ['7', '8', '9'],
		lv: 12,
		multi: 0.9,
		cost: 55000,
		costRare: 2,
		rare: 0.00005
	},
	'11': {
		nam: 'Chrome',
		cookie: ['5', '6', '7', '8', '9'],
		lv: 14,
		multi: 0.9,
		cost: 40000,
		rare: 0.00005
	},
	'12': {
		nam: 'Oat-Coat',
		cookie: ['10'],
		lv: 16,
		multi: 0.9,
		cost: 50000,
		rare: 0.00001
	},
	'13': {
		nam: 'Swiss',
		cookie: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
		lv: 19,
		multi: 0.9,
		cost: 87500,
		rare: 0.00005
	},
	'14': {
		nam: 'Yummy',
		cookie: ['9', '10', '11', '12'],
		lv: 22,
		multi: 0.875,
		cost: 125000,
		rare: 0.00005
	}
};
const SPECIAL_WORKER_CUT_OFF_ID = '90';
export const BakeryStaff: { [staffId: string]: okbot.BakeryStaff } = {
	'1': { nam: 'Rat', emoji: '🐀', cost: 4000, lv: 4, multi: 0.95 },
	'2': { nam: 'Grade schooler', emoji: '🧒', cost: 10000, lv: 7, multi: 0.925 },
	'3': {
		nam: 'Grandma',
		emoji: '🧓',
		cost: 30000,
		lv: 10,
		multi: 0.9125,
		spec: { '1': 0.8875, '4': 0.8875 }
	},
	'4': {
		nam: 'Chef',
		emoji: ':cook:',
		cost: 50000,
		lv: 12,
		multi: 0.9125,
		spec: { '5': 0.875, '6': 0.875, '7': 0.85 }
	},
	'5': { nam: 'Baker', emoji: ':french_bread:', cost: 75000, lv: 13, multi: 0.85, spec: { '12': 0.675 } },
	'6': { nam: 'Cookie witch', emoji: '🧙‍♀️', cost: 150000, lv: 15, multi: 0.8, spec: { '9': 0.775 } },
	'7': { nam: 'Robot', emoji: '🤖', cost: 225000, lv: 17, multi: 0.75 },
	'8': { nam: 'Cookie', emoji: '🍪', cost: 270000, lv: 20, multi: 0.7, spec: { '4': 0.675 } },
	'9': {
		nam: 'White collar',
		emoji: '🧑‍🔬',
		cost: 325000,
		lv: 23,
		multi: 0.7,
		spec: { '9': 0.675, '10': 0.675, '11': 0.675, '12': 0.675 }
	},
	'10': { nam: 'Kneader', emoji: '🐱', cost: 300000, lv: 26, multi: 0.666 },
	[SPECIAL_WORKER_CUT_OFF_ID]: {
		nam: 'Genetically engineered baker',
		emoji: '🕵️',
		cost: 0,
		lv: 7,
		multi: 0.575
	} // special unlock from Perfect genome collection
};

export const BakeryLevels = [
	{ cost: 5000, maxOven: 1, maxStaff: 0, multi: 1, maxColl: 3500 }, //lv1
	{ cost: 8000, maxOven: 2, maxStaff: 0, multi: 1, maxColl: 6000 }, //lv2
	{ cost: 16000, maxOven: 2, maxStaff: 0, multi: 1, maxColl: 8000 }, //lv3
	{ cost: 25000, maxOven: 2, maxStaff: 1, multi: 1, maxColl: 9000 }, //lv4
	{ cost: 40000, maxOven: 2, maxStaff: 1, multi: 1, maxColl: 11250 }, //lv5
	{ cost: 70000, maxOven: 2, maxStaff: 1, multi: 1, maxColl: 12500 }, //lv6
	{ cost: 100000, maxOven: 2, maxStaff: 1, multi: 0.9, maxColl: 17500 }, //lv7
	{ cost: 200000, maxOven: 3, maxStaff: 1, multi: 0.9, maxColl: 17500 }, //lv8
	{ cost: 350000, maxOven: 3, maxStaff: 2, multi: 0.9, maxColl: 22500 }, //lv9
	{ cost: 600000, maxOven: 4, maxStaff: 2, multi: 0.9, maxColl: 30000 }, //lv10
	{ cost: 750000, maxOven: 4, maxStaff: 2, multi: 0.825, maxColl: 40000 }, //lv11
	{ cost: 1000000, maxOven: 4, maxStaff: 3, multi: 0.8, maxColl: 42500 }, //lv12
	{ cost: 1000000, maxOven: 4, maxStaff: 3, multi: 0.8, maxColl: 50000 }, //lv13
	{ cost: 1250000, maxOven: 5, maxStaff: 3, multi: 0.8, maxColl: 75000 }, //lv14
	{ cost: 1770000, maxOven: 5, maxStaff: 3, multi: 0.75, maxColl: 77700 }, //lv15
	{ cost: 1800000, maxOven: 5, maxStaff: 3, multi: 0.75, maxColl: 80000 }, //lv16
	{ cost: 1880000, maxOven: 5, maxStaff: 4, multi: 0.75, maxColl: 80000 }, //lv17
	{ cost: 2000000, maxOven: 5, maxStaff: 4, multi: 0.7, maxColl: 90000 }, //lv18
	{ cost: 2330000, maxOven: 5, maxStaff: 4, multi: 0.7, maxColl: 90000 }, //lv19
	{ cost: 4660000, maxOven: 5, maxStaff: 4, multi: 0.7, maxColl: 100000 }, //lv20
	{ cost: 5500000, maxOven: 5, maxStaff: 5, multi: 0.685, maxColl: 100000 }, //lv21
	{ cost: 7000000, maxOven: 5, maxStaff: 5, multi: 0.685, maxColl: 125000 }, //lv22
	{ cost: 9000000, maxOven: 5, maxStaff: 5, multi: 0.65, maxColl: 144000 } //lv23
];
const BakeryLevelRequirements: Array<null | {
	cookie?: { [cookieId: string]: number };
	tot?: number;
	monLv?: number;
}> = [
	null, //0 -> 1
	{ cookie: { '1': 150 } }, //1 -> 2
	{ cookie: { '1': 2000, '2': 1500 } }, //2 -> 3
	{ cookie: { '1': 5000, '2': 3000, '3': 1000 }, tot: 10000 }, //4
	{ cookie: { '1': 6750, '2': 5000, '3': 7250 }, tot: 22500 }, //5
	{ cookie: { '1': 6750, '2': 7750, '3': 10000, '4': 1000, '5': 7500, [RARE_ID]: 2 }, tot: 60000 }, //6
	{ cookie: { '1': 6750, '2': 18750, '3': 12500, '4': 20000, '5': 10000 }, tot: 100000 }, //7
	{ cookie: { '1': 20000, '2': 40000, '3': 12500, '4': 25000, '5': 40000 }, tot: 300000 }, //8
	{ cookie: { '1': 25000, '2': 50000, '3': 12500, '4': 75000, '5': 80000, [RARE_ID]: 20 }, tot: 450000 }, //9
	{
		cookie: { '1': 75000, '2': 100000, '3': 12500, '4': 75000, '5': 80000, '6': 87500, [RARE_ID]: 40 },
		tot: 1000000
	}, //9 -> 10
	{ cookie: { '1': 150000, '2': 300000, '7': 1, '8': 2 }, tot: 1400000 }, //10 -> 11
	{ cookie: { '1': 150000, '2': 300000, '5': 100000, '6': 125000, '7': 50000, '8': 50000, [RARE_ID]: 80 } }, //12
	{
		cookie: {
			'1': 150000,
			'2': 300000,
			'5': 100000,
			'6': 175000,
			'7': 100000,
			'8': 100000,
			'9': 50000,
			[RARE_ID]: 90
		},
		tot: 2500000
	}, //13
	{
		cookie: {
			'1': 250000,
			'2': 500000,
			'5': 100000,
			'6': 175000,
			'7': 100000,
			'8': 100000,
			'9': 50000,
			[RARE_ID]: 200
		},
		tot: 4000000
	}, //14
	{
		cookie: {
			'1': 250000,
			'2': 500000,
			'5': 177000,
			'6': 277000,
			'7': 100007,
			'8': 177000,
			'9': 50000,
			[RARE_ID]: 277
		},
		tot: 5000000
	}, //15
	{ cookie: { '1': 350000, '2': 550000, '5': 200000, '6': 300000, '7': 120000, '8': 200000, '9': 300000 } }, //16
	{
		cookie: {
			'1': 350000,
			'2': 550000,
			'5': 200000,
			'6': 300000,
			'7': 200000,
			'8': 300000,
			'9': 475000,
			'10': 50000
		}
	}, //17
	{
		cookie: {
			'1': 350000,
			'2': 550000,
			'5': 200000,
			'6': 300000,
			'7': 200000,
			'8': 300000,
			'9': 500000,
			'10': 250000,
			[RARE_ID]: 355
		}
	}, //18
	{
		cookie: {
			'1': 350000,
			'2': 550000,
			'5': 400000,
			'6': 300000,
			'7': 200000,
			'8': 300000,
			'9': 550000,
			'10': 375000
		},
		tot: 7777777
	}, //19
	{ cookie: {}, tot: 14777777 }, //19 -> 20
	{
		cookie: {
			'1': 350000,
			'2': 750000,
			'5': 400000,
			'6': 450000,
			'7': 200000,
			'8': 300000,
			'9': 550000,
			'10': 375000,
			'11': 400000
		}
	}, //21
	{
		cookie: {
			'1': 950000,
			'2': 900000,
			'5': 500000,
			'6': 550000,
			'7': 350000,
			'8': 400000,
			'9': 850000,
			'10': 425000,
			'11': 525000
		}
	}, //22
	{
		cookie: { '1': 950000, '2': 900000, '9': 850000, '10': 525000, '11': 700000, '12': 288000 },
		tot: 22777777
	} //23
];

function sendNoBakeryMessage(msg: okbot.Message, user?: User) {
	sendSimpleMessage<okbot.Message>(
		msg,
		user && msg.author != user
			? `\`${user.displayName}\` doesn't own a bakery :(`
			: `You don't own a bakery :(\nYou can open one if you have ${formatDoler(BakeryLevels[0].cost)} using \`${name} open\`.`
	);
}

function getCookiesToSellAmount(msg: okbot.Message, args: string[]) {
	const amount = parseInt(args[args.length - 1]);
	if (isNaN(amount) || args.length <= 1) return 0;
	if (amount < 0) {
		sendSimpleMessage<okbot.Message>(msg, 'Invalid amount of cookies to sell provided!');
		return null;
	}

	args.pop();
	return amount;
}

function getCookieIdByIdOrName(msg: okbot.Message, nameOrId: string) {
	let cookieId = parseInt(nameOrId);

	if (isNaN(cookieId) || !BakeryCookies[cookieId]) {
		// invalid id, test if name
		const cookieName = new RegExp(nameOrId.trim(), 'gi');
		let found = false;

		for (const j in BakeryCookies) {
			if (cookieName.test(BakeryCookies[j].nam)) {
				cookieId = Number(j);
				found = true;
				break;
			}
		}

		if (!found) {
			sendSimpleMessage<okbot.Message>(
				msg,
				`**"${nameOrId}"** is not a valid cookie.\nUse \`${name} inventory\` to see your cookies or \`${name} cookies\` to list all of them.`
			);
			return null;
		}
	}

	return cookieId;
}

function showOvenList(lv: number) {
	let s = '';
	let overLevel = false;
	let curLv = 0;

	for (const i in BakeryOvens) {
		const oven = BakeryOvens[i];
		if (oven.lv > lv) {
			if (overLevel && oven.lv > curLv) break;
			overLevel = true;
			s += '❌ ';
		} else s += '✅ ';
		curLv = oven.lv;

		const lastCookie = oven.cookie[oven.cookie.length - 1];
		const cookieS =
			oven.cookie.length.toString() === lastCookie
				? `#${oven.cookie[0]} - #${lastCookie}`
				: '#' + oven.cookie.join(', ');
		const unlockS = overLevel
			? 'unlocks at level ' + curLv
			: formatDoler(oven.cost, false) +
				(oven.costRare ? ` + ${oven.costRare} ${showItemName(BakeryCookies[RARE_ID], false)}` : '');

		s += `\`${('#' + i).padStart(3, ' ')}\` **${oven.nam}** (${unlockS})
		Bakes cookies ${cookieS}
		${Math.round((1 / oven.multi) * 100) / 100}x speed | ${oven.rare * 100}% rare cookie chance\n`;
	}

	return createSimpleMessage(s, Colors.Yellow, 'Available and soon unlocked ovens');
}

function showStaffList(lv: number, hasPerfectGenome = false) {
	let s = '';
	let overLevel = false;
	let curLv = 0;

	for (const i in BakeryStaff) {
		if (!hasPerfectGenome && i >= SPECIAL_WORKER_CUT_OFF_ID) continue; // don't display special workers if locked

		if (BakeryStaff[i].lv > lv) {
			if (overLevel && BakeryStaff[i].lv > curLv) continue; // skip locked staff but don't break loop (unsorted objects + special employee)
			overLevel = true;
			s += '❌ ';
		} else s += '✅ ';
		curLv = BakeryStaff[i].lv;

		const unlockS =
			i >= SPECIAL_WORKER_CUT_OFF_ID
				? 'special worker'
				: overLevel
					? 'unlocks at level ' + curLv
					: formatDoler(BakeryStaff[i].cost, false);

		s += `\`${('#' + i).padStart(3, ' ')}\` ${showItemName(BakeryStaff[i])} (${unlockS})
		Increases baking speed by ${Math.round((1 / BakeryStaff[i].multi) * 100) / 100}x\n`;

		if (BakeryStaff[i].spec) {
			s += 'Specializes in baking:\n';
			for (const j in BakeryStaff[i].spec)
				s += `${showItemName(BakeryCookies[j], false)} - ${Math.round((1 / (BakeryStaff[i].spec?.[j] ?? 1)) * 100) / 100}x\n`;
		}
	}

	return createSimpleMessage(s, Colors.Yellow, 'Available and soon unlocked workers');
}

function showCookieList(bakery: okbot.Bakery) {
	let s = '';

	for (const i in BakeryCookies) {
		if (i == RARE_ID) break;

		const ovens = [];
		for (const j in BakeryOvens) {
			if (BakeryOvens[j].lv > bakery.lv) break;
			if (BakeryOvens[j].cookie.includes(i)) ovens.push(j);
		}
		const req = BakeryLevelRequirements[bakery.lv]?.cookie?.[i];
		const baked = bakery.stat[i] ?? 0;

		s += `\`${('#' + i).padStart(3, ' ')}\` ${showItemName(BakeryCookies[i])}
		**${BakeryCookies[i].time}**s to bake, valued at ${formatDoler(BakeryCookies[i].value)}`;
		if (ovens.length)
			s += `\nCan be baked in oven${ovens.length === 1 ? '' : 's'} \`#${ovens.join(', ')}\`\n`;

		if (baked) s += `Baked **${formatNumber(baked)}** so far `;
		if (req) {
			const reqAchieved = req - baked;
			s +=
				reqAchieved <= 0
					? `🟢 ${formatNumber(-reqAchieved)} more than necessary to level up`
					: `🔴 need ${formatNumber(reqAchieved)} more to level up`;
		}

		s += '\n';
	}

	return createSimpleMessage(s, Colors.Yellow, 'List of cookies');
}

function checkBakeryLevelRequirements(monLv: number, bakery?: okbot.Bakery) {
	if (!bakery?.lv) return { met: true, string: '' };
	const req = BakeryLevelRequirements[bakery.lv];
	if (!req) return { met: true, string: '' };

	let string = '';
	let met = true;
	if (req.tot) {
		if (bakery.tot < req.tot) {
			string += '❌';
			met = false;
		} else string += '✅';
		string += `${e_blank}Total cookies: **${formatNumber(bakery.tot)}**/${formatNumber(req.tot)}\n`;
	}
	if (req.cookie) {
		for (const i in req.cookie) {
			const cookie = BakeryCookies[i];
			const need = req.cookie[i];
			const has = bakery.stat[i] ?? 0;

			if (has < need) {
				string += '❌';
				met = false;
			} else string += '✅';
			string += `${e_blank}${showItemName(cookie, false)} cookies: **${formatNumber(has)}**/${formatNumber(need)}\n`;
		}
	}
	if (req.monLv) {
		if (monLv < req.monLv) {
			string += '❌';
			met = false;
		} else string += '✅';
		string += `${e_blank}Money level: **${monLv}**/${req.monLv}\n`;
	}

	return { met, string };
}

function showLevels() {
	const msge = new EmbedBuilder().setColor(Colors.White).setTitle('Bakery upgrades');

	for (const i in BakeryLevels) {
		const stat = BakeryLevels[i];
		msge.addFields({
			name: 'Level ' + (Number(i) + 1),
			value: `\`${formatNumber(stat.cost).padStart(9, ' ')}\` 💵 | max ovens: **${stat.maxOven}** ● max staff: **${stat.maxStaff}** ● **${
				Math.round((1 / stat.multi) * 100) / 100
			}**x speed multiplier`
		});
	}

	return msge;
}

function showUpgradeStats(lv: number, money: number, reqString: string) {
	const msge = new EmbedBuilder()
		.setColor(Colors.White)
		.setDescription(
			showUpgradeCost(BakeryLevels[lv].cost, money) + (reqString ? '\n\nRequirements:\n' + reqString : '')
		);

	if (lv === 0)
		return msge
			.setTitle('Bakery construction')
			.addFields({ name: '\u200b', value: 'Allows you to bake and sell delicious cookies!' });

	msge
		.setTitle(`Bakery level ${lv + 1} upgrade`)
		.addFields([
			showUpgradeStat(BakeryLevels, lv, 'maxOven', 'Oven spaces'),
			showUpgradeStat(BakeryLevels, lv, 'maxStaff', 'Maximum staff'),
			showUpgradeStat(BakeryLevels, lv, 'multi', 'Baking speed', v => Math.round(100 / v) / 100 + 'x'),
			showUpgradeStat(BakeryLevels, lv, 'maxColl', 'Cookie storage capacity')
		])
		.setFooter({ text: "Cookies will not be consumed on upgrade\nUse 'bakery levels' to view all upgrades" });

	return msge;
}

// count cookie speed multipliers for every cookie per every employee
function countStaffMulti(bakery: okbot.Bakery) {
	const staffMulti: { base: number; cookie: { [cookieId: string]: number } } = { base: 1, cookie: {} };

	for (const i in bakery.staff) {
		if (bakery.staff[i] == null) continue;
		const worker = BakeryStaff[bakery.staff[i] as string];
		staffMulti.base *= worker.multi;

		for (const cookieId in BakeryCookies) {
			if (cookieId == RARE_ID || cookieId == RARE_BUNDLE_ID) continue;

			if (!staffMulti.cookie[cookieId]) staffMulti.cookie[cookieId] = 1;
			// multiply speed by base worker speed or spec if they specialize in the given cookie
			staffMulti.cookie[cookieId] *= worker.spec?.[cookieId] ? worker.spec[cookieId] : worker.multi;
		}
	}

	return staffMulti;
}

function explainBake(user: User, bakery: okbot.Bakery) {
	bakery = bake(bakery);
	db_plr_set({ _id: user.id, bakery });

	const msge = new EmbedBuilder()
		.setColor(Colors.Yellow)
		.setAuthor({
			iconURL: user.displayAvatarURL({ size: 32, forceStatic: true }),
			name: bakery.nam || user.displayName + "'s Bakery"
		})
		.setFooter({
			text: `Use 'bakery collect' to put all cookies in your inventory
Use 'bakery sell' to sell cookies from your inventory
Use 'bakery edit' to manage your staff and ovens`
		});

	let rareCPS = 0;
	let totalCPS = 0;
	const staffMulti = countStaffMulti(bakery);

	// set cookie specialization embed description
	let staffSpecializationCookies = 0; // number of cookies current staff is specialized for in total
	let staffMultiDesc = 'Specialized for baking:\n';
	for (const cookieId in staffMulti.cookie) {
		if (cookieId == RARE_ID || cookieId == RARE_BUNDLE_ID) continue;
		if (staffMulti.cookie[cookieId] != staffMulti.base) {
			++staffSpecializationCookies;
			staffMultiDesc += `${showItemName(BakeryCookies[cookieId], false)} (${Math.round((1 / staffMulti.cookie[cookieId]) * 1000) / 1000}x)\n`;
		}
	}
	if (staffSpecializationCookies) msge.setDescription(staffMultiDesc);

	for (const i in bakery.ovens) {
		if (!bakery.ovens[i]) continue;
		const cookie = BakeryCookies[bakery.ovens[i]!.cookie];
		const oven = BakeryOvens[bakery.ovens[i]!.id];
		const staffMultiCookie = staffMulti.cookie[bakery.ovens[i]!.cookie] ?? 1;

		const timeToBake = cookie.time * oven.multi * bakery.multi * staffMultiCookie;
		const cps = 1 / timeToBake;
		totalCPS += cps;
		rareCPS += oven.rare * cps;

		const ovenTime = `**${Math.round((1 / oven.multi) * 1000) / 1000}** oven speed`;
		const bakeryTime = `**${Math.round((1 / bakery.multi) * 1000) / 1000}** bakery bonus`;
		const staffTime = `**${Math.round((1 / staffMultiCookie) * 1000) / 1000}** staff bonus${staffMultiCookie != staffMulti.base ? ' (specialized)' : ''}`;

		const fieldName = `\`${Number(i) + 1}\` ${oven.nam} - ${showItemName(cookie, false)} (${Math.round(cps * 60 * 100) / 100}/min, ${Math.round(cps * 3600 * 100) / 100}/h)`;
		const fieldValue = `Time to bake = **${Math.round(timeToBake * 1000) / 1000}s**\n${cookie.time}s base / ${ovenTime} / ${bakeryTime} / ${staffTime}`;
		msge.addFields({ name: fieldName, value: fieldValue });
	}

	if (totalCPS <= 0) return msge.setDescription('🕸️ *Nothing baked in here...*');

	const spaceLeft = bakery.maxColl - bakery.toCollTot;
	const cpmString = `${Math.round(totalCPS * 60 * 100) / 100}/min 🍪 total`;
	const rareString = rareCPS
		? ` (~${Math.round((1 / rareCPS / 60) * 10) / 10} min per ${showItemName(BakeryCookies[RARE_ID], false)})`
		: '';
	msge.addFields(
		{ name: '\u200b', value: '\u200b' },
		{
			name: cpmString + rareString,
			value: `Space for ${spaceLeft ? formatNumber(spaceLeft) : 'no'} more cookies${spaceLeft ? `\n(full in ${formatMilliseconds((spaceLeft / totalCPS) * 1000)})` : ''}`
		}
	);

	return msge;
}

// returns a bakery with set cookies and stats
export function bake(bakery: okbot.Bakery, now?: number) {
	if (!now) now = Math.round(new Date().getTime() / 1000);
	const elapsedSeconds = now - bakery.lastColl;
	const invSpace = bakery.maxColl - bakery.toCollTot;
	const staffMulti = countStaffMulti(bakery);

	const bakedPerOven: number[] = [];
	let totalBaked = 0;
	for (const i in bakery.ovens) {
		if (!bakery.ovens[i]) continue;
		const cookie = BakeryCookies[bakery.ovens[i]!.cookie];
		const oven = BakeryOvens[bakery.ovens[i]!.id];
		const staffMultiCookie = staffMulti.cookie[bakery.ovens[i]!.cookie] ?? 1;

		const cps = 1 / (cookie.time * oven.multi * bakery.multi * staffMultiCookie);
		const cookiesBaked = Math.round(elapsedSeconds * cps);

		bakedPerOven[i] = cookiesBaked;
		totalBaked += cookiesBaked;
	}

	if (totalBaked > invSpace) {
		const overflow = totalBaked - invSpace;
		const overflowRatio = 1 - overflow / totalBaked;

		let firstOven;
		for (const i in bakedPerOven) {
			if (!bakedPerOven[i]) continue;
			if (firstOven == null) firstOven = i;

			totalBaked -= bakedPerOven[i];
			bakedPerOven[i] = Math.floor(bakedPerOven[i] * overflowRatio);
			totalBaked += bakedPerOven[i];
		}

		if (firstOven && totalBaked < invSpace) {
			const add = invSpace - totalBaked;
			bakedPerOven[firstOven as any] += add;
			totalBaked += add;
		}
	}

	let totalBakedValue = 0;
	for (const i in bakedPerOven) {
		if (!bakedPerOven[i]) continue;
		const oven = bakery.ovens[i];
		const { rares, rareBundles } = bakeRares(BakeryOvens[oven!.id], bakedPerOven[i]);
		const cookies = bakedPerOven[i] - rares - rareBundles;

		bakery.toColl[oven!.cookie]
			? (bakery.toColl[oven!.cookie] += cookies)
			: (bakery.toColl[oven!.cookie] = cookies);
		bakery.stat[oven!.cookie]
			? (bakery.stat[oven!.cookie] += cookies)
			: (bakery.stat[oven!.cookie] = cookies);
		bakery.toColl[RARE_ID] ? (bakery.toColl[RARE_ID] += rares) : (bakery.toColl[RARE_ID] = rares);
		bakery.stat[RARE_ID] ? (bakery.stat[RARE_ID] += rares) : (bakery.stat[RARE_ID] = rares);
		bakery.toColl[RARE_BUNDLE_ID]
			? (bakery.toColl[RARE_BUNDLE_ID] += rareBundles)
			: (bakery.toColl[RARE_BUNDLE_ID] = rareBundles);
		bakery.stat[RARE_BUNDLE_ID]
			? (bakery.stat[RARE_BUNDLE_ID] += rareBundles)
			: (bakery.stat[RARE_BUNDLE_ID] = rareBundles);

		totalBakedValue +=
			cookies * BakeryCookies[oven!.cookie].value +
			rares * BakeryCookies[RARE_ID].value +
			rareBundles * BakeryCookies[RARE_BUNDLE_ID].value;
	}

	bakery.tot += totalBaked;
	bakery.totVal += totalBakedValue;
	bakery.toCollTot += totalBaked;
	bakery.lastColl = now; // will reset all ovens' times to 0, potentially losing a cookie or two...
	return bakery;
}

function bakeRares(oven: okbot.BakeryOven, bakedCookies: number) {
	const raresRaw = bakedCookies * oven.rare * (Math.random() * 0.25 + 0.875);
	const raresFloor = Math.floor(raresRaw);
	const raresDecimal = raresRaw - raresFloor;

	const rares = raresFloor + (Math.random() < raresDecimal ? 1 : 0);
	const rareBundles = rares ? Math.ceil(Math.random() * 0.504 - 0.5) : 0;
	return { rares: rares - rareBundles, rareBundles };
}

export function getBakeryToCollect(bakery: okbot.Bakery) {
	const cookies: { [cookieId: string]: number } = {};
	let value = 0;
	for (const i in bakery.toColl) {
		cookies[i] = bakery.toColl[i];
		value += BakeryCookies[i].value * bakery.toColl[i];
	}

	return { value, fish: cookies };
}

// lists ovens in showBakery()
function showOvens(
	ovens: okbot.BakeryOvenList,
	bakeryMulti: number,
	staffMulti: { base: number; cookie: { [cookieId: string]: number } }
) {
	let s = '';
	let incomePerHour = 0;

	for (const i in ovens) {
		if (!ovens[i]?.id) {
			s += '⬛ Empty oven slot\n';
			continue;
		}

		const oven = BakeryOvens[ovens[i]!.id];
		const cookie = BakeryCookies[ovens[i]!.cookie];
		const staffMultiCookie = staffMulti.cookie[ovens[i]!.cookie] ?? 1;
		const cpm = 60 / (cookie.time * oven.multi * bakeryMulti * staffMultiCookie);
		incomePerHour += cpm * cookie.value;

		s += `🟩 ${oven.nam} (${Math.round(cpm * 100) / 100} ${showItemName(cookie, false)}/min)\n`;
	}

	return { string: s, incomePerHour: Math.round(incomePerHour * 6000) / 100 };
}

// lists staff in showBakery()
function showStaff(staff: okbot.BakeryStaffList) {
	let s = '';
	for (const i in staff) {
		if (!staff[i]) {
			s += '⚫ Empty worker slot\n';
			continue;
		}

		const worker = BakeryStaff[staff[i] as string];
		s += `${showItemName(worker, false)} (${Math.round((1 / worker.multi) * 100) / 100}x)\n`;
	}

	return s || '\u200b';
}

function showBakery(user: User, bakery: okbot.Bakery) {
	bakery = bake(bakery);
	db_plr_set({ _id: user.id, bakery });

	const lvMultiString = bakery.multi === 1 ? '' : ` (${Math.round(100 / bakery.multi) / 100}x speed)`;
	const msge = new EmbedBuilder()
		.setColor(Colors.Yellow)
		.setAuthor({
			iconURL: user.displayAvatarURL({ size: 32, forceStatic: true }),
			name: bakery.nam || user.displayName + "'s Bakery"
		})
		.setFooter({
			text: `Level ${bakery.lv}${lvMultiString}
Use 'bakery collect' to put all cookies in your inventory
Use 'bakery sell' to sell cookies from your inventory
Use 'bakery edit' to manage your staff and ovens
Use 'bakery explain' to view a detailed breakdown of your cookies' bake time`
		});

	const staffMulti = countStaffMulti(bakery);
	const ovens = showOvens(bakery.ovens, bakery.multi, staffMulti); //field value string + income per hour
	const ovensC = bakery.ovens.length;
	const staff = showStaff(bakery.staff);
	const staffC = bakery.staff.length;
	const staffMultiString =
		staffMulti.base === 1 ? '' : ` (${Math.round((1 / staffMulti.base) * 100) / 100}x speed)`;
	const invBar = drawProgressBar(Math.round((bakery.toCollTot / bakery.maxColl) * 10), 10, '🟨');
	const invString = `**${formatNumber(bakery.toCollTot)}**/${formatNumber(bakery.maxColl)} 🍪`;

	msge.addFields(
		{ name: `${ovensC} oven${ovensC === 1 ? '' : 's'}`, value: ovens.string },
		{
			name: `${staffC} worker${staffC === 1 ? '' : 's'}${staffMultiString}`,
			value: staff
		},
		{ name: '\u200b', value: '\u200b' },
		{
			name: `Stored cookies (${formatDoler(ovens.incomePerHour, false)}/h)`,
			value: invString + '\n' + invBar
		}
	);

	const components = bakery.toCollTot
		? [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(`bake_collect-${user.id}`)
						.setStyle(ButtonStyle.Primary)
						.setLabel('Collect')
				)
			]
		: [];

	return { msge, components };
}

async function showStats(usr: User, bakery: okbot.Bakery) {
	bakery = bake(bakery);
	await db_plr_set({ _id: usr.id, bakery });

	const msge = new EmbedBuilder().setColor(Colors.Yellow).setAuthor({
		name: `${usr.displayName}'s bakery stats`,
		iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
	});
	if (!bakery.tot) return msge.setDescription("This bakery hasn't baked anything yet...");

	let stringName = '';
	let stringAmount = '';
	for (const i in bakery.stat) {
		if (!bakery.stat[i]) continue; //skip in case 0 cookies
		const cookie = BakeryCookies[i];
		stringName += `${showItemName(cookie, false)}\n`;
		stringAmount += `x**${bakery.stat[i]}**${e_blank}\n`;
	}

	msge.setDescription(
		`Opened <t:${bakery.created}:D>\nLevel **${bakery.lv}** achieved <t:${bakery.lvTime}:R>.`
	);
	msge.addFields(
		{ name: '\u200b', value: stringName, inline: true },
		{ name: '\u200b', value: stringAmount, inline: true },
		{ name: '\u200b', value: '\u200b', inline: true },
		{ name: 'Total baked', value: formatNumber(bakery.tot), inline: true },
		{ name: 'Total value', value: formatDoler(bakery.totVal, false), inline: true }
	);

	return msge;
}

async function showInventory(usr: User, bakery: okbot.Bakery) {
	await db_plr_set({ _id: usr.id, bakery });

	const msge = new EmbedBuilder().setColor(Colors.Yellow).setAuthor({
		name: `${usr.displayName}'s cookie inventory`,
		iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
	});

	let valTot = 0;
	let stringName = '';
	let stringAmount = '';
	let stringValue = '';

	for (const i in bakery.inv) {
		if (!bakery.inv[i]) continue; //skip in case 0 cookies

		const cookie = BakeryCookies[i];
		const val = cookie.value * bakery.inv[i];

		stringAmount += `**${bakery.inv[i]}**x\n`;
		stringName += `${showItemName(cookie, false)}\n`;
		stringValue += `${formatDoler(val, false)}\n`;
		valTot += val;
	}
	if (!stringName) return msge.setDescription('🕸️ There is nothing here...');

	msge
		.addFields(
			{ name: '\u200b', value: stringAmount, inline: true },
			{ name: '\u200b', value: stringName, inline: true },
			{ name: '\u200b', value: stringValue, inline: true },
			{ name: 'Total value', value: formatDoler(valTot, false), inline: true }
		)
		.setFooter({ text: "Use 'bakery sell' to sell your cookies" });

	return msge;
}

async function collect(usr: User, bakery: okbot.Bakery) {
	bakery = bake(bakery);
	if (!bakery.toCollTot) return createSimpleMessage('There are no cookies to collect!');

	let totValue = 0;
	for (const i in bakery.toColl) {
		bakery.inv[i] = (bakery.inv?.[i] ?? 0) + bakery.toColl[i];
		if (i == RARE_ID) continue;
		totValue += bakery.toColl[i] * BakeryCookies[i].value;
	}

	const rares = bakery.toColl[RARE_ID];
	const rareBundles = bakery.toColl[RARE_BUNDLE_ID];
	const rareString = rares
		? `\n+**${rares}** ${showItemName(BakeryCookies[RARE_ID], false)} cookie${rares === 1 ? '' : 's'}!`
		: '';
	const rareBundlesString = rareBundles
		? `\n+**${rareBundles}** ${showItemName(BakeryCookies[RARE_BUNDLE_ID], false)}!`
		: '';
	const toColl = bakery.toCollTot;
	bakery.toCollTot = 0;
	bakery.toColl = {};
	await db_plr_set({ _id: usr.id, bakery });

	return createSimpleMessage(
		`Collected ${formatNumber(toColl - rares)} cookies worth ${formatDoler(totValue)}.${rareString}${rareBundlesString}`,
		Colors.DarkGreen
	).setFooter({ text: "Use 'bakery inventory' to view them" });
}

export async function execute(msg: okbot.Message, args: string[]) {
	const action = args.shift()?.toLowerCase();

	switch (action) {
		case 'inventory':
		case 'inv':
			return executeInventory(msg, args);
		case 'stats':
		case 'stat':
			return executeStats(msg, args);
		case 'edit':
		case 'set':
			if (!args.length) return sendSimpleMessage<okbot.Message>(msg, usageEdit, Colors.White);
			return executeEdit(msg, args);
		case 'upgrade':
		case 'open':
		case 'up':
			return executeUpgrade(msg);
		case 'upgrades':
		case 'levels':
		case 'lv': {
			return msg.reply({ embeds: [showLevels()], allowedMentions: { repliedUser: false } });
		}
		case 'collect':
		case 'pay':
			return executeCollect(msg);
		case 'ovens':
			return executeOvenList(msg);
		case 'staff':
		case 'workers':
			return executeStaffList(msg);
		case 'cookies':
			return executeCookieList(msg);
		case 'explain':
		case 'details':
			return executeExplain(msg, args);
		case 'globalstats':
		case 'global':
			return executeStatsGlobal(msg);
		case 'sell':
			if (!args.length) return sendSimpleMessage<okbot.Message>(msg, usageSell, Colors.White);
			return executeSell(msg, args);
		default:
			return executeShowBakery(msg, args);
	}
}

async function executeInventory(msg: okbot.Message, args: string[]) {
	const user = (await getUserFromMsg(msg, args)) || msg.author;
	const plrdat = await db_plr_get({ _id: user.id, bakery: 1 });

	if (!plrdat?.bakery) return sendNoBakeryMessage(msg, user);

	const msge = await showInventory(user, plrdat.bakery);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeStatsGlobal(msg: okbot.Message) {
	const stats = await db_bakery_get_stats();

	let total = 0;
	let desc = '';
	for (const i in stats) {
		desc += `\`${formatNumber(stats[i]).padStart(9, ' ')}\`x${e_blank}${showItemName(BakeryCookies[i])}\n`;
		total += stats[i];
	}

	const msge = new EmbedBuilder()
		.setColor(Colors.Yellow)
		.setTitle('🌍 Global bakery stats')
		.setDescription(desc)
		.addFields({ name: 'Total baked', value: formatNumber(total) });
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeExplain(msg: okbot.Message, args: string[]) {
	const user = (await getUserFromMsg(msg, args)) || msg.author;
	const plrdat = await db_plr_get({ _id: user.id, bakery: 1 });

	if (!plrdat?.bakery) return sendNoBakeryMessage(msg, user);

	const msge = explainBake(user, plrdat.bakery);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeCookieList(msg: okbot.Message) {
	const plrdat = await db_plr_get({ _id: msg.author.id, bakery: 1 });
	if (!plrdat?.bakery) return sendNoBakeryMessage(msg);

	const msge = showCookieList(plrdat.bakery);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeStaffList(msg: okbot.Message) {
	const plrdat = await db_plr_get({ _id: msg.author.id, bakery: 1, fishCol: 1 });
	if (!plrdat?.bakery) return sendNoBakeryMessage(msg);

	const msge = showStaffList(plrdat.bakery.lv, !!plrdat.fishCol?.['Perfect genome']?.fin);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeUpgrade(msg: okbot.Message) {
	const id = msg.author.id;
	const plrdat = await db_plr_get({ _id: id, bakery: 1, mon: 1, monLv: 1 });
	const bakery = plrdat?.bakery ? bake(plrdat?.bakery) : undefined;
	const lv = bakery?.lv ?? 0;
	if (!BakeryLevels[lv])
		return sendSimpleMessage<okbot.Message>(msg, 'Your bakery is already at the maximum level!');

	const requirements = checkBakeryLevelRequirements(plrdat?.monLv ?? 0, bakery);
	const mon = plrdat?.mon ?? 0;
	const components =
		mon >= BakeryLevels[lv].cost && requirements.met
			? [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`bake_up_confirm-${id}`)
							.setStyle(ButtonStyle.Success)
							.setLabel('Upgrade'),
						new ButtonBuilder()
							.setCustomId(`bake_up_cancel-${id}`)
							.setStyle(ButtonStyle.Danger)
							.setLabel('Cancel')
					)
				]
			: [];

	if (bakery) await db_plr_set({ _id: id, bakery }); // update after baking new cookies
	msg.reply({ embeds: [showUpgradeStats(lv, mon, requirements.string)], components });
}

async function executeStats(msg: okbot.Message, args: string[]) {
	const user = (await getUserFromMsg(msg, args)) || msg.author;
	const plrdat = await db_plr_get({ _id: user.id, bakery: 1 });

	if (!plrdat?.bakery) return sendNoBakeryMessage(msg, user);

	const msge = await showStats(user, plrdat.bakery);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeShowBakery(msg: okbot.Message, args: string[]) {
	const user = (await getUserFromMsg(msg, args)) || msg.author;
	const plrdat = await db_plr_get({ _id: user.id, bakery: 1 });

	if (!plrdat?.bakery) return sendNoBakeryMessage(msg, user);

	const show = showBakery(user, plrdat.bakery);
	msg.reply({ embeds: [show.msge], components: show.components, allowedMentions: { repliedUser: false } });
}

async function executeCollect(msg: okbot.Message) {
	const plrdat = await db_plr_get({ _id: msg.author.id, bakery: 1 });
	if (!plrdat?.bakery) return sendNoBakeryMessage(msg);

	const msge = await collect(msg.author, plrdat.bakery);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeOvenList(msg: okbot.Message) {
	const plrdat = await db_plr_get({ _id: msg.author.id, bakery: 1 });
	if (!plrdat?.bakery) return sendNoBakeryMessage(msg);

	const msge = showOvenList(plrdat.bakery.lv);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

async function executeSell(msg: okbot.Message, args: string[]) {
	const plrdat = await db_plr_get({ _id: msg.author.id, mon: 1, monTot: 1, monLv: 1, bakery: 1 });
	if (!plrdat?.bakery) return sendNoBakeryMessage(msg);

	const amount = getCookiesToSellAmount(msg, args);
	if (!amount) return;
	const cookieIdsOrNames = args.join(' ').split(',');

	let tot = 0;
	let totVal = 0;
	const toSell: { [cookieId: string]: boolean } = {}; // duplicate cookies check, true if already marked for sale

	const bakery = bake(plrdat.bakery);

	// "all"
	if (cookieIdsOrNames.length === 1) {
		const idOrName = cookieIdsOrNames[0].toLowerCase();

		if (idOrName === 'all') {
			for (const i in bakery.inv) {
				const cookieInInv = bakery.inv[i];
				if (!cookieInInv || i == RARE_ID) continue; // skip if 0 cookies or rare cookie

				if (amount && cookieInInv < amount)
					return sendSimpleMessage<okbot.Message>(
						msg,
						`You have **${formatNumber(cookieInInv)}** ${showItemName(BakeryCookies[i], false)} cookie${cookieInInv == 1 ? '' : 's'} but requested to sell ${formatNumber(amount)} of them.\nRemove the amount argument to sell all cookies of that type in your inventory.`
					);
				if (!cookieInInv) continue;

				const cookieAmount = amount || cookieInInv; // sell all if no amount provided

				bakery.inv[i] -= cookieAmount;
				tot += cookieAmount;
				totVal += BakeryCookies[i].value * cookieAmount;
			}

			if (!tot) return sendSimpleMessage<okbot.Message>(msg, 'No cookies to sell!', Colors.DarkOrange);
		}
	}

	// explicitly given cookies
	if (!tot) {
		for (const i in cookieIdsOrNames) {
			const cookieId = getCookieIdByIdOrName(msg, cookieIdsOrNames[i]);
			if (cookieId == null) return;

			const cookieInInv = bakery.inv[cookieId];
			if (!cookieInInv || toSell[cookieId]) continue; // don't count the same cookie twice

			if (amount && cookieInInv < amount)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`You have **${formatNumber(cookieInInv)}** ${showItemName(BakeryCookies[i], false)} cookie${cookieInInv == 1 ? '' : 's'} but requested to sell ${formatNumber(amount)} of them.\nRemove the amount argument to sell all cookies of that type in your inventory.`
				);
			if (!cookieInInv) continue;

			const cookieAmount = amount || cookieInInv; // sell all if no amount provided

			toSell[cookieId] = true;
			bakery.inv[cookieId] -= cookieAmount;
			tot += cookieAmount;
			totVal += BakeryCookies[cookieId].value * cookieAmount;
		}
	}

	if (!tot) return sendSimpleMessage<okbot.Message>(msg, 'No cookies to sell!', Colors.DarkOrange);

	const monLv = calcMoneyLevelsGain(plrdat.monLv ?? 0, (plrdat.monTot ?? 0) + totVal, msg);
	await db_plr_add({ _id: msg.author.id, mon: totVal, monTot: totVal, monLv, income: { bakery: totVal } });
	await db_plr_set({ _id: msg.author.id, bakery });

	return sendSimpleMessage<okbot.Message>(
		msg,
		`Sold **${formatNumber(tot)}** cookies for ${formatDoler(totVal)}.`,
		Colors.DarkGreen
	);
}

// TODO refactor hahaaa
async function executeEdit(msg: okbot.Message, args: string[]) {
	const plrdat = await db_plr_get({ _id: msg.author.id, mon: 1, bakery: 1, fishCol: 1 });
	if (!plrdat?.bakery) return sendNoBakeryMessage(msg);

	const mon = plrdat.mon ?? 0;
	const type = args.shift()!.toLowerCase();
	if (type === 'name') {
		//reset name
		if (!args.length) {
			await db_plr_set({ _id: msg.author.id, 'bakery.nam': undefined } as any);
			return sendSimpleMessage<okbot.Message>(msg, "Reset your bakery's name.", Colors.DarkGreen);
		}
		//set name
		const nam = args.join(' ').slice(0, 96);
		await db_plr_set({ _id: msg.author.id, 'bakery.nam': nam } as any);
		return sendSimpleMessage<okbot.Message>(
			msg,
			"Set your bakery's name to `" + nam + '`.',
			Colors.DarkGreen
		);
	}

	if (args.length < 2) return sendSimpleMessage<okbot.Message>(msg, usageEdit, Colors.White);
	const index = parseInt(args.shift() as string); //oven spot/staff id 1-indexed for user friendliness

	if (type === 'oven') {
		const maxOvens = plrdat.bakery.ovens.length;
		if (isNaN(index) || index < 1 || index > maxOvens)
			return sendSimpleMessage<okbot.Message>(
				msg,
				'Invalid oven spot number!\n' +
					(maxOvens === 1
						? 'You only have one oven spot (numbered `#1`).'
						: 'Your current oven spots are numbered `#1-#' + maxOvens + '`.')
			);

		const action = args.shift()!.toLowerCase();
		const oven = plrdat.bakery.ovens[index - 1];
		const ovenObject = oven?.id ? BakeryOvens[oven.id] : null; //current oven in the selected spot

		const bakery = bake(plrdat.bakery); //bake cookies not to lose any when switching ovens

		if (action === 'sell') {
			if (!ovenObject)
				return sendSimpleMessage<okbot.Message>(
					msg,
					"You don't have any oven to sell at spot `#" + index + '`!'
				);

			bakery.ovens[index - 1] = null;

			await db_plr_add({ _id: msg.author.id, mon: ovenObject.cost, expense: { bakery: -ovenObject.cost } });
			await db_plr_set({ _id: msg.author.id, bakery });

			return sendSimpleMessage<okbot.Message>(
				msg,
				`Sold ${ovenObject.nam} oven from spot \`#${index}\` and received ${formatDoler(ovenObject.cost)}.`,
				Colors.DarkGreen
			);
		}

		if (action === 'buy') {
			if (!args.length)
				return sendSimpleMessage<okbot.Message>(
					msg,
					'Please provide the name (e.g. Rusty) or index (e.g. 1) of the oven you wish to buy!'
				);

			let ovenToBuy;
			let ovenToBuyId = parseInt(args[0]);
			if (ovenToBuyId) ovenToBuy = BakeryOvens[ovenToBuyId];
			else {
				const ovenName = new RegExp(args[0], 'gi');
				for (const i in BakeryOvens) {
					if (ovenName.test(BakeryOvens[i].nam)) {
						ovenToBuy = BakeryOvens[i];
						ovenToBuyId = parseInt(i);
						break;
					}
				}
			}

			if (!ovenToBuy)
				return sendSimpleMessage<okbot.Message>(
					msg,
					'Invalid oven selected!\nPlease provide the name (e.g. Rusty) or index (e.g. 1) of the oven you wish to buy.'
				);

			if (ovenToBuy.nam === ovenObject?.nam)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`You already have a **${ovenToBuy.nam}** oven at spot \`#${index}\`!`
				);

			if (ovenToBuy.lv > bakery.lv)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`The **${ovenToBuy.nam}** oven is only available at bakery level \`${ovenToBuy.lv}\` or higher while yours is level \`${bakery.lv}\`.`
				);

			const cost = ovenToBuy.cost - (ovenObject?.cost ?? 0); //previous oven will be sold
			if (mon < cost)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`You need ${formatDoler(cost - mon)} more to afford the ${ovenToBuy.nam} oven!`
				);

			let costString = cost < 0 ? `You got ${formatDoler(-cost)}.` : `You spent ${formatDoler(cost)}.`;
			if (ovenToBuy.costRare) {
				if (ovenToBuy.costRare > bakery.inv[RARE_ID])
					return sendSimpleMessage<okbot.Message>(
						msg,
						`You need **${ovenToBuy.costRare - bakery.inv[RARE_ID]}** more ${
							BakeryCookies[RARE_ID].emoji
						} rare cookies in your inventory to buy the ${ovenToBuy.nam} oven!`
					);

				bakery.inv[RARE_ID] -= ovenToBuy.costRare;
				costString += `\nAte **${ovenToBuy.costRare}** ${BakeryCookies[RARE_ID].emoji} rare cookies.`;
			}

			// keep baking the previously set cookie if possible, choose the oven's first otherwise
			bakery.ovens[index - 1] = {
				id: ovenToBuyId.toString(),
				cookie: oven?.cookie && ovenToBuy.cookie.includes(oven.cookie) ? oven.cookie : ovenToBuy.cookie[0]
			};

			await db_plr_add({ _id: msg.author.id, mon: -cost, expense: { bakery: cost } });
			await db_plr_set({ _id: msg.author.id, bakery });

			if (ovenObject)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`Replaced \`${ovenObject.nam}\` oven at spot #${index} with \`${ovenToBuy.nam}\` oven.\n${costString}`,
					Colors.DarkGreen
				);
			return sendSimpleMessage<okbot.Message>(
				msg,
				`Put \`${ovenToBuy.nam}\` oven at spot #${index}.\n${costString}`,
				Colors.DarkGreen
			);
		}

		if (action === 'set' || action === 'cookie') {
			if (!args.length)
				return sendSimpleMessage<okbot.Message>(
					msg,
					'Please provide the name (e.g. Plain) or index (e.g. 1) of the cookie you wish to bake!'
				);
			if (!ovenObject)
				return sendSimpleMessage<okbot.Message>(
					msg,
					"You don't have any oven to bake with at spot `#" + index + '`!'
				);

			let cookie;
			let cookieId = parseInt(args[0]);
			if (cookieId) cookie = BakeryCookies[cookieId];
			else {
				const cookieName = new RegExp(args[0], 'gi');
				for (const i in BakeryCookies) {
					if (cookieName.test(BakeryCookies[i].nam)) {
						cookie = BakeryCookies[i];
						cookieId = parseInt(i);
						break;
					}
				}
			}

			if (!cookie)
				return sendSimpleMessage<okbot.Message>(
					msg,
					'Invalid cookie selected!\nPlease provide the name (e.g. Butter) or index (e.g. 1) of the cookie you wish to bake.'
				);

			const oldCookie = BakeryCookies[oven!.cookie];
			if (cookie.nam === oldCookie.nam)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`You are already baking ${showItemName(cookie)} cookies at spot \`#${index}\`!`
				);

			if (!ovenObject.cookie.includes(cookieId.toString()))
				return sendSimpleMessage<okbot.Message>(
					msg,
					`The ${ovenObject.nam} oven is not able to bake ${showItemName(cookie)} cookies.`
				);

			bakery.ovens[index - 1]!.cookie = cookieId.toString();

			await db_plr_set({ _id: msg.author.id, bakery });
			return sendSimpleMessage<okbot.Message>(
				msg,
				`Switched from baking ${showItemName(oldCookie, false)} to ${showItemName(cookie)} cookies at spot \`#${index}\`.`,
				Colors.DarkGreen
			);
		}

		return sendSimpleMessage<okbot.Message>(msg, usageEdit, Colors.White);
	}

	if (type === 'staff' || type === 'worker' || type === 'employee') {
		const maxStaff = plrdat.bakery.staff.length;
		if (isNaN(index) || index < 1 || index > maxStaff)
			return sendSimpleMessage<okbot.Message>(
				msg,
				'Invalid worker spot number!\n' +
					(maxStaff === 1
						? 'You only have one worker spot (numbered `#1`).'
						: 'Your current worker spots are numbered `#1-#' + maxStaff + '`.')
			);

		const action = args.shift()!.toLowerCase();
		const staff = plrdat.bakery.staff[index - 1];
		const staffObject = staff ? BakeryStaff[staff] : null; //current worker in the selected spot

		const bakery = bake(plrdat.bakery); //bake cookies not to lose any when switching

		if (action === 'fire' || action === 'sell') {
			if (!staffObject)
				return sendSimpleMessage<okbot.Message>(
					msg,
					"You don't have any worker to fire from spot `#" + index + '`!'
				);

			bakery.staff[index - 1] = null;
			await db_plr_set({ _id: msg.author.id, bakery });

			return sendSimpleMessage<okbot.Message>(
				msg,
				`Fired ${showItemName(staffObject)} from spot \`#${index}\`.`,
				Colors.DarkGreen
			);
		}

		if (action === 'hire' || action === 'buy') {
			if (!args.length)
				return sendSimpleMessage<okbot.Message>(
					msg,
					'Please provide the name (e.g. Rat) or index (e.g. 1) of the worker you wish to employ!'
				);

			let toHire;
			let toHireId = parseInt(args[0]);
			if (toHireId) toHire = BakeryStaff[toHireId];
			else {
				const workerName = new RegExp(args[0], 'gi');
				for (const i in BakeryStaff) {
					if (workerName.test(BakeryStaff[i].nam)) {
						toHire = BakeryStaff[i];
						toHireId = parseInt(i);
						break;
					}
				}
			}

			if (!toHire)
				return sendSimpleMessage<okbot.Message>(
					msg,
					'Invalid worker selected!\nPlease provide the name (e.g. Rat) or index (e.g. 1) of the worker you wish to employ.'
				);

			if (toHire.nam === staffObject?.nam)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`You are already employing ${showItemName(staffObject)} at spot \`#${index}\`!`
				);

			if (toHire.lv > bakery.lv)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`${showItemName(toHire)} is only available at bakery level \`${toHire.lv}\` or higher while yours is level \`${bakery.lv}\`.`
				);

			if (mon < toHire.cost)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`You need ${formatDoler(toHire.cost - mon)} more to afford a ${showItemName(toHire, false)}!`
				);

			// special collectors employee
			if (toHireId >= Number(SPECIAL_WORKER_CUT_OFF_ID)) {
				const maxSpecialWorkers = plrdat.fishCol?.['Perfect genome']?.fin ?? 0;
				const curSpecialWorkers = bakery.staff.filter(a => a && a >= SPECIAL_WORKER_CUT_OFF_ID).length;
				if (curSpecialWorkers >= maxSpecialWorkers) {
					const msgContent =
						(maxSpecialWorkers ? `You can only hire **${maxSpecialWorkers}**` : "You can't hire any") +
						` of this type of worker based on your ${showItemName({ nam: 'Perfect genome', emoji: Fish.f['Perfect genome'].emoji }, false)} count!`;

					return sendSimpleMessage<okbot.Message>(msg, msgContent);
				}
			}

			bakery.staff[index - 1] = toHireId.toString();

			await db_plr_add({ _id: msg.author.id, mon: -toHire.cost, expense: { bakery: toHire.cost } });
			await db_plr_set({ _id: msg.author.id, bakery });

			if (staffObject)
				return sendSimpleMessage<okbot.Message>(
					msg,
					`Replaced ${showItemName(staffObject, false)} at spot \`#${index}\` with a ${showItemName(
						toHire,
						false
					)}.\nYou paid ${formatDoler(toHire.cost, false)}.`,
					Colors.DarkGreen
				);
			return sendSimpleMessage<okbot.Message>(
				msg,
				`Hired a ${showItemName(toHire)} at spot \`#${index}\`.\nYou paid ${formatDoler(toHire.cost, false)}.`,
				Colors.DarkGreen
			);
		}

		return sendSimpleMessage<okbot.Message>(msg, usageEdit, Colors.White);
	}

	return sendSimpleMessage<okbot.Message>(msg, usageEdit, Colors.White);
}
