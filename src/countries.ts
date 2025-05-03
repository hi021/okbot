export enum CountryRegion {
	AFRICA,
	ASIA,
	EUROPE,
	NORTH_AMERICA,
	OCEANIA,
	SOUTH_AMERICA
}
export enum CountryType {
	COUNTRY,
	SMALL_COUNTRY,
	TERRITORY,
	STATE,
	OTHER
}

export const countries_common = [
	"us",
	"ua",
	"tr",
	"se",
	"sa",
	"ru",
	"qa",
	"pt",
	"pl",
	"no",
	"mx",
	"kr",
	"jp",
	"in",
	"il",
	"gr",
	"gb",
	"fr",
	"fi",
	"es",
	"de",
	"cn",
	"ch",
	"ca",
	"br",
	"au",
	"ar"
];

// indexed by ISO 3166 code
// full from https://flagcdn.com/en/codes.json
export const countries: { [countryCode: string]: okbot.Country } = {
	ad: {
		nam: ["Andorra"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Andorra la Vella"]
	},
	ae: {
		nam: ["United Arab Emirates", "UAE"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Abu Dhabi"]
	},
	af: {
		nam: ["Afghanistan"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Kabul"]
	},
	ag: {
		nam: ["Antigua and Barbuda", "Antigua"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Saint John's", "Saint John", "St. John", "St. John's"]
	},
	ai: {
		nam: ["Anguilla"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["The Valley"]
	},
	al: {
		nam: ["Albania"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Tirana", "Tirane"]
	},
	am: {
		nam: ["Armenia"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Yerevan"]
	},
	ao: {
		nam: ["Angola"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Luanda"]
	},
	aq: {
		nam: ["Antarctica"],
		regionDetail: "Antarctica",
		type: CountryType.OTHER
	},
	ar: {
		nam: ["Argentina"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Buenos Aires"]
	},
	as: {
		nam: ["American Samoa"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.TERRITORY,
		capital: ["Pago Pago"]
	},
	at: {
		nam: ["Austria"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.COUNTRY,
		capital: ["Vienna"]
	},
	au: {
		nam: ["Australia"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Australia and New Zealand",
		type: CountryType.COUNTRY,
		capital: ["Canberra"]
	},
	aw: {
		nam: ["Aruba"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Oranjestad"]
	},
	ax: {
		nam: ["Åland Islands", "Aland", "Aland Islands"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.TERRITORY,
		capital: ["Mariehamn"]
	},
	az: {
		nam: ["Azerbaijan"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Baku"]
	},
	ba: {
		nam: ["Bosnia and Herzegovina", "Bosnia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Sarajevo"]
	},
	bb: {
		nam: ["Barbados"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Bridgetown"]
	},
	bd: {
		nam: ["Bangladesh"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Dhaka"]
	},
	be: {
		nam: ["Belgium"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.COUNTRY,
		capital: ["Brussels"]
	},
	bf: {
		nam: ["Burkina Faso"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Ouagadougou"]
	},
	bg: {
		nam: ["Bulgaria"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Sofia"]
	},
	bh: {
		nam: ["Bahrain"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Manama"]
	},
	bi: {
		nam: ["Burundi"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Gitega"]
	},
	bj: {
		nam: ["Benin"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Porto Novo"]
	},
	bl: {
		nam: ["Saint Barthélemy", "St. Barthélemy", "Saint Barthelemy", "St. Barthelemy", "St. Barts"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Gustavia", "Le Carénage", "Le Carenage", "Carenage"]
	},
	bm: {
		nam: ["Bermuda"],
		region: CountryRegion.NORTH_AMERICA,
		regionDetail: "Northern America",
		type: CountryType.TERRITORY,
		capital: ["Hamilton"]
	},
	bn: {
		nam: ["Brunei"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Bandar Seri Begawan"]
	},
	bo: {
		nam: ["Bolivia"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["La Paz", "Sucre"]
	},
	bq: {
		nam: ["Caribbean Netherlands"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.TERRITORY
	},
	br: {
		nam: ["Brazil"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Brasilia"]
	},
	bs: {
		nam: ["Bahamas"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Nassau"]
	},
	bt: {
		nam: ["Bhutan"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Thimphu"]
	},
	bw: {
		nam: ["Botswana"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Gaborone"]
	},
	by: {
		nam: ["Belarus"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Minsk"]
	},
	bz: {
		nam: ["Belize"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Belmopan"]
	},
	ca: {
		nam: ["Canada"],
		region: CountryRegion.NORTH_AMERICA,
		regionDetail: "Northern America",
		type: CountryType.COUNTRY,
		capital: ["Ottawa"]
	},
	cc: {
		nam: ["Cocos (Keeling) Islands", "Cocos", "Cocos Islands", "Keeling Islands"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Australia and New Zealand",
		type: CountryType.TERRITORY,
		capital: ["West Island"]
	},
	cd: {
		nam: ["Democratic Republic of the Congo", "DR Congo", "Democratic Republic of Congo", "DRC", "Congo"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Kinshasa"]
	},
	cf: {
		nam: ["Central African Republic", "CAR", "Central Africa"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Bangui"]
	},
	cg: {
		nam: ["Republic of the Congo", "Congo Republic", "Republic of Congo"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Brazzaville"]
	},
	ch: {
		nam: ["Switzerland"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.COUNTRY,
		capital: ["Bern"]
	},
	ci: {
		nam: ["Côte d'Ivoire", "Ivory Coast", "Cote d'Ivoire", "Cote Ivoire"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Yamoussoukro"]
	},
	ck: {
		nam: ["Cook Islands"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.TERRITORY,
		capital: ["Avarua", "Avarua District"]
	},
	cl: {
		nam: ["Chile"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Santiago"]
	},
	cm: {
		nam: ["Cameroon"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Yaounde"]
	},
	cn: {
		nam: ["China"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Beijing"]
	},
	co: {
		nam: ["Colombia"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Bogota"]
	},
	cr: {
		nam: ["Costa Rica"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["San Jose"]
	},
	cu: {
		nam: ["Cuba"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Havana"]
	},
	cv: {
		nam: ["Cape Verde", "Cabo Verde"],
		region: CountryRegion.AFRICA,
		regionDetail: "Western Africa",
		type: CountryType.COUNTRY,
		capital: ["Praia"]
	},
	cw: {
		nam: ["Curaçao", "Curacao"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Willemstad"]
	},
	cx: {
		nam: ["Christmas Island"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Australia and New Zealand",
		type: CountryType.TERRITORY,
		capital: ["Flying Fish Cove", "Flying Fish"]
	},
	cy: {
		nam: ["Cyprus"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Nicosia"]
	},
	cz: {
		nam: ["Czech Republic", "Czechia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Prague"]
	},
	de: {
		nam: ["Germany"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.COUNTRY,
		capital: ["Berlin"]
	},
	dj: {
		nam: ["Djibouti"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Djibouti"]
	},
	dk: {
		nam: ["Denmark"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Copenhagen"]
	},
	dm: {
		nam: ["Dominica"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Roseau"]
	},
	do: {
		nam: ["Dominican Republic"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Santo Domingo"]
	},
	dz: {
		nam: ["Algeria"],
		region: CountryRegion.AFRICA,
		regionDetail: "Northern Africa",
		type: CountryType.COUNTRY,
		capital: ["Algiers"]
	},
	ec: {
		nam: ["Ecuador"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Quito"]
	},
	ee: {
		nam: ["Estonia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Tallinn"]
	},
	eg: {
		nam: ["Egypt"],
		region: CountryRegion.AFRICA,
		regionDetail: "Northern Africa",
		type: CountryType.COUNTRY,
		capital: ["Cairo"]
	},
	eh: {
		nam: ["Western Sahara"],
		region: CountryRegion.AFRICA,
		regionDetail: "Northern Africa",
		type: CountryType.TERRITORY,
		capital: ["Laayoune", "Laâyoune", "El Aaiún", "El Aaiun"]
	},
	er: {
		nam: ["Eritrea"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Asmara"]
	},
	es: {
		nam: ["Spain"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Madrid"]
	},
	et: {
		nam: ["Ethiopia"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Addis Ababa"]
	},
	eu: {
		nam: ["European Union", "EU"],
		type: CountryType.OTHER
	},
	fi: {
		nam: ["Finland"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Helsinki"]
	},
	fj: {
		nam: ["Fiji"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Melanesia",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Suva"]
	},
	fk: {
		nam: ["Falkland Islands", "Falklands", "Malvinas"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Stanley"]
	},
	fm: {
		nam: ["Federated States of Micronesia", "Micronesia"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Micronesia",
		type: CountryType.COUNTRY,
		capital: ["Palikir"]
	},
	fo: {
		nam: ["Faroe Islands", "Faroe"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.TERRITORY,
		capital: ["Tórshavn", "Torshavn"]
	},
	fr: {
		nam: ["France"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.COUNTRY,
		capital: ["Paris"]
	},
	ga: {
		nam: ["Gabon"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Libreville"]
	},
	gb: {
		nam: ["United Kingdom", "UK", "GB", "Great Britain"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["London"]
	},
	gd: {
		nam: ["Grenada"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Saint George's", "Saint George", "St. George's", "St. George"]
	},
	ge: {
		nam: ["Georgia"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Tbilisi"]
	},
	gf: {
		nam: ["French Guiana", "French Guyana"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Cayenne"]
	},
	gg: {
		nam: ["Guernsey"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.TERRITORY,
		capital: ["Saint Peter Port", "St. Peter Port"]
	},
	gh: {
		nam: ["Ghana"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Accra"]
	},
	gi: {
		nam: ["Gibraltar"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.TERRITORY,
		capital: ["Westside"]
	},
	gl: {
		nam: ["Greenland"],
		region: CountryRegion.NORTH_AMERICA,
		regionDetail: "Northern America",
		type: CountryType.COUNTRY,
		capital: ["Nuuk"]
	},
	gm: {
		nam: ["Gambia"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Banjul"]
	},
	gn: {
		nam: ["Guinea"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Conakry"]
	},
	gp: {
		nam: ["Guadeloupe"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Basse-Terre", "Basse Terre"]
	},
	gq: {
		nam: ["Equatorial Guinea"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Malabo"]
	},
	gr: {
		nam: ["Greece"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Athens"]
	},
	gs: {
		nam: ["South Georgia and the South Sandwich Islands", "South Georgia", "South Sandwich Islands"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.TERRITORY,
		capital: ["King Edward Point"]
	},
	gt: {
		nam: ["Guatemala"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Guatemala City"]
	},
	gu: {
		nam: ["Guam"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Micronesia",
		type: CountryType.TERRITORY,
		capital: ["Hagåtña", "Hagatna"]
	},
	gw: {
		nam: ["Guinea-Bissau", "Guinea Bissau"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Bissau"]
	},
	gy: {
		nam: ["Guyana"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Georgetown"]
	},
	hk: {
		nam: ["Hong Kong"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.TERRITORY
	},
	hm: {
		nam: ["Heard Island and McDonald Islands", "Heard Island", "McDonald Islands", "Australia"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Australia and New Zealand",
		type: CountryType.TERRITORY
	},
	hn: {
		nam: ["Honduras"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Tegucigalpa"]
	},
	hr: {
		nam: ["Croatia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Zagreb"]
	},
	ht: {
		nam: ["Haiti"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Port au Prince"]
	},
	hu: {
		nam: ["Hungary"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Budapest"]
	},
	id: {
		nam: ["Indonesia"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Jakarta"]
	},
	ie: {
		nam: ["Ireland"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Dublin"]
	},
	il: {
		nam: ["Israel"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Jerusalem"]
	},
	im: {
		nam: ["Isle of Man"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.TERRITORY,
		capital: ["Douglas"]
	},
	in: {
		nam: ["India"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["New Delhi"]
	},
	io: {
		nam: ["British Indian Ocean Territory", "British Indian Ocean"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.TERRITORY,
		capital: ["Camp Thunder Cove", "Thunder Cove"]
	},
	iq: {
		nam: ["Iraq"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Baghdad"]
	},
	ir: {
		nam: ["Iran"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Tehran"]
	},
	is: {
		nam: ["Iceland"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Reykjavik"]
	},
	it: {
		nam: ["Italy"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Rome"]
	},
	je: {
		nam: ["Bailiwick of Jersey", "Jersey"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.TERRITORY,
		capital: ["Saint Helier", "St. Helier"]
	},
	jm: {
		nam: ["Jamaica"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Kingston"]
	},
	jo: {
		nam: ["Jordan"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Amman"]
	},
	jp: {
		nam: ["Japan"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Tokyo"]
	},
	ke: {
		nam: ["Kenya"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Nairobi"]
	},
	kg: {
		nam: ["Kyrgyzstan"],
		region: CountryRegion.ASIA,
		regionDetail: "Central Asia",
		type: CountryType.COUNTRY,
		capital: ["Bishkek"]
	},
	kh: {
		nam: ["Cambodia"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Phnom Penh"]
	},
	ki: {
		nam: ["Kiribati"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Micronesia",
		type: CountryType.COUNTRY,
		capital: ["Tarawa Atoll"]
	},
	km: {
		nam: ["Comoros"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Moroni"]
	},
	kn: {
		nam: ["Saint Kitts and Nevis", "Saint Kitts", "St. Kitts", "Kitts and Nevis"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Basseterre"]
	},
	kp: {
		nam: ["North Korea"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Pyongyang"]
	},
	kr: {
		nam: ["South Korea"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Seoul"]
	},
	kw: {
		nam: ["Kuwait"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Kuwait City"]
	},
	ky: {
		nam: ["Cayman Islands"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["George Town"]
	},
	kz: {
		nam: ["Kazakhstan"],
		region: CountryRegion.ASIA,
		regionDetail: "Central Asia",
		type: CountryType.COUNTRY,
		capital: ["Nur-Sultan", "Nur Sultan"]
	},
	la: {
		nam: ["Lao People's Democratic Republic", "Laos"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Vientiane"]
	},
	lb: {
		nam: ["Lebanon"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Beirut"]
	},
	lc: {
		nam: ["Saint Lucia", "St. Lucia"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Castries"]
	},
	li: {
		nam: ["Liechtenstein"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Vaduz"]
	},
	lk: {
		nam: ["Sri Lanka"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Sri Jayawardenapura Kotte"]
	},
	lr: {
		nam: ["Liberia"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Monrovia"]
	},
	ls: {
		nam: ["Lesotho"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Maseru"]
	},
	lt: {
		nam: ["Lithuania"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Vilnius"]
	},
	lu: {
		nam: ["Luxembourg"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Luxembourg"]
	},
	lv: {
		nam: ["Latvia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Riga"]
	},
	ly: {
		nam: ["Libya"],
		region: CountryRegion.AFRICA,
		regionDetail: "Northern Africa",
		type: CountryType.COUNTRY,
		capital: ["Tripoli"]
	},
	ma: {
		nam: ["Morocco"],
		region: CountryRegion.AFRICA,
		regionDetail: "Northern Africa",
		type: CountryType.COUNTRY,
		capital: ["Rabat"]
	},
	mc: {
		nam: ["Monaco"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Monaco"]
	},
	md: {
		nam: ["Republic of Moldova", "Moldova"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Chișinău", "Chisinau"]
	},
	me: {
		nam: ["Montenegro"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Podgorica"]
	},
	mf: {
		nam: ["Saint Martin", "St. Martin"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Marigot"]
	},
	mg: {
		nam: ["Madagascar"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Antananarivo"]
	},
	mh: {
		nam: ["Marshall Islands"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Micronesia",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Majuro"]
	},
	mk: {
		nam: ["North Macedonia", "Macedonia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Skopje"]
	},
	ml: {
		nam: ["Mali"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Bamako"]
	},
	mm: {
		nam: ["Myanmar"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Naypyidaw", "Nay Pyi Daw"]
	},
	mn: {
		nam: ["Mongolia"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Ulaanbaatar"]
	},
	mo: {
		nam: ["Macao", "Macau"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.TERRITORY
	},
	mp: {
		nam: ["Northern Mariana Islands", "Mariana Islands"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Micronesia",
		type: CountryType.TERRITORY,
		capital: ["Saipan"]
	},
	mq: {
		nam: ["Martinique"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Fort-de-France"]
	},
	mr: {
		nam: ["Mauritania"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Nouakchott"]
	},
	ms: {
		nam: ["Montserrat"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Plymouth", "Brades"]
	},
	mt: {
		nam: ["Malta"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Valletta"]
	},
	mu: {
		nam: ["Mauritius"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Port Louis"]
	},
	mv: {
		nam: ["Maldives"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Male"]
	},
	mw: {
		nam: ["Malawi"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Lilongwe"]
	},
	mx: {
		nam: ["Mexico"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Mexico City"]
	},
	my: {
		nam: ["Malaysia"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Kuala Lumpur"]
	},
	mz: {
		nam: ["Mozambique"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Maputo"]
	},
	na: {
		nam: ["Namibia"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Windhoek"]
	},
	nc: {
		nam: ["New Caledonia", "Caledonia"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Melanesia",
		type: CountryType.TERRITORY,
		capital: ["Nouméa", "Noumea"]
	},
	ne: {
		nam: ["Niger"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Niamey"]
	},
	nf: {
		nam: ["Norfolk Island"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Australia and New Zealand",
		type: CountryType.TERRITORY,
		capital: ["Kingston"]
	},
	ng: {
		nam: ["Nigeria"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Abuja"]
	},
	ni: {
		nam: ["Nicaragua"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Managua"]
	},
	nl: {
		nam: ["The Netherlands", "Netherlands"],
		region: CountryRegion.EUROPE,
		regionDetail: "Western Europe",
		type: CountryType.COUNTRY,
		capital: ["Amsterdam"]
	},
	no: {
		nam: ["Norway"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Oslo"]
	},
	np: {
		nam: ["Nepal"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Kathmandu"]
	},
	nr: {
		nam: ["Nauru"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Micronesia",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Yaren"]
	},
	nu: {
		nam: ["Niue"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Alofi"]
	},
	nz: {
		nam: ["New Zealand"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Australia and New Zealand",
		type: CountryType.COUNTRY,
		capital: ["Wellington"]
	},
	om: {
		nam: ["Oman"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Muscat"]
	},
	pa: {
		nam: ["Panama"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Panama City"]
	},
	pe: {
		nam: ["Peru"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Lima"]
	},
	pf: {
		nam: ["French Polynesia", "Tahiti"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.TERRITORY,
		capital: ["Papeete"]
	},
	pg: {
		nam: ["Papua New Guinea"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Melanesia",
		type: CountryType.COUNTRY,
		capital: ["Port Moresby"]
	},
	ph: {
		nam: ["Philippines"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Manila"]
	},
	pk: {
		nam: ["Pakistan"],
		region: CountryRegion.ASIA,
		regionDetail: "Southern Asia",
		type: CountryType.COUNTRY,
		capital: ["Islamabad"]
	},
	pl: {
		nam: ["Poland"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Warsaw"]
	},
	pm: {
		nam: ["Saint Pierre and Miquelon", "St. Pierre and Miquelon", "Pierre and Miquelon"],
		region: CountryRegion.NORTH_AMERICA,
		regionDetail: "Northern America",
		type: CountryType.TERRITORY,
		capital: ["Saint-Pierre", "Saint Pierre", "St. Pierre"]
	},
	pn: {
		nam: ["Pitcairn Islands"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.TERRITORY
	},
	pr: {
		nam: ["Puerto Rico"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["San Juan"]
	},
	ps: {
		nam: ["State of Palestine", "Palestine"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Jerusalem"]
	},
	pt: {
		nam: ["Portugal"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Lisbon"]
	},
	pw: {
		nam: ["Palau"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Micronesia",
		type: CountryType.COUNTRY,
		capital: ["Melekeok"]
	},
	py: {
		nam: ["Paraguay"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Asuncion"]
	},
	qa: {
		nam: ["Qatar"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Doha"]
	},
	re: {
		nam: ["Réunion", "Reunion"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.TERRITORY,
		capital: ["Saint-Denis", "Saint Denis", "St. Denis"]
	},
	ro: {
		nam: ["Romania"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Bucharest"]
	},
	rs: {
		nam: ["Serbia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Belgrade"]
	},
	ru: {
		nam: ["Russian Federation", "Russia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Moscow"]
	},
	rw: {
		nam: ["Rwanda"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Kigali"]
	},
	sa: {
		nam: ["Saudi Arabia"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Riyadh"]
	},
	sb: {
		nam: ["Solomon Islands"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Melanesia",
		type: CountryType.COUNTRY,
		capital: ["Honiara"]
	},
	sc: {
		nam: ["Seychelles"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Victoria"]
	},
	sd: {
		nam: ["Sudan"],
		region: CountryRegion.AFRICA,
		regionDetail: "Northern Africa",
		type: CountryType.COUNTRY,
		capital: ["Khartoum"]
	},
	se: {
		nam: ["Sweden"],
		region: CountryRegion.EUROPE,
		regionDetail: "Northern Europe",
		type: CountryType.COUNTRY,
		capital: ["Stockholm"]
	},
	sg: {
		nam: ["Singapore"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Singapore"]
	},
	sh: {
		nam: [
			"Saint Helena, Ascension and Tristan da Cunha",
			"Saint Helena",
			"St. Helena",
			"Ascension",
			"Tristan da Cunha"
		],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.TERRITORY,
		capital: ["Jamestown"]
	},
	si: {
		nam: ["Slovenia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Ljubljana"]
	},
	sk: {
		nam: ["Slovakia"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Bratislava"]
	},
	sl: {
		nam: ["Sierra Leone"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Freetown"]
	},
	sm: {
		nam: ["San Marino"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.SMALL_COUNTRY,
		capital: ["San Marino"]
	},
	sn: {
		nam: ["Senegal"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Dakar"]
	},
	so: {
		nam: ["Somalia"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Mogadishu"]
	},
	sr: {
		nam: ["Suriname"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Paramaribo"]
	},
	ss: {
		nam: ["South Sudan"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Juba"]
	},
	st: {
		nam: ["São Tomé and Príncipe", "Sao Tome and Principe", "Sao Tome"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Sao Tome"]
	},
	sv: {
		nam: ["El Salvador"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["San Salvador"]
	},
	sx: {
		nam: ["Sint Maarten", "Saint Martin"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Philipsburg"]
	},
	sy: {
		nam: ["Syrian Arab Republic", "Syria"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Damascus"]
	},
	sz: {
		nam: ["Eswatini (Swaziland)", "Swaziland", "Eswatini"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Mbabane", "Lobamba"]
	},
	tc: {
		nam: ["Turks and Caicos Islands", "Turks and Caicos"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Cockburn Town"]
	},
	td: {
		nam: ["Chad"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["N'Djamena", "N Djamena"]
	},
	tf: {
		nam: ["French Southern and Antarctic Lands", "French Southern Territories"],
		region: CountryRegion.AFRICA,
		regionDetail: "Eastern Africa",
		type: CountryType.TERRITORY,
		capital: ["Saint Pierre", "St. Pierre"]
	},
	tg: {
		nam: ["Togo"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Lome"]
	},
	th: {
		nam: ["Thailand"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Bangkok"]
	},
	tj: {
		nam: ["Tajikistan"],
		region: CountryRegion.ASIA,
		regionDetail: "Central Asia",
		type: CountryType.COUNTRY,
		capital: ["Dushanbe"]
	},
	tk: {
		nam: ["Tokelau"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.TERRITORY,
		capital: ["Nukunonu"]
	},
	tl: {
		nam: ["Democratic Republic of Timor-Leste", "Timor-Leste", "Timor Leste", "East Timor"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Dili"]
	},
	tm: {
		nam: ["Turkmenistan"],
		region: CountryRegion.ASIA,
		regionDetail: "Central Asia",
		type: CountryType.COUNTRY,
		capital: ["Ashgabat"]
	},
	tn: {
		nam: ["Tunisia"],
		region: CountryRegion.AFRICA,
		regionDetail: "Northern Africa",
		type: CountryType.COUNTRY,
		capital: ["Tunis"]
	},
	to: {
		nam: ["Tonga"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.COUNTRY,
		capital: ["Nuku'alofa", "Nuku alofa"]
	},
	tr: {
		nam: ["Turkey", "Türkiye", "Turkiye"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Ankara"]
	},
	tt: {
		nam: ["Trinidad and Tobago", "Trinidad"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Port of Spain"]
	},
	tv: {
		nam: ["Tuvalu"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.COUNTRY,
		capital: ["Funafuti"]
	},
	tw: {
		nam: ["Taiwan"],
		region: CountryRegion.ASIA,
		regionDetail: "Eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Taipei City"]
	},
	tz: {
		nam: ["United Republic of Tanzania", "Republic of Tanzania", "Tanzania"],
		region: CountryRegion.AFRICA,
		regionDetail: "Eastern Africa",
		type: CountryType.COUNTRY,
		capital: ["Dodoma"]
	},
	ua: {
		nam: ["Ukraine"],
		region: CountryRegion.EUROPE,
		regionDetail: "Eastern Europe",
		type: CountryType.COUNTRY,
		capital: ["Kyiv", "Kiev"]
	},
	ug: {
		nam: ["Uganda"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Kampala"]
	},
	un: {
		nam: ["United Nations", "UN"],
		type: CountryType.OTHER
	},
	us: {
		nam: ["United States of America", "United States", "US", "USA"],
		region: CountryRegion.NORTH_AMERICA,
		regionDetail: "Northern America",
		type: CountryType.COUNTRY,
		capital: ["Washington, D.C.", "Washington", "Washington DC"]
	},
	uy: {
		nam: ["Uruguay"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Montevideo"]
	},
	uz: {
		nam: ["Uzbekistan"],
		region: CountryRegion.ASIA,
		regionDetail: "Central Asia",
		type: CountryType.COUNTRY,
		capital: ["Tashkent"]
	},
	va: {
		nam: ["Vatican City (Holy See)", "Vatican", "Vatican City", "Holy See"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.SMALL_COUNTRY
	},
	vc: {
		nam: ["Saint Vincent and the Grenadines", "Saint Vincent", "St. Vincent"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.SMALL_COUNTRY,
		capital: ["Kingstown"]
	},
	ve: {
		nam: ["Venezuela"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.COUNTRY,
		capital: ["Caracas"]
	},
	vg: {
		nam: ["British Virgin Islands", "UK Virgin Islands", "UK Virgin"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Road Town"]
	},
	vi: {
		nam: ["United States Virgin Islands", "US Virgin Islands", "US Virgin", "American Virgin Islands"],
		region: CountryRegion.SOUTH_AMERICA,
		regionDetail: "Latin America and the Caribbean",
		type: CountryType.TERRITORY,
		capital: ["Charlotte Amalie"]
	},
	vn: {
		nam: ["Viet Nam", "Vietnam"],
		region: CountryRegion.ASIA,
		regionDetail: "South-eastern Asia",
		type: CountryType.COUNTRY,
		capital: ["Hanoi"]
	},
	vu: {
		nam: ["Vanuatu"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Melanesia",
		type: CountryType.COUNTRY,
		capital: ["Port Vila"]
	},
	wf: {
		nam: ["Wallis and Futuna Islands", "Wallis and Futuna Island", "Wallis and Futuna", "Wallis Futuna"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.TERRITORY,
		capital: ["Matā'utu", "Mata Utu", "Mata'utu", "Matautu"]
	},
	ws: {
		nam: ["Samoa"],
		region: CountryRegion.OCEANIA,
		regionDetail: "Polynesia",
		type: CountryType.COUNTRY,
		capital: ["Apia"]
	},
	xk: {
		nam: ["Kosovo"],
		region: CountryRegion.EUROPE,
		regionDetail: "Southern Europe",
		type: CountryType.COUNTRY,
		capital: ["Pristina"]
	},
	ye: {
		nam: ["Yemen"],
		region: CountryRegion.ASIA,
		regionDetail: "Western Asia",
		type: CountryType.COUNTRY,
		capital: ["Sana'a", "Sanaa"]
	},
	yt: {
		nam: ["Mayotte"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.TERRITORY,
		capital: ["Mamoudzou"]
	},
	za: {
		nam: ["South Africa", "S Africa"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Pretoria", "Bloemfontein", "Cape Town"]
	},
	zm: {
		nam: ["Zambia"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Lusaka"]
	},
	zw: {
		nam: ["Zimbabwe"],
		region: CountryRegion.AFRICA,
		regionDetail: "Sub-Saharan Africa",
		type: CountryType.COUNTRY,
		capital: ["Harare"]
	}
};

export const countries_gb_states = {
	"gb-eng": "England",
	"gb-nir": "Northern Ireland",
	"gb-sct": "Scotland",
	"gb-wls": "Wales"
};

export const countries_us_states: { [countryCode: string]: okbot.CountryState } = {
	"us-ak": {
		nam: ["Alaska"]
	},
	"us-al": {
		nam: ["Alabama"]
	},
	"us-ar": {
		nam: ["Arkansas"]
	},
	"us-az": {
		nam: ["Arizona"]
	},
	"us-ca": {
		nam: ["California"]
	},
	"us-co": {
		nam: ["Colorado"]
	},
	"us-ct": {
		nam: ["Connecticut"]
	},
	"us-de": {
		nam: ["Delaware"]
	},
	"us-fl": {
		nam: ["Florida"]
	},
	"us-ga": {
		nam: ["Georgia"]
	},
	"us-hi": {
		nam: ["Hawaii"]
	},
	"us-ia": {
		nam: ["Iowa"]
	},
	"us-id": {
		nam: ["Idaho"]
	},
	"us-il": {
		nam: ["Illinois"]
	},
	"us-in": {
		nam: ["Indiana"]
	},
	"us-ks": {
		nam: ["Kansas"]
	},
	"us-ky": {
		nam: ["Kentucky"]
	},
	"us-la": {
		nam: ["Louisiana"]
	},
	"us-ma": {
		nam: ["Massachusetts"]
	},
	"us-md": {
		nam: ["Maryland"]
	},
	"us-me": {
		nam: ["Maine"]
	},
	"us-mi": {
		nam: ["Michigan"]
	},
	"us-mn": {
		nam: ["Minnesota"]
	},
	"us-mo": {
		nam: ["Missouri"]
	},
	"us-ms": {
		nam: ["Mississippi"]
	},
	"us-mt": {
		nam: ["Montana"]
	},
	"us-nc": {
		nam: ["North Carolina"]
	},
	"us-nd": {
		nam: ["North Dakota"]
	},
	"us-ne": {
		nam: ["Nebraska"]
	},
	"us-nh": {
		nam: ["New Hampshire"]
	},
	"us-nj": {
		nam: ["New Jersey"]
	},
	"us-nm": {
		nam: ["New Mexico"]
	},
	"us-nv": {
		nam: ["Nevada"]
	},
	"us-ny": {
		nam: ["New York"]
	},
	"us-oh": {
		nam: ["Ohio"]
	},
	"us-ok": {
		nam: ["Oklahoma"]
	},
	"us-or": {
		nam: ["Oregon"]
	},
	"us-pa": {
		nam: ["Pennsylvania"]
	},
	"us-ri": {
		nam: ["Rhode Island"]
	},
	"us-sc": {
		nam: ["South Carolina"]
	},
	"us-sd": {
		nam: ["South Dakota"]
	},
	"us-tn": {
		nam: ["Tennessee"]
	},
	"us-tx": {
		nam: ["Texas"]
	},
	"us-ut": {
		nam: ["Utah"]
	},
	"us-va": {
		nam: ["Virginia"]
	},
	"us-vt": {
		nam: ["Vermont"]
	},
	"us-wa": {
		nam: ["Washington"]
	},
	"us-wi": {
		nam: ["Wisconsin"]
	},
	"us-wv": {
		nam: ["West Virginia"]
	},
	"us-wy": {
		nam: ["Wyoming"]
	}
};
