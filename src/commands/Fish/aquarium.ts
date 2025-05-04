import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	MessageFlags,
	User
} from "discord.js";
import { db_plr_add, db_plr_get, db_plr_set } from "../../db/db.js";
import { bot } from "../../okbot.js";
import {
	calcMoneyLevelsGain,
	drawProgressBar,
	formatDoler,
	formatNumber,
	getUserFromMsg,
	sendEphemeralReply,
	sendSimpleMessage,
	showUpgradeCost,
	showUpgradeStat
} from "../../utils.js";
import { findFish } from "./fish.js";

export const name = "aquarium";
export const alias = ["aqua"];
export const description = "🦈 Show off your precious fish to others and get money doing so";
export const usage = '<Username OR Mention> <"Upgrade" OR "Collect" OR "Edit" OR "Reset">';
export const usageDetail =
	"Display fish from your inventory in the aquarium and collect passive income.\nOne tank houses one fish, but larger tanks multiply the income.\nRarer fish generally generate more income.\nUpgrading will come with a one-time fee but give you more fish tanks and increase the income cap.\nUse 'edit' to put your fish in the aquarium, provide no parameters to view help.\nUse 'reset' to take all the fish back to your inventory.";
const usageEdit =
	'The usage for this command is:\n`edit [Tank size] [Tank index (1-indexed)] <Fish from your inventory (blank to remove)> OR ["Name"] <New name>`\nE.g. `aquarium edit medium 1 Turtle`';

bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton() || !interaction.guild) return;

	const split = interaction.customId.split("-");

	const id = split[1];
	if (split[0] == "aq_up_confirm") {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, `No, shoo, bad ${interaction.user.displayName}!`);

		const plrdat = await db_plr_get({ _id: id, mon: 1, aqua: 1 });
		const lv = plrdat?.aqua?.lv ?? 0;
		if (lv >= AquaLevels.length)
			return sendEphemeralReply(interaction, "Your aquarium is already at the maximum level!");

		const cost = AquaLevels[lv].upCost;
		const mon = plrdat?.mon ?? 0;
		if (cost > mon)
			return sendEphemeralReply(
				interaction,
				`You need ${formatDoler(cost - mon)} more to afford this upgrade.`
			);

		if (!plrdat?.aqua?.lv) {
			// open new
			await db_plr_set({
				_id: id,
				aqua: {
					...AquaLevels[0],
					lv: 1,
					coll: 0,
					collTot: 0,
					toColl: 0,
					lastColl: Math.floor(new Date().getTime() / 1000),
					small: [undefined],
					med: [undefined],
					big: [],
					huge: []
				}
			});
			await db_plr_add({ _id: id, mon: -cost, expense: { aqua: cost } });
			sendSimpleMessage(
				interaction.message as okbot.Message,
				"Successfully opened your aquarium!",
				Colors.DarkGreen
			);
		} else {
			// upgrade existing
			plrdat.aqua.huge.length = AquaLevels[lv].huge;
			plrdat.aqua.big.length = AquaLevels[lv].big;
			plrdat.aqua.med.length = AquaLevels[lv].med;
			plrdat.aqua.small.length = AquaLevels[lv].small;
			plrdat.aqua.maxColl += AquaLevels[lv].maxColl - AquaLevels[lv - 1].maxColl;
			++plrdat.aqua.lv;
			plrdat.aqua.collMul += AquaLevels[lv].collMul - AquaLevels[lv - 1].collMul;
			plrdat.aqua.collTot = plrdat.aqua.coll * plrdat.aqua.collMul;

			await db_plr_set({ _id: id, aqua: plrdat.aqua });
			await db_plr_add({ _id: id, mon: -cost, expense: { aqua: cost } });
			sendSimpleMessage(
				interaction.message as okbot.Message,
				"Upgraded your aquarium to level **" + plrdat.aqua.lv + "**!",
				Colors.DarkGreen
			);
		}

		interaction.update({ components: [] });
		return;
	} else if (split[0] == "aq_up_cancel") {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, `No, shoo, bad ${interaction.user.displayName}!`);

		interaction.update({ components: [] });
		return;
	} else if (split[0] == "aq_collect") {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, "Why don't you get a job instead of robbing aquariums?");

		await collect<ButtonInteraction>(interaction);
	}
});

