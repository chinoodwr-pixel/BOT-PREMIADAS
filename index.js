const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TABLA_PREMIADAS_ID  = '1512262863773892658'; // /tabla
const LISTA_GANADORES_ID  = '1517978040003596359'; // ranking pavos (auto)
const LOGS_ID             = '1517978289069883534'; // logs automáticos

const MAX_PAVOS = 2400;
const DATA_FILE = './data.json';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let data = {
  activa: false,
  winsNecesarias: 0,
  premioPavos: 0,
  jugadores: {},    // { nombre: { wins, pavos, canjeado, premiadasGanadas, winsHistoricas } }
  ganadores: [],    // ganadores de la premiada actual
  rankingMsgId: null
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    console.log('⚠️ No se pudo leer data.json, usando datos vacíos');
  }
}

function guardar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 CLIENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛠️ HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function asegurarJugador(nombre) {
  if (!data.jugadores[nombre]) {
    data.jugadores[nombre] = {
      nombre,
      wins: 0,
      pavos: 0,
      canjeado: false,
      premiadasGanadas: 0,
      winsHistoricas: 0
    };
  }
}

function formatWins(wins) {
  // Muestra 1 en vez de 1.0, pero 0.5 en vez de 0
  return wins % 1 === 0 ? wins.toString() : wins.toFixed(1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 EMBED: TABLA DE WINS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildTablaEmbed() {
  const jugadores = Object.values(data.jugadores)
    .filter(j => j.wins > 0)
    .sort((a, b) => b.wins - a.wins);

  const medals = ['🥇', '🥈', '🥉'];
  const estado = data.activa
    ? `✅ Activa — ${data.winsNecesarias} wins para ganar | 💰 ${data.premioPavos} pavos`
    : '🔴 Sin premiada activa';

  let desc = '';

  if (jugadores.length === 0) {
    desc = '*Todavía no hay jugadores con wins.*';
  } else {
    jugadores.forEach((j, i) => {
      const pos = medals[i] || `**${i + 1}.**`;
      const ganador = data.ganadores.includes(j.nombre) ? ' 🏆' : '';
      desc += `${pos} **${j.nombre}**${ganador} — ${formatWins(j.wins)}/${data.winsNecesarias} wins\n`;
    });
  }

  return new EmbedBuilder()
    .setTitle('🏆 LEADERBOARD — PREMIADA')
    .setDescription(desc)
    .setColor(0xF1C40F)
    .setFooter({ text: estado })
    .setTimestamp();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 EMBED: RANKING DE V-BUCKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildPavosEmbed() {
  const jugadores = Object.values(data.jugadores)
    .filter(j => j.pavos > 0 || j.canjeado)
    .sort((a, b) => b.pavos - a.pavos);

  const medals = ['🥇', '🥈', '🥉'];

  let desc = '';

  if (jugadores.length === 0) {
    desc = '*Todavía no hay jugadores con pavos.*';
  } else {
    jugadores.forEach((j, i) => {
      const pos = medals[i] || `**${i + 1}.**`;
      const estado = j.canjeado ? '✅ Canjeado' : '⏳ Pendiente';
      desc += `${pos} **${j.nombre}** — 💰 ${j.pavos} pavos — ${estado}\n`;
    });
  }

  return new EmbedBuilder()
    .setTitle('💰 RANKING DE V-BUCKS')
    .setDescription(desc)
    .setColor(0x9B59B6)
    .setFooter({ text: `Máximo acumulable: ${MAX_PAVOS} pavos` })
    .setTimestamp();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 ACTUALIZAR RANKING DE V-BUCKS (auto)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function actualizarRankingPavos() {
  try {
    const channel = await client.channels.fetch(LISTA_GANADORES_ID);
    const embed = buildPavosEmbed();

    if (data.rankingMsgId) {
      try {
        const msg = await channel.messages.fetch(data.rankingMsgId);
        await msg.edit({ embeds: [embed] });
        return;
      } catch {
        // mensaje no existe más, mandar uno nuevo
      }
    }

    const msg = await channel.send({ embeds: [embed] });
    data.rankingMsgId = msg.id;
    guardar();
  } catch (err) {
    console.error('❌ Error actualizando ranking de pavos:', err);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📜 LOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function log(embed) {
  try {
    const channel = await client.channels.fetch(LOGS_ID);
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error enviando log:', err);
  }
}

function logEmbed(titulo, descripcion, color = 0x3498DB) {
  return new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descripcion)
    .setColor(color)
    .setTimestamp();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 EVENTOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const staff = interaction.member?.permissions?.has('ManageMessages');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏆 /start
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'start') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });
    if (data.activa) return interaction.reply({ content: '⚠️ Ya hay una premiada activa. Usá `/end` primero.', ephemeral: true });

    const wins = interaction.options.getInteger('wins');
    const pavos = interaction.options.getInteger('pavos');

    data.activa = true;
    data.winsNecesarias = wins;
    data.premioPavos = pavos;
    data.jugadores = {};
    data.ganadores = [];
    guardar();

    const embed = new EmbedBuilder()
      .setTitle('🏆 ¡PREMIADA INICIADA!')
      .setDescription(
        `> 🎯 **Wins necesarias:** ${wins}\n` +
        `> 💰 **Premio por ganar:** ${pavos} pavos\n\n` +
        `Usá \`/win\` para sumar wins a los jugadores.`
      )
      .setColor(0x2ECC71)
      .setFooter({ text: `Iniciada por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '🏆 Premiada iniciada',
      `**Staff:** ${interaction.user.username}\n**Wins:** ${wins}\n**Premio:** ${pavos} pavos`,
      0x2ECC71
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎮 /win
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'win') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });
    if (!data.activa) return interaction.reply({ content: '❌ No hay premiada activa.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getNumber('cantidad');

    asegurarJugador(nombre);
    data.jugadores[nombre].wins += cantidad;
    data.jugadores[nombre].winsHistoricas += cantidad;

    const winsActuales = data.jugadores[nombre].wins;
    let ganoAhora = false;

    // ¿ganó?
    if (winsActuales >= data.winsNecesarias && !data.ganadores.includes(nombre)) {
      data.ganadores.push(nombre);
      data.jugadores[nombre].premiadasGanadas += 1;

      // sumar pavos
      data.jugadores[nombre].pavos += data.premioPavos;
      if (data.jugadores[nombre].pavos > MAX_PAVOS) {
        data.jugadores[nombre].pavos = MAX_PAVOS;
      }

      ganoAhora = true;
      await actualizarRankingPavos();

      await log(logEmbed(
        '🏆 ¡GANADOR!',
        `**${nombre}** ganó la premiada con **${formatWins(winsActuales)} wins**\n💰 +${data.premioPavos} pavos`,
        0xF1C40F
      ));
    }

    guardar();

    const embed = new EmbedBuilder()
      .setColor(ganoAhora ? 0xF1C40F : 0x2ECC71)
      .setTitle(ganoAhora ? '🏆 ¡GANADOR!' : '✅ Win sumada')
      .setDescription(
        `**Jugador:** ${nombre}\n` +
        `**Wins:** ${formatWins(winsActuales)} / ${data.winsNecesarias}` +
        (ganoAhora ? `\n\n💰 +${data.premioPavos} pavos agregados!` : '')
      )
      .setFooter({ text: `+${cantidad} win sumada por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '➕ Win sumada',
      `**Jugador:** ${nombre}\n**+${cantidad} win** → Total: ${formatWins(winsActuales)}/${data.winsNecesarias}\n**Staff:** ${interaction.user.username}`,
      0x2ECC71
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ➖ /removewin
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'removewin') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });
    if (!data.activa) return interaction.reply({ content: '❌ No hay premiada activa.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getNumber('cantidad');

    asegurarJugador(nombre);
    data.jugadores[nombre].wins -= cantidad;
    if (data.jugadores[nombre].wins < 0) data.jugadores[nombre].wins = 0;

    const winsActuales = data.jugadores[nombre].wins;
    guardar();

    const embed = new EmbedBuilder()
      .setTitle('➖ Win removida')
      .setDescription(
        `**Jugador:** ${nombre}\n` +
        `**Wins:** ${formatWins(winsActuales)} / ${data.winsNecesarias}`
      )
      .setColor(0xE74C3C)
      .setFooter({ text: `-${cantidad} win por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '➖ Win removida',
      `**Jugador:** ${nombre}\n**-${cantidad} win** → Total: ${formatWins(winsActuales)}/${data.winsNecesarias}\n**Staff:** ${interaction.user.username}`,
      0xE74C3C
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📊 /tabla
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'tabla') {
    const embed = buildTablaEmbed();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔚 /end
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'end') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });
    if (!data.activa) return interaction.reply({ content: '❌ No hay premiada activa.', ephemeral: true });

    data.activa = false;
    guardar();

    const ganadoresTexto = data.ganadores.length > 0
      ? data.ganadores.map(g => `🏆 **${g}**`).join('\n')
      : '*Nadie ganó esta premiada.*';

    const embed = new EmbedBuilder()
      .setTitle('🔴 Premiada finalizada')
      .setDescription(`**Ganadores:**\n${ganadoresTexto}`)
      .setColor(0xE74C3C)
      .setFooter({ text: `Finalizada por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '🔴 Premiada finalizada',
      `**Finalizó:** ${interaction.user.username}\n**Ganadores:** ${data.ganadores.join(', ') || 'Ninguno'}`,
      0xE74C3C
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔄 /reset
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'reset') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    // Guardamos pavos, historial, etc. Solo reseteamos la premiada
    const jugadoresConHistorial = {};
    for (const [nombre, j] of Object.entries(data.jugadores)) {
      jugadoresConHistorial[nombre] = {
        ...j,
        wins: 0
      };
    }

    data.activa = false;
    data.winsNecesarias = 0;
    data.premioPavos = 0;
    data.jugadores = jugadoresConHistorial;
    data.ganadores = [];
    guardar();

    const embed = new EmbedBuilder()
      .setTitle('🔄 Premiada reseteada')
      .setDescription('Las wins fueron reseteadas.\nLos pavos acumulados se mantienen.')
      .setColor(0x95A5A6)
      .setFooter({ text: `Reset por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '🔄 Reset de premiada',
      `**Staff:** ${interaction.user.username}\nLas wins fueron reseteadas. Los pavos se mantienen.`,
      0x95A5A6
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💰 /pavos_add
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'pavos_add') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getInteger('cantidad');

    asegurarJugador(nombre);
    data.jugadores[nombre].pavos += cantidad;
    if (data.jugadores[nombre].pavos > MAX_PAVOS) data.jugadores[nombre].pavos = MAX_PAVOS;

    guardar();
    await actualizarRankingPavos();

    const embed = new EmbedBuilder()
      .setTitle('💰 Pavos sumados')
      .setDescription(`**${nombre}** recibió **+${cantidad} pavos**\nTotal: **${data.jugadores[nombre].pavos} pavos**`)
      .setColor(0x9B59B6)
      .setFooter({ text: `Por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '💰 Pavos sumados',
      `**Jugador:** ${nombre}\n**+${cantidad} pavos** → Total: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`,
      0x9B59B6
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💰 /pavos_remove
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'pavos_remove') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getInteger('cantidad');

    asegurarJugador(nombre);
    data.jugadores[nombre].pavos -= cantidad;
    if (data.jugadores[nombre].pavos < 0) data.jugadores[nombre].pavos = 0;

    guardar();
    await actualizarRankingPavos();

    const embed = new EmbedBuilder()
      .setTitle('💰 Pavos restados')
      .setDescription(`**${nombre}** perdió **-${cantidad} pavos**\nTotal: **${data.jugadores[nombre].pavos} pavos**`)
      .setColor(0xE74C3C)
      .setFooter({ text: `Por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '💰 Pavos restados',
      `**Jugador:** ${nombre}\n**-${cantidad} pavos** → Total: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`,
      0xE74C3C
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ /canjear
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'canjear') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');

    if (!data.jugadores[nombre]) {
      return interaction.reply({ content: `❌ No existe el jugador **${nombre}**.`, ephemeral: true });
    }

    if (data.jugadores[nombre].canjeado) {
      return interaction.reply({ content: `⚠️ **${nombre}** ya tiene sus pavos como canjeados.`, ephemeral: true });
    }

    const pavosCanjeados = data.jugadores[nombre].pavos;
    data.jugadores[nombre].canjeado = true;
    data.jugadores[nombre].pavos = 0;

    guardar();
    await actualizarRankingPavos();

    const embed = new EmbedBuilder()
      .setTitle('✅ Pavos canjeados')
      .setDescription(`**${nombre}** canjeó **${pavosCanjeados} pavos** ✅`)
      .setColor(0x2ECC71)
      .setFooter({ text: `Canjeado por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await log(logEmbed(
      '✅ Canje realizado',
      `**Jugador:** ${nombre}\n**Pavos canjeados:** ${pavosCanjeados}\n**Staff:** ${interaction.user.username}`,
      0x2ECC71
    ));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👀 /pavos_info
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'pavos_info') {
    const nombre = interaction.options.getString('nombre');
    const j = data.jugadores[nombre];

    if (!j) return interaction.reply({ content: `❌ No existe el jugador **${nombre}**.`, ephemeral: true });

    const estado = j.canjeado ? '✅ Canjeado' : '⏳ Pendiente';

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${nombre}`)
      .setDescription(
        `💰 **Pavos actuales:** ${j.pavos}\n` +
        `📦 **Estado:** ${estado}\n` +
        `🏆 **Premiadas ganadas:** ${j.premiadasGanadas || 0}\n` +
        `📊 **Wins históricas:** ${formatWins(j.winsHistoricas || 0)}`
      )
      .setColor(0x3498DB)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }
});

client.login(process.env.TOKEN);