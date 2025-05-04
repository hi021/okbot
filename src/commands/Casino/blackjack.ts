import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	Interaction
} from "discord.js";
import { db_add_casino_top, db_plr_add, db_plr_get } from "../../db/db.js";
import { bot } from "../../okbot.js";
import {
	addCasinoStat,
	calcMoneyLevelsGain,
	formatDoler,
	parseNumberSuffix,
	randomFromArray,
	sendEphemeralReply,
	sendSimpleMessage,
	showCasinoTopWins
} from "../../utils.js";
import { Blackjack_games } from "../../volatile.js";

export const name = "blackjack";
export const alias = ["bj", "21"];
export const description = "🃏 Play blackjack (21)";
export const usage = '[Bet amount (10-10M/33M 💵) OR "All" OR "Top"]';

const BET_RANGES = { def: { min: 10, max: 10000000 }, vip: { min: 50000, max: 33000000 } };

bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split("-");
	if (split[0] !== "bj_hit" && split[0] !== "bj_stand" && split[0] !== "bj_double") return;

	const id = split[1];
	if (id != interaction.user.id)
		return sendEphemeralReply(interaction, "This is someone else's game, please leave...");

	const game = Blackjack_games[id];
	if (!game) return sendEphemeralReply(interaction, "This game has already ended.");

	if (split[0] === "bj_hit") {
		//player draw
		const card = drawCard(game.tot, game.hasAce);
		if (card.val === "A") game.hasAce = true;
		game.cards[game.cards.length] = card;
		game.tot += card.num;

		if (game.tot > 21) {
			if (playerBusted(game, id, interaction)) {
				await displayGame(game);
				return;
			}
		}

		await displayGame(game);
		interaction.deferUpdate(); //otherwise says 'interaction failed'
		return;
	} else if (split[0] === "bj_stand") {
		game.msg.edit({ components: [] });
		dealerDraw(game);
		await displayGame(game);
		await checkWinConditions(game, id, interaction);
		return;
	} else if (split[0] === "bj_double") {
		const plrdat = await db_plr_get({ _id: id, mon: 1 });
		const bet = game.bet * 2;
		if (bet > (plrdat?.mon ?? 0))
			return sendEphemeralReply(interaction, `You only have ${formatDoler(plrdat?.mon ?? 0)}.`);

		await db_plr_add({ _id: id, mon: -game.bet, expense: { bj: game.bet } });
		game.bet = bet;
		game.doubled = true;
		const msge = game.msg.embeds[0];
		const msgeEdit = EmbedBuilder.from(msge);
		msgeEdit.setDescription(`${formatDoler(bet)}`);
		game.msg.edit({ embeds: [msgeEdit], components: [] });

		//player draw
		const card = drawCard(game.tot, game.hasAce);
		if (card.val === "A") game.hasAce = true;
		game.cards[game.cards.length] = card;
		game.tot += card.num;

		if (game.tot > 21) {
			if (playerBusted(game, id, interaction)) {
				await displayGame(game);
				return;
			}
		}

		dealerDraw(game);
		await displayGame(game);
		await checkWinConditions(game, id, interaction);
		return;
	}
});

//checks if player busted and ends the game if so
function playerBusted(game: okbot.BlackjackGame, plrId: string, interaction: ButtonInteraction) {
	//count ace as 1 instead of 11 | WARNING: Assuming there was a check for game.tot > 21 beforehand
	if (game.hasAce) {
		for (const i in game.cards) {
			if (game.cards[i].val == "A" && game.cards[i].num == 11) {
				game.cards[i].num = 1;
				game.tot -= 10;
				break; //because only one ace per player:))
			}
		}
	}

	if (game.tot > 21) {
		//lose - busted
		const msge = new EmbedBuilder()
			.setAuthor({
				name: interaction.user.displayName,
				iconURL: interaction.user.displayAvatarURL({ forceStatic: true, size: 32 })
			})
			.setColor(Colors.DarkRed)
			.setDescription(`${interaction.user.displayName} busted, dealer wins!`)
			.setTitle(`Lost ${formatDoler(game.bet, false)}!`);

		endGame(plrId, "You busted!");
		displayGame(game);
		interaction.reply({ embeds: [msge] });
		return true;
	}

	return false;
}

