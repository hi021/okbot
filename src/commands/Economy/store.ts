import {
	ActionRow,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonComponent,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	MessageCollector,
	SelectMenuComponentOptionData,
	SendableChannels,
	StringSelectMenuBuilder,
	User
} from "discord.js";
import { db_plr_add, db_plr_get, db_plr_set } from "../../db/db.js";
import {
	db_store_get_all,
	db_store_get_categories,
	db_store_get_category,
	db_store_get_item
} from "../../db/store.js";
import { bot } from "../../okbot.js";
import {
	checkBoosterValidity,
	createCollector,
	formatDoler,
	formatMilliseconds,
	getGuildPrefix,
	nowSeconds,
	sendEphemeralReply,
	sendSimpleMessage,
	showItemName,
	uniqueArray
} from "../../utils.js";
import { Players_in_collector } from "../../volatile.js";
import { calculateAquaIncome } from "../Fish/aquarium.js";

// TODO?: map of items instead of array (to reduce db queries)
export const Store_Items: okbot.Item[] = [];
export const Store_Categories: string[] = [];
const SelectMenu_CategoryDetails: { [category: string]: { emoji: string } } = {
	Booster: { emoji: "💸" },
	"Fishing accessory": { emoji: "🎣" },
	"Profile badge": { emoji: "⭐" },
	"Profile color": { emoji: "🔵" }
};
const SelectMenu_Categories: Array<SelectMenuComponentOptionData> = [];

const playerCollectors: { [plrId: string]: MessageCollector } = {};

function clearPlayerCollector(plrId: string) {
	if (!playerCollectors[plrId]) return;
	playerCollectors[plrId].stop("clear");
	delete playerCollectors[plrId];
}

const itmPriceDesc = (price: number) => (price ? formatDoler(price) : "**FREE**");

export async function loadStoreItems() {
	const items = await db_store_get_all();
	const categories = await db_store_get_categories();
	if (!items?.length || !categories) {
		console.warn("Failed to initialize store items!");
		return null;
	}

	for (const cat of categories) {
		Store_Categories.push(cat);
		SelectMenu_Categories.push({ label: cat, value: cat, emoji: SelectMenu_CategoryDetails[cat]?.emoji });
	}
	for (const item of items) Store_Items.push(item);

	return Store_Items;
}

// the returned status starts with "NO" if unable to purchase, and "OK" if the purchase can be finalized
async function purchase(usr: User, purchaseOrders: okbot.StorePurchaseOrders, confirmed: boolean = false) {
	const plrdat = await db_plr_get({
		_id: usr.id,
		mon: 1,
		itms: 1
	});
	if (!plrdat)
		return {
			success: false,
			msg: "Sorry, you're completely broke!"
		};

	const mon = plrdat.mon ?? 0;
	let totalSpent = 0;
	let itemsBought = "";
	for (const ord of purchaseOrders) {
		const quantity = ord.am <= 0 ? 1 : ord.am;
		const price = ord.itm.price * quantity;

		const purchased = plrdat.itms ? plrdat.itms[ord.itm._id] || 0 : 0;
		const maxPurchased = ord.itm.maxQ == undefined ? (ord.itm.timed ? Infinity : 1) : ord.itm.maxQ;

		if (purchased + quantity > maxPurchased) {
			return {
				success: false,
				msg:
					maxPurchased === 1 && quantity === 1
						? `You already have ${showItemName(ord.itm)}.`
						: `You can only have ${maxPurchased} of ${showItemName(ord.itm)}.`
			};
		}

		if (price > 0 && mon < price) {
			return {
				success: false,
				msg:
					quantity === 1
						? `${showItemName(ord.itm)} costs ${formatDoler(price, false)}, you need ${formatDoler(price - mon)} more to afford it.`
						: `${showItemName(ord.itm)} cost ${formatDoler(price, false)} in total, you need ${formatDoler(price - mon)} more to afford them.`
			};
		}

		totalSpent += price;
		itemsBought += `**${quantity}**x ${showItemName(ord.itm, false)}\n`;
	}

	if (confirmed) return { success: true, msg: itemsBought, totalSpent };
	return { success: true, needConfirmation: true, msg: itemsBought, totalSpent, moneyLeft: mon - totalSpent };
}