//they swim :D
const displayHugeTank = (fish?: okbot.FishAquarium) => {
	if (!fish) return "=⬛⬛⬛=\n=⬛⬛⬛=\n=⬛⬛⬛=";
	const rand = Math.floor(Math.random() * 9);
	let s = "=";
	for (let i = 0; i < 9; i++) {
		if (i == rand) s += fish.emoji;
		else s += "🟦";
		if (i == 2 || i == 5) s += "=\n=";
	}
	return s + "=";
};
const displayBigTank = (fish?: okbot.FishAquarium) => {
	if (!fish) return "|⬛⬛⬛|\n|⬛⬛⬛|";
	const rand = Math.floor(Math.random() * 6);
	let s = "|";
	for (let i = 0; i < 6; i++) {
		if (i == rand) s += fish.emoji;
		else s += "🟦";
		if (i == 2) s += "|\n|";
	}
	return s + "|";
};
const displayMedTank = (fish?: okbot.FishAquarium) =>
	fish ? (Math.random() < 0.5 ? "🟦" + fish.emoji : fish.emoji + "🟦") : "⬛⬛";
const displaySmallTank = (fish?: okbot.FishAquarium) => (fish ? fish.emoji : "⬛");

export function calculateAquaIncome(aq: okbot.Aquarium, now?: number) {
	if (!aq) return 0;
	if (!now) now = new Date().getTime() / 1000;
	const passed = now - aq.lastColl;

	if (!aq.toColl && passed < 600) return 0;
	return Math.min(aq.maxColl, Math.floor(aq.toColl + (passed / 3600) * aq.coll * aq.collMul));
}

function displayAquarium(aq: okbot.Aquarium, user: User, collect?: boolean) {
	const msge = new EmbedBuilder().setColor(Colors.Blurple).setAuthor({
		name: aq.nam ?? `${user.displayName}'s aquarium`,
		iconURL: user.displayAvatarURL({ forceStatic: true, size: 32 })
	});
	let footerText = "Level " + aq.lv;

	if (aq.huge?.length) {
		let s = "";
		for (const i in aq.huge) s += displayHugeTank(aq.huge[i]) + "\n";
		//format so it's all nicely in 3 lines instead of every tank being lower than the previous
		const splitS = s.split("\n");
		let formattedS = "";

		for (let i = 0; i < splitS.length; i += 3) {
			formattedS += splitS[i] + " ";
		}
		formattedS += "\n";
		for (let i = 1; i < splitS.length; i += 3) {
			formattedS += splitS[i] + " ";
		}
		formattedS += "\n";
		for (let i = 2; i < splitS.length; i += 3) {
			formattedS += splitS[i] + " ";
		}

		msge.addFields({
			name: `${aq.huge.length} huge tank${aq.huge.length == 1 ? "" : "s"} (x1.5)`,
			value: formattedS
		});
	}
	if (aq.big?.length) {
		let s = "";
		for (const i in aq.big) s += displayBigTank(aq.big[i]) + "\n";
		const splitS = s.split("\n");
		let formattedS = "";

		for (let i = 0; i < splitS.length; i += 2) {
			formattedS += splitS[i] + " ";
		}
		formattedS += "\n";
		for (let i = 1; i < splitS.length; i += 2) {
			formattedS += splitS[i] + " ";
		}

		msge.addFields({
			name: `${aq.big.length} big tank${aq.big.length == 1 ? "" : "s"} (x1.25)`,
			value: formattedS
		});
	}
	if (aq.med?.length) {
		let s = "";
		for (let i = 0; i < aq.med.length; i++)
			s += displayMedTank(aq.med[i]) + `${i != aq.med.length - 1 ? "-" : ""}`;
		msge.addFields({ name: `${aq.med.length} medium tank${aq.med.length == 1 ? "" : "s"} (x1.1)`, value: s });
	}
	let s = "";
	for (const i in aq.small) s += displaySmallTank(aq.small[i]) + " \u200b";
	msge.addFields({ name: `${aq.small.length} small tank${aq.small.length == 1 ? "" : "s"}`, value: s });

	const now = Math.floor(new Date().getTime() / 1000);
	const income = calculateAquaIncome(aq, now);
	const incomeText = `${Math.round(aq.coll * 100) / 100}/h base income ${aq.collMul != 1 ? `(${aq.collMul.toFixed(2)}x)` : ""}`;
	if (collect) {
		if (income) footerText += "\nUse 'aquarium collect' to collect your income";
		if (aq.lv < AquaLevels.length)
			footerText += `\nUse 'aquarium upgrade' to upgrade your aquarium for ${formatDoler(AquaLevels[aq.lv].upCost, false)}`;

		msge.addFields({ name: "\u200b", value: "\u200b" });
		msge.addFields({
			name: incomeText,
			value:
				`**${formatNumber(income)}**/${formatDoler(aq.maxColl, false)}\n` +
				drawProgressBar(Math.round((income / aq.maxColl) * 10), 10, "🟩")
		});
	} else {
		footerText += "\n" + incomeText;
	}

	return { aq: msge.setFooter({ text: footerText }), income: collect ? income : 0 };
}

