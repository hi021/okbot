import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	Snowflake,
	User
} from "discord.js";
import { db_plr_add, db_plr_get, db_plr_set } from "../../db/db.js";
import { bot } from "../../okbot.js";
import { SET } from "../../settings.js";
import {
	calcMoneyLevelsGain,
	createUserMsgEmbed,
	e_blank,
	formatDoler,
	formatNumber,
	getUserFromMsg,
	nowSeconds,
	parseNumberSuffix,
	sendEphemeralReply,
	sendSimpleMessage,
	showUpgradeCost,
	showUpgradeStat
} from "../../utils.js";

export const name = "bank";
export const description = "🏦 What gold reserves?";
export const usage = '<"Withdraw" OR "Deposit"> [Amount OR "All"]\n<"Upgrade" OR "Levels" OR "Stats">';

bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton() || !interaction.inGuild()) return;
	const split = interaction.customId.split("-");
	const id = split[1];

	if (split[0] === "bank_up_confirm") {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, `No, shoo, bad ${interaction.user.displayName}!`);

		const plrdat = await db_plr_get({ _id: id, mon: 1, bank: 1 });
		const lv = plrdat?.bank?.lv ?? 0;
		if (lv >= BankMemberships.length - 1)
			return sendEphemeralReply(interaction, "Your bank is already at the maximum level!");

		const cost = BankMemberships[lv].cost;
		const mon = plrdat?.mon ?? 0;
		if (cost > mon)
			return sendEphemeralReply(
				interaction,
				`You need ${formatDoler(cost - mon)} more to afford this upgrade.`
			);

		const now = nowSeconds();
		await db_plr_set({
			_id: id,
			bank: {
				...plrdat?.bank,
				balance: plrdat?.bank?.balance ?? 0,
				lv: lv + 1,
				lvTime: now
			}
		});
		await db_plr_add({ _id: id, mon: -cost, expense: { bank: cost } });

		sendSimpleMessage(
			interaction.message as okbot.Message,
			`Upgraded your bank membership to **${BankMemberships[lv + 1].name}**!`,
			Colors.DarkGreen
		);
		interaction.update({ components: [] });
		return;
	}
	if (split[0] === "bank_up_cancel") {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, `No, shoo, bad ${interaction.user.displayName}!`);

		interaction.update({ components: [] });
		return;
	}
});

//withdraw cooldown is in seconds, will only pay percent fee if withdrawing before the cooldown
export const BankMemberships = [
	{ cost: 0, name: "Free", max: 10000, interest: 0, withdrawFee: 0.05, withdrawCD: 86400 /*24h*/ }, //default (lv.0)
	{ cost: 2000, name: "Starter", max: 40000, interest: 0, withdrawFee: 0.04, withdrawCD: 86400 },
	{ cost: 5000, name: "Basic", max: 75000, interest: 0.002, withdrawFee: 0.04, withdrawCD: 86400 }, //lv2
	{ cost: 10000, name: "Basic+", max: 75000, interest: 0.002, withdrawFee: 0.04, withdrawCD: 79200 /*22h*/ },
	{ cost: 17500, name: "Quality", max: 100000, interest: 0.004, withdrawFee: 0.03, withdrawCD: 79200 }, //lv4
	{ cost: 30000, name: "Business", max: 150000, interest: 0.005, withdrawFee: 0.03, withdrawCD: 79200 },
	{
		cost: 50000,
		name: "Professional",
		max: 250000,
		interest: 0.007,
		withdrawFee: 0.03,
		withdrawCD: 72000 /*20h*/
	}, //lv6
	{ cost: 80000, name: "Expert", max: 500000, interest: 0.01, withdrawFee: 0.03, withdrawCD: 72000 },
	{ cost: 87500, name: "Extra", max: 750000, interest: 0.01, withdrawFee: 0.02, withdrawCD: 72000 },
	{ cost: 150000, name: "Exclusive", max: 1000000, interest: 0.01, withdrawFee: 0.02, withdrawCD: 72000 },
	{ cost: 300000, name: "Elite", max: 1000000, interest: 0.012, withdrawFee: 0.02, withdrawCD: 72000 }, //lv10
	{ cost: 500000, name: "VIP", max: 2000000, interest: 0.014, withdrawFee: 0.02, withdrawCD: 64800 /*18h*/ },
	{ cost: 800000, name: "Shark", max: 5000000, interest: 0.016, withdrawFee: 0.02, withdrawCD: 64800 },
	{ cost: 1500000, name: "Ultra", max: 10000000, interest: 0.018, withdrawFee: 0.015, withdrawCD: 64800 },
	{ cost: 2050000, name: "Ultimate", max: 15000000, interest: 0.018, withdrawFee: 0.01, withdrawCD: 64800 } //lv14
];

