import { Colors, EmbedBuilder, User } from "discord.js";
import fs from "fs";
import { db_fish_add, db_fish_get, db_plr_add, db_plr_get } from "../../db/db.js";
import { SET } from "../../settings.js";
import {
	calcMoneyLevelsGain,
	checkBoosterValidity,
	createSimpleMessage,
	formatDoler,
	formatNumber,
	getUserFromMsg,
	isOnCooldown,
	randomInt,
	sendSimpleMessage
} from "../../utils.js";

export const Fish: { tot: number; f: { [nam: string]: okbot.Fish } } = { tot: 0, f: {} };

export const name = "fish";
export const description = "🐟 Catch them all (or get caught)";
export const usage = "<Action> <Username OR Mention> <Fish type OR Fish name>";
export const usageDetail =
	"Actions (empty to cast for fish):\n- inventory\n- stats\n- info\n- sell\n- list\n- globalstats\nTypes:\n- stinky\n- ok\n- cool\n- rare\n- collectors";

export const getRarityEmoji = (type: okbot.FishRarity) => {
	switch (type) {
		case "stinky":
			return "⚫";
		case "ok":
			return "⚪";
		case "cool":
			return "🟡";
		case "rare":
			return "🔴";
		case "collectors":
		case "collectors+":
			return "🟣";
	}
};

const getRarityColor = (type: okbot.FishRarity) => {
	switch (type) {
		case "stinky":
			return "#31373D";
		case "ok":
			return "#E6E7E8";
		case "cool":
			return "#FDCB58";
		case "rare":
			return "#DD2E44";
		case "collectors":
		case "collectors+":
			return "#AA8ED6";
	}
};

const sellableRarities = ["cool", "ok", "stinky", "rare"]; // prevent sale of collectors+

/*Pants [ 0, 55000 ]
Water [ 55000, 115000 ]
bugger [ 115000, 175000 ]
it is just a boot [ 175000, 235000 ]
Battery [ 235000, 275000 ]
Takeout [ 275000, 320000 ]
Shopping Cart!? [ 320000, 334000 ]
booger [ 334000, 367000 ]
potato [ 367000, 392000 ]
Brain [ 392000, 410000 ]
Saxophone [ 410000, 423000 ]
egg [ 423000, 438000 ]
Snalea [ 438000, 453000 ]
Argentina [ 453000, 455500 ]
Ring [ 455500, 462000 ]
CPU [ 462000, 463800 ]
Duck [ 463800, 471300 ]
Wheelchair [ 471300, 477300 ]
Hot chick [ 477300, 486300 ]
Adam [ 486300, 488300 ]
Turtle [ 488300, 488750 ]
BLÅHAJ [ 488750, 489070 ]
The Moon [ 489070, 489290 ]
Fucking dragon [ 489290, 489480 ]
Peachie [ 489480, 489650 ]
Gil [ 489650, 489820 ]
The Singularity [ 489820, 489906 ]
Alien artifact [ 489906, 489908 ]
Ancient skeleton [ 489908, 489910 ]
Perfect genome [ 489910, 489912 ]
Lost crown [ 489912, 489914 ]
Pure euphoria [ 489914, 489916 ]*/

