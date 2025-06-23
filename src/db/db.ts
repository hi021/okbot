import { Snowflake } from "discord.js";
import dotenv from "dotenv";
import { Collection, Db, MongoClient } from "mongodb";
import { bot } from "../okbot.js";
import { SET } from "../settings.js";
import { Casino_tops } from "../volatile.js";
import { db_store_init } from "./store.js";
import { formatNumber } from "../utils.js";
dotenv.config();

let _db: MongoClient;

export async function db_init(initStore = true) {
	if (_db) {
		console.warn("Trying to init a previously initialized DB!");
		return _db;
	}

	try {
		if (!process.env.DB_URL) throw new Error("No DB URI provided.");

		const db = await MongoClient.connect(process.env.DB_URL);
		_db = db;
		if (initStore) await db_store_init();
		console.log("DB initialized.");

		return db;
	} catch (e) {
		console.error("Failed to initialize database:\n", e);
		return null;
	}
}

export function db_get_client() {
	if (!_db) throw new Error("Attempting to get an uninitalized database!");
	return _db;
}

type DbOrCollection<T> = T extends string ? Collection : Db;
export function db_get<T>(collection?: T): DbOrCollection<T> {
	const db =
		typeof collection == "string"
			? (_db?.db(process.env.DB_NAME)?.collection(collection) as DbOrCollection<T>)
			: (_db?.db(process.env.DB_NAME) as DbOrCollection<T>);
	if (!db) throw new Error("Attempting to get an uninitalized database or nonexistent collection!");

	return db;
}

//// OK
export function db_ok_add(ok: string, guildId = "0") {
	const $inc = { all: 1, [ok]: 1 };

	db_get("ok").bulkWrite([
		{
			updateOne: { filter: { _id: guildId as any }, update: { $inc }, upsert: true }
		},
		{
			updateOne: { filter: { _id: "_GLOBAL" as any }, update: { $inc }, upsert: true }
		}
	]);
}

