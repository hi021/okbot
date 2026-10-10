import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commandsDir = path.join(root, "src", "commands");
const modCommandsDir = path.join(root, "src", "commands_mod");
const outputPath = path.join(root, "commands.md");

async function findCommandFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await findCommandFiles(entryPath)));
		else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(entryPath);
	}

	return files;
}

function readExportedLiteral(sourceText, constantName) {
	const match = sourceText.match(
		new RegExp(`^[\\t ]*export\\s+const\\s+${constantName}\\s*=\\s*(true\\b|"(?:\\\\.|[^"\\\\])*")`, "m")
	);
	if (!match) return undefined;

	return match[1] === "true" ? true : JSON.parse(match[1]);
}

const files = (await findCommandFiles(commandsDir)).sort();
const categories = new Map();

for (const filePath of files) {
	const relativePath = path.relative(commandsDir, filePath);
	const category = relativePath.split(path.sep)[0];
	const sourceText = await readFile(filePath, "utf8");
	const hidden = readExportedLiteral(sourceText, "hidden");

	if (hidden === true) continue;

	const name = readExportedLiteral(sourceText, "name");
	const description = readExportedLiteral(sourceText, "description");
	if (typeof name !== "string" || typeof description !== "string")
		throw new Error(`Visible command must export string name and description: ${relativePath}`);

	if (!categories.has(category)) categories.set(category, []);
	categories.get(category).push(`- ${name} - ${description}`);
}

// NOTICE: This includes descriptions with custom discord emojis (like <:color_lightPink:1008342282153513020>) which have to be removed manually.
const sections = [...categories.keys()]
	.sort()
	.map(category => `### ${category}\n\n${categories.get(category).sort().join("\n")}`);
const modCommandCount = (await findCommandFiles(modCommandsDir)).length;

await writeFile(
	outputPath,
	`Available commands:\n\n${sections.join("\n\n")}\n\nPlus **${modCommandCount}** mod commands.\n`
);
console.log(`Generated ${path.relative(root, outputPath)}`);