async function fish(msg: okbot.Message) {
	if (isOnCooldown("fish", msg.author.id, msg, "before casting again.")) return;

	const plrdat = await db_plr_get({ _id: msg.author.id, mon: 1, fishPower: 1, boosters: 1 });
	let numFish = 1 + (plrdat?.fishPower ?? 0);
	if (plrdat?.boosters) {
		// technically not TimedBoosters, this is just to avoid type errors
		const bos_time10 = checkBoosterValidity(plrdat, "FIS0003") as okbot.TimedBooster;
		const bos_time60 = checkBoosterValidity(plrdat, "FIS0004") as okbot.TimedBooster;

		if (bos_time10?.v) numFish += bos_time10.v[0];
		if (bos_time60?.v) numFish += bos_time60.v[0];
	}

	//check if enough money
	const moneyNeed = (SET.FISH_COST ?? 0) * numFish;
	if ((plrdat?.mon ?? 0) < moneyNeed)
		return sendSimpleMessage(msg, `You need at least ${formatDoler(moneyNeed)} to cast!`);

	// get `numFish` random fish
	let collectorsPartGlobal;
	const fishCaught: { [fishName: string]: { am: number; collectorsPart?: 1 | 2 | 3 | 4 | 5 } } = {};
	for (let i = 0; i < numFish; i++) {
		let collectorsPart;
		const r = Math.floor(Math.random() * (Fish.tot + 1));

		for (const nam in Fish.f) {
			const caught = Fish.f[nam];
			if (r >= caught.odds![0] && r < caught.odds![1]) {
				// WARNING: will set the same collectorsPart instead of rolling multiple times (very very very low odds to ever matter)
				if (fishCaught[nam]) ++fishCaught[nam].am;
				else {
					if (caught.type === "collectors")
						collectorsPartGlobal = collectorsPart = randomInt(1, 5) as 1 | 2 | 3 | 4 | 5;
					fishCaught[nam] = { am: 1, collectorsPart };
				}
				break;
			}
		}
	}

	let desc = "";
	let rarestSort = 10; // fish's sort field (0-4, 0 rarest), used to determine the color of the embed
	let rarestType;
	let raresCaught = 0;
	let sameFishCaught = 0;

	const promises = [];
	for (const i in fishCaught) {
		promises.push(
			new Promise(async (resolve, reject) => {
				if (
					(await db_fish_add(
						msg.author.id,
						i,
						(SET.FISH_COST ?? 0) * fishCaught[i].am,
						fishCaught[i].collectorsPart,
						fishCaught[i].am
					)) === null
				) {
					reject();
					return;
				}
				resolve(1);
			})
		);

		if (!rarestType || Fish.f[i].sort < rarestSort) {
			rarestType = Fish.f[i].type;
			rarestSort = Fish.f[i].sort;
		}
		desc +=
			fishCaught[i].am > 1
				? `${fishCaught[i].am}x ${Fish.f[i].emoji} **${i}**, `
				: `${Fish.f[i].emoji} **${i}**, `;

		if (Fish.f[i].type === "rare") raresCaught += fishCaught[i].am;
		if (fishCaught[i].am >= 3 && sameFishCaught < fishCaught[i].am) sameFishCaught = fishCaught[i].am;
	}

	await Promise.all(promises);
	const msge = createSimpleMessage(
		`You caught ${desc.slice(0, -2)}!\nYou paid ${formatDoler(moneyNeed)} for casting.`,
		getRarityColor(rarestType as okbot.FishRarity)
	);

	let description;
	if (collectorsPartGlobal)
		description = `> **Extremely rare collection piece - part ${collectorsPartGlobal}/5!**`;
	else if (raresCaught >= 2) description = `> Caught **${raresCaught}** rare fish at once!`;
	if (sameFishCaught) {
		if (description) description += "\n> ";
		else description = "> ";
		description += `**${sameFishCaught}** of a kind!`;
	}

	msg.reply({
		content: description,
		embeds: [msge],
		allowedMentions: { repliedUser: Boolean(collectorsPartGlobal) }
	});
}