async function collect<T>(msg: okbot.MessageOrInteraction<T>) {
	const usrId = msg instanceof ButtonInteraction ? msg.user.id : msg.author.id;

	const plrdat = await db_plr_get({ _id: usrId, aqua: 1, monTot: 1, monLv: 1 });
	const aq = plrdat?.aqua;
	if (!aq) return sendNoAquariumMessage(msg);

	const now = Math.floor(new Date().getTime() / 1000);
	const income = calculateAquaIncome(aq, now);
	if (!income)
		return sendSimpleMessage(
			msg,
			"There is no income to collect.\nThe minimum interval between collecting income is **10 minutes**.",
			undefined,
			true,
			[MessageFlags.Ephemeral]
		);

	const monLv = calcMoneyLevelsGain(plrdat.monLv ?? 0, (plrdat.monTot ?? 0) + income, msg);
	await db_plr_add({ _id: usrId, mon: income, monLv, monTot: income, income: { aqua: income } });
	await db_plr_set({ _id: usrId, aqua: { ...aq, toColl: 0, lastColl: now } });

	const content = `Collected ${formatDoler(income)} of ticket revenue.`;
	if (msg instanceof ButtonInteraction) {
		const invText = `**0**/${formatDoler(aq.maxColl, false)}`;
		const invBar = drawProgressBar(0, 10, "🟩");

		const msge = EmbedBuilder.from(msg.message.embeds[0]);
		msge.spliceFields(-1, 1, {
			name: `${Math.round(aq.coll * 100) / 100}/h base income ${aq.collMul != 1 ? `(${aq.collMul.toFixed(2)}x)` : ""}`,
			value: invText + "\n" + invBar
		});

		msg.message.edit({ embeds: [msge], components: [] });
		return sendEphemeralReply(msg, content, Colors.DarkGreen);
	}

	return sendSimpleMessage(msg, content, Colors.DarkGreen);
}

//upCost is how much it costs to upgrade to that level
export const AquaLevels = [
	{ upCost: 500, maxColl: 500, collMul: 1, small: 1, med: 1, big: 0, huge: 0 },
	{ upCost: 700, maxColl: 600, collMul: 1, small: 2, med: 2, big: 0, huge: 0 },
	{ upCost: 1000, maxColl: 800, collMul: 1, small: 2, med: 2, big: 1, huge: 0 }, //lv3
	{ upCost: 1500, maxColl: 1000, collMul: 1, small: 4, med: 3, big: 1, huge: 0 },
	{ upCost: 2000, maxColl: 1250, collMul: 1, small: 4, med: 4, big: 2, huge: 0 },
	{ upCost: 3500, maxColl: 1750, collMul: 1, small: 4, med: 4, big: 2, huge: 1 },
	{ upCost: 5500, maxColl: 2250, collMul: 1, small: 4, med: 4, big: 4, huge: 1 },
	{ upCost: 8000, maxColl: 2750, collMul: 1, small: 6, med: 4, big: 4, huge: 2 }, //lv8
	{ upCost: 17500, maxColl: 3750, collMul: 1, small: 8, med: 6, big: 4, huge: 2 },
	{ upCost: 25000, maxColl: 5000, collMul: 1, small: 8, med: 6, big: 4, huge: 4 },
	{ upCost: 32500, maxColl: 5500, collMul: 1.1, small: 8, med: 6, big: 4, huge: 4 },
	{ upCost: 40000, maxColl: 6000, collMul: 1.22, small: 8, med: 6, big: 4, huge: 4 }, //lv12
	{ upCost: 50000, maxColl: 6500, collMul: 1.37, small: 8, med: 6, big: 4, huge: 4 },
	{ upCost: 60000, maxColl: 7250, collMul: 1.58, small: 8, med: 6, big: 4, huge: 4 },
	{ upCost: 75000, maxColl: 9000, collMul: 1.85, small: 8, med: 6, big: 4, huge: 4 },
	{ upCost: 90000, maxColl: 10000, collMul: 2.1, small: 8, med: 6, big: 4, huge: 4 }, //lv16
	{ upCost: 110000, maxColl: 12500, collMul: 2.2, small: 10, med: 8, big: 4, huge: 4 },
	{ upCost: 135000, maxColl: 15000, collMul: 2.4, small: 10, med: 8, big: 6, huge: 4 },
	{ upCost: 160000, maxColl: 20000, collMul: 2.8, small: 10, med: 8, big: 6, huge: 4 },
	{ upCost: 200000, maxColl: 25000, collMul: 2.8, small: 12, med: 10, big: 6, huge: 5 }, //lv20
	{ upCost: 240000, maxColl: 30000, collMul: 3.2, small: 12, med: 10, big: 6, huge: 5 },
	{ upCost: 300000, maxColl: 35000, collMul: 3.75, small: 12, med: 10, big: 6, huge: 5 },
	{ upCost: 360000, maxColl: 37500, collMul: 4.2, small: 14, med: 10, big: 6, huge: 5 },
	{ upCost: 450000, maxColl: 50000, collMul: 5, small: 16, med: 10, big: 6, huge: 6 } //lv24
];