async function purchase_finalize(usr: User, purchaseOrders: okbot.StorePurchaseOrders) {
	let itemsBought = "";
	let spentTotal = 0;
	const itms: { [_id: string]: number } = {};

	for (const ord of purchaseOrders) {
		const itm = ord.itm;
		let quantity = ord.am;

		if (itm.nam.startsWith("Base daily payout")) {
			db_plr_add({
				_id: usr.id,
				day: { v: itm.v * quantity }
			});
		} else if (itm.nam.startsWith("Fishing rod upgrade")) {
			db_plr_add({
				_id: usr.id,
				fishPower: itm.v * quantity
			});
		} else if (itm.nam.startsWith("Aquarium income multiplier")) {
			const plrdatAqua = await db_plr_get({ _id: usr.id, aqua: 1 });
			if (!plrdatAqua?.aqua)
				return {
					success: false,
					msg: "Sorry, you first need an aquarium to purchase this booster.\nYou can open one using `aqua open`."
				};

			plrdatAqua.aqua.collMul += itm.v * quantity;
			plrdatAqua.aqua.collTot = plrdatAqua.aqua.coll * plrdatAqua.aqua.collMul;
			db_plr_set({ _id: usr.id, aqua: plrdatAqua.aqua });
		} else if (itm.nam.startsWith("Aquarium income storage")) {
			const plrdatAqua = await db_plr_get({ _id: usr.id, aqua: 1 });
			if (!plrdatAqua?.aqua)
				return {
					success: false,
					msg: "Sorry, you first need an aquarium to purchase this booster.\nYou can open one using `aqua open`."
				};

			const now = nowSeconds();
			plrdatAqua.aqua.toColl = calculateAquaIncome(plrdatAqua.aqua, now);
			plrdatAqua.aqua.maxColl += itm.v * quantity;
			plrdatAqua.aqua.lastColl = now;
			db_plr_set({ _id: usr.id, aqua: plrdatAqua.aqua });
		} else if (itm.nam.startsWith("Booster cooldown")) {
			db_plr_add({
				_id: usr.id,
				boosterCd: itm.v * quantity
			});
		} else if (itm.timed) {
			let plrdatBoost = await db_plr_get({ _id: usr.id, boosters: 1, boosterC: 1, boosterCd: 1 });
			const booster = checkBoosterValidity(plrdatBoost, itm._id);
			// @ts-ignore shhh
			if (booster?.timeRemaining)
				return {
					success: false,
					msg:
						`**${booster?.name}**` +
						" is still active! It will expire in `" +
						formatMilliseconds(
							(
								booster as okbot.TimedBooster & {
									timeRemaining: number;
								}
							).timeRemaining
						) +
						"`."
				};

			const now = nowSeconds();

			if ((booster as okbot.ExpiredBooster)?.cooldownRemaining > 0)
				return {
					success: false,
					msg:
						`**${booster!.name}** is on a cooldown for \`` +
						formatMilliseconds((booster as okbot.ExpiredBooster).cooldownRemaining * 1000) +
						"`."
				};

			const boosterObj: { [boosterId: string]: okbot.TimedBooster } = {
				[itm._id]: { start: now, time: itm.v[1], v: itm.v, name: itm.nam }
			};

			if (plrdatBoost) {
				if (plrdatBoost.boosters) plrdatBoost.boosters = { ...plrdatBoost.boosters, ...boosterObj };
				else plrdatBoost.boosters = boosterObj;

				plrdatBoost.boosterC = (plrdatBoost.boosterC ?? 0) + 1;
			} else {
				plrdatBoost = { boosters: boosterObj, boosterC: 1 };
			}
			await db_plr_set({ _id: usr.id, boosters: plrdatBoost.boosters, boosterC: plrdatBoost.boosterC });

			quantity = 1; // prevent user from wasting money on multiple boosters at once
		}

		spentTotal += itm.price * quantity;
		itms[itm._id] = quantity;
		itemsBought += `**${quantity}**x ${showItemName(itm, false)}\n`;
	}

	await db_plr_add({
		_id: usr.id,
		mon: -spentTotal,
		itms,
		expense: { shop: spentTotal }
	});
	return { success: true, msg: itemsBought, spentTotal };
}

export const name = "store";
export const alias = ["shop"];
export const description = "🛒 Browse the store, a category, or a specific item";
export const usage = '<Category OR Item name OR "All">';
const perPage = 20;

