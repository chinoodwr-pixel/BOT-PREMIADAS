const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1512161236937080893";
const GUILD_ID = "1512154824593117195";

const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Inicia una premiada')
    .addIntegerOption(option =>
      option
        .setName('wins')
        .setDescription('Wins necesarias (2-5)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('win')
    .setDescription('Suma una win')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('removewin')
    .setDescription('Quita una win')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('tabla')
    .setDescription('Ver tabla'),

  new SlashCommandBuilder()
    .setName('end')
    .setDescription('Finalizar premiada'),

  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Resetear premiada')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('✅ Comandos registrados');
  } catch (error) {
    console.error(error);
  }
})();