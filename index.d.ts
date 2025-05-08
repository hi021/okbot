declare namespace okbot {
    type Message = import('discord.js').OmitPartialGroupDMChannel<import('discord.js').Message>;
    type MessageOrInteraction<T> = T extends import('discord.js').ButtonInteraction ? import('discord.js').ButtonInteraction : okbot.Message;
    type TextChannel = import('discord.js').SendableChannels & import('discord.js').TextBasedChannel;
    type Client<boolean> = import('discord.js').Client<boolean> & {
        commands: import('discord.js').Collection<string, okbot.Command>;
        commands_mod: import('discord.js').Collection<string, okbot.Command>;
    };

    type CooldownActivity = 'slot' | 'fish' | 'ok';
    type CooldownActivitySettingName = `${Uppercase<CooldownActivity>}_COOLDOWN`

    type ErrorWithMessageResponse = {error: string};

    type UserExpense = UserIncome & { shop?: number; pond?: number };
	type UserIncome = {
        [game in EstateActivity]?: number;
	};

    type EstateActivity = CasinoGame | 'fish' | 'aqua' | 'bakery' | 'bank'
    type CasinoGame = 'slot' | 'flip' | 'jackpot' | 'bingo' | 'bj' | 'rl' | 'dice' | 'poker';
	type CasinoStatDefault = {
		am: number;
		win?: number;
		highestBet: number;
		highestWin?: { v: number; date: number };
	}; //am is total rounds, win is total wins yes I don't use 2 letter property names anymore fine!!
	type CasinoStatDefaultWithDraw = CasinoStatDefault & { draw?: number };
	type CasinoStat = {
		bingo?: CasinoStatDefault;
		bj?: CasinoStatDefaultWithDraw & { bj?: number /*perfect 21 score count*/; double?: number /*times doubled*/; doubleWin?: number /*times won double*/ };
		dice?: CasinoStatDefaultWithDraw & { totalScore?: number };
		flip?: CasinoStatDefault;
		jackpot?: CasinoStatDefault;
		rl?: CasinoStatDefault & {
			red?: number;
			black?: number;
			green?: number;
			redWin?: number;
			blackWin?: number;
			greenWin?: number;
		};
		slot?: CasinoStatDefaultWithDraw & { bigWin?: number }; // bigWin is wins at 10x payout or higher, draw when payout is 1x
	    poker?: undefined;
    };

	type CasinoTopStat = { _id: string; usernameDiscrim: string; bet: number; won: number; date: number }; //for highest wins rankings

	interface User {
		_id?: string;
		mon?: number;
		monTot?: number; //total money earned
		monLv?: number; //money level
		okTot?: number;
		gay?: number; //number of k!gay uses
		okLv?: number; //unused
		rep?: {
			last?: number; //last time given
			v?: number; //rape amount
			am?: number; //times given
		};
		title?: string; //profile title
		badge?: string; //profile badge emoji
		color?: `#${string}`; //profile embed color (hex)
		day?: {
			last?: number; //last time claimed
			v?: number; //daily amount
			am?: number; //times claimed
			streak?: number; //current days on streak, 5 to get bonus
            streakAm?: number; //times streak bonus claimed
		};
		stimLast?: number; //stimulus: last time claimed
		stimAm?: number; //stimulus: times claimed
		bank?: Bank;
		itms?: { [_id: string]: number }; //inventory purchased from the store {itemId: amountStored}
		fish?: { [_id: string]: number }; //fish in inventory {fishId: amountStored}
		fishTot?: { [_id: string]: number }; //all fish ever caught {fishId: amountCaught}
		fishCol?: { [_id: string]: CollectionItem }; //{fishId: {parts, times finished}}
		fishTotC?: number; //total fish caught numeric
		fishPower?: number; //number of fish caught per cast, can be increased with upgrades from the shop (defaults to 0, will always add 1 when fishing)
		osu?: number; //osu! id
		bottom?: number; //bottom 0-100%
		aqua?: Aquarium;
		pond?: Pond;
		flags?: number; //number of flag quiz rounds won
		boosterC?: number; //number of timed boosters used
		boosters?: { [itemId: string]: TimedBooster }; //active timed boosters {start timestamp, effect time in seconds, item's v}
		boosterCd?: number; //booster cooldown decrementer (in seconds) from purchaseable boosters
		// TODO
		// mine?: {
		// 	floor?: number;
		// 	attempt?: number; //number of attempts for current floor
		// 	attemptT?: number; //last attempt timestamp
		// 	attemptDay?: number; //number of attempts in the given day
		// 	attemptDayT?: number; //day attempts timestamp
		// 	attemptMax?: number; //number of additional possible daily attempts from boosters
		// 	attemptTot?: number; //total number of attempts
		// 	treasureTot?: number; //total number of treasure chests found (for stats)
		// 	hp?: number; //current health
		// 	hpT?: number; //last health timestamp
		// };
		// mineEq?: {
		// 	//equipment IDs
		// 	pick?: number;
		// 	sword?: number;
		// 	armor?: number;
		// 	ringL?: number;
		// 	ringR?: number;
		// };
		// mineStatMineral?: { [mineralId: string]: number };
		// mineStatEnemy?: { [enemyId: string]: number };
		// mineInv?: { [id: string]: number };
		casinoStat?: CasinoStat;
		bakery?: Bakery;
		income?: UserIncome;
		expense?: UserExpense;
	}

	type TimedBooster = { start: number; time: number; v: any; name: string }; //start also works as lastUsed timestamp for cooldowns
	type ExpiredBooster = { start: number; name: string; cooldownRemaining: number }; //cooldownRemaining can be undefined if there's no cooldown:)

	type AquariumTankSize = 'huge' | 'big' | 'med' | 'small';
	interface Aquarium {
		nam?: string;
		lv: number; //upgrade level
		toColl: number; //money to collect
		maxColl: number; //money cap
		lastColl: number; //timestamp last toColl set
		coll: number; //money generated per hour
		collMul: number; //income multiplier
		collTot: number; //multiplied income (indexed for ranking)
		huge: Array<FishAquarium | undefined>; //huge tanks
		big: Array<FishAquarium | undefined>; //big tanks
		med: Array<FishAquarium | undefined>; //medium tanks
		small: Array<FishAquarium | undefined>;
	}

	type BakeryStaff = {
		nam: string;
		emoji: string;
		cost: number; //cost to hire
		lv: number; //req bakery level
		multi: number; //bake time multiplier for all cookies not in specialty
		spec?: { [cookieId: string]: number }; //specialty for cookies with faster baking times
	};
	type BakeryCookie = {
		nam: string;
		emoji: string;
		value: number;
		time: number; //baking time in s
	};
	type BakeryOven = {
		nam: string;
		cost: number; //doler cost
		costRare?: number; //rare cookies cost
		multi: number; //baking time multiplier
		lv: number; //minimum bakery level to purchase
		cookie: string[]; //cookies possible to bake in the oven
		rare: number; //chance for the rare cookie to be baked instead
	};
	type BakeryOvenList = Array<{ id: string; cookie: string } | null>; //null if no oven, id is ovenId, cookie is cookieId
	type BakeryStaffList = Array<string | null>; //staff id or null if none
	interface Bakery {
		nam?: string;
		lv: number;
		ovens: BakeryOvenList;
		staff: BakeryStaffList;
		multi: number; //cookie baking time multiplier
		stat: { [cookieId: string]: number }; //number of each cookie baked
		tot: number; //total cookies baked (index for leaderboards)
		totVal: number; //total value of all cookies baked (index for leaderboards)
		toColl: { [cookieId: string]: number }; //cookies to collect
		toCollTot: number; //total number of cookies to collect
		maxColl: number; //max amount of cookies to collect
		lastColl: number; //timestamp last toColl set
		inv: { [cookieId: string]: number }; //cookies in inventory
		created: number; //bakery purchase timestamp
		lvTime: number; //when upgraded to current level timestamp
	}

	interface Bank {
		lv?: number;
		lvTime?: number; //when upgraded to current level timestamp
		lastWithdraw?: number;
		lastInterest?: number;
		balance: number;
		totDeposit?: number;
	}

	type CollectionItem = {
		1?: number;
		2?: number;
		3?: number;
		4?: number;
		5?: number;
		fin?: number;
	};

	type MineEquipmentItemType = 'sword' | 'pick' | 'ring' | 'armor' | 'collar';
	type MineAnyItemType = MineEquipmentItemType | 'mineral' | 'enemy';
	type MineEquipmentTier =
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12
		| 13
		| 14
		| 15
		| 16
		| 17
		| 18
		| 19;
	interface MineEquipmentItem {
		name: string;
		tier: MineEquipmentTier;
		emoji?: string; // custom emoji instead of the default one from showItemName()
		bonus?: { luck?: number; hp?: number; regen?: number; dmg?: number; def?: number };
		marry?: boolean; // only for rings & collars - whether it's possible to confess using one
	}
	interface MineMineral {
		name: string;
		emoji: string;
		tier: 0 | MineEquipmentTier; // minimum equipment tier that can mine this mineral
		type: FishRarity;
	}
	interface MineEnemy {
		name: string;
		emoji: string;
		dmg: number;
		hp: number;
		drops?: Array<{ type: MineEquipmentItemType | 'mineral'; id: number; am: number[] } | undefined>;
	}

	// artifical interface to allow for string indexing
	interface RankingUser extends User {
		nam?: string;
		'rep.v'?: number;
		'rep.am'?: number;
		'aqua.collTot'?: number;
		'pond.fishTot'?: number;
	}

	interface RankingGuild {
		_id: string;
		all: number;
		nam?: string;
	}

	type RankingField =
		| 'monTot'
		| 'okTot'
		| 'gay'
		| 'bottom'
		| 'rep.v'
		| 'rep.am'
		| 'aqua.collTot'
		| 'pond.fishTot'
		| 'fishTotC';

	interface OsuTrackSettings {
		chn: string; //channel id to send notif to
		plr: number[]; //ids of tracked players
		topGain?: boolean; //whether to show top g50 from given day
		minGain?: number; //minimum player g50 to show notif at all, defaults to 1, can be undefined to skip check
	}

	interface Guild {
		_id: string; //can be _GLOBAL for reactions
		cr?: { [reactionText: string]: string[] }; //custom reactions: {msgToReactTo: Array<possibleResponses>}
		otrack?: OsuTrackSettings; //osu top50 track settings
		pre?: string; //override prefix (k!)
		blacklist?: string[]; //disabled channels' ids (no commands, okays, reactions, only mod commands are not ignored)
		lvl?: boolean; //whether to show level up messages, undefined counts as true
	}

	//store items
	interface Item {
		_id: string; //must conform to AAA0000 (with _ allowed), e.g. CLR0001
		cat: string; //category
		nam: string; //All names should start with a capital letter (the rest should be lowercase)
		desc?: string;
		maxQ?: number; //max purchasable quantity (1 by default or Infinity if timed)
		price: number;
		showV?: boolean; //whether to show a preview of the value in the listing
		emoji?: string; //displayed in the store
		timed?: boolean; //whether a timed booster, defaults to false
		v?: any; //value (if any) e.g. color hex, badge emoji
	}
	type StorePurchaseOrders = Array<{ itm: okbot.Item; am: number }>;

	//fish stored in Fish/fish.ts, loaded from assets/fish.json
	interface FishBasic {
		nam: string;
		emoji: string;
	}
	type FishRarity = 'stinky' | 'ok' | 'cool' | 'rare' | 'collectors' | 'collectors+';
	type FishAquarium = FishBasic & { aq: number /*money generated*/ };
	interface Fish {
		emoji: string;
		type: FishRarity; //rarity
		sort: 0 | 1 | 2 | 3 | 4; //rarity numeric used for sorting (0 - collectors, 4 - stinky)
		price: number; //collectors don't have price
		rare?: number; //relative rarity (fish.json)
		odds?: number[]; //[min, max] in randomInt when casting
		aq?: number; //money generated per 10min in aquarium
	}

	//global fish count from "fish" db collection
	interface FishGlobal {
		_id: string;
		v: number;
	}

	interface JackpotGame {
		plr: { [id: string]: number }; //id: money in the pool
		pool: number; //total money in the pool
		host: string; //user id
		msg: Message; //discord message with the game (for editing)
		time: NodeJS.Timeout | null; //if null then the game has ended
		t: number; //seconds left until the jackpot
	}

	interface PokerPlayer {
		id: string;
		bet: number; //round bet
		playing: 'yes' | 'idle' | 'folded' | 'max'; //either still in the game, folded (force folded by idling), or already bet table max
		cards: Card[]; //2 hole cards
	}
	interface PokerGame {
		plr: PokerPlayer[];
		queuePlr: string[]; //players before starting table's ids
		host: string; //user id
		pot: number; //total money in the pot
		msg: Message; //discord message with the game (for editing)
		idleTimer: NodeJS.Timeout | null; //if null then the game has ended
		currentTurn: number; //playing player's index or -1 if not playing
		bigBlind: number; //forced double min bet player's index (start on 0)
		smallBlind: number; //forced min bet player's index (start on 1)
		cards: Card[]; //5 community cards
		minBet: number;
		maxBet: number;
		round: number; //current round (times cards shown and pot won)
		maxRound: number; //number of games in one table
		betRound: number; //how many times every player bet (for revealing community cards etc)
	}

	type BingoPlayer = { bet: number; board: number[] }; //numbers 0-100 or 100-200 if crossed out
	interface BingoGame {
		plr: { [id: string]: BingoPlayer };
		plrWin: string[]; //ids of players who can say bingo! to win
		host: string; //user id
		msg: Message; //discord message with the game (for editing/replying)
		num: Set<number>; //numbers not rolled yet, 101 - size to get round number
		int: NodeJS.Timeout | null; //number roll interval, if null then not playing
		time?: NodeJS.Timeout; //timeout if the host doesn't start
	}

    type RouletteColor = 'red' | 'black' | 'green';
	type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
	type CardColor = '♣️' | '♠️' | '♥️' | '♦️';
	interface Card {
		num: number; //numeric value
		val: CardValue;
		clr: CardColor;
	}
	interface BlackjackDealer {
		cards: Card[];
		tot: number;
		hasAce?: boolean;
	}
	interface BlackjackGame {
		bet: number;
		hasAce?: boolean;
		tot: number; //total value of cards
		cards: Card[];
		deal: BlackjackDealer; //dealer's game
		msg: Message;
		time: NodeJS.Timeout; //timeout if the game doesn't conclude
		doubled?: boolean; //whether the player has doubled (used to count stats)
	}

	type FishPond = { [name: string]: number }; //accumulated fish since last check
	interface Pond {
		budget: number; //current budget, 1 fish costs 10
		budgetMax: number;
		fish: FishPond; //current fish
		fishNum: number; //current amount of fish
		fishTot: number; //total caught number
		stats: FishPond; //total caught
		fishMax: number; //max stored
		col: number; //last catch timestamp (in seconds)
		lv: number;
		interval: number; //seconds between fish
		nam?: string;
	}

	interface DiceGame {
		from: string; //game author id
		to: string; //game recipient id
		sumFrom: number; //sum of number on the dies of the author
		sumTo: number;
		diceFrom: string[]; //emojis of author's dies
		diceTo: string[];
		nameFrom: string; //author's discord username
		nameTo: string;
		bet: number;
		msg: Message;
		time: NodeJS.Timeout; //timeout if the game doesn't start or interval for rolling new dice if started
	}

	interface FlagGame {
		category: string;
		rounds: number;
		round: number;
		flags: Set<string>; // all potential country codes
		curFlag: string; // country code
		points: { [plrId: string]: number };
		roundTime: number; // ms
		roundStartTime: number; // s
        gameStartTime: number; // ms
		time?: NodeJS.Timeout;
		channel: TextChannel;
        flagMsg: okbot.Message; // current flag round message
	}

	interface Country extends CountryState {
		region?: import('./src/countries').CountryRegion;
		regionDetail?: string;
		capital?: string[];
		type: import('./src/countries').CountryType;
	}
    type CountryState = {nam: string[];}

	type CommandPermission = undefined | 'EVERYONE' | 'GUILD_ADMIN' | 'BOT_ADMIN' | 'BOT_OWNER'; // undefined defaults to EVERYONE
	interface Command {
		name: string;
		category: string; // directory name the source file is in
		alias?: string[];
		description?: string;
		usage?: string;
		usageDetail?: string;
		hidden?: boolean;
		restrict: CommandPermission;
		execute: (msg: Message, args: string[]) => void;
        [additional: string]: any;
	}
}
