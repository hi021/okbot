import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	MessageFlags
} from 'discord.js';
import { db_add_casino_top, db_plr_add, db_plr_get } from '../../db/db.js';
import { bot } from '../../okbot.js';
import { SET } from '../../settings.js';
import {
	addCasinoStat,
	calcMoneyLevelsGain,
	createSimpleMessage,
	formatDoler,
	formatMilliseconds,
	objLength,
	parseNumberSuffix,
	randomFromArray,
	sendEphemeralReply,
	sendSimpleMessage,
	showCasinoTopWins
} from '../../utils.js';
import { Bingo_games } from '../../volatile.js';

export const name = 'bingo';
export const description = '🔢 Play bingo';
export const usage =
	'<"Start" OR "Cancel" OR "Top" (blank to join existing game)> <Bet amount (0-2M 💵)> <16 space-separated numbers 0-99>';
export const usageDetail =
	"The board is 4x4 so actually it's just bing\nLeave out the numbers to get a randomly generated board\nGet back your bet multiplied by number of players if you win";

const MIN_BET = 0;
const MAX_BET = 2000000;
const allNumbers = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
	29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
	56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82,
	83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99
];

bot.on('interactionCreate', interaction => {
	if (!interaction.isButton() || !interaction.inGuild() || interaction.customId !== 'show_board') return;

	const game = Bingo_games[interaction.guildId];
	if (!game?.plr?.[interaction.user.id])
		return sendEphemeralReply(interaction, "You aren't a part of this game!");

	return sendEphemeralReply(interaction, visualizeBoard(game.plr[interaction.user.id].board), Colors.Blue);
});

function generateRandomBoard() {
	const numberSet = new Set(allNumbers);
	const board = new Array(16);

	for (let i = 0; i < 16; i++) {
		const numberArray = [...numberSet];
		const number = randomFromArray(numberArray);

		board[i] = number;
		numberSet.delete(number);
	}
	return board;
}

function parseNumbers(num: string[]) {
	if (!num?.length) return { board: generateRandomBoard(), e: null };
	if (num.length != 16)
		return { board: null, e: `Please input exactly **16** numbers instead of **${num.length}**.` };

	const set = new Set<number>();
	for (let i = 0; i < 16; i++) {
		const previousSize = set.size;
		let n = Number(num[i]);
		if (isNaN(n) || n < 0 || n > 99)
			return { board: null, e: 'All numbers must be between **0** and **99**.' };

		n = Math.floor(n);
		set.add(n);
		if (set.size == previousSize)
			return { board: null, e: `All numbers must be unique, **${n}** was given more than once.` };
	}

	return { board: [...set], e: null };
}

function checkBoardWin(board: number[]) {
	for (let i = 0; i < 4; i++) {
		let win = true;
		for (let j = 0; j < 4; j++) {
			if (board[i * 4 + j] < 100) {
				win = false;
				break;
			}
		}
		if (win) return `Row ${i + 1}`;
	}

	for (let i = 0; i < 4; i++) {
		let win = true;
		for (let j = 0; j < 4; j++) {
			if (board[i + j * 4] < 100) {
				win = false;
				break;
			}
		}
		if (win) return `Column ${i + 1}`;
	}

	let win = true;
	for (let i = 0; i < 4; i++) {
		if (board[i * 5] < 100) {
			win = false;
			break;
		}
	}
	if (win) return 'Diagonal-LR';

	for (let i = 0; i < 4; i++) {
		if (board[i * 3 + 3] < 100) {
			win = false;
			break;
		}
	}
	if (win) return 'Diagonal-RL';

	return null;
}

function rollNumber(guildId: string) {
	const game = Bingo_games[guildId];
	if (!game) return;

	if (!game.num.size) {
		const msge = new EmbedBuilder()
			.setColor(Colors.Orange)
			.setDescription(`No one got bingo after 100 rounds...`);
		game.msg.channel.send({ embeds: [msge] });

		removeTimeouts(Bingo_games[guildId]);
		updateParticipants(game, 'This game has ended.');
		delete Bingo_games[guildId];
		return;
	}

	const rolled = randomFromArray([...game.num]);
	game.num.delete(rolled);
	const round = 100 - game.num.size;

	const playersHit = []; //unused

	for (const i in game.plr) {
		//check hits
		for (const j in game.plr[i].board) {
			if (game.plr[i].board[j] == rolled) {
				game.plr[i].board[j] += 100;
				playersHit.push(i);
				//check wins (can only win on 4th or later)
				if (round >= 4 && !game.plrWin.includes(i)) {
					const win = checkBoardWin(game.plr[i].board);
					if (win) game.plrWin.push(i);
				}
				break;
			}
		}
	}

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('show_board').setLabel('Show board').setStyle(ButtonStyle.Secondary)
	);
	const msge = new EmbedBuilder()
		.setAuthor({ name: `Bingo game ● round ${round}` })
		.setColor(Colors.Yellow)
		.setDescription(`The number is **${rolled}**!`)
		.setFooter({ text: 'Say bingo! if you crossed out all numbers in a row, column, or diagonally' });
	game.msg.channel.send({ embeds: [msge], components: [row] });

	return playersHit;
}

