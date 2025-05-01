import { ActivityType, Colors, Embed, EmbedBuilder, MessageType } from 'discord.js';
import { getSongById, parseSongInfo, searchSongs } from 'genius-lyrics-api';
import { formatNumber, sendSimpleMessage } from '../../utils.js';

export const name = 'lyrics';
export const alias = ['lyric', 'song'];
export const description = '🎶 For your karaoke nights';
export const usage =
	"<Song search query (tries to get song data from presence if none provided)> OR reply to a .fmbot's fm command";

function parseQueryFromBotEmbed(reference: okbot.Message, msge: Embed, args: string[]) {
	const botId = reference.author.id;
	// Woozy (song queued message)
	if (botId === '1014578749393616941' && msge.description) {
		// embeds look like (Queued:\n<Query>)
		// get second line and remove bold (**) from beginning and end
		return msge.description.split('\n')[1].slice(2).slice(0, -2);
	}

	// fmbot (.fm, .np command)
	if (botId === '356268235697553409') {
		// embeds look like [<Title>](URL)\nBy **<Artist>** | *<Album>*
		const regTitle = /(\[)(.+)(\])/;
		const regArtist = /By \*\*(.+)\*\*/;

		let title;
		let artist;
		// EmbedMini and EmbedTiny have descriptions, EmbedFull has Current and Previous fields
		const split = (msge.fields.length ? msge.fields[0].value : (msge.description ?? '')).split('\n');

		title = regTitle.exec(split[0])?.[2];
		artist = regArtist.exec(split[1])?.[1];

		if (title || artist) return `${artist ?? ''} ${title ?? ''}`;
	}

	// mikazuki (;rs command)
	else if (botId === '839937716921565252' && msge.title) {
		// embeds look like <Artist> – <Title> [Difficulty]
		const reg = /(.+) – (.+) (\[.+\])/;
		const regExec = reg.exec(msge.title);

		const artist = regExec?.[1];
		const title = regExec?.[2];
		if (title || artist) return `${artist ?? ''} ${title ?? ''}`;
	}
}

function parseQueryFromSpotifyActivity(msg: okbot.Message) {
	const authorActivities = msg.member?.presence?.activities;
	if (!authorActivities?.length) return;

	for (const activity of authorActivities) {
		if (activity.type == ActivityType.Listening)
			return `${activity.details} ${activity.state?.replaceAll(';', '') ?? ''}`;
	}
}

// returns query from a woozy 'song queued' embed, fmbot .fm command, message content, or args
async function parseQuery(msg: okbot.Message, args: string[]) {
	if (msg.type === MessageType.Reply) {
		const reference = await msg.fetchReference();
		const msge = reference?.embeds[0];
		const queryEmbed = msge ? parseQueryFromBotEmbed(reference, msge, args) : undefined;
		if (queryEmbed) return queryEmbed;
		if (!args[0] && reference?.content?.length > 1) return reference.content;
	}

	if (args[0]) return args.join(' ');
	const queryActivity = parseQueryFromSpotifyActivity(msg);

	return queryActivity ?? '';
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
			lyrics = songParsed.lyrics.replace(/[*_]|[~]{2,}/g, '').replace(/(\[[^\]]*\])/g, '**$1**');
			if (lyrics.length > 4096) {
				lyrics = lyrics.slice(0, 4091) + ' ...';
				lyricsTruncated = true;
			}
		}

		let albumText = '';
		if (songParsed.releaseDate) albumText = 'Released ' + songParsed.releaseDate;
		if (songParsed.albumName) albumText += ' on ' + songParsed.albumName;

		let footerText = '';
		if (lyricsTruncated) footerText = 'Lyrics were truncated to fit\n';
		if (songParsed.views) footerText += formatNumber(songParsed.views) + ' views\n';
		footerText += 'data from genius.com';

		const msge = new EmbedBuilder()
			.setColor(Colors.White)
			.setDescription(lyrics)
			.setTitle(songParsed.artist + ' - ' + songParsed.title)
			.setURL(songParsed.url)
			.setFooter({ text: footerText });
		albumText && msge.setAuthor({ name: albumText });
		songParsed.thumbnail && msge.setThumbnail(songParsed.thumbnail);

		return msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
	} catch (e) {
		console.error('Failed to get song info:', e);
		return sendSimpleMessage(msg, `**Failed to fetch song info**\n\n\`${e}\``);
	}
}
