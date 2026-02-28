import fs from "fs";
import { db_get } from "./db.js";
import { Collection } from "mongodb";

const assetPath = "../assets/gay/";

// TODO
export async function db_gay_init() {
	try {
		const col = db_get("gay");

		const gay: okbot.Item[] = [];
		fs.readdirSync(assetPath).forEach(f => {
			const items: okbot.Item[] = JSON.parse(fs.readFileSync(assetPath + f, { encoding: "utf-8" }));
			for (const i in items) {
				gay.push(items[i]);
			}
		});

		await col.insertMany(gay as any);
		await col.createIndex({ cat: "text" });
		console.log("Gay DB initialized.");
	} catch (err) {
		console.warn("Failed to initialize gay DB:", err);
	}
}

export async function db_get_gay(type: okbot.GayType, id?: number) {
	const col = db_get(`gay_${type.toLowerCase}`);
	return id ? db_get_gay_from_collection_by_id(col, id) : db_get_gay_from_collection(col);
}

async function db_get_gay_from_collection(col: Collection) {
	return await col.aggregate([{ $sample: { size: 1 } }]).next() as null | okbot.GayObject;
}

async function db_get_gay_from_collection_by_id(col: Collection, id: number) {
	return await col.findOne({_id: id as any}) as null | okbot.GayObject;
}