// pagination, purchasing, and category selection
bot.on("interactionCreate", async interaction => {
	// pagination and purchasing TODO: refactor :)
	if (interaction.isButton()) {
		const split = interaction.customId.split("-");
		if (split[0] !== "store_prev" && split[0] !== "store_next" && split[0] !== "store_buy") return;

		const msge = interaction.message.embeds[0];
		const msgeEdit = EmbedBuilder.from(msge);
		const category = split[1];
		const page = Number(split[2]);
		const plrId = split[3];

		if (split[0] === "store_prev") {
			if (page <= 0) return interaction.update({});

			const plr = await db_plr_get({ _id: plrId, itms: 1 });
			const playerItems = plr?.itms ?? {};
			if (category === "All") {
				addItemsToMsgEmbed(msgeEdit.spliceFields(0, perPage), Store_Items, playerItems, page);
			} else {
				const items = await db_store_get_category(category);
				if (!items) return;
				addCategoryItemsToMsgEmbed(msgeEdit.spliceFields(0, perPage), items, playerItems, page);
			}

			const row = interaction.message.components.shift() as ActionRow<ButtonComponent>;
			const rowNew = ActionRowBuilder.from(row) as ActionRowBuilder<ButtonBuilder>;
			rowNew.setComponents(
				new ButtonBuilder()
					.setCustomId(`store_prev-${category}-${page - 1}-${plrId}`)
					.setEmoji("⬅️")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page <= 1),
				new ButtonBuilder()
					.setCustomId(`store_next-${category}-${page + 1}-${plrId}`)
					.setEmoji("➡️")
					.setStyle(ButtonStyle.Primary)
			);

			return interaction.update({
				embeds: [msgeEdit],
				components: [rowNew, ...interaction.message.components]
			});
		} else if (split[0] === "store_next") {
			let maxPage;
			const plr = await db_plr_get({ _id: plrId, itms: 1 });
			const playerItems = plr?.itms ?? {};

			if (category === "All") {
				maxPage = Math.ceil(Store_Items.length / perPage);
				addItemsToMsgEmbed(msgeEdit.spliceFields(0, perPage), Store_Items, playerItems, page);
			} else {
				const items = await db_store_get_category(category);
				if (!items) return;
				maxPage = Math.ceil(items.length / perPage);
				addCategoryItemsToMsgEmbed(msgeEdit.spliceFields(0, perPage), items, playerItems, page);
			}

			// should never happen:)
			if (page > maxPage) return interaction.update({});

			const row = interaction.message.components.shift() as ActionRow<ButtonComponent>;
			const rowNew = ActionRowBuilder.from(row) as ActionRowBuilder<ButtonBuilder>;
			rowNew.setComponents(
				new ButtonBuilder()
					.setCustomId(`store_prev-${category}-${page - 1}-${plrId}`)
					.setEmoji("⬅️")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId(`store_next-${category}-${page + 1}-${plrId}`)
					.setEmoji("➡️")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(page >= maxPage)
			);

			return interaction.update({
				embeds: [msgeEdit],
				components: [rowNew, ...interaction.message.components]
			});
		} else if (split[0] === "store_buy") {
			const itmId = split[1];
			const plrId = split[2];

			if (interaction.user.id !== plrId)
				return sendEphemeralReply(interaction, "You thief! That's somebody else's item!");

			const itm = await db_store_get_item({ id: itmId });
			if (!itm) return;

			const response = await purchase(interaction.user, [{ itm, am: 1 }], true);
			if (!response.success) {
				sendSimpleMessage(interaction.message as okbot.Message, response.msg);
				return interaction.update({ components: [] });
			}

			const responseFinal = await purchase_finalize(interaction.user, [{ itm, am: 1 }]);
			const msge = createPurchaseEmbed(responseFinal.msg, responseFinal.spentTotal as number);
			interaction.message.reply({ embeds: [msge] });
			interaction.update({ components: [] });
		}
	}
	// select categories (k!store no arguments)
	else if (interaction.isStringSelectMenu()) {
		const split = interaction.customId.split("-");
		if (split[0] !== "store_category") return;

		const plrId = split[1];
		if (interaction.user.id !== plrId) {
			interaction.update({});
			return;
		}

		const category = interaction.values[0];
		const categoryItems = await db_store_get_category(category);
		if (!categoryItems)
			return sendSimpleMessage(
				interaction.message as okbot.Message,
				"Something went wrong... chosen category seems not to exist..."
			);

		const plr = await db_plr_get({ _id: plrId, itms: 1 });
		const playerItems = plr?.itms ?? {};
		const msge = EmbedBuilder.from(interaction.message.embeds[0]);

		msge.setFields();
		const msgeCategory = showCategory(msge, categoryItems, playerItems, plrId);
		clearPlayerCollector(plrId);
		createPurchaseCollector(
			interaction.user,
			interaction.channel as SendableChannels,
			interaction.message as okbot.Message,
			categoryItems
		);

		if (interaction.message.components.length >= 2) interaction.message.components.shift(); // remove existing buttons
		interaction.update({
			embeds: msgeCategory.embeds,
			components: [...msgeCategory.components, ...interaction.message.components]
		});
	}
});