export async function db_ok_get(guildId = "_GLOBAL", sort = true) {
	try {
		const okObj = await db_get("ok").findOne({ _id: guildId as any });
		if (!okObj?.all) return null;

		const total = okObj.all as number;
		// @ts-ignore
		delete okObj._id;
		delete okObj.all;

		const okArr: Array<{ type: string; count: number }> = [];
		for (const oktype in okObj) okArr.push({ type: oktype, count: okObj[oktype] });

		if (sort) okArr.sort((a, b) => (a.count < b.count ? 1 : -1));
		return { total, detail: okArr };
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_ok_prune(server = "_GLOBAL") {
	await db_get("ok").deleteOne({ _id: server as any });
}

////PLAYER
export async function db_plr_set(plr: okbot.User) {
	const _id = plr._id;
	if (!_id) return null;
	delete plr._id;

	try {
		return await db_get("plr").updateOne({ _id: _id as any }, { $set: plr }, { upsert: true });
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_plr_add(plr: okbot.User) {
	const _id = plr._id;
	if (!_id) return;
	delete plr._id;
	const plrf = JSON.parse(JSON.stringify(plr));

	// TODO: make a function for these
	if (plr.day) {
		for (const [k, v] of Object.entries(plr.day)) plrf[`day.${k}`] = v;
		delete plrf.day;
	}
	if (plr.rep) {
		for (const [k, v] of Object.entries(plr.rep)) plrf[`rep.${k}`] = v;
		delete plrf.rep;
	}
	if (plr.itms) {
		for (const [k, v] of Object.entries(plr.itms)) plrf[`itms.${k}`] = v;
		delete plrf.itms;
	}
	if (plr.fish) {
		for (const [k, v] of Object.entries(plr.fish)) plrf[`fish.${k}`] = v;
		delete plrf.fish;
	}
	if (plr.fishTot) {
		for (const [k, v] of Object.entries(plr.fishTot)) plrf[`fishTot.${k}`] = v;
		delete plrf.fishTot;
	}
	if (plr.fishCol) {
		for (const [k, v] of Object.entries(plr.fishCol)) {
			let field = `fishCol.${k}`;
			for (const [k2, v2] of Object.entries(plr.fishCol[k])) {
				plrf[`${field}.${k2}`] = v2;
			}
		}
		delete plrf.fishCol;
	}
	if (plr.income) {
		for (const [k, v] of Object.entries(plr.income)) plrf[`income.${k}`] = v;
		delete plrf.income;
	}
	if (plr.expense) {
		for (const [k, v] of Object.entries(plr.expense)) plrf[`expense.${k}`] = v;
		delete plrf.expense;
	}
	if (plr.casinoStat) {
		for (const [k, v] of Object.entries(plr.casinoStat)) plrf[`casinoStat.${k}`] = v;
		delete plrf.casinoStat;
	}

	await db_get("plr").updateOne({ _id: _id as any }, { $inc: plrf }, { upsert: true });
}

export async function db_plr_get(plr: okbot.User | any) {
	try {
		return (await db_get("plr").findOne({ _id: plr._id }, { projection: plr })) as unknown as okbot.User;
	} catch (err) {
		console.error(err);
		return null;
	}
}

/**
 * @returns records from `min` to `max+1` to know whether there are further pages, splice the array removing the last element later
 * @TODO add user lookup
 */
export async function db_ranking_get(
	field: okbot.RankingField,
	min = 0,
	max = 0,
	setUsername = true,
	usrId?: string
) {
	try {
		let ranking: Array<okbot.RankingUser>;
		const cursor = db_get("plr")
			.find({ [field]: { $exists: true } }, { projection: { _id: 1, [field]: 1 } })
			.sort({ [field]: -1, _id: 1 });

		if (!usrId) {
			ranking = (await cursor
				.skip(min)
				.limit(max + 1)
				.toArray()) as unknown as Array<okbot.RankingUser>;
		} else {
			// TODO
			ranking = (await cursor.toArray()) as unknown as Array<okbot.RankingUser>;
		}

		// TODO: move to a function
		if (setUsername) {
			const promises = [];
			for (const i in ranking) {
				promises.push(
					new Promise(async (resolve, reject) => {
						try {
							const u = await bot.users.fetch(ranking[i]._id as Snowflake);
							if (!u) {
								reject(null);
								return;
							}

							ranking[i].nam = u.tag;
							resolve(u.tag);
						} catch (e) {
							reject(e);
						}
					})
				);
			}

			await Promise.allSettled(promises);
		}

		return ranking;
	} catch (e) {
		console.error(`Failed to get ${field} ranking:\n`, e);
		return null;
	}
}

export async function db_ranking_get_guild_ok(min = 0, max = 0, setName = true) {
	try {
		const ranking = (await db_get("ok")
			.find({ _id: { $ne: "_GLOBAL" as any } }, { projection: { _id: 1, all: 1 } })
			.sort({ all: -1, _id: 1 })
			.skip(min)
			.limit(max)
			.toArray()) as unknown as Array<okbot.RankingGuild>;

		// TODO: move to a function
		if (setName) {
			const promises = [];
			for (const i in ranking) {
				promises.push(
					new Promise(async (resolve, reject) => {
						try {
							const u = await bot.guilds.fetch(ranking[i]._id as string);
							if (!u) {
								reject(null);
								return;
							}
							ranking[i].nam = `${u.name}`;
							resolve(u.name);
						} catch (e) {
							reject(e);
						}
					})
				);
			}

			await Promise.allSettled(promises);
		}

		return ranking;
	} catch (e) {
		console.error(`Failed to get ok guild ranking:\n`, e);
		return null;
	}
}

////FISH
export async function db_fish_add(
	usrId: string,
	nam: string,
	cost: number,
	collectionPart?: 1 | 2 | 3 | 4 | 5,
	numFish = 1
) {
	const toAdd: okbot.User = {
		_id: usrId,
		mon: -cost,
		fishTot: { [nam]: numFish },
		fishTotC: numFish,
		expense: { fish: cost }
	};

	if (collectionPart) {
		console.log(`COLLECTION CAUGHT BY ${usrId} - ${nam} ${collectionPart}`);
		db_plr_add({
			...toAdd,
			fishCol: { [nam]: { [collectionPart]: numFish } }
		});
	} else {
		db_plr_add({ ...toAdd, fish: { [nam]: numFish } });
	}

	// global fish stats
	db_get("fish").updateOne({ _id: nam as any }, { $inc: { v: numFish } }, { upsert: true });
}

export async function db_fish_get(nam?: string) {
	try {
		return nam
			? ((await db_get("fish").findOne({ _id: nam as any })) as unknown as okbot.FishGlobal)
			: ((await db_get("fish").find().toArray()) as unknown as okbot.FishGlobal[]);
	} catch (err) {
		console.error(err);
		return null;
	}
}

//// CASINO
/**
 * Populates in-memory `Casino_tops` by copying stats from the db
 */
export async function db_get_casino_top(game: okbot.CasinoGame) {
	const top = (await db_get("rankings").findOne({ _id: game as any })) || { v: [] };
	Casino_tops[game] = [];
	for (const i in top.v) Casino_tops[game]![Number(i)] = top.v[i];
}

/**
 *  @param winnings total win (net + bet)
 */
export async function db_add_casino_top(
	game: okbot.CasinoGame,
	plrId: string,
	username: string,
	bet: number,
	winnings: number
) {
	const minWinnings = SET.MIN_CASINO_TOP_BET ?? 500;
	const maxTops = SET.CASINO_TOP_COUNT ?? 15;
	if (winnings < minWinnings || winnings <= bet) return;

	let lb = Casino_tops[game] as okbot.CasinoTopStat[];
	try {
		//fetch leaderboard if uninitialized
		if (!lb?.length) {
			await db_get_casino_top(game);
			lb = Casino_tops[game] as okbot.CasinoTopStat[];
		}

		//up to maxTops largest wins
		for (let i = 0; i < maxTops; i++) {
			if (!lb?.[i] || winnings > lb[i].won) {
				//move smaller values down
				for (let j = lb.length - 1; j >= i; j--) lb[j + 1] = lb[j];

				lb[i] = {
					_id: plrId,
					usernameDiscrim: username,
					bet,
					won: winnings,
					date: Math.floor(new Date().getTime() / 1000)
				};
				if (lb.length > maxTops) lb.pop();
				break;
			}
		}

		Casino_tops[game] = lb;
		await db_get("rankings").updateOne({ _id: game as any }, { $set: { v: lb } }, { upsert: true });
	} catch (err) {
		console.error(err);
		return null;
	}
}

//
export async function db_bakery_get_stats() {
	try {
		const plrdat = await db_get("plr")
			.find({ bakery: { $exists: 1 } }, { projection: { bakery: 1 } })
			.toArray();
		if (!plrdat) return null;

		const stats: { [cookieId: string]: number } = {};
		for (const i in plrdat) {
			const curStat = plrdat[i].bakery.stat;
			for (const j in curStat) stats[j] = stats[j] ? stats[j] + curStat[j] : curStat[j];
		}

		return stats;
	} catch (e) {
		console.error("Failed to get bakery stats:\n", e);
		return null;
	}
}

//// for queries in k@query
export async function db_find(
	coll: string,
	filter: Record<string, any>,
	projection?: Record<string, any>,
	other?: Record<string, any>,
	db = process.env.DB_NAME
) {
	return await _db
		.db(db)
		.collection(coll)
		.find(filter, { projection, ...other })
		.toArray();
}

export async function db_count(coll: string, filter: Record<string, any>, db = process.env.DB_NAME) {
	return await _db.db(db).collection(coll).countDocuments(filter);
}

export async function db_update(
	coll: string,
	filter: Record<string, any>,
	update?: Record<string, any>,
	other?: Record<string, any>,
	db = process.env.DB_NAME
) {
	return await _db
		.db(db)
		.collection(coll)
		.updateMany(filter, { ...update }, { ...other });
}

/**
 * Converts pond fish and stats from `{[fishName]: {emoji, am}}` to `{[fishName]: am}`
 */
export async function db_fix_pond() {
	const allPlr = await db_get("plr")
		.find({ pond: { $exists: true } })
		.toArray();

	for (const i in allPlr) {
		const fish: any = {};
		for (const j in allPlr[i].pond.fish) {
			if (allPlr[i].pond.fish[j]?.am) {
				fish[j] = allPlr[i].pond.fish[j]?.am;
			} else if (allPlr[i].pond.fish[j]) {
				fish[j] = allPlr[i].pond.fish[j];
			}
		}

		const stats: any = {};
		for (const j in allPlr[i].pond.stats) {
			if (allPlr[i].pond.stats[j]?.am) {
				stats[j] = allPlr[i].pond.stats[j]?.am;
			} else if (allPlr[i].pond.stats[j]) {
				stats[j] = allPlr[i].pond.stats[j];
			}
		}

		await db_get("plr").updateOne(
			{ _id: allPlr[i]._id },
			{ $set: { "pond.fish": fish, "pond.stats": stats } }
		);
	}
}

/**
 * Sets correct pond parameters for its level (used after nerfing existing pond levels)
 */
export async function db_fix_pond_levels(
	pondLevels: Array<{
		budgetMax: number;
		fishMax: number;
		interval: number;
		cost?: number;
	}>
) {
	const allPlayers = await db_get("plr")
		.find({ pond: { $exists: true } })
		.toArray();

	for (const plr of allPlayers) {
		const level = pondLevels[plr.pond.lv - 1];
		if (!level) {
			console.error("No level for " + plr._id);
			continue;
		}

		let overBudget = false;
		if (plr.pond.budget > level.budgetMax) {
			overBudget = true;
			console.log(
				`${plr._id} is ${plr.pond.budget - level.budgetMax} over budget (${plr.pond.budgetMax} -> ${
					level.budgetMax
				}), setting to level.budgetMax`
			);
		}

		await db_get("plr").updateOne(
			{ _id: plr._id },
			{
				$set: {
					"pond.budgetMax": level.budgetMax,
					"pond.fishMax": level.fishMax,
					"pond.interval": level.interval,
					"pond.budget": overBudget ? level.budgetMax : plr.pond.budget
				}
			}
		);
	}
}

export async function db_recalc_bakery_total_value(cookies: { [cookieId: string]: okbot.BakeryCookie }) {
	const playersToUpdate: Array<{
		updateOne: { filter: { _id: any }; update: { $set: { "bakery.totVal": number } } };
	}> = [];
	const allPlayers = (await db_get("plr")
		.find({ bakery: { $ne: null } })
		.toArray()) as unknown as okbot.User[];

	for (const plr of allPlayers) {
		const currentValue = plr.bakery!.totVal;
		let newValue = 0;

		for (const cookieId in plr.bakery!.stat) {
			const cookieCount = plr.bakery!.stat[cookieId];
			const cookieValue = cookies[cookieId].value;
			newValue += cookieCount * cookieValue;
		}

		const difference = newValue - currentValue;
		if (difference)
			playersToUpdate.push({
				updateOne: { filter: { _id: plr._id as string }, update: { $set: { "bakery.totVal": newValue } } }
			});
		console.log(`Bakery value recalc: ${formatNumber(difference)}\t\tdifference for player\t${plr._id}`);
	}

	if (!playersToUpdate.length) {
		console.log("No players to update.");
		return;
	}

	await db_get("plr").bulkWrite(playersToUpdate);
}
