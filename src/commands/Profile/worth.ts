import { EmbedBuilder } from "discord.js";
import { db_plr_get, db_plr_set } from "../../db/db.js";
import { db_store_get_item } from "../../db/store.js";
import { formatDoler, getUserFromMsg, sendSimpleMessage } from "../../utils.js";
import {
	bake,
	BakeryCookies,
	BakeryLevels,
	BakeryOvens,
	BakeryStaff,
	getBakeryToCollect
} from "../Business/bakery.js";
import { bankInterest, BankMemberships } from "../Economy/bank.js";
import { AquaLevels, calculateAquaIncome } from "../Fish/aquarium.js";
import { Fish } from "../Fish/fish.js";
import { getFishToCollect, PondLevels, pondUpdateFish } from "../Fish/pond.js";

export const name = "worth";
export const alias = ["networth", "estate"];
export const description = "💹 Visualize the grind";
export const usage = "<Username OR Mention>";

export async function execute(msg: okbot.Message, args: string[]) {
	const usr = (await getUserFromMsg(msg, args)) || msg.author;
	const plrdat = await db_plr_get({
		_id: usr.id,
		mon: 1,
		monTot: 1,
		monLv: 1,
		bank: 1,
		itms: 1,
		fish: 1,
		fishCol: 1,
		aqua: 1,
		pond: 1,
		bakery: 1,
		color: 1,
		badge: 1
	});
	if (plrdat?.mon == null) return sendSimpleMessage(msg, "There are no stats for `" + usr.displayName + "`.");

	const msge = new EmbedBuilder()
		.setFooter({ text: "ok worth" })
		.addFields({ name: "doler", value: formatDoler(plrdat.mon, false) });
	if (plrdat.color) msge.setColor(plrdat.color);
	if (plrdat.badge) msge.setTitle(plrdat.badge);

	const now = Math.round(new Date().getTime() / 1000);
	let total = plrdat.mon;

	if (plrdat.bank) {
		const bank = await bankInterest(plrdat, usr, now, msg);

		let bankLv = 0;
		for (let i = 0; i < (bank.lv ?? 0); i++) bankLv += BankMemberships[i].cost;

		total += (bank.balance ?? 0) + bankLv;
		msge.addFields({
			name: `bank [lv. ${bank.lv}]`,
			value: `${formatDoler(bank.balance, false)} stored **|** ${formatDoler(bankLv, false)} upgrades`,
			inline: false
		});
	}

	if (plrdat.pond) {
		const pondAfterCatch = pondUpdateFish(plrdat.pond, now);
		const toCollect = getFishToCollect(pondAfterCatch);
		const pond = toCollect.value;
		await db_plr_set({ _id: usr.id, pond: pondAfterCatch });

		let pondLv = 0;
		for (let i = 0; i < pondAfterCatch.lv; i++) pondLv += PondLevels[i].cost;

		total += pond + pondLv + pondAfterCatch.budget;
		msge.addFields({
			name: `pond [lv. ${pondAfterCatch.lv}]`,
			value: `${formatDoler(pond, false)} stored **|** ${formatDoler(pondLv, false)} upgrades **|** ${formatDoler(pondAfterCatch.budget, false)} budget`,
			inline: false
		});
	}

	if (plrdat.aqua) {
		const aqua = calculateAquaIncome(plrdat.aqua, now);
		let aquaLv = 0;
		for (let i = 0; i < plrdat.aqua.lv; i++) aquaLv += AquaLevels[i].upCost;

		let aquaFish = 0;
		for (const i of plrdat.aqua.small) {
			if (i) aquaFish += Fish.f[i.nam].price;
		}
		for (const i of plrdat.aqua.med) {
			if (i) aquaFish += Fish.f[i.nam].price;
		}
		for (const i of plrdat.aqua.big) {
			if (i) aquaFish += Fish.f[i.nam].price;
		}
		for (const i of plrdat.aqua.huge) {
			if (i) aquaFish += Fish.f[i.nam].price;
		}

		total += aqua + aquaLv + aquaFish;
		msge.addFields({
			name: `aquarium [lv. ${plrdat.aqua.lv}]`,
			value: `${formatDoler(aqua, false)} stored **|** ${formatDoler(aquaLv, false)} upgrades **|** ${formatDoler(aquaFish, false)} fish`,
			inline: false
		});
	}

	if (plrdat.bakery) {
		const bakery = bake(plrdat.bakery);
		await db_plr_set({ _id: usr.id, bakery });
		const toCollect = getBakeryToCollect(bakery);

		let invValue = toCollect.value;
		for (const i in bakery.inv) invValue += BakeryCookies[i].value * bakery.inv[i];

		let lv = 0;
		for (let i = 0; i < bakery.lv; i++) lv += BakeryLevels[i].cost;

		let eqValue = 0;
		for (const i of bakery.ovens) {
			if (!i) continue;
			eqValue += BakeryOvens[i.id].cost;
		}
		for (const i of bakery.staff) {
			if (!i) continue;
			eqValue += BakeryStaff[i].cost;
		}

		total += invValue + lv + eqValue;
		msge.addFields({
			name: `bakery [lv. ${bakery.lv}]`,
			value: `${formatDoler(invValue, false)} inventory **|** ${formatDoler(lv, false)} upgrades **|** ${formatDoler(eqValue, false)} equipment`,
			inline: false
		});
	}

	let fish = 0;
	if (plrdat.fish) {
		for (const nam in plrdat.fish) {
			if (plrdat.fish[nam]) fish += plrdat.fish[nam] * (Fish.f[nam].price ?? 0);
		}

		total += fish;
		msge.addFields({ name: "fish", value: formatDoler(fish, false), inline: true });
	}

	let fishCol = 0;
	if (plrdat.fishCol) {
		// value each part at 1.2M
		for (const item in plrdat.fishCol) {
			fishCol +=
				((plrdat.fishCol[item]?.[1] ?? 0) +
					(plrdat.fishCol[item]?.[2] ?? 0) +
					(plrdat.fishCol[item]?.[3] ?? 0) +
					(plrdat.fishCol[item]?.[4] ?? 0) +
					(plrdat.fishCol[item]?.[5] ?? 0)) *
				1200000;
		}

		total += fishCol;
		msge.addFields({ name: "collection", value: "~" + formatDoler(fishCol, false), inline: true });
	}

	let items = 0;
	if (plrdat.itms) {
		const promises = [];

		for (const i in plrdat.itms) {
			const q = plrdat.itms[i];
			if (q) {
				promises.push(
					new Promise(async (resolve, reject) => {
						const itm = await db_store_get_item({ id: i });
						if (!itm) return reject();

						items += itm.price * q;
						resolve(1);
					})
				);
			}
		}

		await Promise.allSettled(promises);
		total += items;
		msge.addFields({ name: "items", value: formatDoler(items, false), inline: true });
	}

	let title = "The Hobo";
	if (total > 500000000) title = "The Overlord";
	else if (total > 250000000) title = "The Biggest Fish";
	else if (total > 100000000) title = "The Real Estate Shork";
	else if (total > 30000000) title = "The Lottery Winner";
	else if (total > 1000000) title = "The Ladder-climber";
	else if (total > 4000000) title = "The Money Hoarder";
	else if (total > 1000000) title = "The Baby Millionaire";
	else if (total > 300000) title = "The Middle Class";
	else if (total > 50000) title = "The Blue-collar";
	else if (total > 7500) title = "The Scraper-by";

	msge
		.addFields({ name: "\u200b", value: "\u200b" }, { name: "total", value: formatDoler(total, false) })
		.setAuthor({
			name: `${usr.displayName} - ${title}`,
			iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
		});
	return msg.reply({ embeds: [msge] });
}
