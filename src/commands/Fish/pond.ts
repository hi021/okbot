import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	Interaction,
	User
} from "discord.js";
import { db_plr_add, db_plr_get, db_plr_set } from "../../db/db.js";
import { bot } from "../../okbot.js";
import { SET } from "../../settings.js";
import {
	calcMoneyLevelsGain,
	createSimpleMessage,
	drawProgressBar,
	e_blank,
	formatDoler,
	formatNumber,
	getUserFromMsg,
	sendEphemeralReply,
	sendSimpleMessage,
	showUpgradeCost,
	showUpgradeStat
} from "../../utils.js";
import { Fish, getRarityEmoji } from "./fish.js";

export const name = "pond";
export const description = "🎣 Make others catch fish for you";
export const usage = `<"Collect" OR "Upgrade" OR "Sell" OR "Stats" OR "Set" OR "Levels"> <Username OR Mention>
- <"Budget"> [New budget (prepend with + to increase, - to decrease, no sign to set, "Max" to set to maximum)]
- <"Name"> <New pond name (blank to reset)>`;
export const usageDetail =
	"Will catch fish as long as there's storage space and the budget is at least 10 💵 - casting still costs.\nWon't find collectors' type items.";
const usageBudget =
	"budget [(+ to increase, - to decrease, no sign to set) Amount OR \"Max\"]\ne.g. 'budget +250'";

bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (
		split[0] !== "pond_up_confirm" &&
		split[0] !== "pond_up_cancel" &&
		split[0] !== "pond_sell_cancel" &&
		split[0] !== "pond_sell_confirm"
	)
		return;

	const id = split[1];
	if (id !== interaction.user.id)
		return sendEphemeralReply(
			interaction,
			"Sorry, you cannot make managerial decisions on behalf of other users."
		);

	if (split[0] === "pond_up_confirm") {
		const plrdat = await db_plr_get({ _id: id, mon: 1, pond: 1 });
		const lv = plrdat?.pond?.lv ?? 0;
		if (lv >= PondLevels.length)
			return sendEphemeralReply(interaction, "Your pond is already at the maximum level!");

		const cost = PondLevels[lv].cost;
		const mon = plrdat?.mon ?? 0;
		if (cost > mon)
			return sendEphemeralReply(
				interaction,
				`You need ${formatDoler(cost - mon)} more to afford this upgrade.`
			);

		const now = Math.round(new Date().getTime() / 1000);
		let pond;
		if (!plrdat?.pond?.lv)
			pond = {
				budget: 0,
				col: now,
				fish: {},
				fishNum: 0,
				fishTot: 0,
				lv: 0,
				stats: {}
			};
		else pond = pondUpdateFish(plrdat.pond, now); //fill up pond
		pond = { ...pond, ...PondLevels[lv], lv: pond.lv + 1 };
		delete (pond as any).cost; //unnecessary fields from pondLevels
		delete (pond as any).sprite;

		await db_plr_set({ _id: id, pond });
		await db_plr_add({ _id: id, mon: -cost, expense: { pond: cost } });
		sendSimpleMessage(
			interaction.message as okbot.Message,
			"Upgraded your pond to level **" + pond.lv + "**!",
			Colors.DarkGreen
		);

		interaction.update({ components: [] });
		return;
	} else if (split[0] === "pond_up_cancel") {
		interaction.update({ components: [] });
		return;
	} else if (split[0] === "pond_sell_confirm") {
		const plrdat = await db_plr_get({ _id: id, monTot: 1, monLv: 1, pond: 1 });
		const pondAfterCatch = pondUpdateFish(plrdat!.pond as okbot.Pond);
		if (!pondAfterCatch.fishNum)
			return sendEphemeralReply(interaction, "🕸️ *There are no fish stored in your pond...*");

		let value = 0;
		for (const i in pondAfterCatch.fish) value += Fish.f[i].price * pondAfterCatch.fish[i];

		const monLv = calcMoneyLevelsGain<Interaction>(
			plrdat?.monLv ?? 0,
			(plrdat?.monTot ?? 0) + value,
			interaction
		);
		await db_plr_add({ _id: id, mon: value, monTot: value, monLv: monLv, income: { fish: value } });
		await db_plr_set({ _id: id, pond: { ...pondAfterCatch, fish: {}, fishNum: 0 } });

		interaction.message.edit({ components: [] });
		return sendEphemeralReply(
			interaction,
			`Sold **${pondAfterCatch.fishNum}** fish for a total of ${formatDoler(value)}.`,
			Colors.DarkGreen
		);
	} else if (split[0] === "pond_sell_cancel") {
		interaction.update({ components: [] });
		return;
	}
});