async function checkWinConditions(game: okbot.BlackjackGame, plrId: string, interaction: ButtonInteraction) {
	const msge = new EmbedBuilder().setAuthor({
		name: interaction.user.displayName,
		iconURL: interaction.user.displayAvatarURL({ forceStatic: true, size: 32 })
	});

	if (game.deal.tot > 21) {
		//won (dealer bust) - double bet
		const bet = game.bet;
		msge
			.setColor(Colors.DarkGreen)
			.setDescription(`Dealer busted, ${interaction.user.displayName} wins!`)
			.setTitle(`Won ${formatDoler(bet, false)}!`);
		endGame(plrId, "Dealer busted!");

		const plrdat = await db_plr_get({ _id: plrId, monTot: 1, monLv: 1 });
		const monLv = calcMoneyLevelsGain<Interaction>(
			plrdat?.monLv ?? 0,
			(plrdat?.monTot ?? 0) + bet,
			interaction
		);

		await db_plr_add({ _id: plrId, mon: bet * 2, monLv, monTot: bet, income: { bj: bet * 2 } });
		await addCasinoStat(plrId, "bj", "win", bet, bet, {
			countDraws: true,
			bjDoubled: game.doubled,
			is21: game.tot === 21
		});
		db_add_casino_top("bj", plrId, interaction.user.tag, game.bet, game.bet * 2);

		interaction.reply({ embeds: [msge] });
		return;
	} else if (game.deal.tot > game.tot) {
		//lost
		msge
			.setColor(Colors.DarkRed)
			.setDescription("Dealer wins!")
			.setTitle(`Lost ${formatDoler(game.bet, false)}!`);
		endGame(plrId, "Dealer wins!");

		await addCasinoStat(plrId, "bj", "lose", game.bet, -game.bet, {
			countDraws: true,
			bjDoubled: game.doubled,
			is21: game.tot === 21
		});
		interaction.reply({ embeds: [msge] });
		return;
	} else if (game.deal.tot < game.tot) {
		//won (higher total) - double bet
		const bet = game.bet;
		msge
			.setColor(Colors.DarkGreen)
			.setDescription(`${interaction.user.displayName} wins!`)
			.setTitle(`Won ${formatDoler(bet, false)}!`);
		endGame(plrId, "You win!");

		const plrdat = await db_plr_get({ _id: plrId, monTot: 1, monLv: 1 });
		const monLv = calcMoneyLevelsGain<Interaction>(
			plrdat?.monLv ?? 0,
			(plrdat?.monTot ?? 0) + bet,
			interaction
		);

		await db_plr_add({ _id: plrId, mon: bet * 2, monLv, monTot: bet, income: { bj: bet * 2 } });
		await addCasinoStat(plrId, "bj", "win", bet, bet, {
			countDraws: true,
			bjDoubled: game.doubled,
			is21: game.tot === 21
		});
		db_add_casino_top("bj", plrId, interaction.user.tag, game.bet, game.bet * 2);

		interaction.reply({ embeds: [msge] });
		return;
	} else {
		//draw - return bet
		const bet = game.bet;
		msge.setColor(Colors.DarkOrange).setDescription("It's a draw!");

		endGame(plrId, "Draw!");
		await db_plr_add({ _id: plrId, mon: bet, income: { bj: bet } });
		await addCasinoStat(plrId, "bj", "draw", bet, 0, {
			countDraws: true,
			bjDoubled: game.doubled,
			is21: game.tot === 21
		});
		interaction.reply({ embeds: [msge] });
		return;
	}
}

function dealerDraw(game: okbot.BlackjackGame) {
	while (game.deal.tot <= 16) {
		const dcard = drawCard(game.deal.tot, game.deal.hasAce);
		if (dcard.val === "A") game.deal.hasAce = true;
		game.deal.cards[game.deal.cards.length] = dcard;
		game.deal.tot += dcard.num;

		if (game.deal.tot > 21 && game.deal.hasAce) {
			//make ace count as 1 instead of 11
			for (const i in game.deal.cards) {
				if (game.deal.cards[i].val == "A" && game.deal.cards[i].num == 11) {
					game.deal.cards[i].num = 1;
					game.deal.tot -= 10;
					break; //because only one ace per player:))
				}
			}
		}
	}
}

const getCardValue = (val: okbot.CardValue, over21?: boolean) => {
	if (val == "A") return over21 ? 1 : 11;
	if (val == "Q" || val == "K" || val == "J") return 10;
	return Number(val);
};

function drawCard(tot: number, hasAce?: boolean): okbot.Card {
	//won't draw second ace
	const vals: Array<okbot.CardValue> = hasAce
		? ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
		: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
	const val = randomFromArray(vals);
	return {
		clr: randomFromArray(["♣️", "♠️", "♥️", "♦️"]),
		val,
		num: getCardValue(val, tot > 21)
	};
}

