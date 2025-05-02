import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    Interaction
} from 'discord.js';
import { db_add_casino_top, db_plr_add, db_plr_get } from '../../db/db.js';
import { bot } from '../../okbot.js';
import { SET } from '../../settings.js';
import {
    addCasinoStat,
    calcMoneyLevelsGain,
    formatDoler,
    formatNumber,
    getUserFromMsg,
    numberToEmoji,
    parseNumberSuffix,
    sendEphemeralReply,
    sendSimpleMessage,
    showCasinoTopWins
} from '../../utils.js';
import { Dice_games } from '../../volatile.js';

export const name = 'diceduel';
export const alias = ['dice', 'duel'];
export const description = '🎲 Duel somebody in dice';
export const usage = '[Username OR Mention OR "Top"] [Bet amount (1-10M/50M 💵) OR "All"]';

const BET_RANGES = { def: { min: 1, max: 10000000 }, vip: { min: 1, max: 50000000 } };

bot.on('interactionCreate', interaction => {
	if (!interaction.isButton() || !interaction.guild) return;

	const split = interaction.customId.split('-');
	if (split[0] !== 'dice_accept' && split[0] !== 'dice_cancel') return;
	const id = split[1];
	const game = Dice_games[id];
	if (!game) return sendEphemeralReply(interaction, 'This game has ended.');

	if (split[0] === 'dice_accept') return acceptDice(game, id, interaction);
	return rejectDice(game, id, interaction);
});

async function acceptDice(game: okbot.DiceGame, gameId: string, interaction: ButtonInteraction) {
	if (interaction.user.id !== game.to)
		return sendEphemeralReply(interaction, "This invitation wasn't meant for you, jackass.");

	const plrdat = await db_plr_get({ _id: game.from, mon: 1 });
	if ((plrdat?.mon ?? 0) < game.bet) {
		sendSimpleMessage(
			interaction.message as okbot.Message,
			`<@${game.from}> has only ${formatDoler(plrdat?.mon ?? 0)}.`
		);
		interaction.update({});
		return;
	}
	const plrdatRecipient = await db_plr_get({ _id: game.to, mon: 1 });
	if ((plrdatRecipient?.mon ?? 0) < game.bet) {
		sendSimpleMessage(
			interaction.message as okbot.Message,
			`<@${game.to}> has only ${formatDoler(plrdatRecipient?.mon ?? 0)}.`
		);
		interaction.update({});
		return;
	}

	clearTimeout(game.time);
	await db_plr_add({ _id: game.from, mon: -game.bet, expense: { dice: game.bet } });
	await db_plr_add({ _id: game.to, mon: -game.bet, expense: { dice: game.bet } });
	sendSimpleMessage(game.msg, `<@${game.to}> accepted the duel!`, Colors.DarkGreen);
	game.time = setInterval(() => rollGame(gameId, interaction), SET.DICE_TIME ?? 1500);

	interaction.update({ components: [] });
}

function rejectDice(game: okbot.DiceGame, gameId: string, interaction: ButtonInteraction) {
	if (interaction.user.id === game.from) {
		sendSimpleMessage(game.msg, `<@${game.from}> canceled the duel...`, Colors.DarkOrange);
	} else if (interaction.user.id === game.to) {
		sendSimpleMessage(game.msg, `<@${game.to}> rejected the duel...`);
	} else return sendEphemeralReply(interaction, "This invitation wasn't meant for you, jackass.");

	endGame(gameId, 'This game was canceled.');
	interaction.update({});
}

const rollDice = () => Math.floor(Math.random() * 6) + 1;

async function rollGame(gameId: string, interaction: ButtonInteraction) {
	const game = Dice_games[gameId];
	if (!game) return;

	if (game.diceFrom.length >= 3) return handleGameEnd(game, gameId, interaction);

	const diceFrom = rollDice();
	const diceTo = rollDice();
	game.sumFrom += diceFrom;
	game.diceFrom.push(numberToEmoji(diceFrom));
	game.sumTo += diceTo;
	game.diceTo.push(numberToEmoji(diceTo));
	updateGame(game);
}

function updateGame(game: okbot.DiceGame) {
	const msge = game.msg.embeds[0];
	const msgeEdit = EmbedBuilder.from(msge);
	msgeEdit.spliceFields(0, 3);
	msgeEdit.addFields([
		{
			name: `${game.nameFrom} (${game.sumFrom})`,
			value: `${game.diceFrom.join(' ')}${'🎲'.repeat(3 - game.diceFrom.length)}\u200b`,
			inline: true
		},
		{ name: '\u200b', value: '\u200b', inline: true },
		{
			name: `${game.nameTo} (${game.sumTo})`,
			value: `${game.diceTo.join(' ')}${'🎲'.repeat(3 - game.diceTo.length)}\u200b`,
			inline: true
		}
	]);

	game.msg.edit({ embeds: [msgeEdit] });
}

