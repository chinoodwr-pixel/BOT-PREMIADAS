const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const { getRanking } = require("./ranking.js.txt");

const token = process.env.TOKEN;
const RANKING_CHANNEL_ID = "1517584279566291067";
const LOGS_CHANNEL_ID = "1517584673348517969";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DATA_FILE = './data.json';

let data = {
  activa: false,
  winsNecesarias: 0,
  premioPavos: 0,
  jugadores: {},
  ganadores: []
};

let rankingMessageId = null;

// 📦 cargar data
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
}

// 💾 guardar data
function guardar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 💰 sumar pavos
function sumarPavos(nombre, cantidad) {
  if (!data.jugadores[nombre]) {
    data.jugadores[nombre] = {
      nombre,
      wins: 0,
      pavos: 0,
      canjeado: false
    };
  }

  data.jugadores[nombre].pavos += cantidad;

  if (data.jugadores[nombre].pavos > 2400) {
    data.jugadores[nombre].pavos = 2400;
  }
}

// 📊 actualizar ranking (EDITA MENSAJE)
async function actualizarRanking() {
  const channel = await client.channels.fetch(1517584279566291067);

  const texto = getRanking(data);

  if (!rankingMessageId) {
    const msg = await channel.send("Cargando ranking...");
    rankingMessageId = msg.id;
  }

  const msg = await channel.messages.fetch(rankingMessageId);
  await msg.edit(texto);
}

// 📜 logs
async function log(texto) {
  const channel = await client.channels.fetch(1517584673348517969);
  channel.send(texto);
}

client.once('ready', () => {
  console.log(`✅ Bot listo ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // 🏆 START
  if (interaction.commandName === 'start') {
    data.activa = true;
    data.winsNecesarias = interaction.options.getInteger('wins');
    data.premioPavos = interaction.options.getInteger('pavos');
    data.jugadores = {};
    data.ganadores = [];

    guardar();

    return interaction.reply("🏆 Premiada iniciada");
  }

  // 🎮 WIN
  if (interaction.commandName === 'win') {

    if (!data.activa) {
      return interaction.reply("❌ No hay premiada activa");
    }

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getNumber('cantidad');

    if (!data.jugadores[nombre]) {
      data.jugadores[nombre] = {
        nombre,
        wins: 0,
        pavos: 0,
        canjeado: false
      };
    }

    data.jugadores[nombre].wins += cantidad;

    const winsActuales = data.jugadores[nombre].wins;

    if (
      winsActuales >= data.winsNecesarias &&
      !data.ganadores.includes(nombre)
    ) {
      data.ganadores.push(nombre);

      sumarPavos(nombre, data.premioPavos);

      await actualizarRanking();
      await log(`${nombre} ganó ${data.premioPavos} pavos`);
    }

    guardar();

    return interaction.reply("OK");
  }

  // ➕ PAVOS ADD
  if (interaction.commandName === 'pavos_add') {
    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getInteger('cantidad');

    sumarPavos(nombre, cantidad);

    guardar();
    await actualizarRanking();

    return interaction.reply(`➕ ${nombre} +${cantidad} pavos`);
  }

  // ➖ PAVOS REMOVE
  if (interaction.commandName === 'pavos_remove') {
    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getInteger('cantidad');

    if (data.jugadores[nombre]) {
      data.jugadores[nombre].pavos -= cantidad;
      if (data.jugadores[nombre].pavos < 0) data.jugadores[nombre].pavos = 0;
    }

    guardar();
    await actualizarRanking();

    return interaction.reply(`➖ ${nombre} -${cantidad} pavos`);
  }

  // 👀 INFO
  if (interaction.commandName === 'pavos_info') {
    const nombre = interaction.options.getString('nombre');
    const j = data.jugadores[nombre];

    if (!j) return interaction.reply("❌ No existe jugador");

    const estado = j.canjeado ? "CANJEADO" : "PENDIENTE";

    return interaction.reply(
      `👤 ${nombre}\n💰 ${j.pavos} pavos\n📦 ${estado}`
    );
  }

  // 🔄 RESET
  if (interaction.commandName === 'reset') {
    data = {
      activa: false,
      winsNecesarias: 0,
      premioPavos: 0,
      jugadores: {},
      ganadores: []
    };

    guardar();

    return interaction.reply("🔄 Reset hecho");
  }
});

client.login(TOKEN);