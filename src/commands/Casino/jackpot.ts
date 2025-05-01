import { Colors, EmbedBuilder } from 'discord.js';
import { db_add_casino_top, db_plr_add, db_plr_get } from '../../db/db.js';
import { SET } from '../../settings.js';
import {
	addCasinoStat,
	calcMoneyLevelsGain,
	createSimpleMessage,
	formatDoler,
	formatNumber,
	objLength,
	parseNumberSuffix,
	sendSimpleMessage,
	showCasinoTopWins
} from '../../utils.js';
import { Jackpot_games } from '../../volatile.js';

export const name = 'jackpot';
export const description = '⚜️ Scam the rich in this family game';
export const usage = '["Start" OR "Join" OR "Top"] [Bet amount (5-20M 💵)]';

// TODO?: maybe switch to high roller table if every person has high roller card and stakes are higher than default max
const MIN_BET = 5;
const MAX_BET = 20000000;

async function endGame(guildId: string) {
	const game = Jackpot_games[guildId];
	clearInterval(Jackpot_games[guildId].time as NodeJS.Timeout);
	Jackpot_games[guildId].time = null;

	const plrLen = objLength(game.plr);
	if (plrLen < 2) {
		sendSimpleMessage(game.msg, 'Not enough players joined the jackpot.', Colors.DarkRed, false);
		db_plr_add({ _id: game.host, mon: game.pool, expense: { jackpot: -game.pool } }); // return bet to host
		delete Jackpot_games[guildId];
		return;
	}

	const rolled = Math.random();
	let cur = 0;
	let winnerId;
	let winnerOdds;

	for (const i in game.plr) {
		let odds = game.plr[i] / game.pool;

		if (rolled >= cur && rolled <= cur + odds) {
			winnerId = i;
			winnerOdds = odds;
		} else {
			addCasinoStat(i, 'jackpot', 'lose', game.plr[i], 0); // add loser stats
		}
		cur += odds;
	}

	sendSimpleMessage(
		game.msg,
		`<@${winnerId}> won the ${formatDoler(game.pool)} pool with a ${((winnerOdds ?? 0) * 100).toFixed(2)}% chance!`,
		Colors.DarkGreen,
		false
	);

	const plrdat = await db_plr_get({ _id: winnerId, monLv: 1, monTot: 1 });
	const bet = game.plr[winnerId as string];
	const winnings = game.pool - bet;
	const monLv = calcMoneyLevelsGain(plrdat?.monLv ?? 0, (plrdat?.monTot ?? 0) + winnings, game.msg);

	db_plr_add({ _id: winnerId, mon: game.pool, monTot: winnings, monLv, income: { jackpot: game.pool } });
	addCasinoStat(winnerId as string, 'jackpot', 'win', bet, winnings); //add winner stats
	const winnerUsr = await game.msg.guild!.members.fetch(winnerId as string);
	db_add_casino_top('jackpot', winnerId as string, winnerUsr.user.tag, bet, game.pool);

	delete Jackpot_games[guildId];
	return winnerId;
}

async function updateParticipants(game: okbot.JackpotGame) {
	const msge = game?.msg?.embeds?.[0];
	if (!msge) return;
	const msgeEdit = EmbedBuilder.from(msge);

	let s = '';
	for (const i in game.plr) s += `<@${i}>: ${formatDoler(game.plr[i], false)}\n`;

	msgeEdit.spliceFields(0, 1, { name: 'Participants', value: s });
	msgeEdit.setTitle(formatNumber(game.pool) + ' 💵');
	await game.msg.edit({ embeds: [msgeEdit] });
}

// game.t can be removed - just use a gameLength timeout
function countdownJackpot(guildId: string) {
	const game = Jackpot_games[guildId];
	const msge = game?.msg?.embeds?.[0];
	if (!msge) return;
	const msgeEdit = EmbedBuilder.from(msge);

	if (game.t > 10500 && game.t < 11500)
		sendSimpleMessage(game.msg, '10 seconds left until the jackpot!', Colors.Orange);

	game.t -= 1000;
	if (game.t < 400) {
		msgeEdit.spliceFields(1, 1, { name: '\u200b', value: '-# This game has ended.' });
		endGame(guildId);
		game.msg.edit({ embeds: [msgeEdit] });
	}
}

