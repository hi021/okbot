import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    SendableChannels
} from 'discord.js';
import { db_plr_add, db_plr_get } from '../../db/db.js';
import { bot } from '../../okbot.js';
import {
    createSimpleMessage,
    e_blank,
    formatDoler,
    formatNumber,
    sendEphemeralReply,
    sendSimpleMessage,
    shuffleArray
} from '../../utils.js';
import { Poker_games } from '../../volatile.js';

export const name = 'poker';
export const alias = ['holdem'];
export const description = '🃏 Play like poker money like a broker';
export const usage = '["Start" OR "Join" OR "Top"] [Created table max bet amount (100-10M 💵)]';

const MAX_BET = 10000000;
const MIN_BET = 100;

//k!poker start -> createGame() -> host starts -> startGame() & newRound() -> newTurn()
// -> player finishes action -> advanceTurn() until newBettingRound()

bot.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split('-');
	const guildId = split[1];
	const game = Poker_games[guildId];

	if (split[0] === 'poker_start') {
		if (!game) {
			interaction.update({ components: [] });
			return;
		}

		if (interaction.user.id != game.host)
			return sendEphemeralReply(interaction, 'Only the host may start the game.');
		if (game.queuePlr.length < 2)
			return sendEphemeralReply(interaction, 'At least two players are necessary to start.');

		startGame(guildId);
		interaction.deferUpdate();
		return;
	}

	if (split[0] === 'poker_join') {
		if (!game) {
			interaction.update({ components: [] });
			return;
		}

		if (game.queuePlr.length >= 10) return sendEphemeralReply(interaction, 'This game is already full.');
		if (game.queuePlr.includes(interaction.user.id))
			return sendEphemeralReply(interaction, 'You are already participating in this game.');

		const plr = await db_plr_get({ _id: interaction.user.id, mon: 1 });
		if ((plr?.mon ?? 0) < game.minBet * 2)
			return sendEphemeralReply(
				interaction,
				`You need at least ${formatDoler(game.minBet * 2)} to join a ${formatDoler(game.maxBet, false)} table.`
			);

		game.queuePlr.push(interaction.user.id);
		updatePlayers(game);
		interaction.deferUpdate();
		return;
	}

	if (split[0] === 'poker_leave') {
		if (!game) {
			interaction.update({ components: [] });
			return;
		}

		if (interaction.user.id == game.host) {
			endGame(guildId, 'Game was canceled by the host.');
		} else {
			game.queuePlr = game.queuePlr.filter(a => a != interaction.user.id);
			updatePlayers(game);
		}

		interaction.deferUpdate();
		return;
	}

	const plrId = parseInt(split[2]);
	if (split[0] === 'poker_cards') {
		if (!game) {
			interaction.update({ components: [] });
			return;
		}

		const plr = game.plr[plrId];
		if (interaction.user.id !== plr?.id)
			return sendEphemeralReply(interaction, "This isn't your decision to make...");

		const cards = `${plr.cards[0].clr} **${plr.cards[0].val}**${e_blank}${plr.cards[1].clr} **${plr.cards[1].val}**`;
		return sendEphemeralReply(interaction, 'Your hand is\n' + cards, Colors.Blue);
	}

	if (split[0] === 'poker_call') {
		if (!game) {
			interaction.update({ components: [] });
			return;
		}

		const plr = game.plr[plrId];
		if (interaction.user.id !== plr?.id)
			return sendEphemeralReply(interaction, "This isn't your decision to make...");

		//
		return;
	}

	if (split[0] === 'poker_fold') {
		if (!game) {
			interaction.update({ components: [] });
			return;
		}

		const plr = game.plr[plrId];
		if (interaction.user.id !== plr?.id)
			return sendEphemeralReply(interaction, "This isn't your decision to make...");

		const msge = createSimpleMessage(`<@${plr.id}> has folded!`);
		plr.playing = 'folded';
		interaction.update({ embeds: [msge] });
		await advanceTurn(guildId);
		return;
	}
});

//deletes from Poker_games object
async function endGame(guildId: string, reason: string) {
	const game = Poker_games[guildId];
	if (!game) return;

	if (game.idleTimer) clearTimeout(game.idleTimer);
	const msge = EmbedBuilder.from(game.msg.embeds[0]);
	msge.setDescription(reason);
	await game.msg.edit({ embeds: [msge], components: [] });

	delete Poker_games[guildId];
}