async function inv(msg: okbot.Message, usr?: User | null) {
	if (!usr) usr = msg.author;
	const fishe = await db_plr_get({ _id: usr.id, fish: 1 });
	if (!fishe?.fish) return sendSimpleMessage(msg, `\`${usr.displayName}\` has no fish :pensive:`);

	const fishArr = [];
	let totalPrice = 0;
	for (const nam in fishe.fish) {
		if (fishe.fish[nam]) {
			const currentFish = Fish.f[nam];
			const currentPrice = fishe.fish[nam] * (currentFish.price ?? 0);
			totalPrice += currentPrice;

			fishArr.push({
				count: `${getRarityEmoji(currentFish.type)} **${fishe.fish[nam]}**x\n`,
				nam: `${currentFish.emoji} ${nam}\n`,
				price: `${formatDoler(currentPrice, false)}\n`,
				sort: currentFish.sort
			});
		}
	}

	if (!fishArr.length) return sendSimpleMessage(msg, `\`${usr.displayName}\` has no fish :pensive:`);

	// sort by type
	fishArr.sort((a, b) => (a.sort < b.sort ? -1 : 1));
	let countfield = "";
	let namefield = "";
	let pricefield = "";
	for (const i of fishArr) {
		countfield += i.count;
		namefield += i.nam;
		pricefield += i.price;
	}

	const av = usr.displayAvatarURL({ forceStatic: true, size: 32 });
	const msge = new EmbedBuilder()
		.setAuthor({ name: `${usr.displayName}'s fishy	`, iconURL: av })
		.addFields(
			{ name: "\u200b", value: countfield, inline: true },
			{ name: "\u200b", value: namefield, inline: true },
			{ name: "\u200b", value: pricefield, inline: true },
			{ name: "Total value", value: `${formatDoler(totalPrice, false)}` }
		);

	msg.reply({
		embeds: [msge],
		allowedMentions: {
			repliedUser: false
		}
	});
}

async function stats(msg: okbot.Message, usr?: User | null) {
	const fishGlobal = (await db_fish_get()) as okbot.FishGlobal[];
	if (!fishGlobal) return sendSimpleMessage(msg, "🕸️ *ummm the fish have died...*");
	fishGlobal.sort((a, b) => (a.v < b.v ? -1 : 1));

	if (!usr) usr = msg.author;
	const plrdat = await db_plr_get({ _id: usr.id, fishTot: 1, fishTotC: 1 });

	let namefield = "";
	let countfieldGlobal = "";
	let totGlobal = 0;
	let countfieldUsr = "";
	for (const nam in fishGlobal) {
		const id = fishGlobal[nam]._id;

		namefield += `${getRarityEmoji(Fish.f[id].type)} ${Fish.f[id].emoji} ${id}\n`;
		countfieldGlobal += `${fishGlobal[nam].v}\n`;
		totGlobal += fishGlobal[nam].v;
		if (plrdat?.fishTot?.[id]) countfieldUsr += `${plrdat.fishTot[id]}\n`;
		else countfieldUsr += `0\n`;
	}

	const msge = new EmbedBuilder()
		.setThumbnail(usr.displayAvatarURL())
		.addFields(
			{ name: "\u200b", value: namefield, inline: true },
			{ name: "Global", value: countfieldGlobal, inline: true },
			{ name: `${usr.displayName}`, value: countfieldUsr, inline: true },
			{ name: "\u200b", value: "\u200b", inline: true },
			{ name: "Total", value: formatNumber(totGlobal), inline: true },
			{ name: "Total", value: formatNumber(plrdat?.fishTotC ?? 0), inline: true }
		);
	msg.reply({
		embeds: [msge],
		allowedMentions: {
			repliedUser: false
		}
	});
}

export function findFish(nam: string) {
	// WARNING: hardcoded, might break if something else starts with bla :)
	if (nam.toLowerCase().startsWith("bla")) nam = "BLÅHAJ";

	let fis: okbot.Fish | undefined = Fish.f[nam];
	if (!fis) {
		const reg = new RegExp(nam, "i");
		for (const i in Fish.f) {
			if (i.match(reg)) {
				fis = Fish.f[i];
				nam = i;
				break;
			}
		}
	}

	return { fisNam: nam, fis };
}