async function createGame(msg: okbot.Message, bet: number, mon: number) {
	const game = Jackpot_games[msg.guild!.id];

	if (game)
		return sendSimpleMessage(
			msg,
			`There's already a running game in this server!\nYou can join it using \`${name} <bet amount>\``
		);
	if (mon < bet) return sendSimpleMessage(msg, `You only have ${formatDoler(mon)}!`);
	if (bet < MIN_BET * 2)
		return sendSimpleMessage(msg, `You need at least ${formatDoler(MIN_BET * 2)} to start a game!`);

	const now = Math.floor(new Date().getTime() / 1000);
	const gameLength = SET.JACKPOT_TIME || 30000;
	const msge = new EmbedBuilder()
		.setColor(Colors.DarkAqua)
		.setAuthor({
			name: `Jackpot game started by ${msg.author.displayName}`,
			iconURL: msg.author.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setTitle(formatNumber(bet) + ' 💵')
		.addFields(
			{ name: 'Participants', value: `<@${msg.author.id}>: ${formatDoler(bet, false)}` },
			{
				name: '\u200b',
				value: `-# Ends <t:${now + Math.floor(gameLength / 1000)}:R> ● winner takes all\n-# Use '${name} join <amount>' to add your bet!`
			}
		);

	const time = setInterval(() => countdownJackpot(msg.guild!.id), 1000);
	const messageSent = (await msg.channel.send({ embeds: [msge] })) as okbot.Message;
	await db_plr_add({ _id: msg.author.id, mon: -bet, expense: { jackpot: bet } });

	Jackpot_games[msg.guild!.id] = {
		host: msg.author.id,
		pool: bet,
		plr: { [msg.author.id]: bet },
		time,
		msg: messageSent,
		t: gameLength
	};
}

async function joinGame(msg: okbot.Message, bet: number, mon: number) {
	const game = Jackpot_games[msg.guild!.id];

	if (!game?.time)
		return sendSimpleMessage(
			msg,
			`There's no game running in this server!\nYou can start one using \`${name} start <bet amount>\``
		);

	if (mon < bet) return sendSimpleMessage(msg, `You only have ${formatDoler(mon)}!`);

	if (!game.plr[msg.author.id]) {
		// player not in game
		try {
			game.plr[msg.author.id] = bet;
			const msge = createSimpleMessage(`<@${msg.author.id}> has joined the jackpot game!`, Colors.DarkGreen);
			msg.channel.send({ embeds: [msge] });
			await msg.delete();
		} catch (e) {
			console.error(e);
		}
	} else {
		// player already in game
		try {
			bet = Math.min(MAX_BET - game.plr[msg.author.id], bet); // cap to MAX_BET
			if (bet <= 0) return await sendSimpleMessage(msg, `You can't bet more than ${formatDoler(MAX_BET)}!`);

			game.plr[msg.author.id] += bet;
			const msge = createSimpleMessage(
				`<@${msg.author.id}> has increased their jackpot bet!`,
				Colors.DarkGreen
			);
			msg.channel.send({ embeds: [msge] });
			await msg.delete();
		} catch (e) {
			console.error(e);
		}
	}

	game.pool += bet;
	await updateParticipants(game);
	await db_plr_add({ _id: msg.author.id, mon: -bet, expense: { jackpot: bet } });
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.guild) return;
	if (!args.length)
		return sendSimpleMessage(msg, 'The usage for this command is\n`' + usage + '`', Colors.White);

	const action = args[0].toLowerCase();
	if (action === 'top')
		return msg.reply({
			embeds: [await showCasinoTopWins('jackpot', true)],
			allowedMentions: { repliedUser: false }
		});

	const betRaw = args.pop()!.toLowerCase();
	const plrdat = await db_plr_get({ _id: msg.author.id, mon: 1 });
	const mon = plrdat?.mon ?? 0;

	const bet = betRaw == 'all' ? Math.min(MAX_BET, mon) : parseNumberSuffix(betRaw);
	if (bet == null || isNaN(bet) || bet < MIN_BET || bet > MAX_BET)
		return sendSimpleMessage(
			msg,
			`Your bet must be between **${formatNumber(MIN_BET)}** and **${formatNumber(MAX_BET)}** 💵!`
		);

	if (action == 'start' || action == 'new') {
		createGame(msg, bet, mon);
	} else if (action == 'join' || action == 'bet' || action == 'add') {
		joinGame(msg, bet, mon);
	} else if (!isNaN(parseInt(action)) || action.toLowerCase() == 'all') {
		// auto action if only bet provided
		if (Jackpot_games[msg.guild.id]) joinGame(msg, bet, mon);
		else createGame(msg, bet, mon);
	} else {
		return sendSimpleMessage(msg, 'The usage for this command is\n`' + usage + '`', Colors.White);
	}
}