// plr = {bank, monTot, monLv}, pass a message to sendMessage to inform about potential level up
export async function bankInterest(
	plr: okbot.User,
	user: User,
	now = nowSeconds(),
	sendMessage?: okbot.Message
) {
	let bank = plr.bank;
	if (bank?.balance == null) {
		bank = { ...bank, balance: bank?.balance ?? 0 };
		await db_plr_set({ _id: user.id, bank });
		return bank;
	}
	if (!bank.lastInterest) return bank;

	const membership = BankMemberships[bank.lv ?? 0];
	if (!membership.interest) return bank;

	const interestCD = SET.BANK_INTEREST_INTERVAL || 604800;
	let sinceInterest = now - (bank.lastInterest ?? now);

	// count interest (in case of skipped payments)
	let interestCount = 0;
	let interestValue = 0;
	while (sinceInterest >= interestCD) {
		++interestCount;
		sinceInterest -= interestCD;
		interestValue += Math.round(bank.balance * membership.interest);
	}
	if (!interestValue) return bank;

	// add interest
	bank.lastInterest = now - sinceInterest;
	const monLvGain = calcMoneyLevelsGain(plr.monLv ?? 0, (plr.monTot ?? 0) + interestValue, sendMessage);
	await db_plr_set({ _id: user.id, bank });
	await db_plr_add({
		_id: user.id,
		income: { bank: interestValue },
		mon: interestValue,
		monTot: interestValue,
		monLv: monLvGain
	});

	if (sendMessage) {
		const msge = createUserMsgEmbed(user, Colors.Green).setDescription(
			`+ ${formatDoler(interestValue, false)} bank interest\n${interestCount} payment${interestCount == 1 ? "" : "s"} at a ${
				Math.round(membership.interest * 10000) / 100
			}% rate`
		);
		sendMessage.channel.send({ embeds: [msge] });
	}

	return bank;
}

function getLastWithdraw(bank: okbot.Bank, now = nowSeconds()) {
	const membership = BankMemberships[bank.lv ?? 0];
	const lastWithdraw = bank.lastWithdraw ?? 0;
	const sinceLastWithdraw = now - lastWithdraw;
	const untilCanWithdraw = membership.withdrawCD - sinceLastWithdraw;

	return {
		sinceLastWithdraw,
		withdrawFee: untilCanWithdraw <= 0 ? 0 : membership.withdrawFee,
		untilCanWithdraw
	};
}

// get from db and call showBank
async function getAndShowBank(user: User, msg: okbot.Message) {
	const plrdat = await db_plr_get({ _id: user.id, bank: 1, mon: 1, monTot: 1, monLv: 1 });
	const now = nowSeconds();

	if (!plrdat?.bank) {
		const bank = { balance: 0, lv: 0, totDeposit: 0 };
		await db_plr_set({ _id: user.id, bank });

		return msg.reply({ embeds: [showBank(bank, user)], allowedMentions: { repliedUser: false } });
	}

	const bank = await bankInterest(plrdat, user, now, msg);
	return msg.reply({ embeds: [showBank(bank, user)], allowedMentions: { repliedUser: false } });
}

