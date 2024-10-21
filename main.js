const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });
const sqlite3 = require('better-sqlite3-with-prebuilds');
const cron = require('node-cron');

const pathDB = __dirname + '/data/trans_db.db';

const bot_id = 'xxx';
const token = 'xxx';
const adminIds = [
	// xxx
];

const debug = true;

const guild_id = debug ? "xxx" : "xxx";
const channel_id = debug ? "xxx" : "xxx";
const hour = 18; // kdy poslat denní otázku
const rest = new REST({ version: '9' }).setToken(token);
const db = new sqlite3(pathDB, { verbose: console.log });
var guild, channel;

process.on('unhandledRejection', error => {
        console.error('Unhandled error: ', error);
console.log(error);
});

client.on("ready", async () => {
	console.log('tpbot is online!');
	
	client.user.setActivity("over Trans*parent", {
		type: "WATCHING"
	});

	guild = await client.guilds.fetch(guild_id);
	channel = await guild.channels.fetch(channel_id);
});

const commands = [
    {
        name: 'otazka',
        description: 'test',
    }
];

(async () => {
	// 
	if (false)
	{
		const data = new SlashCommandBuilder()
			.setName('otazka')
			.setDescription('Správa otázek.')
			.addStringOption(option =>
				option.setName('akce')
					.setDescription('Co provést')
					.setRequired(true)
					.addChoices(
						{ name: 'pridat', value: 'pridat' },
						{ name: 'smazat', value: 'smazat' },
					))
			.addStringOption(option =>
				option.setName("text_otazky")
					.setRequired(true)
					.setDescription("Text otázky.")
		);
		const data_2 = new SlashCommandBuilder()
			.setName('pocet')
			.setDescription('Vypíše počet otázek');
	
		console.log("registering slash commands");

		await rest.put(
			Routes.applicationGuildCommands(bot_id, guild_id),
			{ body: [data.toJSON(), data_2.toJSON()] 
				
			},
		)
		
		console.log("registering slash commands done");

	}
})();

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (adminIds.includes(interaction.member.user.id))
	{
		if (interaction.commandName === "pocet")
		{
			const row = db.prepare("SELECT COUNT(*) FROM questions").get();
			interaction.reply("Počet otázek: " + row['COUNT(*)']);
		}
		else if (interaction.commandName === "otazka")
		{
			const options = interaction.options.data;
			const akce = options.find(option => option.name === "akce").value;
			const questionText = options.find(option => option.name === "text_otazky").value.trim();

			if (questionText == "") {
				interaction.reply("Otázka nemůže být prázdná.");
			}

			const row = db.prepare("SELECT COUNT(*) FROM questions WHERE LOWER(QuestionText) = ?").get(questionText.toLowerCase());
			const exists = row['COUNT(*)'] > 0;

			if (akce == "pridat") {
				if (exists) {
					interaction.reply("Tato otázka již existuje.");
				}
				else {
					const insert = db.prepare("INSERT INTO questions VALUES(?, '2023-08-28 15:00:00')");
					insert.run(questionText);
			
					console.log('added question: ' + questionText);
					interaction.reply('Přidána nová otázka: ' + questionText);
				}
			}
			else if (akce == "smazat") {
				if (!exists)
				{
					interaction.reply("Tato otázka neexistuje.");
				}
				else
				{
					db.prepare("DELETE FROM questions WHERE LOWER(QuestionText) = ?").run(questionText.toLowerCase());
			
					console.log('deleted question: ' + questionText);
					interaction.reply('Smazána otázka: ' + questionText);
				}
			}
		}
	}
});

function sendQuestion()
{
	const question = db.prepare("SELECT rowid, * FROM questions ORDER BY LastAsked LIMIT 1").get();
	if (question != null)
	{
		channel.send("Denní otázka! " + question["QuestionText"]);
		db.prepare("UPDATE questions SET LastAsked=CURRENT_TIMESTAMP WHERE ROWID=?").run(question["rowid"]);
	}
}

cron.schedule('0 ' + hour + ' * * *', () => {
    console.log("sent daily question");
    sendQuestion();
}, {
    scheduled: true,
    timezone: "Europe/Prague"
});

client.login(token);