async function updatePlayers(game: okbot.PokerGame) {
	let playersField = '';
	if (game.currentTurn < 0) {
		//join/leave before game start
		for (const i in game.queuePlr) playersField += `<@${game.queuePlr[i]}>${i == '0' ? ' ⭐' : ''}\n`; //host always at index 0
	} else {
		//during play
		for (const i in game.plr)
			playersField += `<@${game.plr[i].id}> - ${formatDoler(game.plr[i].bet, false)}${
				game.plr[i].playing === 'idle' || game.plr[i].playing === 'folded' ? ' ❌ folded' : ''
			}${game.bigBlind == Number(i) ? ' BB' : game.smallBlind == Number(i) ? ' B' : ''}${game.currentTurn == Number(i) ? ' 🡄' : ''}\n`;
	}

	const msge = EmbedBuilder.from(game.msg.embeds[0]);
	msge.spliceFields(
		2,
		2,
		{ name: 'Players', value: playersField },
		{ name: 'Pot', value: '💵 ' + formatNumber(game.pot) }
	);
	await game.msg.edit({ embeds: [msge] });
}

async function updateCommunityCards(game: okbot.PokerGame) {
	let desc = '';
	let shownCards;
	if (game.betRound <= 1) shownCards = 3;
	else shownCards = Math.min(game.betRound + 1, 5);

	for (let i = 0; i < shownCards; i++) desc += `${game.cards[i].clr} **${game.cards[i].val}**   `;

	const msge = EmbedBuilder.from(game.msg.embeds[0]);
	msge.setDescription(desc);
	msge.spliceFields(1, 1, { name: 'Round', value: `${game.round}/${game.maxRound}`, inline: true });
	await game.msg.edit({ embeds: [msge] });
}

//big and small blinds
async function forceBet(game: okbot.PokerGame) {
	const plrBB = await db_plr_get({ _id: game.plr[game.bigBlind].id, mon: 1 });
	const monBB = plrBB?.mon ?? 0;
	const bigBlind = game.minBet * 2;
	const actualBigBlind = Math.min(bigBlind, monBB);
	const actualSmallBlind = Math.round(actualBigBlind / 2);

	//force blinds to bed, fold if not enough money
	if (!bet(game, game.bigBlind, actualBigBlind)) game.plr[game.bigBlind].playing = 'folded';
	if (!bet(game, game.smallBlind, actualSmallBlind)) game.plr[game.smallBlind].playing = 'folded';
	game.currentTurn = (game.currentTurn + 2) % game.plr.length; //set new better
	await updatePlayers(game);
}

async function bet(game: okbot.PokerGame, pokerId: number, bet: number) {
	const plr = await db_plr_get({ _id: game.plr[pokerId].id, mon: 1 });
	const mon = plr?.mon ?? 0;
	if (bet > mon) return false;

	game.plr[pokerId].bet += bet;
	game.pot += bet;

	db_plr_add({ _id: game.plr[pokerId].id, mon: -bet, expense: { poker: mon } });

	return true;
}

//start new game round
async function newRound(guildId: string) {
	const game = Poker_games[guildId];
	++game.round;
	game.betRound = 1;
	game.bigBlind = (game.bigBlind + 1) % game.plr.length;
	game.smallBlind = (game.smallBlind + 1) % game.plr.length;
	game.currentTurn = game.bigBlind;

	await forceBet(game);
	await updatePlayers(game);
	await newTurn(guildId);
}

function pickWinner(game: okbot.PokerGame) {
	//poker
	//
	//..
	//full house
	//triple
	//two-pair
	//pair
	//high card
}

//pick winner and start a new round/end game
async function endRound(guildId: string) {}

//start new betting round (all players bet once)
async function newBettingRound(guildId: string) {
	const game = Poker_games[guildId];
	++game.betRound;
	game.currentTurn = game.bigBlind;

	await newTurn(guildId);
}

//after 1 player action
async function advanceTurn(guildId: string) {
	const game = Poker_games[guildId];
	let i = 0;
	do {
		++i;
		game.currentTurn = (game.currentTurn + 1) % game.plr.length;
	} while (game.plr[game.currentTurn].playing != 'yes' && i <= game.plr.length);

	if (game.currentTurn == game.bigBlind || i >= game.plr.length) await newBettingRound(guildId); //everyone already bet, start new betting round
	//if i >= game.plr.length no one can bet - end round
	await updatePlayers(game);
}

//display next player's turn
async function newTurn(guildId: string) {
	const game = Poker_games[guildId];
	const plrId = game.plr[game.currentTurn].id;
	const msge = createSimpleMessage(`It's <@${plrId}>'s turn!`, Colors.Blurple);
	const components = [
		new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setCustomId(`poker_call-${guildId}-${game.currentTurn}`)
				.setStyle(ButtonStyle.Primary)
				.setLabel('Call'),
			new ButtonBuilder()
				.setCustomId(`poker_bet-${guildId}-${game.currentTurn}`)
				.setStyle(ButtonStyle.Success)
				.setLabel('Bet'),
			new ButtonBuilder()
				.setCustomId(`poker_fold-${guildId}-${game.currentTurn}`)
				.setStyle(ButtonStyle.Danger)
				.setLabel('Fold'),
			new ButtonBuilder()
				.setCustomId(`poker_cards-${guildId}-${game.currentTurn}`)
				.setStyle(ButtonStyle.Secondary)
				.setLabel('Show Cards')
		)
	];

	game.msg.reply({ embeds: [msge], components });
}

