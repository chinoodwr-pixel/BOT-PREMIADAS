const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LOGS_ID = '1517978289069883534';
const MAX_PAVOS = 2400;
   const DATA_FILE = './data.json';


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let data = {
  activa: false,
  winsNecesarias: 0,
  premioPavos: 0,
  jugadores: {},
  ganadores: []
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

function fechaHoy() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 CLIENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
      fechaGano: null,
      premiadasGanadas: 0,
      winsHistoricas: 0
    };
  }
}

function formatWins(wins) {
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

  let desc = jugadores.length === 0
    ? '*Todavía no hay jugadores con wins.*'
    : jugadores.map((j, i) => {
        const pos = medals[i] || `**${i + 1}.**`;
        const gano = data.ganadores.includes(j.nombre) ? ' 🏆' : '';
        return `${pos} **${j.nombre}**${gano} — ${formatWins(j.wins)}/${data.winsNecesarias} wins`;
      }).join('\n');

  return new EmbedBuilder()
    .setTitle('🏆 LEADERBOARD — PREMIADA')
    .setDescription(desc)
    .setColor(0xF1C40F)
    .setFooter({ text: estado })
    .setTimestamp();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 EMBED: RANKING DE PAVOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildRankingEmbed() {
  const jugadores = Object.values(data.jugadores)
    .filter(j => j.pavos > 0 || j.canjeado)
    .sort((a, b) => b.pavos - a.pavos);

  const medals = ['🥇', '🥈', '🥉'];

  let desc = jugadores.length === 0
    ? '*No hay jugadores con pavos pendientes.*'
    : jugadores.map((j, i) => {
        const pos = medals[i] || `**${i + 1}.**`;
        const estado = j.canjeado ? '✅ Canjeado' : '⏳ Pendiente';
        const fecha = j.fechaGano ? ` — ganó el ${j.fechaGano}` : '';
        return `${pos} **${j.nombre}** — 💰 ${j.pavos} pavos — ${estado}${fecha}`;
      }).join('\n');

  return new EmbedBuilder()
    .setTitle('💰 RANKING DE PAVOS')
    .setDescription(desc)
    .setColor(0x9B59B6)
    .setFooter({ text: `Máximo acumulable: ${MAX_PAVOS} pavos` })
    .setTimestamp();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📜 LOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function log(titulo, descripcion, color = 0x3498DB) {
  try {
    const channel = await client.channels.fetch(LOGS_ID);
    const embed = new EmbedBuilder()
      .setTitle(titulo)
      .setDescription(descripcion)
      .setColor(color)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error enviando log:', err);
  }
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

  // ━━━ /start ━━━
  if (commandName === 'start') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });
    if (data.activa) return interaction.reply({ content: '⚠️ Ya hay una premiada activa. Usá `/end` primero.', ephemeral: true });

    const wins = interaction.options.getInteger('wins');
    const pavos = interaction.options.getInteger('pavos');

    data.activa = true;
    data.winsNecesarias = wins;
    data.premioPavos = pavos;
    data.ganadores = [];

    // Conservar jugadores con pavos, solo resetear sus wins
    const jugadoresConservados = {};
    for (const [nombre, j] of Object.entries(data.jugadores)) {
      if (j.pavos > 0 || j.canjeado) {
        jugadoresConservados[nombre] = { ...j, wins: 0 };
      }
    }
    data.jugadores = jugadoresConservados;
    guardar();

    const embed = new EmbedBuilder()
      .setTitle('🏆 ¡PREMIADA INICIADA!')
      .setDescription(`> 🎯 **Wins necesarias:** ${wins}\n> 💰 **Premio por ganar:** ${pavos} pavos\n\nUsá \`/win\` para sumar wins a los jugadores.`)
      .setColor(0x2ECC71)
      .setFooter({ text: `Iniciada por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log('🏆 Premiada iniciada', `**Staff:** ${interaction.user.username}\n**Wins:** ${wins}\n**Premio:** ${pavos} pavos`, 0x2ECC71);
    return;
  }

  // ━━━ /win ━━━
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

    if (winsActuales >= data.winsNecesarias && !data.ganadores.includes(nombre)) {
      data.ganadores.push(nombre);
      data.jugadores[nombre].premiadasGanadas += 1;
      data.jugadores[nombre].pavos += data.premioPavos;
        data.jugadores[nombre].fechaGano = fechaHoy();
      data.jugadores[nombre].canjeado = false;
      ganoAhora = true;

      await log('🏆 ¡GANADOR!', `**${nombre}** ganó la premiada con **${formatWins(winsActuales)} wins**\n💰 +${data.premioPavos} pavos\n📅 Fecha: ${fechaHoy()}`, 0xF1C40F);
    }

    guardar();

    const embed = new EmbedBuilder()
      .setColor(ganoAhora ? 0xF1C40F : 0x2ECC71)
      .setTitle(ganoAhora ? '🏆 ¡GANADOR!' : '✅ Win sumada')
      .setDescription(
        `**Jugador:** ${nombre}\n**Wins:** ${formatWins(winsActuales)} / ${data.winsNecesarias}` +
        (ganoAhora ? `\n\n💰 +${data.premioPavos} pavos!\n📅 Ganó el ${fechaHoy()}` : '')
      )
      .setFooter({ text: `+${cantidad} win por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    if (!ganoAhora) {
      await log('➕ Win sumada', `**Jugador:** ${nombre}\n**+${cantidad} win** → Total: ${formatWins(winsActuales)}/${data.winsNecesarias}\n**Staff:** ${interaction.user.username}`, 0x2ECC71);
    }
    return;
  }

  // ━━━ /removewin ━━━
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
      .setDescription(`**Jugador:** ${nombre}\n**Wins:** ${formatWins(winsActuales)} / ${data.winsNecesarias}`)
      .setColor(0xE74C3C)
      .setFooter({ text: `-${cantidad} win por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log('➖ Win removida', `**Jugador:** ${nombre}\n**-${cantidad} win** → Total: ${formatWins(winsActuales)}/${data.winsNecesarias}\n**Staff:** ${interaction.user.username}`, 0xE74C3C);
    return;
  }

  // ━━━ /tabla ━━━
  if (commandName === 'tabla') {
    await interaction.reply({ embeds: [buildTablaEmbed()] });
    return;
  }

  // ━━━ /ranking ━━━
  if (commandName === 'ranking') {
    await interaction.reply({ embeds: [buildRankingEmbed()] });
    return;
  }

  // ━━━ /end ━━━
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
    await log('🔴 Premiada finalizada', `**Finalizó:** ${interaction.user.username}\n**Ganadores:** ${data.ganadores.join(', ') || 'Ninguno'}`, 0xE74C3C);
    return;
  }

  // ━━━ /reset ━━━
  if (commandName === 'reset') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const jugadoresConHistorial = {};
    for (const [nombre, j] of Object.entries(data.jugadores)) {
      jugadoresConHistorial[nombre] = { ...j, wins: 0 };
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
    await log('🔄 Reset de premiada', `**Staff:** ${interaction.user.username}\nLas wins fueron reseteadas. Los pavos se mantienen.`, 0x95A5A6);
    return;
  }

  // ━━━ /pavos_add ━━━
  if (commandName === 'pavos_add') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getInteger('cantidad');

    asegurarJugador(nombre);
    data.jugadores[nombre].pavos += cantidad;
    if (!data.jugadores[nombre].fechaGano) data.jugadores[nombre].fechaGano = fechaHoy();

    guardar();

    const embed = new EmbedBuilder()
      .setTitle('💰 Pavos sumados')
      .setDescription(`**${nombre}** recibió **+${cantidad} pavos**\nTotal: **${data.jugadores[nombre].pavos} pavos**`)
      .setColor(0x9B59B6)
      .setFooter({ text: `Por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log('💰 Pavos sumados', `**Jugador:** ${nombre}\n**+${cantidad} pavos** → Total: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`, 0x9B59B6);
    return;
  }

  // ━━━ /pavos_remove ━━━
  if (commandName === 'pavos_remove') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getInteger('cantidad');

    asegurarJugador(nombre);
    data.jugadores[nombre].pavos -= cantidad;
    if (data.jugadores[nombre].pavos < 0) data.jugadores[nombre].pavos = 0;

    guardar();

    const embed = new EmbedBuilder()
      .setTitle('💰 Pavos restados')
      .setDescription(`**${nombre}** perdió **-${cantidad} pavos**\nTotal: **${data.jugadores[nombre].pavos} pavos**`)
      .setColor(0xE74C3C)
      .setFooter({ text: `Por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log('💰 Pavos restados', `**Jugador:** ${nombre}\n**-${cantidad} pavos** → Total: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`, 0xE74C3C);
    return;
  }

  // ━━━ /canjear ━━━
  if (commandName === 'canjear') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');
    const cantidad = interaction.options.getInteger('cantidad');

    if (!data.jugadores[nombre]) {
      return interaction.reply({ content: `❌ No existe el jugador **${nombre}**.`, ephemeral: true });
    }

    if (data.jugadores[nombre].pavos < cantidad) {
      return interaction.reply({ content: `⚠️ **${nombre}** solo tiene **${data.jugadores[nombre].pavos} pavos**, no se pueden descontar ${cantidad}.`, ephemeral: true });
    }

    data.jugadores[nombre].pavos -= cantidad;
    if (data.jugadores[nombre].pavos === 0) data.jugadores[nombre].canjeado = true;
    guardar();

    const embed = new EmbedBuilder()
      .setTitle('✅ Pavos entregados')
      .setDescription(`Se entregaron **${cantidad} pavos** a **${nombre}**\nPavos restantes: **${data.jugadores[nombre].pavos}**`)
      .setColor(0x2ECC71)
      .setFooter({ text: `Por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log('✅ Pavos entregados', `**Jugador:** ${nombre}\n**-${cantidad} pavos entregados** → Restantes: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`, 0x2ECC71);
    return;
  }

  // ━━━ /reclamar ━━━
  if (commandName === 'reclamar') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');

    if (!data.jugadores[nombre]) {
      return interaction.reply({ content: `❌ No existe el jugador **${nombre}**.`, ephemeral: true });
    }

    data.jugadores[nombre].canjeado = true;
    guardar();

    const embed = new EmbedBuilder()
      .setTitle('✅ Reclamo confirmado')
      .setDescription(`**${nombre}** reclamó su premio.\nLos pavos están **pendientes de entrega**.`)
      .setColor(0x2ECC71)
      .setFooter({ text: `Confirmado por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log('✅ Reclamo confirmado', `**Jugador:** ${nombre}\n**Staff:** ${interaction.user.username}`, 0x2ECC71);
    return;
  }

  // ━━━ /pavos_info ━━━
  if (commandName === 'pavos_info') {
    const nombre = interaction.options.getString('nombre');
    const j = data.jugadores[nombre];

    if (!j) return interaction.reply({ content: `❌ No existe el jugador **${nombre}**.`, ephemeral: true });

    const estado = j.canjeado ? '✅ Canjeado' : '⏳ Pendiente de reclamo';
    const fecha = j.fechaGano ? `\n📅 **Ganó el:** ${j.fechaGano}` : '';

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${nombre}`)
      .setDescription(
        `💰 **Pavos actuales:** ${j.pavos}\n` +
        `📦 **Estado:** ${estado}${fecha}\n` +
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
