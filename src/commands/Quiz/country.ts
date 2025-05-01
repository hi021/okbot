import { Colors, EmbedBuilder } from 'discord.js';
import { capitalizeFirstLetter, sendSimpleMessage } from '../../utils.js';
import { countries } from '../../countries.js';

export const name = 'country';
export const alias = ['countryinfo', 'flaginfo'];
export const description = ':flag_aq: Check up on the 16 people living in remote french territories';
export const usage = '<Country Name OR 2-letter Country Code>';

function getCountryAndCode(query: string) {
	let code = query,
		country = countries[query];

	if (code.length !== 2 || !country) {
		const queryR = new RegExp(query.replace(/[,\(\)-\.]/, ''), 'i');

		for (const i in countries) {
			for (const j of countries[i].nam) {
				if (queryR.test(j.replace(/[,\(\)-\.]/, ''))) {
					code = i;
					country = countries[i];
					break;
				}
			}
			if (country) break;
		}
	}

	return { country, code };
}

export function execute(msg: okbot.Message, args: string[]) {
	if (!args.length)
		return sendSimpleMessage(msg, 'The usage for this command is:\n`' + usage + '`', Colors.White);

	const { country, code } = getCountryAndCode(args.join(' ').toLowerCase());
	if (!country) return sendSimpleMessage(msg, 'Country not found.');

	const msge = new EmbedBuilder()
		.setColor(Colors.DarkerGrey)
		.setTitle(country.nam[0])
		.setThumbnail(`https://flagcdn.com/w160/${code}.jpg`);
	if (country.nam.length > 1)
		msge.addFields({ name: 'Alternative names', value: country.nam.slice(1).join(', ') });
	if (country.region)
		msge.addFields({
			name: 'Region',
			value: country.regionDetail || capitalizeFirstLetter(country.region.toString()),
			inline: false
		});
	if (country.capital) msge.addFields({ name: 'Capital', value: country.capital[0] });
	if (country.type) msge.setFooter({ text: country.type.toString().toLowerCase() });
	return msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}
