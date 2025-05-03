import { AttachmentBuilder } from "discord.js";
import { db_count, db_find, db_update } from "../../db/db.js";
import { formatDate, objLength, sendSimpleMessage } from "../../utils.js";

export const name = "query";
export const alias = ["db"];
export const description = "❓ query the db";
export const usage =
	"[<Database>.[Collection]] [Action] <Filter> <Projection OR Update action> <Additional (e.g. sort)> (Flag +obj OR +noTable)";
export const usageDetail = "Action can be 'find', 'update', or 'count'.";
export const restrict = "BOT_ADMIN";

function objToString<T>(obj: Record<string, T> | {}, parseObjects = false) {
	let string = "{";
	let i = 0;
	for (const [k, v] of Object.entries(obj)) {
		if (i) string += ", ";
		string += `${k}:${friendlyToString<T>(v, parseObjects)}`;
		++i;
	}

	return string + "}";
}

function friendlyToString<T>(a: T, parseObjects = false, forceToString = false) {
	let formatted: T | string = a;
	if (typeof a == "string") formatted = '"' + a + '"';
	else if (a === null) formatted = "null";
	else if (a === undefined) formatted = "undefined";
	else if (a instanceof Array) formatted = parseObjects ? a.toString() : `ARR[${a.length}]`;
	else if (typeof a === "object") formatted = parseObjects ? objToString(a) : `OBJ[${objLength(a)}]`;
	else if (forceToString) return a.toString();

	return formatted;
}

function parseArgs(args: string[]) {
	if (!args?.length) return null;

	let argsString = args.join(" ");
	let splitByFlag = argsString.split("+");

	const flags = [];
	const queryRaw = splitByFlag.shift()!.split(" ");

	for (const j of splitByFlag) flags.push(j.trim().toLowerCase());
	const flagsParsed = {
		recursiveObjects: flags.includes("obj"),
		defaultFormat: flags.includes("notable")
	};

	return { filter: queryRaw[0] ?? "{}", projection: queryRaw[1], other: queryRaw[2], flags: flagsParsed };
}

function tableFromObjects(arr: Array<Record<string, any>>, parseObjects = false) {
	const fields = new Set<string>();
	//get all unique fields
	for (const i of arr) for (const j in i) fields.add(j);

	const rows = new Array<any[]>(arr.length); //row of values
	for (const i in arr) {
		rows[i] = new Array(fields.size);
		let fieldIndex = 0;
		for (const fieldName of fields) {
			const v = arr[i][fieldName];
			rows[i][fieldIndex++] = friendlyToString(v, parseObjects, false);
		}
	}

	const columns = new Array<{ field: string; len: number }>(fields.size);
	let fieldIndex = 0;
	for (const i of fields) {
		columns[fieldIndex] = { field: i, len: i.length };
		for (const j in arr) {
			const len = rows[j][fieldIndex].toString().length;
			if (len > columns[fieldIndex].len) columns[fieldIndex].len = len; //get max length in column for padding
		}
		++fieldIndex;
	}

	let head = "|";
	for (const column of columns) head += " " + column.field.padEnd(column.len, " ") + " |";
	const horizontalBar = "-".repeat(head.length);
	head = horizontalBar + "\n" + head + "\n" + horizontalBar;

	let body = "|";
	for (const row in rows) {
		for (const i in rows[row]) {
			body += " " + rows[row][i]?.toString().padEnd(columns[i].len, " ") + " |";
		}
		body += "\n" + horizontalBar + "\n";
		if (Number(row) < rows.length - 1) body += "|";
	}

	return head + "\n" + body;
}

export async function execute(msg: okbot.Message, args: string[]) {
	if (args.length < 2) return;

	const dbcoll = args.shift() as string;
	const dbcollSplit = dbcoll.split(".");
	let db = process.env.DB_NAME;
	let coll;
	if (dbcollSplit.length >= 2) {
		db = dbcollSplit[0];
		coll = dbcollSplit[1];
	} else {
		coll = dbcollSplit[0];
	}

	try {
		const action = args.shift()!.toLowerCase();
		const argsParsed = parseArgs(args);
		if (!argsParsed) throw new Error("Invalid arguments.");

		const filter = JSON.parse(argsParsed.filter);
		const projection = argsParsed.projection?.startsWith("{") ? JSON.parse(argsParsed.projection) : undefined;
		const other = argsParsed.other?.startsWith("{") ? JSON.parse(argsParsed.other) : undefined;

		if (action === "find") {
			const res = await db_find(coll, filter, projection, other, db);
			let formattedRes = "";

			if (res?.length) {
				if (argsParsed.flags.defaultFormat) {
					for (const i in res) {
						formattedRes += `${i}: ${objToString(res[i], argsParsed.flags.recursiveObjects)}\n`;
					}
				} else {
					formattedRes = tableFromObjects(res, argsParsed.flags.recursiveObjects);
				}
			} else formattedRes = "<No result>";

			// will send as file if content too long or too wide (cool condition)
			if (formattedRes.length > 1991 || formattedRes.startsWith("-".repeat(91))) {
				const file = new AttachmentBuilder(Buffer.from(formattedRes, "utf-8"), {
					name: `q_find_${formatDate(new Date(), "alphabetical", undefined, true)}.txt`
				});
				await msg.reply({
					content: `> Find result (${res.length})`,
					files: [file],
					allowedMentions: { repliedUser: false }
				});
			} else {
				await msg.reply({
					content: `\`\`\`js\n${formattedRes}\`\`\``,
					allowedMentions: { repliedUser: false }
				});
			}
		} else if (action === "count") {
			const res = await db_count(coll, filter, db);
			await msg.reply({ content: `\`\`\`js\n${res}\`\`\``, allowedMentions: { repliedUser: false } });
		} else if (action === "update") {
			// projection is update action in this case
			const res = await db_update(coll, filter, projection, other, db);
			await msg.reply({
				content: `\`\`\`js\n${friendlyToString(res, true)}\`\`\``,
				allowedMentions: { repliedUser: false }
			});
		} else {
			throw new Error("Invalid action.");
		}
	} catch (e) {
		return await sendSimpleMessage(msg, "`" + e + "`");
	}
}