function sendNoAquariumMessage<T>(msg: okbot.MessageOrInteraction<T>, user?: User) {
	const author = msg instanceof ButtonInteraction ? msg.user : msg.author;
	sendSimpleMessage(
		msg,
		user && author != user
			? `\`${user.displayName}\` doesn't own an aquarium :(`
			: `You don't own an aquarium :(\nYou can open one if you have ${formatDoler(AquaLevels[0].upCost)} using \`${name} open\`.`
	);
}

function displayLevels() {
	const msge = new EmbedBuilder().setColor(Colors.White).setTitle("Aquarium upgrades");

	for (const i in AquaLevels) {
		const stat = AquaLevels[i];
		msge.addFields({
			name: `Level ${Number(i) + 1}`,
			value: `\`${formatNumber(stat.upCost).padStart(7, " ")}\` 💵 | Tanks: ${stat.small ? `**${stat.small}** small` : ""} ${
				stat.med ? `● **${stat.med}** medium` : ""
			} ${stat.big ? `● **${stat.big}** big` : ""} ${stat.huge ? `● **${stat.huge}** huge` : ""} ${
				stat.collMul > 1 ? `● **${stat.collMul}**x income multiplier` : ""
			}`
		});
	}

	return msge;
}

//lv is current pond level; returns EmbedBuilder with upgrade confirmation; need to check if the level isn't max beforehand
function displayUpgradeStats(lv: number, money: number) {
	const statOld =
		lv === 0 ? { small: 0, med: 0, big: 0, huge: 0, collMul: 1, maxColl: 0 } : AquaLevels[lv - 1];
	const statNew = AquaLevels[lv];

	const msge = new EmbedBuilder()
		.setColor(Colors.White)
		.setDescription(showUpgradeCost(statNew.upCost, money));

	if (lv === 0)
		return msge
			.setTitle("Aquarium construction")
			.addFields({ name: "\u200b", value: "Allows you to display your rarest fish for income!" });

	let tanks = `${statOld.small != statNew.small ? `${formatNumber(statOld.small)} → ${formatNumber(statNew.small)} small ● ` : ""}${
		statOld.med != statNew.med ? `${formatNumber(statOld.med)} → ${formatNumber(statNew.med)} medium ● ` : ""
	}${statOld.big != statNew.big ? `${formatNumber(statOld.big)} → ${formatNumber(statNew.big)} big ● ` : ""}${
		statOld.huge != statNew.huge
			? `${formatNumber(statOld.huge)} → ${formatNumber(statNew.huge)} huge ● `
			: ""
	}`;
	if (tanks.length) tanks = tanks.slice(0, -3);
	else tanks = "";

	if (tanks) msge.addFields({ name: "Tanks", value: tanks });
	msge
		.addFields([
			showUpgradeStat(AquaLevels, lv, "collMul", "Income multiplier", v => v + "x"),
			showUpgradeStat(AquaLevels, lv, "maxColl", "Income storage", v => formatDoler(v, false))
		])
		.setFooter({ text: "Use 'aqua levels' to view all upgrades" });

	return msge;
}