async function createGame(
	guildId: string,
	channel: SendableChannels,
	host: string,
	maxBet: number,
	minBet: number,
	maxRound = 1
) {
	const msge = new EmbedBuilder()
		.setColor(Colors.DarkGold)
		.setTitle(':black_joker: Poker table')
		.setDescription('Awaiting players...')
		.setFooter({ text: '2 - 10 players, waiting for host to start.\nGame will timeout after 5 minutes.' })
		.setFields(
			{ name: 'Bets', value: `${formatNumber(minBet)} 💵 - ${formatDoler(maxBet, false)}`, inline: true },
			{ name: 'Round', value: `0/${maxRound}`, inline: true },
			{ name: 'Players', value: `<@${host}> ⭐` },
			{ name: 'Pot', value: '💵 0' },
			{ name: '\u200b', value: '\u200b' }
		);

	const components = [
		new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setCustomId(`poker_start-${guildId}`)
				.setStyle(ButtonStyle.Success)
				.setLabel('Start game'),
			new ButtonBuilder().setCustomId(`poker_join-${guildId}`).setStyle(ButtonStyle.Primary).setLabel('Join'),
			new ButtonBuilder()
				.setCustomId(`poker_leave-${guildId}`)
				.setStyle(ButtonStyle.Danger)
				.setLabel('Leave/Cancel game')
		)
	];

	const msg = (await channel.send({ embeds: [msge], components })) as okbot.Message;
	const idleTimer = setTimeout(() => {
		endGame(guildId, 'The game has timed out.');
	}, 300000); //5 minutes
	const game: okbot.PokerGame = {
		plr: [],
		cards: [],
		currentTurn: -1,
		host,
		idleTimer,
		maxBet,
		minBet,
		pot: 0,
		queuePlr: [host],
		msg,
		bigBlind: -1,
		smallBlind: 0,
		betRound: 0,
		maxRound,
		round: 0
	};

	Poker_games[guildId] = game;
	return game;
}

async function startGame(guildId: string) {
	const game = Poker_games[guildId];
	const deck: okbot.Card[] = new Array(52);
	const colors: okbot.CardColor[] = ['♣️', '♠️', '♥️', '♦️'];
	const values: okbot.CardValue[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

	let i = 0;
	for (const v in values) {
		for (const c in colors) {
			const card: okbot.Card = { clr: colors[c], val: values[v], num: Number(v) + 2 };
			deck[i++] = card;
		}
	}

	shuffleArray(deck);
	for (let j = 0; j < 5; j++) game.cards.push(deck.pop() as okbot.Card);
	for (let plrId of game.queuePlr)
		game.plr.push({ id: plrId, bet: 0, playing: 'yes', cards: [deck.pop(), deck.pop()] as okbot.Card[] });

	console.log(game); //

	game.msg.edit({ components: [] });
	await updateCommunityCards(game);
	await newRound(guildId);
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.guild) return;
	const guildId = msg.guild.id;
	return; // NOT IMLPEMENTED
	let action;

	if (!args?.length) {
		if (Poker_games[guildId]) action = 'join';
		else
			return sendSimpleMessage(
				msg,
				'There are no ongoing poker Poker_games in this server.\nCreate one using `poker start <max bet>`',
				Colors.DarkRed
			);
	} else {
		action = (args.shift() as string).toLowerCase();
	}

	if (action == 'start') {
		if (Poker_games[guildId])
			return sendSimpleMessage(msg, 'There is already an ongoing poker game in this server.', Colors.DarkRed);
		if (!args?.length) return sendSimpleMessage(msg, 'Please provide the table maximum bet.', Colors.DarkRed);

		const plr = await db_plr_get({ _id: msg.author.id, mon: 1 });
		const maxBetParsed = parseInt(args[0]);
		const maxBet = Math.max(Math.min(maxBetParsed, MAX_BET), MIN_BET);
		const minBet = Math.floor(maxBet / 10);

		if ((plr?.mon ?? 0) < minBet * 2)
			return sendSimpleMessage(
				msg,
				`You need at least 💵 **${formatNumber(minBet * 2)}** to host a 💵 ${formatNumber(maxBet)} table.`,
				Colors.DarkRed
			);

		createGame(guildId, msg.channel, msg.author.id, maxBet, minBet);
		return;
	}

	if (action == 'join') {
		return;
	}

	if (action == 'top') {
		return;
	}

	if (action == 'help') {
		return;
	}

	return sendSimpleMessage(msg, 'The usage for this command is:\n' + usage, Colors.White);
}
