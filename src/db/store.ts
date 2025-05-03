import fs from "fs";
import { db_get } from "./db.js";

const storePath = "../assets/store/";

//populates the store collection
export async function db_store_init(reset = true) {
	try {
		const col = db_get("store");
		if (reset && (await col.findOne())) await col.drop();

		const store: okbot.Item[] = [];
		fs.readdirSync(storePath).forEach(f => {
			const items: okbot.Item[] = JSON.parse(fs.readFileSync(storePath + f, { encoding: "utf-8" }));
			for (const i in items) {
				// IDs conform to AAA0000 with underscores allowed: ^([A-Z]|_){3}\d{4}$
				if (items[i]._id == undefined)
					items[i]._id = items[i].cat.toUpperCase().slice(0, 3).replace("/[^A-Z]", "_") + i.padStart(4, "0");
				store.push(items[i]);
			}
		});

		await col.insertMany(store as any);
		await col.createIndex({ cat: "text" });
		console.log("Store DB initialized.");
	} catch (err) {
		console.warn("Failed to initialize store DB:", err);
	}
}

export async function db_store_get_item(query: { nam?: string | RegExp; id?: string }) {
	try {
		if (query.id) return (await db_get("store").findOne({ _id: query.id as any })) as okbot.Item | null;

		if (query.nam) return (await db_get("store").findOne({ nam: query.nam })) as okbot.Item | null;

		return null;
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_store_get_category(cat: string | RegExp) {
	return (await db_get("store").find({ cat }).toArray()) as unknown as okbot.Item[] | null;
}

export async function db_store_get_all() {
	try {
		return (await db_get("store").find().toArray()) as unknown as okbot.Item[] | null;
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_store_get_categories() {
	return (await db_get("store").distinct("cat")) as string[];
}
