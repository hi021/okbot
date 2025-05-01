import { db_get_client } from './db.js';

// WARNING: Relies on poggers.ltd osu! rankings to be in the same database!

export async function db_osu_get_players(ids: number[], projection?: any) {
	try {
		return await db_get_client()
			.db('ranking-static')
			.collection('players')
			.find({ _id: { $in: ids as any } }, { projection })
			.toArray();
	} catch (e) {
		console.error('Failed to get osu players:\n', e);
		return null;
	}
}

export async function db_osu_find_players(filter: any, projection?: any) {
	try {
		return await db_get_client()
			.db('ranking-static')
			.collection('players')
			.find(filter, { projection })
			.toArray();
	} catch (e) {
		console.error('Failed to find osu players:\n', e);
		return null;
	}
}