//cost is how much it costs to upgrade to the given level
export const PondLevels = [
	{ fishMax: 10, interval: 3600, cost: 600, budgetMax: 500, sprite: "🎣\n🟦🟦\n🟦🟦" },
	{ fishMax: 20, interval: 3000, cost: 1000, budgetMax: 750, sprite: "🎣🎣\n🟦🟦\n🟦🟦" },
	{ fishMax: 25, interval: 1800, cost: 1500, budgetMax: 750, sprite: "🎣🎣\n🟦🟦\n🟦🟦\n🎣🎣" },
	{
		//lv4
		fishMax: 35,
		interval: 1200,
		cost: 2200,
		budgetMax: 1000,
		sprite: `${e_blank}🎣🎣🎣\n${e_blank}🟦🟦🟦\n${e_blank}🟦🟦🟦\n${e_blank}⬛🟦🟦\n${e_blank}${e_blank}🎣🎣`
	},
	{
		fishMax: 40,
		interval: 900,
		cost: 3000,
		budgetMax: 1000,
		sprite: `${e_blank}🎣🎣🎣\n${e_blank}🟦🟦🟦\n🎣🟦🟦🟦\n${e_blank}⬛🟦🟦\n${e_blank}${e_blank}🎣🎣`
	},
	{
		fishMax: 50,
		interval: 700,
		cost: 5000,
		budgetMax: 1250,
		sprite: `${e_blank}🎣🎣🎣\n${e_blank}🟦🟦🟦\n🎣🟦🟦🟦🎣\n${e_blank}⬛🟦🟦🎣\n${e_blank}${e_blank}🎣🎣`
	},
	{
		fishMax: 60,
		interval: 500,
		cost: 7500,
		budgetMax: 1250,
		sprite: `${e_blank}🎣🎣🎣\n🎣🟦🟦🟦🎣\n🎣🟦🟦🟦🎣\n${e_blank}🎣🟦🟦🎣\n${e_blank}${e_blank}🎣🎣`
	},
	{
		//lv8
		fishMax: 80,
		interval: 400,
		cost: 11250,
		budgetMax: 1500,
		sprite: `${e_blank}🎣🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦⬛\n🎣🟦🟦🟦🟦🟦🎣\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 100,
		interval: 300,
		cost: 15000,
		budgetMax: 2000,
		sprite: `${e_blank}🎣🎣${e_blank}🎣🎣\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦⬛\n🎣🟦🟦🟦🟦🟦🎣\n${e_blank}🎣${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 140,
		interval: 240,
		cost: 20000,
		budgetMax: 2250,
		sprite: `${e_blank}🎣🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🟦🎣\n${e_blank}🎣🎣🎣🎣🎣`
	},
	{
		//lv11
		fishMax: 220,
		interval: 200,
		cost: 27500,
		budgetMax: 3500,
		sprite: `${e_blank}🎣🎣🎣🎣\n${e_blank}🟦🟦🟦🟦\n🎣🟦🟦🟦🟦🟦\n🎣🟦🟦🟦🟦🟦\n${e_blank}🟦🟦\n${e_blank}🟦🟦🟦\n${e_blank}🎣${e_blank}🎣`
	},
	{
		fishMax: 350,
		interval: 150,
		cost: 40000,
		budgetMax: 5000,
		sprite: `${e_blank}🎣🎣🎣🎣\n${e_blank}🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🟦\n🎣🟦🟦🟦🟦🟦\n🎣🟦🟦\n${e_blank}🟦🟦🟦\n${e_blank}🎣${e_blank}🎣`
	},
	{
		fishMax: 650,
		interval: 120,
		cost: 60000,
		budgetMax: 8000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🟦\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦\n${e_blank}🟦🟦🟦\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 800,
		interval: 90,
		cost: 85000,
		budgetMax: 12500,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦🎣${e_blank}🎣\n${e_blank}🟦🟦🟦\n${e_blank}🎣🎣🎣`
	},
	{
		//lv15
		fishMax: 1000,
		interval: 60,
		cost: 110000,
		budgetMax: 15000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦🟦🟦🟦🎣\n🎣🟦🟦🎣🎣🎣\n🎣🟦🟦🟦🎣\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 1200,
		interval: 45,
		cost: 140000,
		budgetMax: 18000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🎣\n🎣🟦🟦🟪🟦🟦🎣\n🎣🟦🟦🟪🟦🟦🎣\n🎣🟦🟦🎣🎣🎣\n🎣🟦🟦🟦🎣\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 1500,
		interval: 40,
		cost: 180000,
		budgetMax: 22500,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🎣\n🎣🟦🟦🟪🟪🟦🎣\n🎣🟦🟪🟪🟦🟦🎣\n🎣🟦🟦🎣🎣🎣\n🎣🟦🟦🟦🎣\n${e_blank}🎣🎣🎣`
	},
	{
		//lv18
		fishMax: 1750,
		interval: 30,
		cost: 220000,
		budgetMax: 25000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟦🟦🎣\n🎣🟦🟪🟪🟪🟦🎣\n🎣🟦🟪🟪🟦🟦🎣\n🎣🟦🟪🎣🎣🎣\n🎣🟦🟦🟦🎣\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 1800,
		interval: 25,
		cost: 250000,
		budgetMax: 27500,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟪🟦🎣\n🎣🟦🟪🟪🟪🟦🎣\n🎣🟦🟪🟪🟪🟦🎣\n🎣🟦🟪🎣🎣🎣\n🎣🟦🟦🟦🎣\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 2200,
		interval: 20,
		cost: 290000,
		budgetMax: 30000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟪🟦🎣\n🎣🟦🟪🟪🟪🟦🎣\n🎣🟦🟪🟪🟪🟦🎣\n🎣🟪🟪🎣🎣🎣\n🎣🟦🟪🟦🎣\n${e_blank}🎣🎣🎣`
	},
	{
		//lv21
		fishMax: 3200,
		interval: 15,
		cost: 360000,
		budgetMax: 45000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟦🟦🟪🟪🎣\n🎣🟦🟪🟪🟪🟦🎣\n🎣🟦🟪🟪🟪🟪🎣\n🎣🟪🟪🎣🎣🎣\n🎣🟦🟪🟪🎣\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 6250,
		interval: 14,
		cost: 420000,
		budgetMax: 82500,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟪🟪🟪🟪🎣\n🎣🟦🟪🟪🟪🟦🎣\n🎣🟦🟪🟪🟪🟪🎣\n🎣🟪🟪🎣🎣🎣\n🎣🟦🟪🟪🎣\n${e_blank}🎣🎣🎣`
	},
	{
		fishMax: 7500,
		interval: 12,
		cost: 500000,
		budgetMax: 90000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟪🟪🟪🟪🎣\n🎣🟪🟪🟪🟪🟦🎣\n🎣🟦🟪🟪🟪🟪🎣\n🎣🟪🟪🎣🎣🎣\n🎣🟪🟪🟪🎣\n${e_blank}🎣🎣🎣`
	},
	{
		//lv24
		fishMax: 10000,
		interval: 10,
		cost: 600000,
		budgetMax: 120000,
		sprite: `${e_blank}🎣🎣🎣🎣\n🎣🟪🟪🟪🟪🎣\n🎣🟪🟪🟪🟪🟪🎣\n🎣🟪🟪🟪🟪🟪🎣\n🎣🟪🟪🎣🎣🎣\n🎣🟪🟪🟪🎣\n${e_blank}🎣🎣🎣`
	}
];

function sendNoPondMessage<T>(msg: okbot.MessageOrInteraction<T>, user?: User) {
	const author = msg instanceof ButtonInteraction ? msg.user : msg.author;
	sendSimpleMessage(
		msg,
		user && author != user
			? `\`${user.displayName}\` doesn't own a pond :(`
			: `You don't own a pond :(\nYou can open one if you have ${formatDoler(PondLevels[0].cost)} using \`${name} open\`.`
	);
}

function fish() {
	// get random fish minus collectors'
	const r = Math.random() * (Fish.tot - 10); // HARDCODED WARNING 5 collectors

	for (const nam in Fish.f) {
		const caught = Fish.f[nam];
		if (r >= caught.odds![0] && r < caught.odds![1]) return { nam, emoji: caught.emoji };
	}
	return { nam: "WHAT", emoji: "" };
}

//doesn't set the database entry, only returns a Pond
export function pondUpdateFish(pond: okbot.Pond, now?: number) {
	if (!now) now = Math.round(new Date().getTime() / 1000);
	const fishCost = SET.FISH_COST_POND ?? 1;
	const caughtTime = (now - pond.col) / pond.interval;
	const toCatch = Math.min(
		Math.floor(caughtTime),
		pond.fishMax - pond.fishNum,
		Math.floor(pond.budget / fishCost)
	);

	pond.col = Math.round(now - pond.interval * (caughtTime % 1)); // don't reset next fish' catch timer
	if (toCatch <= 0) return pond;

	for (let i = 0; i < toCatch; i++) {
		const caught = fish();
		pond.fish[caught.nam] = pond.fish[caught.nam] ? pond.fish[caught.nam] + 1 : 1;
		pond.stats[caught.nam] = pond.stats[caught.nam] ? pond.stats[caught.nam] + 1 : 1;
	}

	pond.fishTot += toCatch;
	pond.fishNum += toCatch;
	pond.budget -= toCatch * fishCost;

	return pond;
}

function displayLevels() {
	const msge = new EmbedBuilder().setColor(Colors.White).setTitle(`Pond upgrades`);

	for (const i in PondLevels) {
		const stat = PondLevels[i];
		const time =
			stat.interval >= 60
				? `${Math.round(Math.round(stat.interval * 100) / 60) / 100} m`
				: `${stat.interval} s`;
		msge.addFields({
			name: `Level ${Number(i) + 1}`,
			value: `\`${formatNumber(stat.cost).padStart(7, " ")}\` 💵 | Holds **${formatNumber(stat.fishMax)}** fish ● Catch every **${time}**`
		});
	}

	return msge;
}

// lv is current pond level; returns EmbedBuilder with upgrade confirmation; need to check if the level isn't max beforehand
function displayUpgradeStats(lv: number, money: number) {
	const msge = new EmbedBuilder()
		.setColor(Colors.White)
		.setDescription(showUpgradeCost(PondLevels[lv].cost, money));

	if (lv === 0)
		return msge
			.setTitle("Pond construction")
			.addFields({ name: "\u200b", value: "Allows you to catch fish even while you're away!" });

	return msge
		.setTitle(`Pond level ${lv + 1} upgrade`)
		.addFields([
			showUpgradeStat(PondLevels, lv, "fishMax", "Fish storage capacity"),
			showUpgradeStat(PondLevels, lv, "interval", "Fish catch interval", v =>
				v >= 60 ? Math.round(Math.round(v * 100) / 60) / 100 + "min" : v + "s"
			),
			showUpgradeStat(PondLevels, lv, "budgetMax", "Max budget", v => formatDoler(v, false))
		])
		.setFooter({ text: "Use 'pond levels' to view all upgrades" });
}

function displayPondFish(pond: okbot.Pond) {
	const msge = new EmbedBuilder().setColor(Colors.DarkAqua);
	if (!pond.fishNum)
		return msge.addFields(
			{ name: "Caught fish", value: "🕸️", inline: true },
			{ name: `(0/${pond.fishMax})`, value: "*it's pretty empty in here...*", inline: true }
		);

	let valTot = 0;
	let stringName = "";
	let stringAmount = "";
	const fishArr = [];

	for (const i in pond.fish) {
		const f = Fish.f[i];

		valTot += f.price * pond.fish[i];
		fishArr.push({
			name: `${f.emoji} ${i}\n`,
			count: `${getRarityEmoji(f.type)} **${pond.fish[i]}**x\n`,
			sort: f.sort
		});
	}

	// sort by type
	fishArr.sort((a, b) => (a.sort < b.sort ? -1 : 1));
	for (const i of fishArr) {
		stringAmount += i.count;
		stringName += i.name;
	}

	msge
		.addFields(
			{ name: "Caught fish", value: stringAmount, inline: true },
			{ name: `(${pond.fishNum}/${pond.fishMax})`, value: stringName, inline: true },
			{ name: "Total value", value: formatDoler(valTot, false), inline: false }
		)
		.setFooter({
			text: "Use 'pond collect' to put all caught fish in your inventory\nUse 'pond sell' to sell all caught fish"
		});

	return msge;
}

async function displayPondStats(pond: okbot.Pond, usr: User) {
	const pondAfterCatch = pondUpdateFish(pond);
	pond = pondAfterCatch;
	await db_plr_set({ _id: usr.id, pond });

	const msge = new EmbedBuilder().setColor(Colors.DarkAqua).setAuthor({
		name: `${usr.username}'s pond stats`,
		iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
	});
	if (!pond.fishTot) return msge.setDescription("🕸️ *This pond has never caught any fish...*");

	let valTot = 0;
	let stringName = "";
	let stringAmount = "";

	for (const i in pond.stats) {
		stringName += `${Fish.f[i].emoji} ${i}\n`;
		stringAmount += `x**${formatNumber(pond.stats[i])}**\n`;
		valTot += Fish.f[i].price * pond.stats[i];
	}

	msge.addFields(
		{ name: "\u200b", value: stringName, inline: true },
		{ name: "\u200b", value: stringAmount, inline: true },
		{ name: "\u200b", value: "\u200b", inline: true },
		{ name: "Total caught", value: formatNumber(pond.fishTot), inline: true },
		{ name: "Total value", value: formatDoler(valTot, false), inline: true }
	);

	return msge;
}

/**
 * @returns [pond view EmbedBuilder, pond fish EmbedBuilder]
 */
async function displayPond(pond: okbot.Pond, usr: User) {
	const pondAfterCatch = pondUpdateFish(pond);
	pond = pondAfterCatch;
	await db_plr_set({ _id: usr.id, pond });

	const budgetBar = `**${formatNumber(pond.budget)}**/${formatDoler(pond.budgetMax, false)}
  ${drawProgressBar(Math.round((pond.budget / pond.budgetMax) * 10), 10)}`;

	const msge = new EmbedBuilder()
		.setColor(Colors.DarkAqua)
		.setAuthor({
			name: pond.nam ? pond.nam : `${usr.username}'s pond`,
			iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setDescription(PondLevels[pond.lv - 1].sprite + "\u200b") // whitespace for mobile
		.addFields({ name: "\u200b", value: "\u200b" })
		.addFields({ name: "Budget", value: budgetBar });

	let footerText = `Level ${pond.lv}\nUse 'pond budget' to manage the budget`;
	if (pond.lv < PondLevels.length)
		footerText += `\nUse 'pond upgrade' to upgrade your pond for ${formatDoler(PondLevels[pond.lv].cost, false)}`;
	msge.setFooter({ text: footerText });

	return [msge, displayPondFish(pondAfterCatch)];
}

export function getFishToCollect(pond: okbot.Pond) {
	const fish: { [nam: string]: number } = {};
	let value = 0;
	for (const i in pond.fish) {
		fish[i] = pond.fish[i];
		value += Fish.f[i].price * pond.fish[i];
	}

	return { value, fish };
}

export async function execute(msg: okbot.Message, args: string[]) {
	const usr = msg.author;
	if (!args.length) {
		const plrdat = await db_plr_get({ _id: usr.id, pond: 1 });
		if (!plrdat?.pond) return sendNoPondMessage(msg, usr);

		return msg.reply({
			embeds: await displayPond(plrdat.pond, usr),
			allowedMentions: { repliedUser: false }
		});
	}

	const action = args.shift() as string;
	switch (action.toLowerCase()) {
		case "upgrade":
		case "open":
		case "up": {
			const plrdat = await db_plr_get({ _id: usr.id, pond: 1, mon: 1 });
			const lv = plrdat?.pond?.lv ?? 0;
			if (lv >= PondLevels.length)
				return sendSimpleMessage(msg, "Your pond is already at the maximum level!");

			const cost = PondLevels[lv].cost;
			const mon = plrdat?.mon ?? 0;
			const components =
				mon >= cost
					? [
							new ActionRowBuilder<ButtonBuilder>().addComponents(
								new ButtonBuilder()
									.setCustomId(`pond_up_confirm-${usr.id}`)
									.setStyle(ButtonStyle.Success)
									.setLabel("Upgrade"),
								new ButtonBuilder()
									.setCustomId(`pond_up_cancel-${usr.id}`)
									.setStyle(ButtonStyle.Danger)
									.setLabel("Cancel")
							)
						]
					: [];

			return msg.reply({ embeds: [displayUpgradeStats(lv, mon)], components });
		}
		case "pay":
		case "collect": {
			const plrdat = await db_plr_get({ _id: usr.id, pond: 1 });
			if (!plrdat?.pond) return sendNoPondMessage(msg);

			const pondAfterCatch = pondUpdateFish(plrdat.pond);
			if (!pondAfterCatch.fishNum)
				return sendSimpleMessage(msg, "🕸️ *There are no fish stored in your pond...*");

			const collected = getFishToCollect(pondAfterCatch);

			await db_plr_add({ _id: usr.id, fish: collected.fish });
			await db_plr_set({ _id: usr.id, pond: { ...pondAfterCatch, fishNum: 0, fish: {} } });
			return sendSimpleMessage(
				msg,
				`Put **${formatNumber(pondAfterCatch.fishNum)}** fish worth ${formatDoler(collected.value)} into your inventory.`,
				Colors.DarkGreen
			);
		}
		case "sell": {
			const plrdat = await db_plr_get({ _id: usr.id, pond: 1 });
			if (!plrdat?.pond) return sendNoPondMessage(msg);

			const pondAfterCatch = pondUpdateFish(plrdat.pond);
			if (!pondAfterCatch.fishNum)
				return sendSimpleMessage(msg, "🕸️ *There are no fish stored in your pond...*");

			let value = 0;
			for (const i in pondAfterCatch.fish) value += Fish.f[i].price * pondAfterCatch.fish[i];
			await db_plr_set({ _id: usr.id, pond: pondAfterCatch });

			const msge = createSimpleMessage(
				`Do you want to sell all **${formatNumber(pondAfterCatch.fishNum)}** fish for a total of ${formatDoler(value)}?`,
				Colors.White
			);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`pond_sell_confirm-${usr.id}`)
					.setLabel("Confirm")
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId(`pond_sell_cancel-${usr.id}`)
					.setLabel("Cancel")
					.setStyle(ButtonStyle.Danger)
			);

			return await msg.reply({ embeds: [msge], components: [row] });
		}
		case "budget": {
			//change budget
			if (args.length < 1)
				return sendSimpleMessage(msg, "The usage for this command is:\n`" + usageBudget + "`", Colors.White);

			const plrdat = await db_plr_get({ _id: usr.id, mon: 1, pond: 1 });
			if (!plrdat?.pond) return sendNoPondMessage(msg);

			const budget = args[0].toLowerCase();
			let budgetVal = budget === "max" ? plrdat.pond.budgetMax : parseInt(budget);
			if (isNaN(budgetVal))
				return sendSimpleMessage(msg, "The usage for this command is:\n`" + usageBudget + "`", Colors.White);

			const pondAfterCatch = pondUpdateFish(plrdat.pond);
			let newBudget = budgetVal;
			if (budget[0] === "+" || budget[0] === "-") newBudget += pondAfterCatch.budget;
			else budgetVal -= pondAfterCatch.budget;

			if (budgetVal > (plrdat.mon ?? 0))
				return sendSimpleMessage(
					msg,
					`You only have ${formatDoler(plrdat.mon ?? 0)}.\nThat's ${formatDoler(budgetVal - (plrdat.mon ?? 0), false)} short.`
				);

			if (newBudget < 0)
				return sendSimpleMessage(
					msg,
					`There's only ${formatDoler(pondAfterCatch.budget)} in the current budget.`
				);
			if (newBudget > pondAfterCatch.budgetMax)
				return sendSimpleMessage(
					msg,
					`The maximum budget is ${formatDoler(pondAfterCatch.budgetMax)}.\nThat's ${formatDoler(newBudget - pondAfterCatch.budgetMax)} over.`
				);
			pondAfterCatch.budget = newBudget;

			await db_plr_set({ _id: usr.id, pond: pondAfterCatch });
			await db_plr_add({ _id: usr.id, mon: -budgetVal, expense: { pond: budgetVal } });
			return sendSimpleMessage(msg, `Set your pond's budget to ${formatDoler(newBudget)}.`, Colors.DarkGreen);
		}
		case "stats": {
			const usr = (await getUserFromMsg(msg, args)) ?? msg.author;
			const plrdat = await db_plr_get({ _id: usr.id, pond: 1 });
			if (!plrdat?.pond) return sendNoPondMessage(msg, usr);

			return msg.reply({
				embeds: [await displayPondStats(plrdat.pond, usr)],
				allowedMentions: { repliedUser: false }
			});
		}
		case "levels":
		case "upgrades":
		case "lv": {
			return msg.reply({ embeds: [displayLevels()], allowedMentions: { repliedUser: false } });
		}
		case "name": {
			if (!args.length) {
				await db_plr_set({ _id: usr.id, "pond.nam": undefined } as any);
				return sendSimpleMessage(msg, "Reset your pond's name.", Colors.DarkGreen);
			}

			const nam = args.join(" ");
			if (nam.length > 100) return sendSimpleMessage(msg, "The maximum name length is **100** characters.");
			await db_plr_set({ _id: usr.id, "pond.nam": nam } as any);
			return sendSimpleMessage(msg, `Set your pond's name to \`${nam}\`.`, Colors.DarkGreen);
		}
		case "set":
		case "fill": {
			const plrdat = await db_plr_get({ _id: usr.id, mon: 1, pond: 1 });
			if (!plrdat?.pond) return sendNoPondMessage(msg);

			const pondAfterCatch = pondUpdateFish(plrdat.pond);
			const mon = plrdat.mon ?? 0;
			const neededBudget = pondAfterCatch.budgetMax - pondAfterCatch.budget;
			const addBudget = Math.min(mon, neededBudget);
			if (!addBudget && !pondAfterCatch.fishNum)
				return sendSimpleMessage(msg, "No actions to take - no fish to collect and the budget is full 😴.");

			const collected = getFishToCollect(pondAfterCatch);
			pondAfterCatch.budget += addBudget;
			await db_plr_add({ _id: usr.id, fish: collected.fish, mon: -addBudget, expense: { pond: addBudget } });
			await db_plr_set({ _id: usr.id, pond: { ...pondAfterCatch, fishNum: 0, fish: {} } });
			return sendSimpleMessage(
				msg,
				`Put **${pondAfterCatch.fishNum}** fish worth ${formatDoler(
					collected.value
				)} into your inventory.\nIncreased the budget by ${formatDoler(addBudget, false)} up to **${formatDoler(
					pondAfterCatch.budget
				)}.`,
				Colors.DarkGreen
			);
		}
		default: {
			// assume user wants to display someone's pond
			args.unshift(action);
			const usr = await getUserFromMsg(msg, args);
			if (!usr)
				return sendSimpleMessage(msg, "The usage for this command is:\n`" + usage + "`", Colors.White);

			const plrdat = await db_plr_get({ _id: usr.id, pond: 1 });
			if (!plrdat?.pond) return sendNoPondMessage(msg, usr);

			return msg.reply({
				embeds: await displayPond(plrdat.pond, usr),
				allowedMentions: { repliedUser: false }
			});
		}
	}
}
