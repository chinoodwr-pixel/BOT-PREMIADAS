const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

const fs = require('fs');

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DATA_FILE = './data.json';

let data = {
  activa: false,
  winsNecesarias: 0,
  jugadores: {},
  ganadores: []
};

if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
}

function guardar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

 if (interaction.commandName === 'start') {
  console.log("COMANDO START EJECUTADO");

  const wins = interaction.options.getInteger('wins');

  console.log("Wins:", wins);

    data.activa = true;
    data.winsNecesarias = wins;
    data.jugadores = {};
    data.ganadores = [];

    guardar();

    return interaction.reply(
      `🏆 Premiada iniciada\n🎯 Wins necesarias: ${wins}`
    );
  }

  if (interaction.commandName === 'win') {
    if (!data.activa) {
      return interaction.reply({
        content: '❌ No hay una premiada activa.',
        ephemeral: true
      });
    }

    const nombre = interaction.options.getString('nombre');

    if (!data.jugadores[usuario.id]) {
      data.jugadores[usuario.id] = {
        nombre: usuario.username,
        wins: 0
      };
    }

    data.jugadores[usuario.id].wins++;

    const winsActuales = data.jugadores[usuario.id].wins;

    if (
      winsActuales >= data.winsNecesarias &&
      !data.ganadores.includes(usuario.id)
    ) {
      data.ganadores.push(usuario.id);

      guardar();

      return interaction.reply(
        `🏆 ${usuario.username} ganó la premiada con ${winsActuales} wins`
      );
    }

    guardar();

    return interaction.reply(
      `✅ ${usuario.username} ahora tiene ${winsActuales}/${data.winsNecesarias} wins`
    );

}
 
if (interaction.commandName === 'removewin') {
  const usuario = interaction.options.getUser('usuario');

  if (!data.jugadores[usuario.id]) {
    return interaction.reply(
      `❌ ${usuario.username} no tiene wins registradas.`
    );
  }

  if (data.jugadores[usuario.id].wins > 0) {
    data.jugadores[usuario.id].wins--;
  }

  const winsActuales = data.jugadores[usuario.id].wins;

  guardar();

  return interaction.reply(
    `➖ ${usuario.username} ahora tiene ${winsActuales}/${data.winsNecesarias} wins`
  );
}
  if (interaction.commandName === 'tabla') {
    const jugadores = Object.values(data.jugadores);

    if (jugadores.length === 0) {
      return interaction.reply('📊 No hay wins registradas.');
    }

    jugadores.sort((a, b) => b.wins - a.wins);

    let texto = jugadores
      .map((j, i) => `${i + 1}. ${j.nombre} - ${j.wins} wins`)
      .join('\n');

    return interaction.reply(`🏆 LEADERBOARD\n\n${texto}`);
  }

  if (interaction.commandName === 'end') {
    data.activa = false;

    guardar();

    const nombres = data.ganadores.map(id => {
      return data.jugadores[id]?.nombre || id;
    });

    return interaction.reply(
      `🏆 PREMIADA FINALIZADA\n\nGanadores:\n${nombres.join('\n') || 'Ninguno'}`
    );
  }

  if (interaction.commandName === 'reset') {
    data = {
      activa: false,
      winsNecesarias: 0,
      jugadores: {},
      ganadores: []
    };

    guardar();

    return interaction.reply('✅ Premiada reiniciada.');
  }
});

client.login(TOKEN);
