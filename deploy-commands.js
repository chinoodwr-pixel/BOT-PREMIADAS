const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const token = process.env.TOKEN;

const CLIENT_ID = "1512161236937080893";
const GUILD_ID = "1325518514663981228";

const commands = [

  // 🏆 START
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Inicia una premiada')
    .addIntegerOption(option =>
      option
        .setName('wins')
        .setDescription('Wins necesarias')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('pavos')
        .setDescription('Pavos que se entregan al ganar')
        .setRequired(true)
    ),

  // 🎮 WIN
  new SlashCommandBuilder()
    .setName('win')
    .setDescription('Suma wins a un jugador')
    .addStringOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre del jugador')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName('cantidad')
        .setDescription('0.5 o 1')
        .setRequired(true)
    ),

  // ➖ REMOVE WIN
  new SlashCommandBuilder()
    .setName('removewin')
    .setDescription('Quita wins a un jugador')
    .addStringOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre del jugador')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName('cantidad')
        .setDescription('0.5 o 1')
        .setRequired(true)
    ),

  // 📊 TABLA (WINS)
  new SlashCommandBuilder()
    .setName('tabla')
    .setDescription('Ver tabla de wins'),

  // 💰 PAVOS ADD
  new SlashCommandBuilder()
    .setName('pavos_add')
    .setDescription('Sumar pavos a un jugador')
    .addStringOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre del jugador')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad de pavos')
        .setRequired(true)
    ),

  // 💸 PAVOS REMOVE
  new SlashCommandBuilder()
    .setName('pavos_remove')
    .setDescription('Restar pavos a un jugador')
    .addStringOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre del jugador')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad de pavos')
        .setRequired(true)
    ),

  // 👀 INFO PAVOS
  new SlashCommandBuilder()
    .setName('pavos_info')
    .setDescription('Ver estado de pavos de un jugador')
    .addStringOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre del jugador')
        .setRequired(true)
    ),

  // 🔚 END
  new SlashCommandBuilder()
    .setName('end')
    .setDescription('Finaliza la premiada'),

  // 🔄 RESET
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reinicia todo el sistema')

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🚀 Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('✅ Comandos registrados correctamente');
  } catch (err) {
    console.error(err);
  }
})();