// for showing a single item
function addSingleItemToMsgEmbed(msge: EmbedBuilder, item: okbot.Item, owned: number, maxOwned: number) {
	msge.setTitle(`Item - ${showItemName(item, false)}`);
	msge.addFields(
		{ name: "Category", value: item.cat, inline: true },
		{ name: "Price", value: formatDoler(item.price, false), inline: true }
	);

	if (item.desc) msge.addFields({ name: "Description", value: item.desc, inline: false });
	msge.addFields({
		name: "Owned",
		value: `${owned}${maxOwned == Infinity ? "" : "/" + maxOwned}`,
		inline: true
	});

	if (!item.timed && item.v) msge.addFields({ name: "Value", value: item.v.toString(), inline: true });
	if (item.timed) msge.addFields({ name: "Timed", value: "Yes", inline: true });

	return msge;
}

// for showing all items
function addItemsToMsgEmbed(
	msge: EmbedBuilder,
	items: okbot.Item[],
	playerItems: { [_id: string]: number },
	page = 1
) {
	msge.setFooter({ text: `Page ${page}\nUse 'store <item name>' to view details about said item` });

	for (let i = perPage * (page - 1); i < perPage * page; i++) {
		const item = items[i];
		if (!item) break;

		const owned = playerItems[item._id] || 0;
		const maxOwned = item.maxQ == Infinity || item.timed ? Infinity : item.maxQ ? item.maxQ : 1;
		const ownedString = owned >= maxOwned ? "✅ " : "";
		const desc = item.desc || "\u200b";
		msge.addFields({
			name: `${showItemName(item, false)} (${item.cat})`,
			value: ownedString ? `${ownedString} ~~${desc}~~` : desc
		});
	}

	return msge;
}

// for showing category items (must remove existing fields before calling this function)
function addCategoryItemsToMsgEmbed(
	msge: EmbedBuilder,
	items: okbot.Item[],
	playerItems: { [_id: string]: number },
	page = 1
) {
	msge.setFooter({
		text: `Page ${page}\nTo purchase an item, send the number next to it\nand optionally the amount separated by space (defaults to 1)\nmay also append 'ok' to confirm the purchase right away,\ne.g. '1 ok' or '2 10'.\nSend 'cancel' to abort the purchase.`
	});

	for (let i = perPage * (page - 1); i < perPage * page; i++) {
		const item = items[i];
		if (!item) break;

		const owned = playerItems[item._id] || 0;
		const maxOwned = item.maxQ == Infinity || item.timed ? Infinity : item.maxQ ? item.maxQ : 1;
		const ownedString = owned >= maxOwned ? "✅ " : "";
		const itemNumber = `\`${(i + 1).toString().padStart(2, " ")}\``;
		const desc =
			itmPriceDesc(item.price) + " " + (item.desc || "") + `${item.showV ? "\n" + "`" + item.v + "`" : ""}`;
		msge.addFields({
			name: `${itemNumber} ${showItemName(item, false)}`,
			value: ownedString ? `${ownedString} ~~${desc}~~` : desc
		});
	}

	return msge;
}

function showCategory(
	msge: EmbedBuilder,
	categoryItems: okbot.Item[],
	playerItems: { [_id: string]: number },
	plrId: string
) {
	msge.setTitle(`Category - ${categoryItems[0].cat} (${categoryItems.length})`).setDescription(null);
	addCategoryItemsToMsgEmbed(msge, categoryItems, playerItems);

	const components =
		categoryItems.length > perPage
			? [
					new ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`store_prev-${categoryItems[0].cat}-0`)
							.setEmoji("⬅️")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId(`store_next-${categoryItems[0].cat}-2-${plrId}`)
							.setEmoji("➡️")
							.setStyle(ButtonStyle.Primary)
					)
				]
			: [];

	return { embeds: [msge], components };
}