function displayCards(cards: okbot.Card[]) {
	let s = "";
	for (const i of cards) s += `${i.clr}**${i.val}** `;
	return s;
}

function endGame(plrId: string, reason: string) {
	clearTimeout(Blackjack_games[plrId].time);

	const msge = Blackjack_games[plrId].msg.embeds[0];
	const msgeEdit = EmbedBuilder.from(msge);
	msgeEdit.setFooter({ text: reason });
	Blackjack_games[plrId].msg.edit({ embeds: [msgeEdit], components: [] });

	delete Blackjack_games[plrId];
}

async function displayGame(game: okbot.BlackjackGame) {
	const msge = game.msg.embeds[0];
	const msgeEdit = EmbedBuilder.from(msge);
	msgeEdit
		.spliceFields(0, 3)
		.addFields({ name: `🦈 Dealer (${game.deal.tot})`, value: displayCards(game.deal.cards) })
		.addFields({ name: "\u200b", value: "\u200b" })
		.addFields({ name: `🐱 You (${game.tot})`, value: displayCards(game.cards) });

	await game.msg.edit({ embeds: [msgeEdit] });
}

export async function execute(msg: okbot.Message, args: string[]) {
	const id = msg.author.id;
	if (Blackjack_games[id]) return sendSimpleMessage<okbot.Message>(msg, "You're already in a game!");
	if (!args.length)
		return sendSimpleMessage<okbot.Message>(
			msg,
			"The usage for this command is:\n`" + usage + "`",
			Colors.White
		);

	const plrdat = await db_plr_get({ _id: id, mon: 1, itms: 1 });
	const mon = plrdat?.mon ?? 0;
	const action = args[0]!.toLowerCase();
	const MIN_BET = BET_RANGES[plrdat?.itms?.BOS0010 ? "vip" : "def"].min;
	const MAX_BET = BET_RANGES[plrdat?.itms?.BOS0010 ? "vip" : "def"].max;
	let bet;

	if (action === "all") {
		args.shift();
		bet = Math.min(MAX_BET, mon || MIN_BET);
	} else if (action === "top") {
		return msg.reply({
			embeds: [await showCasinoTopWins("bj", false)],
			allowedMentions: { repliedUser: false }
		});
	} else bet = parseNumberSuffix(args.shift() as string);
	if (bet == null || isNaN(bet) || bet < MIN_BET || bet > MAX_BET)
		return sendSimpleMessage<okbot.Message>(
			msg,
			`Bet amount must be within ${formatDoler(MIN_BET)} and ${formatDoler(MAX_BET)}.`
		);
	if (bet > mon) return sendSimpleMessage<okbot.Message>(msg, `You only have ${formatDoler(mon)}.`);

	//initialize game
	await db_plr_add({ _id: id, mon: -bet, expense: { bj: bet } });
	const dcard1 = drawCard(0, false);
	const dtot = dcard1.num;
	const card1 = drawCard(0, false);
	const card2 = drawCard(0, card1.val == "A");
	const tot = card1.num + card2.num;
	const dcards = [dcard1];
	const cards = [card1, card2];

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
		new ButtonBuilder()
			.setCustomId("bj_hit-" + id)
			.setLabel("Hit")
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId("bj_stand-" + id)
			.setLabel("Stand")
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId("bj_double-" + id)
			.setLabel("Double")
			.setStyle(ButtonStyle.Primary)
	]);

	const msge = new EmbedBuilder()
		.setFooter({
			text: `Press hit to draw another card.\nStand to end your turn and let the dealer draw.\nDouble to double your bet and draw one last card.`,
			iconURL: msg.author.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setColor(Colors.Fuchsia)
		.setTitle("Blackjack table")
		.setDescription(`${formatDoler(bet)}`)
		.addFields({ name: `🦈 Dealer (${dtot})`, value: displayCards(dcards) })
		.addFields({ name: "\u200b", value: "\u200b" })
		.addFields({ name: `🐱 You (${tot})`, value: displayCards(cards) });

	const msgSent = await msg.reply({ embeds: [msge], components: [row] });
	const time = setTimeout(() => {
		endGame(id, "Timeout: the game didn't conclude within 30 minutes.");
	}, 1800000); //timeout game after 30min

	Blackjack_games[id] = {
		bet,
		tot,
		cards,
		hasAce: card1.val == "A" || card2.val == "A",
		deal: { tot: dtot, cards: dcards, hasAce: dcard1.val == "A" },
		msg: msgSent,
		time
	};
}
