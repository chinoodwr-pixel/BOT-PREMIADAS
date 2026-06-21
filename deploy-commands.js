const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const CLIENT_ID = "1512161236937080893";
const GUILD_ID  = "1325518514663981228";

const commands = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏆 PREMIADAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Inicia una nueva premiada')
    .addIntegerOption(o => o.setName('wins').setDescription('Wins necesarias para ganar').setRequired(true))
    .addIntegerOption(o => o.setName('pavos').setDescription('Pavos que se entregan al ganar').setRequired(true)),

  new SlashCommandBuilder()
    .setName('win')
    .setDescription('Suma wins a un jugador (0.5 o 1)')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador').setRequired(true))
    .addNumberOption(o =>
      o.setName('cantidad').setDescription('Cantidad de wins').setRequired(true)
        .addChoices({ name: '0.5 wins', value: 0.5 }, { name: '1 win', value: 1 })
    ),

  new SlashCommandBuilder()
    .setName('removewin')
    .setDescription('Quita wins a un jugador (0.5 o 1)')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador').setRequired(true))
    .addNumberOption(o =>
      o.setName('cantidad').setDescription('Cantidad de wins a quitar').setRequired(true)
        .addChoices({ name: '0.5 wins', value: 0.5 }, { name: '1 win', value: 1 })
    ),

  new SlashCommandBuilder()
    .setName('tabla')
    .setDescription('Muestra la tabla de wins de la premiada actual'),

  new SlashCommandBuilder()
    .setName('end')
    .setDescription('Finaliza la premiada activa'),

  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Resetea la premiada actual (mantiene los pavos acumulados)'),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⏳ RECLAMO (72hs)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  new SlashCommandBuilder()
    .setName('reclamar')
    .setDescription('Confirma que el jugador reclamó su premio a tiempo (detiene el timer)')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador').setRequired(true)),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💰 PAVOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  new SlashCommandBuilder()
    .setName('pavos_add')
    .setDescription('Suma pavos manualmente a un jugador')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador').setRequired(true))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de pavos').setRequired(true)),

  new SlashCommandBuilder()
    .setName('pavos_remove')
    .setDescription('Resta pavos manualmente a un jugador')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador').setRequired(true))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de pavos').setRequired(true)),

  new SlashCommandBuilder()
    .setName('canjear')
    .setDescription('Descuenta pavos entregados a un jugador')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador').setRequired(true))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de pavos a descontar').setRequired(true)),

  new SlashCommandBuilder()
    .setName('pavos_info')
    .setDescription('Ver los pavos de un jugador')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador').setRequired(true)),

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🚀 Registrando comandos...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Comandos registrados correctamente');
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
  }
})();