async function info(msg: okbot.Message, nam: string) {
	const { fisNam, fis } = findFish(nam);
	if (!fis) return sendSimpleMessage(msg, `Given fish wasn't found. Use \`${name} list\` to view all fish.`);

	const globalfish = (await db_fish_get(fisNam)) as okbot.FishGlobal;
	const msge = new EmbedBuilder().setTitle(`${fis.emoji} ${fisNam}`).addFields(
		{ name: "Sell price", value: fis.price ? formatDoler(fis.price, false) : "-", inline: true },
		{ name: "Aquarium income", value: fis.aq ? `${formatDoler(fis.aq, false)}/h` : "-", inline: true },
		{ name: "\u200b", value: "\u200b", inline: true },
		{ name: "Type", value: getRarityEmoji(fis.type) + " " + fis.type, inline: true },
		{
			name: "Catch chance",
			value: (Math.round(((fis.rare || 0) / Fish.tot) * 1000000) / 10000).toString() + "%",
			inline: true
		},
		{ name: "Caught", value: formatNumber(globalfish?.v ?? 0), inline: true }
	);

	msg.reply({
		embeds: [msge],
		allowedMentions: {
			repliedUser: false
		}
	});
}

//if quantity is 0, sell all in inventory, nam can be fish names, or a fish type, or 'all'
async function sell(msg: okbot.Message, nam: string[], qty = 0) {
	const plr = await db_plr_get({ _id: msg.author.id, monTot: 1, monLv: 1, fish: 1 });
	if (!plr?.fish) return null;

	let fishToSell: { [nam: string]: number } = {};
	let money = 0,
		num = 0;
	const type = nam[0].toLowerCase();

	/////////////////////SELL ALL OF TYPE
	if (sellableRarities.includes(type)) {
		for (const i in plr.fish) {
			if (!plr.fish[i] || Fish.f[i].type !== type) continue;
			if (plr.fish[i] >= qty) {
				if (qty) {
					//if specified quantity, sell only that quantity
					fishToSell[i] = -qty;
					money += Fish.f[i].price * qty;
					num += qty;
				} else {
					//otherwise sell all
					fishToSell[i] = -plr.fish[i];
					money += Fish.f[i].price * plr.fish[i];
					num += plr.fish[i];
				}
			} else {
				return sendSimpleMessage(msg, `You only have **${plr.fish[i]}** \`${i}\`!`);
			}
		}

		if (!num) return sendSimpleMessage(msg, `You do not have any ${type} fish.`);
		/////////////////////SELL ALL
	} else if (type == "all") {
		for (const i in plr.fish) {
			if (!plr.fish[i] || !sellableRarities.includes(Fish.f[i].type)) continue; //if no fish in inventory or illegible for sale
			if (plr.fish[i] >= qty) {
				if (qty) {
					fishToSell[i] = -qty;
					money += Fish.f[i].price * qty;
					num += qty;
				} else {
					fishToSell[i] = -plr.fish[i];
					money += Fish.f[i].price * plr.fish[i];
					num += plr.fish[i];
				}
			} else {
				return sendSimpleMessage(msg, `You only have **${plr.fish[i]}** \`${i}\`!`);
			}
		}

		if (!num) return sendSimpleMessage(msg, "You do not have any fish.");
		/////////////////////SELL GIVEN NAMES
	} else {
		//sell by name
		for (const i in nam) {
			if (!nam[i]) continue; //ignore on blank
			const fishInfo = findFish(nam[i].trim());
			const fishId = fishInfo.fisNam;
			if (!fishInfo?.fis) return sendSimpleMessage(msg, `\`${fishId}\` is not a valid fish.`);
			if (!Fish.f[fishId] || !sellableRarities.includes(Fish.f[fishId].type)) continue;

			if (plr.fish[fishId] >= qty) {
				if (qty) {
					fishToSell[fishId] = -qty;
					money += Fish.f[fishId].price * qty;
					num += qty;
				} else {
					if (!plr.fish[fishId]) return sendSimpleMessage(msg, `You do not have any \`${fishId}\`!`);
					fishToSell[fishId] = -plr.fish[fishId];
					money += Fish.f[fishId].price * plr.fish[fishId];
					num += plr.fish[fishId];
				}
			} else {
				return sendSimpleMessage(
					msg,
					plr.fish[fishId]
						? `You only have **${plr.fish[fishId]}** \`${fishId}\`!`
						: `You do not have any \`${fishId}\`!`
				);
			}
		}

		if (!num) return sendSimpleMessage(msg, "You do not have any of the given fish.");
	}

	await db_plr_add({
		_id: msg.author.id,
		mon: money,
		monTot: money,
		monLv: calcMoneyLevelsGain(plr.monLv ?? 0, (plr.monTot ?? 0) + money, msg),
		fish: fishToSell,
		income: { fish: money }
	});
	return msg.reply({
		embeds: [
			new EmbedBuilder()
				.setColor(Colors.DarkGreen)
				.setDescription(`You sold **${formatNumber(num)}** fish for ${formatDoler(money)}.`)
		]
	});
}

