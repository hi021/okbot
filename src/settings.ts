import fs from "fs";
type T_SET = {
	PREFIX: string;
	PREFIX_MOD: string;
	BOT_OWNER: string[];
	BOT_ADMIN: string[];
	STATUS_TEXT?: string;
	BOT_VER?: string;
	REPOSITORY_URL?: string;
	INVITE_URL?: string;
	DAILY_AMOUNT?: number;
	DAILY_STREAK_AMOUNT?: number;
	DAILY_STREAK_LEN?: number;
	DAILY_STREAK_TIME?: number;
	DAILY_STREAK_LV_MULTI?: number;
	DAILY_STREAK_AM_MULTI?: number;
	BANK_INTEREST_INTERVAL?: number;
	STIMULUS_AMOUNT?: number;
	STIMULUS_MINLV?: number;
	STIMULUS_MON?: number;
	DAILY_COOLDOWN?: number;
	STIMULUS_COOLDOWN?: number;
	RAPE_COOLDOWN?: number;
	BOOSTER_COOLDOWN?: number;
	MINE_COOLDOWN?: number;
	DEF_COLLECTOR_TIMEOUT?: number;
	LEN_MAX_TITLE?: number;
	FISH_COST?: number;
	FISH_COST_POND?: number;
	COLLECTION_FORGE_COST?: number;
	JACKPOT_TIME?: number;
	BINGO_TIME?: number;
	DICE_TIME?: number;
	FLAG_TIME?: number;
	CASINO_TOP_COUNT?: number;
	MIN_CASINO_TOP_BET?: number;
} & {
	[cooldown in okbot.CooldownActivitySettingName]?: number;
};

export let SET: T_SET;
export function SET_INIT() {
	try {
		SET = JSON.parse(fs.readFileSync("../settings.json", { encoding: "utf-8" }));
		SET.BOT_OWNER = (process.env.BOT_OWNER ?? "").split(",").map(id => id.trim());
		SET.BOT_ADMIN = (process.env.BOT_ADMIN ?? "").split(",").map(id => id.trim());
		if (process.env.PREFIX) SET.PREFIX = process.env.PREFIX;
		if (process.env.PREFIX_MOD) SET.PREFIX_MOD = process.env.PREFIX_MOD;

		if(!SET.PREFIX)
			console.warn("No command prefix set, this may cause unexpected behavior!\nSet it by adding \"PREFIX\": \"k!\" to settings.json.")
if(!SET.PREFIX_MOD)
			console.warn("No mod command prefix set, this will make it impossible to configure the bot at runtime!\nSet it by adding \"PREFIX_MOD\": \"k@\" to settings.json.")

if(SET.BOT_OWNER.length == 1 && !SET.BOT_OWNER[0])
			console.warn("No bot owner set, this will prevent usage of restricted commands. Set owners in the .env file according to .env.example.")
if(SET.BOT_ADMIN.length == 1 && !SET.BOT_ADMIN[0])
			console.warn("No bot admin set, this will prevent usage of restricted commands. Set admins in the .env file according to .env.example.")

		return SET;
	} catch (e) {
		console.error("Failed to read settings.json:", e);
		return null;
	}
}