function visualizeBoard(board: number[]) {
	let s = '```c\n';
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			const n = board[i * 4 + j];
			const formatted = n >= 100 ? 'xx' : n.toString().padStart(2, '0');
			s += j ? `\t${formatted}` : formatted;
		}
		s += '\n';
	}

	return s + '```';
}

function updateParticipants(game: okbot.BingoGame, footer?: string) {
	const msge = game?.msg?.embeds?.[0];
	if (!msge) return;

	const msgeEdit = EmbedBuilder.from(msge);
	if (footer) {
		msgeEdit.setFooter({ text: footer });
	} else {
		msgeEdit.spliceFields(0, 1);
		let s = '';
		for (const i in game.plr) s += `<@${i}>: ${formatDoler(game.plr[i].bet, false)}\n`;

		msgeEdit.addFields({ name: 'Participants', value: s });
	}

	game.msg.edit({ embeds: [msgeEdit] });
}

//ends game
export async function sayBingo(msg: okbot.Message) {
	if (!msg.inGuild()) return;
	const game = Bingo_games[msg.guildId];
	if (!game?.plr?.[msg.author.id]) return;
	if (!game.plrWin.includes(msg.author.id)) return msg.react('🔫');

	let missedChance = '';
	for (let i = 0; i < game.plrWin.length; i++)
		if (game.plrWin[i] != msg.author.id) missedChance += `<@${game.plrWin[i]}> `;

	const bet = game.plr[msg.author.id].bet;
	const winnings = bet ? bet * objLength(game.plr) : 0;

	const msge = new EmbedBuilder()
		.setColor(Colors.Orange)
		.setAuthor({
			name: `${msg.author.displayName} got bingo!`,
			iconURL: msg.author.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setDescription(
			(missedChance ? missedChance + 'missed their chance...\n' : '') +
				visualizeBoard(game.plr[msg.author.id].board)
		);

	const winningsMonTot = winnings - bet;
	if (winnings) {
		msge.setTitle(`+${(formatDoler(winnings), false)}`);
		const plrdat = await db_plr_get({ _id: msg.author.id, monLv: 1, monTot: 1 });
		const monLv = calcMoneyLevelsGain(plrdat?.monLv ?? 0, (plrdat?.monTot ?? 0) + winningsMonTot, msg);

		db_plr_add({
			_id: msg.author.id,
			mon: winnings,
			monTot: winningsMonTot,
			monLv,
			income: { bingo: winnings }
		});

		db_add_casino_top('bingo', msg.author.id, msg.author.tag, bet, winnings);
	}

	addCasinoStat(msg.author.id, 'bingo', 'win', bet, winningsMonTot);
	for (const i in game.plr) {
		if (i === msg.author.id) continue;
		addCasinoStat(i, 'bingo', 'lose', game.plr[i].bet, 0);
	}

	game.msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });

	removeTimeouts(Bingo_games[msg.guild.id]);
	updateParticipants(game, 'This game has ended.');
	delete Bingo_games[msg.guild.id];
}

function cancelGame(msg: okbot.Message, reason?: string) {
	const game = Bingo_games[msg.guild!.id];
	if (!game) return;

	// return money
	for (const i in game.plr) {
		const returnBet = game.plr[i].bet;
		if (returnBet) db_plr_add({ _id: i, mon: returnBet, expense: { bingo: -returnBet } });
	}

	removeTimeouts(game);
	updateParticipants(game, 'This game has been canceled.');
	delete Bingo_games[msg.guild!.id];
	return reason
		? sendSimpleMessage<okbot.Message>(msg, 'The game has been canceled:\n' + reason)
		: sendSimpleMessage<okbot.Message>(msg, 'Canceled the game.', Colors.DarkGreen);
}

const removeTimeouts = (game: okbot.BingoGame) => {
	if (game.int) {
		clearInterval(game.int);
		game.int = null;
	}
	if (game.time) clearTimeout(game.time);
};