function fishlist(msg: okbot.Message, type?: okbot.FishRarity) {
	let namstring = "";
	let coststring = "";
	for (const i in Fish.f) {
		if ((!type || Fish.f[i].type === type) && Fish.f[i].type != "collectors+") {
			namstring += `${getRarityEmoji(Fish.f[i].type)} ${Fish.f[i].emoji} \`${i}\`\n`;
			const chanceRaw = (Fish.f[i].rare ?? 0) / Fish.tot;
			const chance = (chanceRaw * 100).toFixed(chanceRaw >= 0.1 ? 3 : 4); // small alignment

			if (!sellableRarities.includes(Fish.f[i].type)) {
				coststring += `\`???  \`💵 | \`${chance}\`%\n`;
			} else {
				const price = Fish.f[i].price!.toString().padEnd(5, " ");
				if (Fish.f[i].aq) {
					const aqua = Fish.f[i].aq!.toString().padEnd(4, " ");
					coststring += `\`${price}\`💵 | \`${chance}\`% | \`${aqua}\`💵/h\n`;
				} else {
					coststring += `\`${price}\`💵 | \`${chance}\`%\n`;
				}
			}
		}
	}

	const msge = new EmbedBuilder()
		.setAuthor({ name: `${type ? type + " f" : "F"}ish details` })
		.addFields(
			{ name: "\u200b", value: namstring, inline: true },
			{ name: "\u200b", value: coststring, inline: true }
		)
		.setColor(Colors.White);

	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

export function fishInit() {
	try {
		Fish.tot = 0;
		Fish.f = JSON.parse(fs.readFileSync("../assets/fish.json", { encoding: "utf-8" }));
		for (const i in Fish.f) Fish.f[i].odds = [Fish.tot, (Fish.tot += Fish.f[i].rare || 0)];
	} catch (e) {
		console.warn("Failed to initialize fish:", e);
		return null;
	}
	return Fish;
}

export async function execute(msg: okbot.Message, args: string[]) {
	switch (args[0]?.toLowerCase()) {
		case "inv":
		case "inventory":
			args.shift();
			return inv(msg, await getUserFromMsg(msg, args));
		case "global":
		case "globalstats":
		case "stats":
			args.shift();
			return stats(msg, await getUserFromMsg(msg, args));
		case "info":
			args.shift();
			return info(msg, args.join(" "));
		case "sell":
			args.shift();
			const qty = Number(args.slice(-1));
			if (!isNaN(qty)) {
				if (qty < 0) return;
				args = args.slice(0, -1);
			}
			const list = args.join(" ");
			return sell(msg, list.split(","), qty || 0);
		case "list":
		case "details":
			args.shift();
			let type: string | undefined = args[0]?.toLowerCase();
			if (
				type &&
				type != "stinky" &&
				type != "ok" &&
				type != "cool" &&
				type != "rare" &&
				type != "collectors"
			)
				type = undefined;

			return fishlist(msg, type as okbot.FishRarity | undefined);
		default:
			return fish(msg);
	}
}
