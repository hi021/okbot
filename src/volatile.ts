import { Snowflake } from 'discord.js';

export const Cooldowns: { [activity in okbot.CooldownActivity]: { [id: Snowflake]: number } } = {
	fish: {},
	ok: {},
	slot: {}
};

export const Players_in_collector: { [id: Snowflake]: boolean } = {};

export const Guilds: { [guildId: string]: Omit<okbot.Guild, '_id'> } = {};

export const Casino_tops: { [game in okbot.CasinoGame]?: okbot.CasinoTopStat[] } = {};

export const Flag_games: { [channelId: string]: okbot.FlagGame } = {};
export const Bingo_games: { [guildId: string]: okbot.BingoGame } = {};
export const Blackjack_games: { [id: string]: okbot.BlackjackGame } = {};
export const Dice_games: { [userid: string]: okbot.DiceGame } = {};
export const Jackpot_games: { [guildId: string]: okbot.JackpotGame } = {};
export const Poker_games: { [guildId: string]: okbot.PokerGame } = {};