export async function execute(msg: okbot.Message, args: string[]) {
	const action = args[0]?.toLowerCase();

	switch (action) {
		case "open":
		case "upgrade":
		case "up": {
			const id = msg.author.id;
			const plrdat = await db_plr_get({ _id: id, aqua: 1, mon: 1 });
			const lv = plrdat?.aqua?.lv ?? 0;
			if (!AquaLevels[lv]) return sendSimpleMessage(msg, "Your aquarium is already at the maximum level!");

			const mon = plrdat?.mon ?? 0;
			const components =
				mon >= AquaLevels[lv].upCost
					? [
							new ActionRowBuilder<ButtonBuilder>().addComponents(
								new ButtonBuilder()
									.setCustomId(`aq_up_confirm-${id}`)
									.setStyle(ButtonStyle.Success)
									.setLabel("Upgrade"),
								new ButtonBuilder()
									.setCustomId(`aq_up_cancel-${id}`)
									.setStyle(ButtonStyle.Danger)
									.setLabel("Cancel")
							)
						]
					: [];

			return msg.reply({ embeds: [displayUpgradeStats(lv, mon)], components });
		}

		case "collect":
		case "pay": {
			return await collect<okbot.Message>(msg);
		}

		case "edit":
		case "set": {
			args.shift();
			if (!args.length) return sendSimpleMessage(msg, usageEdit, Colors.White);
			const plrdat = await db_plr_get({ _id: msg.author.id, aqua: 1, fish: 1 });
			if (!plrdat?.aqua) return sendNoAquariumMessage(msg);

			let tankSize = args.shift()!.toLowerCase();
			if (tankSize == "name") {
				//reset name
				if (!args.length) {
					await db_plr_set({ _id: msg.author.id, "aqua.nam": undefined } as any);
					return sendSimpleMessage(msg, "Reset your aquarium's name.", Colors.DarkGreen);
				}
				//set name
				const nam = args.join(" ").slice(0, 128);
				await db_plr_set({ _id: msg.author.id, "aqua.nam": nam } as any);
				return sendSimpleMessage(msg, "Set your aquarium's name to `" + nam + "`", Colors.DarkGreen);
			}

			if (
				tankSize != "huge" &&
				tankSize != "big" &&
				tankSize != "medium" &&
				tankSize != "med" &&
				tankSize != "small"
			)
				return sendSimpleMessage(msg, "Invalid tank size. Must be `small`, `medium`, `big`, or `huge`.");
			if (!args.length) return sendSimpleMessage(msg, usageEdit, Colors.White);
			if (tankSize == "medium") tankSize = "med";

			const curTank = plrdat.aqua[tankSize as okbot.AquariumTankSize];
			const maxTankId = curTank?.length;
			if (!maxTankId) return sendSimpleMessage(msg, `You don't have any ${tankSize} tanks!`);
			const tankId = Number(args.shift());
			if (isNaN(tankId) || tankId < 1 || tankId > maxTankId)
				return sendSimpleMessage(
					msg,
					maxTankId == 1 ? `You only have ${tankSize} tank #1` : `You only have tanks #1-#${maxTankId}!`
				);

			let fisNam, fis;
			if (args.length) {
				const fishNameRaw = args.join(" ");
				const fisRes = findFish(fishNameRaw);
				fis = fisRes.fis;
				fisNam = fisRes.fisNam;

				if (!fis) return sendSimpleMessage(msg, "No fish with the given name was found.");
				if (!plrdat.fish?.[fisNam])
					return sendSimpleMessage(msg, `You don't have any **${fis.emoji} ${fisNam}** in your inventory`);
				if (fis.aq == null)
					return sendSimpleMessage(msg, `**${fis.emoji} ${fisNam}** can't be put in an aquarium...`);
			}

			const curFish = curTank![tankId - 1];
			let msgeDesc = "";
			let newColl = plrdat.aqua.coll ?? 0;
			if (curFish) {
				//fish already in tank
				if (fis && curFish.nam == fisNam)
					return sendSimpleMessage(msg, `**${fis.emoji} ${fisNam}** is already in the requested tank!`);
				msgeDesc = `Returning **${curFish.emoji} ${curFish.nam}** to inventory\n`;
				newColl -= curFish.aq;
			} else if (!fis) {
				return sendSimpleMessage(msg, `\`${tankSize} tank #${tankId}\` is already empty`);
			}

			let fisIncome = fis?.aq;
			if (fis) {
				msgeDesc += `Putting **${fis.emoji} ${fisNam}** into \`${tankSize} tank #${tankId}\``;
				if (!fisIncome) {
					msgeDesc += "\n*However, this fish won't generate any profit...*";
				} else {
					if (tankSize == "med") fisIncome *= 1.1;
					else if (tankSize == "big") fisIncome *= 1.25;
					else if (tankSize == "huge") fisIncome *= 1.5;
					newColl += fisIncome;
				}
			}
			msgeDesc += `\n\nHourly income ${formatDoler(Math.round(plrdat.aqua.collTot * 100) / 100, false)} → ${formatDoler(
				Math.round(newColl * plrdat.aqua.collMul * 100) / 100
			)}`;

			curTank![tankId - 1] = fis
				? { emoji: fis.emoji, nam: fisNam as string, aq: fisIncome as number }
				: undefined;

			const now = Math.floor(new Date().getTime() / 1000);
			const income = calculateAquaIncome(plrdat.aqua, now);
			const incomeToSet = income ? { toColl: income, lastColl: now } : {};
			await db_plr_set({
				_id: msg.author.id,
				aqua: {
					...plrdat.aqua,
					[tankSize]: curTank,
					coll: newColl,
					collTot: newColl * plrdat.aqua.collMul,
					...incomeToSet
				}
			});
			const fishToAdd: { [fishName: string]: number } = curFish ? { [curFish.nam]: 1 } : {};
			if (fisNam) fishToAdd[fisNam] = -1;
			await db_plr_add({ _id: msg.author.id, fish: fishToAdd });

			return sendSimpleMessage(msg, msgeDesc, Colors.DarkGreen);
		}

		case "reset":
		case "empty": {
			const plrdat = await db_plr_get({ _id: msg.author.id, aqua: 1 });
			if (!plrdat?.aqua) return sendNoAquariumMessage(msg);

			const fishToAdd: any = {};
			let fishToAddCount = 0;
			for (const i in plrdat.aqua.huge) {
				const f = plrdat.aqua.huge[i as any];
				if (f) {
					fishToAdd[f.nam] = fishToAdd[f.nam] ? fishToAdd[f.nam] + 1 : 1;
					++fishToAddCount;
					plrdat.aqua.huge[i as any] = undefined;
				}
			}
			for (const i in plrdat.aqua.big) {
				const f = plrdat.aqua.big[i as any];
				if (f) {
					fishToAdd[f.nam] = fishToAdd[f.nam] ? fishToAdd[f.nam] + 1 : 1;
					++fishToAddCount;
					plrdat.aqua.big[i as any] = undefined;
				}
			}
			for (const i in plrdat.aqua.med) {
				const f = plrdat.aqua.med[i as any];
				if (f) {
					fishToAdd[f.nam] = fishToAdd[f.nam] ? fishToAdd[f.nam] + 1 : 1;
					++fishToAddCount;
					plrdat.aqua.med[i as any] = undefined;
				}
			}
			for (const i in plrdat.aqua.small) {
				const f = plrdat.aqua.small[i as any];
				if (f) {
					fishToAdd[f.nam] = fishToAdd[f.nam] ? fishToAdd[f.nam] + 1 : 1;
					++fishToAddCount;
					plrdat.aqua.small[i as any] = undefined;
				}
			}

			if (!fishToAddCount) return sendSimpleMessage(msg, "Your aquarium is already empty.");

			const now = Math.floor(new Date().getTime() / 1000);
			const income = calculateAquaIncome(plrdat.aqua, now);
			await db_plr_add({ _id: msg.author.id, fish: fishToAdd });
			await db_plr_set({
				_id: msg.author.id,
				aqua: { ...plrdat.aqua, toColl: income, lastColl: now, coll: 0 }
			});

			return sendSimpleMessage(
				msg,
				`Emptied the aquarium and returned **${fishToAddCount}** fish to your inventory.`,
				Colors.DarkGreen
			);
		}

		case "levels":
		case "upgrades":
		case "lv": {
			return msg.reply({ embeds: [displayLevels()], allowedMentions: { repliedUser: false } });
		}

		default: {
			//just view
			const usr = (await getUserFromMsg(msg, args)) ?? msg.author;
			const plrdat = await db_plr_get({ _id: usr.id, aqua: 1 });
			if (!plrdat?.aqua) return sendNoAquariumMessage(msg, usr);

			const { aq, income } = displayAquarium(plrdat.aqua, usr, msg.author == usr);
			let row;
			if (income) {
				row = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("aq_collect-" + msg.author.id)
						.setLabel("Collect revenue")
						.setStyle(ButtonStyle.Success)
				);
			}

			return msg.reply({ embeds: [aq], components: row && [row], allowedMentions: { repliedUser: false } });
		}
	}
}