// shown after purchase() (before confirmation)
function createPurchaseEmbedFromOrders(purchaseOrders: okbot.StorePurchaseOrders, plrMon: number) {
	let total = 0;
	let desc = "";

	for (const o of purchaseOrders) {
		total += o.itm.price * o.am;
		desc += `**${o.am}**x ${showItemName(o.itm, false)}\n`;
	}

	return new EmbedBuilder()
		.setTitle("Confirm your purchase")
		.setDescription(desc)
		.addFields({ name: "Balance after purchase", value: formatDoler(plrMon - total, false) })
		.setColor(Colors.DarkGreen)
		.setFooter({ text: "Confirm with (y)es or abort with (n)o" });
}

//shown after purchase is finalized
function createPurchaseEmbed(boughtItems: string, total: number) {
	return new EmbedBuilder()
		.setTitle("You bought")
		.setDescription(boughtItems)
		.addFields({ name: "Total", value: formatDoler(total, false) })
		.setColor(Colors.DarkGreen)
		.setFooter({ text: "Use the 'inventory' command to view your items" });
}

function createPurchaseCollector(
	user: User,
	channel: SendableChannels,
	msg: okbot.Message,
	categoryItems: okbot.Item[]
) {
	// item collector (user has to pick the items and quantity)
	const itemCollector = createCollector(user.id, channel, 60000);
	if (!itemCollector) return;
	playerCollectors[user.id] = itemCollector;

	let purchaseOrders: okbot.StorePurchaseOrders = [];
	itemCollector.on("collect", async m => {
		if (!m.inGuild()) return;
		if (m.content.startsWith(getGuildPrefix(m.guildId))) return; // ignore message if a command
		const query = m.content.split(" "); // item IDs in items[], amounts (or 'ok'), 'ok' (if amounts provided)

		const splitLower = query[0].toLowerCase();
		if (splitLower === "cancel" || splitLower === "abort" || splitLower === "stop" || splitLower === "no")
			return itemCollector.stop("cancel");

		const itemIds = query[0].split(",");
		let amounts: string[] = [];
		let confirmed; // preconfirmed if 'ok' provided (skips calling purchase())

		if (query.length >= 2) {
			if (query[1].toLowerCase() === "ok") {
				confirmed = true;
			} else {
				amounts = query[1].split(",");
				confirmed = query[2]?.toLowerCase() === "ok";
			}
		}

		// parse purchase orders
		for (const i in itemIds) {
			const itemId = parseInt(itemIds[i]);
			if (itemId == null || isNaN(itemId)) continue;
			const itm = categoryItems[itemId - 1]; // (1-indexed in store, 0 indexed in array)
			if (!itm) continue;

			const amount = parseInt(amounts[i]) || 1;
			purchaseOrders.push({ itm, am: amount <= 0 ? 1 : amount });
			if (process.env.VERBOSE)
				console.log(`buying ${amount}x ${itm.nam};${confirmed ? " preconfirmed" : ""}`);
		}

		itemCollector.resetTimer();
		if (!purchaseOrders.length)
			return sendSimpleMessage(msg, "Invalid items provided!\nUse the numbers next to the item names.");

		purchaseOrders = uniqueArray(purchaseOrders); // TODO make sure not to cound "am" fields as necessary for uniqueness
		const response = await purchase(user, purchaseOrders, confirmed);
		if (!response.success) {
			sendSimpleMessage(msg, response.msg);
			return (purchaseOrders.length = 0);
		}

		// items valid and can be purchased, await user confirmation
		itemCollector.stop(response.needConfirmation ? "toConfirm" : "confirmed");
	});

	itemCollector.on("end", async (_, reason) => {
		delete Players_in_collector[user.id];
		if (process.env.VERBOSE) console.log(`Ended purchase collector: ${reason}`);

		if (reason === "clear") return; // user changed category
		if (reason === "time" || reason === "cancel")
			return sendSimpleMessage(msg, "Canceled your purchase.", Colors.DarkOrange, false);

		// purchase can go through, but now needs confirmation
		// purchase preconfirmed with 'ok'
		if (reason === "confirmed") {
			const response = await purchase_finalize(user, purchaseOrders);
			if (!response.success) {
				sendSimpleMessage(msg, response.msg);
				return (purchaseOrders.length = 0);
			}

			return msg.reply({ embeds: [createPurchaseEmbed(response.msg, response.spentTotal as number)] });
		}

		// finalizer collector (not preconfirmed, user has to confirm purchase)
		const plrdat = await db_plr_get({ _id: user.id, mon: 1 });
		msg.reply({ embeds: [createPurchaseEmbedFromOrders(purchaseOrders, plrdat?.mon ?? 0)] });

		const finCollector = createCollector(user.id, channel);
		if (!finCollector) return sendSimpleMessage(msg, "Another activity requires your attention first!");

		playerCollectors[user.id] = finCollector;

		finCollector.on("collect", m => {
			const mc = m.content.toLowerCase();
			if (mc === "n" || mc === "no" || mc === "cancel") finCollector.stop();
			else if (mc === "y" || mc === "yes" || mc === "ok") finCollector.stop("confirm");
		});

		finCollector.on("end", async (_, reason) => {
			delete Players_in_collector[user.id];
			if (process.env.VERBOSE) console.log(`Ended purchase finalizer collector: ${reason}`);

			if (reason === "confirm") {
				const response = await purchase_finalize(user, purchaseOrders);
				if (!response.success) {
					sendSimpleMessage(msg, response.msg);
					return (purchaseOrders.length = 0);
				}

				return msg.reply({ embeds: [createPurchaseEmbed(response.msg, response.spentTotal as number)] });
			}

			return sendSimpleMessage(msg, "Canceled your purchase.", Colors.DarkOrange, false);
		});
	});
}

