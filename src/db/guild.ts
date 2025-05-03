import { Guilds } from "../volatile.js";
import { db_get } from "./db.js";

//loads guild settings into memory
export async function db_guild_init(preferencesObject: { [guildId: string]: Omit<okbot.Guild, "_id"> }) {
	try {
		const res = (await db_get("guilds")
			.find({}, { projection: { otrack: 0 } })
			.toArray()) as unknown as okbot.Guild[];
		if (!res?.length) throw new Error("No guilds found.");

		for (const i in res) {
			const id = res[i]._id;
			//@ts-ignore
			delete res[i]._id;
			preferencesObject[id] = { ...res[i] };
		}

		return preferencesObject;
	} catch (e) {
		console.error("Failed to initialize guilds:\n", e);
		return null;
	}
}

export async function db_guild_set(guild: okbot.Guild) {
	try {
		return await db_get("guilds").updateOne({ _id: guild._id as any }, { $set: guild }, { upsert: true });
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_guild_get(filter?: okbot.Guild | any, projection?: okbot.Guild | any) {
	try {
		return (await db_get("guilds").find(filter, { projection }).toArray()) as unknown as okbot.Guild[] | null;
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_guild_add_reaction(reaction: string, response: string, guildId = "_GLOBAL") {
	try {
		const field = "cr." + reaction;
		if (Guilds[guildId]?.cr)
			Guilds[guildId].cr![reaction]
				? Guilds[guildId].cr![reaction].push(response)
				: (Guilds[guildId].cr![reaction] = [response]);
		else if (Guilds[guildId]) Guilds[guildId].cr = { [reaction]: [response] };
		else Guilds[guildId] = { cr: { [reaction]: [response] } };

		return await db_get("guilds").updateOne(
			{ _id: guildId as any },
			{ $push: { [field]: response as any } },
			{ upsert: true }
		);
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_guild_delete_reaction(reaction: string, response: string, guildId = "_GLOBAL") {
	try {
		const field = "cr." + reaction;
		const reactions = await db_get("guilds").findOne({ _id: guildId as any }, { [field]: 1 });

		//nothing to delete
		if (!reactions?.cr?.[reaction]) return null;

		//delete the whole reaction array if only one response
		if (reactions.cr[reaction].length <= 1) {
			if (reactions.cr[reaction][0] != response) return null;

			delete Guilds[guildId].cr![reaction];
			return await db_get("guilds").updateOne({ _id: guildId as any }, { $unset: { [field]: 1 } });
		} else {
			//delete only one of the responses otherwise
			Guilds[guildId].cr![reaction] = Guilds[guildId].cr![reaction].filter(a => a !== response);
			return await db_get("guilds").updateOne(
				{ _id: guildId as any },
				{ $pull: { [field]: response as any } }
			);
		}
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function db_guild_clear_reactions(guildId = "_GLOBAL") {
	try {
		delete Guilds[guildId].cr;
		return await db_get("guilds").updateOne({ _id: guildId as any }, { $unset: { cr: 1 } });
	} catch (err) {
		console.error(err);
		return null;
	}
}