function showBank(bank: okbot.Bank, user: User) {
	const membership = BankMemberships[bank.lv ?? 0];
	const lastWithdraw = getLastWithdraw(bank);
	let desc = `${formatDoler(bank.balance)}\n ${e_blank}${e_blank}/${formatDoler(membership.max, false)}`;
	if (lastWithdraw.withdrawFee > 0)
		desc += `\n\nWithdrawing earlier than <t:${(bank.lastWithdraw ?? 0) + membership.withdrawCD}:R> will incur a ${
			lastWithdraw.withdrawFee * 100
		}% fee.`;

	const msge = new EmbedBuilder()
		.setColor(Colors.Gold)
		.setAuthor({
			name: user.displayName + "'s bank account",
			iconURL: user.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setDescription(desc)
		.setFooter({
			text:
				`💳 ${membership.name} Membership\n\n` +
				"Use 'bank withdraw' and 'bank deposit' to move money\nUse 'bank upgrade' to upgrade your membership"
		});

	return msge;
}

function showStats(bank: okbot.Bank, user: User) {
	const msge = new EmbedBuilder().setColor(Colors.Gold).setAuthor({
		name: `${user.displayName}'s bank stats`,
		iconURL: user.displayAvatarURL({ forceStatic: true, size: 32 })
	});
	if (!bank.lastInterest || bank.totDeposit == null)
		return msge.setDescription("🕸️ *There are no stats to show...*");

	const now = nowSeconds();
	const lastWithdraw = getLastWithdraw(bank, now);
	const untilNextInterest = (bank.lastInterest ?? now) - now + (SET.BANK_INTEREST_INTERVAL || 604800);
	if (bank.lvTime) msge.setDescription(`Level **${bank.lv}** achieved <t:${bank.lvTime}:R>.`);
	msge.addFields(
		{
			name: "Last withdrawn",
			value: bank.lastWithdraw
				? `<t:${bank.lastWithdraw}:R>${
						lastWithdraw.withdrawFee
							? `\nCan withdraw again <t:${now + lastWithdraw.untilCanWithdraw}:R>`
							: ""
					}`
				: "Never"
		},
		{
			name: "Last interest payment",
			value:
				(bank.lastInterest ? `<t:${bank.lastInterest}:R>` : "Never") +
				(untilNextInterest <= 0
					? "\nNext payment due now! ✨"
					: `\nNext payment <t:${now + untilNextInterest}:R>`)
		},
		{ name: "Total deposited", value: formatDoler(bank.totDeposit, false) }
	);

	return msge;
}

async function withdraw(am: number, msg: okbot.Message, bank: okbot.Bank, id: Snowflake) {
	if (bank.balance < am)
		return sendSimpleMessage(msg, `There is only ${formatDoler(bank.balance)} in your account.`);

	const now = nowSeconds();
	const lastWithdraw = getLastWithdraw(bank, now);

	const fee = lastWithdraw.withdrawFee > 0 ? Math.round(lastWithdraw.withdrawFee * am) : 0;
	bank.lastWithdraw = now;
	bank.balance -= am;

	// TODO?: should probably reset lastInterest timestamp if withdrawing doesn't leave enough balance to provide interest
	await db_plr_add({ _id: id, expense: { bank: fee }, mon: am - fee });
	await db_plr_set({ _id: id, bank });

	const msge = new EmbedBuilder().setColor(Colors.DarkGreen).setFields(
		{
			name: "Withdrawn",
			value: formatDoler(am - fee, false) + (fee ? ` (${lastWithdraw.withdrawFee * 100}% fee)` : "")
		},
		{
			name: "Remaining balance",
			value: formatDoler(bank.balance, false),
			inline: true
		}
	);

	msg.reply({ embeds: [msge] });
}

async function deposit(am: number, msg: okbot.Message, bank: okbot.Bank, id: Snowflake, mon: number) {
	if (am > mon) return sendSimpleMessage(msg, `You only have ${formatDoler(mon)}.`);
	const membership = BankMemberships[bank.lv ?? 0];
	const maxDeposit = membership.max - bank.balance;
	if (am > maxDeposit) am = maxDeposit;

	if (!am) return sendSimpleMessage(msg, "Your bank account is already full. 💰");

	bank.balance += am;
	bank.totDeposit = (bank.totDeposit ?? 0) + am;
	if (!bank.lastInterest) bank.lastInterest = nowSeconds();

	await db_plr_add({ _id: id, mon: -am });
	await db_plr_set({ _id: id, bank });

	const msge = new EmbedBuilder().setColor(Colors.DarkGreen).setFields(
		{
			name: "Deposited",
			value: formatDoler(am, false)
		},
		{
			name: "Current balance",
			value: formatDoler(bank.balance, false),
			inline: true
		}
	);

	msg.reply({ embeds: [msge] });
}

function showLevels() {
	const msge = new EmbedBuilder().setColor(Colors.White).setTitle("Bank membership tiers");

	for (const i in BankMemberships) {
		const stat = BankMemberships[i];
		msge.addFields({
			name: `${stat.name} (lv. ${i})`,
			value: `\`${formatNumber(stat.cost).padStart(9, " ")}\` 💵 | account limit: ${formatDoler(stat.max)} ● interest: **${
				Math.round(stat.interest * 10000) / 100
			}%** ● withdrawal fee: **${stat.withdrawFee * 100}%** ● withdraw cooldown: **${stat.withdrawCD / 3600} h**`
		});
	}

	return msge;
}

function showUpgradeStats(lv: number, money: number) {
	return new EmbedBuilder()
		.setColor(Colors.White)
		.setDescription(showUpgradeCost(BankMemberships[lv].cost, money))
		.setTitle(`Bank level ${lv} upgrade`)
		.addFields([
			showUpgradeStat(BankMemberships, lv, "max", "Account limit", v => formatDoler(v, false)),
			showUpgradeStat(BankMemberships, lv, "interest", "Interest", v => Math.round(v * 10000) / 100 + "%"),
			showUpgradeStat(BankMemberships, lv, "withdrawCD", "Withdraw cooldown", v => v / 3600 + "h"),
			showUpgradeStat(BankMemberships, lv, "withdrawFee", "Withdrawal fee", v => v * 100 + "%")
		])
		.setFooter({ text: "Use 'bank levels' to view all upgrades" });
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (!args.length) return getAndShowBank(msg.author, msg);
	const action = args.shift()!.toLowerCase();
	const user = (await getUserFromMsg(msg, args)) ?? msg.author;

	switch (action) {
		case "withdraw":
		case "w": {
			const arg = args.shift()?.toLowerCase();
			if (!arg) return sendSimpleMessage(msg, "Please provide the amount you wish to withdraw.");

			const plrdat = await db_plr_get({ _id: msg.author.id, bank: 1, mon: 1 });
			const bank = await bankInterest(plrdat ?? { bank: { balance: 0 } }, msg.author, undefined, msg);
			if (!bank?.balance) return sendSimpleMessage(msg, "🕸️ There is no money to withdraw...");

			const am = arg == "all" ? bank.balance : parseNumberSuffix(arg);
			if (!am || isNaN(am) || am < 0)
				return sendSimpleMessage(
					msg,
					`Please provide the amount you wish to withdraw.\nThere is currently ${formatDoler(bank.balance)} in your account.`
				);

			withdraw(am, msg, bank, msg.author.id);
			return;
		}

		case "deposit":
		case "d": {
			const arg = args.shift()?.toLowerCase();
			if (!arg) return sendSimpleMessage(msg, "Please provide the amount you wish to deposit.");

			const plrdat = await db_plr_get({ _id: msg.author.id, bank: 1, mon: 1, monTot: 1, monLv: 1 });
			const bank = await bankInterest(plrdat ?? { bank: { balance: 0 } }, msg.author, undefined, msg);
			const mon = plrdat?.mon ?? 0;
			const am = arg == "all" ? mon : parseNumberSuffix(arg);

			if (!am || isNaN(am) || am < 0)
				return sendSimpleMessage(
					msg,
					`Please provide the amount you wish to deposit.\nYou currently have ${formatDoler(mon, false)}.`
				);

			deposit(am, msg, bank, msg.author.id, mon);
			return;
		}

		case "levels":
		case "lv":
		case "upgrades": {
			return msg.reply({ embeds: [showLevels()], allowedMentions: { repliedUser: false } });
		}

		case "upgrade":
		case "up": {
			const id = msg.author.id;
			const plrdat = await db_plr_get({ _id: id, bank: 1, mon: 1, monTot: 1, monLv: 1 });
			const bank = await bankInterest(plrdat ?? { bank: { balance: 0 } }, msg.author, undefined, msg);
			const lv = (bank.lv ?? 0) + 1;
			if (!BankMemberships[lv]) return sendSimpleMessage(msg, "Your bank is already at the maximum level!");

			const mon = plrdat?.mon ?? 0;
			const components =
				mon >= BankMemberships[lv].cost
					? [
							new ActionRowBuilder<ButtonBuilder>().addComponents(
								new ButtonBuilder()
									.setCustomId(`bank_up_confirm-${id}`)
									.setStyle(ButtonStyle.Success)
									.setLabel("Upgrade"),
								new ButtonBuilder()
									.setCustomId(`bank_up_cancel-${id}`)
									.setStyle(ButtonStyle.Danger)
									.setLabel("Cancel")
							)
						]
					: [];

			return msg.reply({ embeds: [showUpgradeStats(lv, mon)], components });
		}

		case "stats":
		case "stat": {
			const plrdat = await db_plr_get({ _id: user.id, bank: 1, monLv: 1, monTot: 1 });
			const bank = await bankInterest(plrdat ?? { bank: { balance: 0 } }, user, undefined, msg);

			return msg.reply({ embeds: [showStats(bank, user)], allowedMentions: { repliedUser: false } });
		}

		default: {
			//assume viewing other user
			return getAndShowBank(user, msg);
		}
	}
}