export async function execute(msg: okbot.Message, args: string[]) {
	const query = args.join(" ");
	const msge = new EmbedBuilder()
		.setColor(Colors.Blue)
		.setAuthor({ name: "🛒 ok store, congratulations you caught a shopping cart" });

	// Show all categories
	if (!args.length) {
		msge
			.setTitle(`Showing all ${Store_Categories.length} categories`)
			.setDescription("Pick a category using the select menu to browse its items.");
		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(`store_category-${msg.author.id}`)
				.setOptions(SelectMenu_Categories)
				.setPlaceholder("Choose a category")
		);

		msg.reply({ embeds: [msge], components: [row] });
	}
	// Show all items
	else if (query.toLowerCase() === "all") {
		if (!Store_Items?.length) return sendSimpleMessage(msg, "Sorry, the store is closed idk 🥴");

		const plrdat = await db_plr_get({ _id: msg.author.id, itms: 1 });
		addItemsToMsgEmbed(msge, Store_Items, plrdat?.itms ?? {});
		msge.setTitle(`Showing all ${Store_Items.length} items`);

		const components =
			Store_Items.length > perPage
				? [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId("store_prev-All-0")
								.setEmoji("⬅️")
								.setStyle(ButtonStyle.Secondary)
								.setDisabled(true),
							new ButtonBuilder()
								.setCustomId(`store_next-All-2-${msg.author.id}`)
								.setEmoji("➡️")
								.setStyle(ButtonStyle.Primary)
						)
					]
				: [];

		msg.reply({ embeds: [msge], components });
	}
	// Show category or item
	else {
		const queryReg = new RegExp(query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
		const categoryItems = await db_store_get_category(queryReg);
		if (!categoryItems?.length) {
			const item = await db_store_get_item({ nam: queryReg });
			if (!item)
				return sendSimpleMessage(
					msg,
					`Sorry, **${query}** is not a category nor an item in the store.
					Use \`${name} all\` to browse all items or provide no arguments to view all categories.`
				);

			// Show item
			const plrdat = await db_plr_get({ _id: msg.author.id, itms: 1, mon: 1 });
			const owned = plrdat?.itms?.[item._id] || 0;
			const maxOwned = item.maxQ == Infinity || item.timed ? Infinity : item.maxQ ? item.maxQ : 1;
			addSingleItemToMsgEmbed(msge, item, owned, maxOwned);

			// TODO: add amount stringSelect
			const components = [];
			if ((plrdat?.mon || 0) >= item.price && maxOwned > owned)
				components.push(
					new ActionRowBuilder<ButtonBuilder>().setComponents(
						new ButtonBuilder()
							.setCustomId(`store_buy-${item._id}-${msg.author.id}`)
							.setStyle(ButtonStyle.Success)
							.setLabel("Purchase")
					)
				);

			return msg.reply({ embeds: [msge], components });
		} else {
			// Show category
			const plrdat = await db_plr_get({ _id: msg.author.id, itms: 1 });
			msg.reply(showCategory(msge, categoryItems, plrdat?.itms ?? {}, msg.author.id));
			createPurchaseCollector(msg.author, msg.channel as SendableChannels, msg, categoryItems);
		}
	}
}
