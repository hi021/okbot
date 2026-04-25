import fs from "fs";
import { AnyBulkWriteOperation, Collection } from "mongodb";
import path from "path";
import { db_get } from "./db.js";
import { DbLeastOrMost, PartialExcept } from "../utils.js";

const assetPath = "../assets/gay/";

export async function db_gay_init() {
	try {
		const girlsCol = db_get("gay_girls");
		const sillyCol = db_get("gay_silly");

		// TODO: Promise.all?
		const girlsGay = await db_gay_parse("girls.json");
		const sillyGay = await db_gay_parse("silly.json");
		await db_gay_update_and_upsert(girlsCol, girlsGay);
		await db_gay_update_and_upsert(sillyCol, sillyGay);

		if (girlsGay.length && sillyGay.length) console.log("Gay DB initialized.");
	} catch (err) {
		console.warn("Failed to initialize gay DB:", err);
	}
}

export async function db_get_gay(type: okbot.GayType, id?: number) {
	const coll = db_get(`gay_${type.toLowerCase()}`);
	return id
		? db_get_gay_from_collection_by_id(coll, id)
		: db_get_gay_from_collection_by_field(coll, "impressions", "least");
}

async function db_gay_parse(filename: string) {
	const filePath = path.join(assetPath, filename);
	try {
		if (filename == "silly.json") return db_gay_parse_url_array(filePath);
		return JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" })) as okbot.GayObjectPlain[];
	} catch (e) {
		console.warn(`Failed to open or parse '${filePath}'. Continuing gayless.`);
		return [];
	}
}

async function db_gay_parse_url_array(filePath: string) {
	const urls = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" })) as string[];
	const gay = new Array<okbot.GayObjectPlain>(urls.length);
	for (let i = 1; i <= urls.length; ++i) gay[i - 1] = { url: urls[i - 1], _id: i };

	return gay;
}

async function db_gay_update_and_upsert(coll: Collection, gay: okbot.GayObjectPlain[]) {
	const operations = new Array<AnyBulkWriteOperation<any>>(gay.length);
	for (let i = 0; i < gay.length; ++i)
		operations[i] = {
			updateOne: {
				filter: { _id: gay[i]._id as any },
				update: { $set: gay[i] },
				upsert: true
			}
		};

	await coll.bulkWrite(operations, { ordered: false });
}

export async function db_get_gay_from_collection(coll: Collection) {
	return (await coll.aggregate([{ $sample: { size: 1 } }]).next()) as null | okbot.GayObject;
}

async function db_get_gay_from_collection_by_id(coll: Collection, id: number) {
	return (await coll.findOne({ _id: id as any })) as null | okbot.GayObject;
}

export async function db_get_gay_from_collection_by_field(
	coll: Collection,
	field: keyof okbot.GayObject,
	leastOrMostMode: DbLeastOrMost,
	leastOrMostCount = 32
) {
	const aggregate: Array<Record<string, unknown>> = [
		{ $sort: { [field]: leastOrMostMode === "least" ? 1 : -1 } },
		{ $limit: Math.max(1, leastOrMostCount) },
		{ $sample: { size: 1 } }
	];

	return (await coll.aggregate(aggregate).next()) as null | okbot.GayObject;
}

export async function db_get_gays_from_collection_by_field(
	coll: Collection,
	field: keyof okbot.GayObject,
	leastOrMostMode: DbLeastOrMost,
	leastOrMostCount = 15,
	ignoreNull = true
) {
	const aggregate: Array<Record<string, unknown>> = [
		{ $sort: { [field]: leastOrMostMode === "least" ? 1 : -1 } },
		{ $limit: Math.max(1, leastOrMostCount) }
	];
	if (ignoreNull) aggregate.unshift({ $match: { [field]: { $ne: null } } });

	return (await coll.aggregate(aggregate).toArray()) as okbot.GayObject[];
}

export async function db_gay_add(gay: PartialExcept<okbot.GayObject, "_id">, type: okbot.GayType) {
	const _id = gay._id;
	if (!_id) return;
	delete (gay as any)._id;

	const coll = db_get(`gay_${type.toLowerCase()}`);
	await coll.updateOne({ _id: _id as any }, { $inc: gay as any }, { upsert: true });
}