async function addGame(msg: okbot.Message, boardNumbers: string[], bet: number) {
	const boardRaw = parseNumbers(boardNumbers);
	if (!boardRaw.board) return sendSimpleMessage<okbot.Message>(msg, boardRaw.e);
	await db_plr_add({ _id: msg.author.id, mon: -bet, expense: { bingo: bet } });

	const msge = new EmbedBuilder()
		.setColor(Colors.Yellow)
		.setAuthor({
			name: `Bingo game started by ${msg.author.displayName}`,
			iconURL: msg.author.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.addFields({ name: 'Participants', value: `<@${msg.author.id}>: ${formatDoler(bet, false)}` })
		.setFooter({
			text: `Use ${SET.PREFIX + name} <Bet amount> <16 numbers 0-99> to join\nUse ${SET.PREFIX + name} start to start the game`
		});

	const messageSent = (await msg.channel.send({ embeds: [msge] })) as okbot.Message;
	Bingo_games[msg.guild!.id] = {
		host: msg.author.id,
		plr: { [msg.author.id]: { bet, board: boardRaw.board } },
		plrWin: [],
		msg: messageSent,
		num: new Set(allNumbers),
		int: null,
		time: setTimeout(() => cancelGame(msg, "The game didn't start within 3 minutes"), 180000) // cancel after 3 min if not started
	};
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.inGuild()) return;
	if (!args.length)
		return sendSimpleMessage<okbot.Message>(
			msg,
			'The usage for this command is\n`' + usage + '`',
			Colors.White
		);

	const game = Bingo_games[msg.guildId];

	let action = '';
	if (isNaN(parseInt(args[0]))) action = args.shift()?.toLowerCase() ?? '';

	let bet = 0;
	if (args.length === 1 || args.length > 16) {
		bet = parseNumberSuffix(args.shift() as string) ?? 0;
		if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) bet = MIN_BET;
	}
	if (bet) {
		const plrdat = await db_plr_get({ _id: msg.author.id, mon: 1 });
		if (!plrdat?.mon || plrdat.mon < bet)
			return sendSimpleMessage<okbot.Message>(msg, `You only have ${formatDoler(plrdat?.mon ?? 0)}.`);
	}

	//
	if (action === 'start') {
		if (!game) return await addGame(msg, args, bet); // create lobby
		if (game.host != msg.author.id)
			return sendSimpleMessage<okbot.Message>(msg, `Only the host (<@${game.host}>) can manage the game.`);
		if (game.int) return sendSimpleMessage<okbot.Message>(msg, `There is an ongoing game already!`);

		//start lobby
		if (game.time) clearTimeout(game.time);
		game.int = setInterval(() => {
			rollNumber(msg.guild!.id);
		}, SET.BINGO_TIME || 6000);

		return sendSimpleMessage<okbot.Message>(
			msg,
			`The game will now start, good luck!\n\nA number will be rolled every **${formatMilliseconds(
				SET.BINGO_TIME || 6000
			)}** and get automatically crossed out if it's on your board.
      Press the 'Show board' button to view your board and say "**bingo!**" if all numbers in any row, column, or on the diagonal are crossed out.`,
			Colors.DarkGreen,
			false
		);
	} else if (action == 'cancel' || action == 'abort' || action == 'stop' || action == 'leave') {
		if (!game)
			return sendSimpleMessage<okbot.Message>(
				msg,
				`There is no game currently being played in this server.\nUse \`${SET.PREFIX + name} start\` to start one.`
			);

		if (game.host != msg.author.id) {
			// 	if not host, leave game
			if (game.plr[msg.author.id]) {
				// return bet
				const returnBet = game.plr[msg.author.id].bet;
				if (returnBet) db_plr_add({ _id: msg.author.id, mon: returnBet, expense: { bingo: -returnBet } });

				delete game.plr[msg.author.id];
				updateParticipants(game);
				try {
					const msge = createSimpleMessage(`<@${msg.author.id}> has left the bingo game.`, Colors.DarkOrange);
					msg.channel.send({ embeds: [msge] });
					await msg.delete();
				} catch (e) {
					console.error(e);
				}
			}
			return;
		} else {
			// if host, cancel game
			return cancelGame(msg);
		}
	} else if (action === 'top') {
		return msg.reply({
			embeds: [await showCasinoTopWins('bingo', true)],
			allowedMentions: { repliedUser: false }
		});
	}

	// no action
	if (!game) return await addGame(msg, args, bet);
	if (game.int)
		return sendSimpleMessage<okbot.Message>(msg, 'There is an ongoing game in this server already.');
	// TODO?: update player instead
	if (game.plr?.[msg.author.id])
		return sendSimpleMessage<okbot.Message>(msg, "You're already participating in a game in this server.");

	// join game
	const boardRaw = parseNumbers(args);
	if (!boardRaw.board) return sendSimpleMessage<okbot.Message>(msg, boardRaw.e);
	await db_plr_add({ _id: msg.author.id, mon: -bet, expense: { bingo: bet } });
	game.plr[msg.author.id] = { bet, board: boardRaw.board };

	updateParticipants(game);
	try {
		const msge = createSimpleMessage(`<@${msg.author.id}> has joined the bingo game.`, Colors.DarkGreen);
		msg.channel.send({ embeds: [msge] });
		await msg.delete();
	} catch (e) {
		console.error(e);
	}
}
