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
	const status = loadSettingsFile();
	loadPrefixOverrides();
	loadPrivileges();

	if (!SET.PREFIX)
		console.warn(
			'No command prefix set, this may cause unexpected behavior!\nSet it by adding "PREFIX": "k!" to settings.json.'
		);
	if (!SET.PREFIX_MOD)
		console.warn(
			'No mod command prefix set, this will make it impossible to configure the bot at runtime!\nSet it by adding "PREFIX_MOD": "k@" to settings.json.'
		);

	if (!SET.BOT_OWNER?.length || (SET.BOT_OWNER.length == 1 && !SET.BOT_OWNER[0]))
		console.warn(
			"No bot owners set, this will prevent usage of some restricted commands. Set owners in the .env or settings.json file according to .env.example."
		);
	if (!SET.BOT_ADMIN?.length || (SET.BOT_ADMIN.length == 1 && !SET.BOT_ADMIN[0]))
		console.warn(
			"No bot admins set, this will prevent usage of some restricted commands. Set admins in the .env or settings.json file according to .env.example."
		);

	return status;
}

function setDefaults() {
	SET = {
		PREFIX: "k!",
		PREFIX_MOD: "k@",
		BOT_OWNER: [],
		BOT_ADMIN: []
	};
}

function loadSettingsFile() {
	try {
		SET = JSON.parse(fs.readFileSync("../settings.json", { encoding: "utf-8" }));
		return true;
	} catch (e) {
		console.error("Failed to read settings.json:\n", e);
		setDefaults();
		console.log("Using default settings.");
		return false;
	}
}

function loadPrefixOverrides() {
	if (process.env.PREFIX) SET.PREFIX = process.env.PREFIX;
	if (process.env.PREFIX_MOD) SET.PREFIX_MOD = process.env.PREFIX_MOD;
}

function loadPrivileges() {
	SET.BOT_OWNER = (process.env.BOT_OWNER ?? "").split(",").map(id => id.trim());
	SET.BOT_ADMIN = (process.env.BOT_ADMIN ?? "").split(",").map(id => id.trim());
}