async function handleGameEnd(game: okbot.DiceGame, gameId: string, interaction: ButtonInteraction) {
	if (game.sumFrom > game.sumTo) {
		// host wins
		const plrdatFrom = await db_plr_get({ _id: game.from, monLv: 1, monTot: 1 });
		const monTot = (plrdatFrom?.monTot ?? 0) + game.bet;
		const monLv = calcMoneyLevelsGain<Interaction>(plrdatFrom?.monLv ?? 0, monTot, interaction);

		await db_plr_add({
			_id: game.from,
			monLv,
			monTot: game.bet,
			mon: 2 * game.bet,
			income: { dice: 2 * game.bet }
		});
		addCasinoStat(game.from, 'dice', 'win', game.bet, game.bet, {
			countDraws: true,
			diceScore: game.sumFrom
		});
		addCasinoStat(game.to, 'dice', 'lose', game.bet, -game.bet, { countDraws: true, diceScore: game.sumTo });
		db_add_casino_top('dice', game.from, game.nameFrom, game.bet, game.bet * 2);

		endGame(gameId, `${game.nameFrom} wins!`);
	} else if (game.sumFrom < game.sumTo) {
		// challenger wins
		const plrdatTo = await db_plr_get({ _id: game.to, monLv: 1, monTot: 1 });
		const monTot = (plrdatTo?.monTot ?? 0) + game.bet;
		const monLv = calcMoneyLevelsGain<Interaction>(plrdatTo?.monLv ?? 0, monTot, interaction);

		await db_plr_add({
			_id: game.to,
			monLv,
			monTot: game.bet,
			mon: 2 * game.bet,
			income: { dice: 2 * game.bet }
		});
		addCasinoStat(game.from, 'dice', 'lose', game.bet, -game.bet, {
			countDraws: true,
			diceScore: game.sumFrom
		});
		addCasinoStat(game.to, 'dice', 'win', game.bet, game.bet, { countDraws: true, diceScore: game.sumTo });
		db_add_casino_top('dice', game.to, game.nameTo, game.bet, game.bet * 2);

		endGame(gameId, `${game.nameTo} wins!`);
	} else {
		// draw
		await db_plr_add({ _id: game.from, mon: game.bet, income: { dice: game.bet } });
		await db_plr_add({ _id: game.to, mon: game.bet, income: { dice: game.bet } });
		addCasinoStat(game.from, 'dice', 'draw', game.bet, 0, { countDraws: true, diceScore: game.sumFrom });
		addCasinoStat(game.to, 'dice', 'draw', game.bet, 0, { countDraws: true, diceScore: game.sumTo });

		endGame(gameId, "It's a draw!");
	}
}

function endGame(id: string, reason = 'This game has ended.') {
	const game = Dice_games[id];
	if (!game) return;

	clearTimeout(game.time);
	const msge = game.msg.embeds[0];
	const msgeEdit = EmbedBuilder.from(msge);
	msgeEdit.setFooter(null).setDescription(reason);
	game.msg.edit({ embeds: [msgeEdit], components: [] });
	delete Dice_games[id];
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (args[0]?.toLowerCase() === 'top')
		return msg.reply({
			embeds: [await showCasinoTopWins('dice', false)],
			allowedMentions: { repliedUser: false }
		});

	const gameAuthor = msg.author;
	if (Dice_games[gameAuthor.id]) return sendSimpleMessage(msg, "You're already hosting a dice duel!");
	if (args.length < 2)
		return sendSimpleMessage(msg, 'The usage for this command is:\n`' + usage + '`', Colors.White);
	const betArg = args.pop();
	const gameRecipient = await getUserFromMsg(msg, args);

	if (!gameRecipient) return sendSimpleMessage(msg, 'User not found.');
	if (gameRecipient.id === gameAuthor.id)
		return sendSimpleMessage(msg, 'By definition, you need two people for a duel to take place...');

	const plrdat = await db_plr_get({ _id: gameAuthor.id, mon: 1, itms: 1 });
	const mon = plrdat?.mon ?? 0;

	const plrdatRecipient = await db_plr_get({ _id: gameRecipient.id, mon: 1, itms: 1 });
	const monRecipient = plrdatRecipient?.mon ?? 0;
	const MIN_BET = BET_RANGES[plrdat?.itms?.BOS0010 && plrdatRecipient?.itms?.BOS0010 ? 'vip' : 'def'].min;
	const MAX_BET = BET_RANGES[plrdat?.itms?.BOS0010 && plrdatRecipient?.itms?.BOS0010 ? 'vip' : 'def'].max;

	let bet = mon;
	if (betArg!.toLowerCase() !== 'all') bet = parseNumberSuffix(betArg as string) ?? 0;
	if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET)
		return sendSimpleMessage(
			msg,
			`Bet amount must be between **${formatNumber(MIN_BET)}** and **${formatNumber(MAX_BET)}** 💵.${
				plrdat?.itms?.BOS0010 != plrdatRecipient?.itms?.BOS0010
					? '\nBoth players must have the High Roller card for it to count.'
					: ''
			}`
		);

	if (mon < bet) return sendSimpleMessage(msg, `You only have ${formatDoler(mon)}.`);
	if (monRecipient < bet)
		return sendSimpleMessage(msg, `<@${gameRecipient.id}> has only ${formatDoler(monRecipient)}.`);

	const msge = new EmbedBuilder()
		.setColor(Colors.White)
		.setAuthor({
			name: gameAuthor.displayName + "'s dice game",
			iconURL: gameAuthor.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setTitle(`Dueling ${gameRecipient.displayName} for ${formatDoler(bet)}`)
		.setFooter({ text: "The game will time out in 3 minutes if the recipient doesn't accept." });
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`dice_accept-${gameAuthor.id}`)
			.setLabel('Accept')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId(`dice_cancel-${gameAuthor.id}`)
			.setLabel('Cancel/Reject')
			.setStyle(ButtonStyle.Danger)
	);
	const msgSent = (await msg.channel.send({ embeds: [msge], components: [row] })) as okbot.Message;

	const game: okbot.DiceGame = {
		from: gameAuthor.id,
		to: gameRecipient.id,
		sumFrom: 0,
		sumTo: 0,
		diceFrom: [],
		diceTo: [],
		nameFrom: gameAuthor.username,
		nameTo: gameRecipient.username,
		bet,
		msg: msgSent,
		time: setTimeout(() => {
			sendSimpleMessage(msgSent, 'This game has timed out.', Colors.DarkOrange);
			endGame(gameAuthor.id, 'This game has timed out.');
		}, 180000)
	};

	Dice_games[gameAuthor.id] = game;
}
