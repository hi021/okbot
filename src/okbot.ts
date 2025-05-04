import Discord, { ActivityType, Message, OmitPartialGroupDMChannel, PermissionsBitField } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import { gameAnswer } from "./commands/Quiz/flags.js";
import { db_init, db_ok_add, db_plr_add } from "./db/db.js";
import { db_guild_init } from "./db/guild.js";
import { SET, SET_INIT } from "./settings.js";
import { rankingSocket } from "./socket.js";
import { getGuildPrefix, isOnCooldown, objLength, randomFromArray } from "./utils.js";
import { Flag_games, Guilds } from "./volatile.js";
let sayBingo: (msg: okbot.Message) => any; // have to await the import so it doesn't try using bot client before initialization
dotenv.config({ path: "../.env" });

const intents = Discord.GatewayIntentBits;
export const bot = new Discord.Client({
	partials: [Discord.Partials.Channel],
	intents: [
		intents.Guilds,
		intents.GuildPresences,
		intents.GuildMessages,
		intents.DirectMessages,
		intents.MessageContent
	]
}) as okbot.Client<boolean>;
bot.commands = new Discord.Collection();
bot.commands_mod = new Discord.Collection();
bot.setMaxListeners(22); // up from 10 to allow more interactionCreate listeners

export async function loadBot() {
	if (SET_INIT()) console.log("Loaded settings.");

	if (!process.env.DB_URL) console.log("No DB_URL provided - initializing without database access.");
	else await db_init(process.env.INIT_STORE == "true");

	if (bot.commands.get("fish")?.fishInit()) console.log("Loaded fish.");
	if (process.env.DB_URL && bot.commands.get("store")?.loadStoreItems()) console.log("Loaded store items.");

	if (SET.STATUS_TEXT) bot.user!.setActivity(SET.STATUS_TEXT, { type: ActivityType.Custom });

	if (process.env.DB_URL && (await db_guild_init(Guilds)))
		console.log(`Loaded guild preferences (${objLength(Guilds)}).`);

	if (process.env.SOCKET_URI) rankingSocket();
	else console.log("No SOCKET_URI provided - initializing without socket.");

	sayBingo = (await import("./commands/Casino/bingo.js")).sayBingo;

	console.log("okbot ready :)");
}

async function importCmds(directory: "commands" | "commands_mod") {
	const directories = fs.readdirSync(`./${directory}`);
	for (const category of directories) {
		const cmdFiles = fs.readdirSync(`./${directory}/${category}`).filter(file => file.endsWith(".js"));
		for (const file of cmdFiles) {
			const cmd = await import(`./${directory}/${category}/${file}`);
			bot[directory].set(cmd.name, { ...cmd, category });
		}
	}
}

function countOk(msg: OmitPartialGroupDMChannel<Message<true>>) {
	// matches only the first ok, will not match unseparated okays e.g. "okok" :(
	const okArr = msg.content.match(/(^|\W+)(o*(okie?dokie?|ok[ae]ys?|oki[es]?|ok[es]?)[yesik]*)(\W+|$)/im);
	const ok = okArr?.[3];
	if (!ok || isOnCooldown("ok", msg.author.id)) return;

	db_ok_add(ok, msg.guild.id);
	db_plr_add({ _id: msg.author.id, okTot: 1 });
}

async function executeCommandOrAction(msg: OmitPartialGroupDMChannel<Message<true>>, prefix: string) {
	let collection: "commands" | "commands_mod", prefixLength;

	if (msg.content.startsWith(prefix)) {
		collection = "commands";
		prefixLength = prefix.length;
	} else if (msg.content.startsWith(SET.PREFIX_MOD)) {
		collection = "commands_mod";
		prefixLength = SET.PREFIX_MOD.length;
	} else {
		const guild = Guilds[msg.guild.id];
		const guildGlobal = Guilds["_GLOBAL"];
		const reaction = guild?.cr?.[msg.content]
			? randomFromArray(guild!.cr![msg.content])
			: guildGlobal?.cr?.[msg.content]
				? randomFromArray(guildGlobal!.cr![msg.content])
				: undefined;
		if (reaction) msg.channel.send(reaction);

		if (Flag_games[msg.channel.id]) gameAnswer(msg.channel.id, msg.content.toLowerCase(), msg.author.id);
		return;
	}

	const args = msg.content.slice(prefixLength).split(/ +/); // will always be at least [""]
	const cmdName = args.shift()!.toLowerCase();
	if (process.env.VERBOSE) console.log(`[${msg.author.username}] "${cmdName}"`, args);

	const cmd = bot[collection].get(cmdName) ?? bot[collection].find(cmd => cmd.alias?.includes(cmdName));
	if (!cmd) return;

	if (cmd.restrict && cmd.restrict !== "EVERYONE") {
		if (cmd.restrict === "GUILD_ADMIN") {
			if (
				!(await msg.guild.members.fetch(msg.author.id)).permissions.has(PermissionsBitField.Flags.ManageGuild)
			) {
				msg.reply("You do not have the required permissions to use this command (GUILD_ADMIN).");
				return;
			}
		} else {
			const permArray = SET[cmd.restrict as "BOT_OWNER" | "BOT_ADMIN"];
			if (!permArray?.includes(msg.author.id)) {
				msg.reply(`You do not have the required permissions to use this command (${cmd.restrict}).`);
				return;
			}
		}
	}

	cmd.execute(msg, args);
}

bot.login(process.env.TOKEN);
importCmds("commands");
importCmds("commands_mod");

bot.on("ready", async () => {
	if (!bot.user) {
		console.error("Invalid bot user.");
		return;
	}

	console.log("Logged in as " + bot.user.tag);
	await loadBot();

	bot.on("messageCreate", async msg => {
		if (msg.author.id === bot.user!.id) return;
		// DM channel
		if (!msg.inGuild()) return msg.channel.send("What are you doing in here, silly?");
		// ignore blacklisted channels
		if (!msg.content.startsWith(SET.PREFIX_MOD) && Guilds[msg.guild.id]?.blacklist?.includes(msg.channel.id))
			return;

		const prefix = getGuildPrefix(msg.guild.id);

		if (msg.content === `<@${bot.user!.id}>`)
			return msg.reply(
				`Hi! My prefix here is \`${prefix}\`.\nYou can use \`${prefix}help\` to view my commands.`
			);

		countOk(msg);

		try {
			executeCommandOrAction(msg, prefix);
		} catch (e) {
			console.error(e);
			msg.reply("> **Fuckie Wuckie!**\nI have caught on fire...");
		}
	});
});
