const { Client, GatewayIntentBits } = require('discord.js');



const client = new Client({

  intents: [GatewayIntentBits.Guilds]

});



const token = process.env.TOKEN;



client.once('ready', () => {

  console.log(`✅ Bot conectado como ${client.user.tag}`);

});



client.login(TOKEN);
