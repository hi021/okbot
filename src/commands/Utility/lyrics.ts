import { ActivityType, Colors, ComponentType, EmbedBuilder, MessageType, Snowflake } from "discord.js";
import { getSongById, parseSongInfo, searchSongs } from "genius-lyrics-api";
import { Song } from "genius-lyrics-api/lib/utils.js";
import { formatNumber, sendSimpleMessage } from "../../utils.js";

export const name = "lyrics";
export const alias = ["lyric", "song"];
export const description = "🎶 For your karaoke nights";
export const usage =
	"<Song search query (tries to get song data from presence if none provided)> OR reply to a .fmbot's fm command";

const BOT_EMBED_PARSERS: Record<Snowflake, (msg: okbot.Message) => string | undefined> = Object.freeze({
	"1014578749393616941": woozyQueryParser,
	"356268235697553409": fmbotQueryParser,
	"839937716921565252": mikazukiQueryParser
});

function woozyQueryParser(msg: okbot.Message) {
	// Woozy (song queued / now playing / undid message)
	const msge = msg.embeds[0];
	if (!msge?.description) return;

	// embeds look like Queued:\n**<Query>**
	// get second line and remove bold (**) from beginning and end
	return msge.description.split("\n")[1].slice(2).slice(0, -2);
}

function fmbotQueryParser(msg: okbot.Message) {
	// fmbot (.fm command)
	if (msg.components[0]?.type === ComponentType.Container) {
		if (msg.components[0].components[0]?.type === ComponentType.Section && msg.components[0].components[0].components[0]?.type === ComponentType.TextDisplay) {
		// TODO Embed (default) / Embed full: [ContainerComponent]: {[SectionComponent]: {[TextDisplayComponent], ...}}

		// e.g. COMPONENT CONTENT:
		//'-# Last played <t:1777409242:R> for [hi](<link>) \n' +
     //   "### [Linda's in Custody](https://www.last.fm/music/Death+Grips/_/Linda%27s+in+Custody)\n" +
       // '**Death Grips** • *Year of the Snitch*'
		}

		if (msg.components[0].components[0]?.type === ComponentType.TextDisplay) {
			// Embed tiny [ContainerComponent]: {[TextDisplayComponent], [SeparatorComponent], [TextDisplayComponent]}
			const regEmbedTiny = /^\*\*\[(.+)\]\(.*\)\*\*\n\*\*(.*)\*\* • \*(.*)\*$/;
			const regExecEmbedTiny = regEmbedTiny.exec(msg.components[0].components[0].content);
			const title = regExecEmbedTiny?.[1];
			const artist = regExecEmbedTiny?.[2];
			console.log({ title, artist });
			if (title || artist) return `${artist ?? ""} ${title ?? ""}`;
		}
	}

	if (!msg.components.length && !msg.embeds.length && msg.content?.length) {
		console.log(msg.content)
		// Text single-line: **<Username>** is listening to **<Title>** by **<Artist>**
		const regText = /^\*\*(?:.+)\*\* is listening to \*\*(.+)\*\* by \*\*(.+)\*\*/;
		// Text full: *[User]'s last played track:*\n**<Title>**\nBy **<Artist>** | *<Album>*(\nblah blah...)
		const regTextFull = /^(?:\*(?:.+)'s last played track:\*\n)?\*\*(.+)\*\*\nBy \*\*(.+)\*\* \| \*(.+)\*/;

		const regExec = regText.exec(msg.content) ?? regTextFull.exec(msg.content);
		const title = regExec?.[1];
		const artist = regExec?.[2];
		if (title || artist) return `${artist ?? ""} ${title ?? ""}`;
	}
}

function mikazukiQueryParser(msg: okbot.Message) {
	// mikazuki (;rs command)
	const msge = msg.embeds[0];
	if (!msge?.title) return;

	// embeds look like <Artist> – <Title> [Difficulty]
	const reg = /(.+) – (.+) (\[.+\])/;
	const regExec = reg.exec(msge.title);

	const artist = regExec?.[1];
	const title = regExec?.[2];
	if (title || artist) return `${artist ?? ""} ${title ?? ""}`;
}

function parseQueryFromBotMessage(reference: okbot.Message) {
	if (!reference.author.bot) return;
	return BOT_EMBED_PARSERS[reference.author.id]?.(reference);
}

function parseQueryFromSpotifyActivity(msg: okbot.Message) {
	const authorActivities = msg.member?.presence?.activities;
	if (!authorActivities?.length) return;

	for (const activity of authorActivities) {
		if (activity.type == ActivityType.Listening)
			return `${activity.details} ${activity.state?.replaceAll(";", "") ?? ""}`;
	}
}

async function parseQuery(msg: okbot.Message, args: string[]) {
	if (msg.type === MessageType.Reply) {
		const reference = (await msg.fetchReference()) as okbot.Message;
		const queryEmbed = parseQueryFromBotMessage(reference);

		if (queryEmbed) return queryEmbed;
		if (!args[0] && reference?.content?.length > 1) return reference.content;
	}

	if (args[0]) return args.join(" ");
	const queryActivity = parseQueryFromSpotifyActivity(msg);

	return queryActivity ?? "";
}

function buildAlbumLabel(song: Song) {
	let albumLabel = "";
	if (song.releaseDate) albumLabel = "Released " + song.releaseDate;
	if (song.albumName) albumLabel += " on " + song.albumName;
	return albumLabel;
}

function buildFooterText(song: Song, lyricsTruncated: boolean) {
	let footerText = "";
	if (lyricsTruncated) footerText = "Lyrics truncated to fit\n";
	if (song.views) footerText += formatNumber(song.views) + " views\n";
	footerText += "provided by genius.com";
	return footerText;
}

export async function execute(msg: okbot.Message, args: string[]) {
	const query = await parseQuery(msg, args);
	if (query.length < 2)
		return sendSimpleMessage(
			msg,
			"No query was provided!\nType the artist and title of the song you're looking for.",
			Colors.DarkOrange
		);

	msg.channel.sendTyping();
	try {
		const songApi = await searchSongs({
			apiKey: process.env.GENIUS_CLIENT_TOKEN as string,
			query,
			maxResults: 1
		});
		if (!songApi?.length)
			return sendSimpleMessage(
				msg,
				`Couldn't find any songs matching \`${query}\`\nTry a different query!`,
				Colors.DarkRed,
				false
			);

		const songParsed =
			(await getSongById(songApi[0].id, process.env.GENIUS_CLIENT_TOKEN as string)) ??
			(await parseSongInfo(songApi[0], true));

		let lyricsTruncated = false;
		let lyrics: string;
		if (!songParsed.lyrics) lyrics = "*I don't have the lyrics for this song :(*";
		// TODO?: Pagination for lyrics over max char limit/scrolling through search results
		else {
			// remove '*', '_' and '~~' (discord formatting) + bold everything inside [] (usually verse numbering)
			lyrics = songParsed.lyrics.replace(/[*_]|[~]{2,}/g, "").replace(/(\[[^\]]*\])/g, "**$1**");
			if (lyrics.length > 4096) {
				lyrics = lyrics.slice(0, 4094) + "…";
				lyricsTruncated = true;
			}
		}

		const albumLabel = buildAlbumLabel(songParsed);
		const msge = new EmbedBuilder()
			.setColor(Colors.White)
			.setDescription(lyrics)
			.setTitle(songParsed.artist + " - " + songParsed.title)
			.setURL(songParsed.url)
			.setFooter({ text: buildFooterText(songParsed, lyricsTruncated) });
		albumLabel && msge.setAuthor({ name: albumLabel });
		songParsed.thumbnail && msge.setThumbnail(songParsed.thumbnail);

		return msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
	} catch (e) {
		console.error("Failed to get song info:", e);
		return sendSimpleMessage(msg, `**Failed to fetch song info**\n\n\`${e}\``);
	}
}
