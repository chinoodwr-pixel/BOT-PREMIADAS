const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TABLA_PREMIADAS_ID = '1512262863773892658'; // /tabla
const LISTA_GANADORES_ID = '1517978040003596359'; // ranking pavos (auto)
const LOGS_ID            = '1517978289069883534'; // logs automáticos

const MAX_PAVOS    = 2400;
const DATA_FILE    = '/data/data.json'; // 👈 CAMBIO: ahora usa el Volume persistente de Railway
const HORAS_LIMITE = 72;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let data = {
  activa: false,
  winsNecesarias: 0,
  premioPavos: 0,
  jugadores: {},
  ganadores: [],
  rankingMsgId: null,
  timers: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!data.timers) data.timers = {};
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
      reclamado: false,
      premiadasGanadas: 0,
      winsHistoricas: 0
    };
  }
}

function formatWins(wins) {
  return wins % 1 === 0 ? wins.toString() : wins.toFixed(1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏳ FORMATO TIEMPO RESTANTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function formatTiempoRestante(expira) {
  const diff = expira - Date.now();
  if (diff <= 0) return null;

  const totalMinutos = Math.floor(diff / 1000 / 60);
  const totalHoras   = Math.floor(totalMinutos / 60);
  const dias         = Math.floor(totalHoras / 24);

  if (dias >= 1)         return `${dias} día${dias > 1 ? 's' : ''}`;
  if (totalHoras >= 1)   return `${totalHoras} hora${totalHoras > 1 ? 's' : ''}`;
  return `${totalMinutos} minuto${totalMinutos !== 1 ? 's' : ''}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏳ INICIAR TIMER DE 72HS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function iniciarTimer(nombre, pavos) {
  const expira = Date.now() + HORAS_LIMITE * 60 * 60 * 1000;
  const channel = await client.channels.fetch(LOGS_ID);

  const embed = new EmbedBuilder()
    .setTitle('⏳ Tiempo para reclamar')
    .setDescription(`**${nombre}** tiene **3 días** para reclamar sus **${pavos} pavos**`)
    .setColor(0xF39C12)
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });

  data.timers[nombre] = { expira, logMsgId: msg.id, pavos };
  guardar();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔁 LOOP: actualizar timers cada minuto
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function tickTimers() {
  const channel = await client.channels.fetch(LOGS_ID).catch(() => null);
  if (!channel) return;

  for (const [nombre, timer] of Object.entries(data.timers)) {
    const tiempoStr = formatTiempoRestante(timer.expira);

    try {
      const msg = await channel.messages.fetch(timer.logMsgId);

      if (!tiempoStr) {
        // Expiró → quitar pavos
        if (data.jugadores[nombre]) {
          const pavosQuitados = data.jugadores[nombre].pavos;
          data.jugadores[nombre].pavos = 0;
          await actualizarRankingPavos();

          const embedExp = new EmbedBuilder()
            .setTitle('❌ Tiempo expirado')
            .setDescription(`**${nombre}** no reclamó a tiempo y perdió **${pavosQuitados} pavos**`)
            .setColor(0xE74C3C)
            .setTimestamp();

          await msg.edit({ embeds: [embedExp] });
          guardar();
        }

        delete data.timers[nombre];
        guardar();
      } else {
        // Actualizar contador
        const embedUpd = new EmbedBuilder()
          .setTitle('⏳ Tiempo para reclamar')
          .setDescription(`**${nombre}** tiene **${tiempoStr}** para reclamar sus **${timer.pavos} pavos**`)
          .setColor(0xF39C12)
          .setTimestamp();

        await msg.edit({ embeds: [embedUpd] });
      }
    } catch {
      delete data.timers[nombre];
      guardar();
    }
  }
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
        const ganador = data.ganadores.includes(j.nombre) ? ' 🏆' : '';
        return `${pos} **${j.nombre}**${ganador} — ${formatWins(j.wins)}/${data.winsNecesarias} wins`;
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
function buildPavosEmbed() {
  const jugadores = Object.values(data.jugadores)
    .filter(j => j.pavos > 0)
    .sort((a, b) => b.pavos - a.pavos);

  const medals = ['🥇', '🥈', '🥉'];

  let desc = jugadores.length === 0
    ? '*No hay jugadores con pavos pendientes.*'
    : jugadores.map((j, i) => {
        const pos = medals[i] || `**${i + 1}.**`;
        const estado = j.reclamado ? '✅ Reclamado' : '⏳ Pendiente';
        const timerActivo = data.timers[j.nombre] ? ' ⏳' : '';
        return `${pos} **${j.nombre}**${timerActivo} — 💰 ${j.pavos} pavos — ${estado}`;
      }).join('\n');

  return new EmbedBuilder()
    .setTitle('💰 RANKING DE PAVOS')
    .setDescription(desc)
    .setColor(0x9B59B6)
    .setFooter({ text: `Máximo acumulable: ${MAX_PAVOS} pavos` })
    .setTimestamp();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 ACTUALIZAR RANKING DE PAVOS (auto)
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
      } catch {}
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
  return new EmbedBuilder().setTitle(titulo).setDescription(descripcion).setColor(color).setTimestamp();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 EVENTOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  setInterval(tickTimers, 60 * 1000);
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
      .setDescription(`> 🎯 **Wins necesarias:** ${wins}\n> 💰 **Premio por ganar:** ${pavos} pavos\n\nUsá \`/win\` para sumar wins a los jugadores.`)
      .setColor(0x2ECC71)
      .setFooter({ text: `Iniciada por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log(logEmbed('🏆 Premiada iniciada', `**Staff:** ${interaction.user.username}\n**Wins:** ${wins}\n**Premio:** ${pavos} pavos`, 0x2ECC71));
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

    if (winsActuales >= data.winsNecesarias && !data.ganadores.includes(nombre)) {
      data.ganadores.push(nombre);
      data.jugadores[nombre].premiadasGanadas += 1;

      const pavosGanados = data.premioPavos;
      data.jugadores[nombre].pavos += pavosGanados;
      if (data.jugadores[nombre].pavos > MAX_PAVOS) data.jugadores[nombre].pavos = MAX_PAVOS;

      ganoAhora = true;
      await iniciarTimer(nombre, pavosGanados);
      await actualizarRankingPavos();

      await log(logEmbed(
        '🏆 ¡GANADOR!',
        `**${nombre}** ganó la premiada con **${formatWins(winsActuales)} wins**\n💰 +${pavosGanados} pavos\n⏳ Tiene **72 horas** para reclamar`,
        0xF1C40F
      ));
    }

    guardar();

    const embed = new EmbedBuilder()
      .setColor(ganoAhora ? 0xF1C40F : 0x2ECC71)
      .setTitle(ganoAhora ? '🏆 ¡GANADOR!' : '✅ Win sumada')
      .setDescription(
        `**Jugador:** ${nombre}\n**Wins:** ${formatWins(winsActuales)} / ${data.winsNecesarias}` +
        (ganoAhora ? `\n\n💰 +${data.premioPavos} pavos!\n⏳ Tiene 72 horas para reclamar` : '')
      )
      .setFooter({ text: `+${cantidad} win por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    if (!ganoAhora) {
      await log(logEmbed('➕ Win sumada', `**Jugador:** ${nombre}\n**+${cantidad} win** → Total: ${formatWins(winsActuales)}/${data.winsNecesarias}\n**Staff:** ${interaction.user.username}`, 0x2ECC71));
    }
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
      .setDescription(`**Jugador:** ${nombre}\n**Wins:** ${formatWins(winsActuales)} / ${data.winsNecesarias}`)
      .setColor(0xE74C3C)
      .setFooter({ text: `-${cantidad} win por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log(logEmbed('➖ Win removida', `**Jugador:** ${nombre}\n**-${cantidad} win** → Total: ${formatWins(winsActuales)}/${data.winsNecesarias}\n**Staff:** ${interaction.user.username}`, 0xE74C3C));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📊 /tabla
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'tabla') {
    await interaction.reply({ embeds: [buildTablaEmbed()] });
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
    await log(logEmbed('🔴 Premiada finalizada', `**Finalizó:** ${interaction.user.username}\n**Ganadores:** ${data.ganadores.join(', ') || 'Ninguno'}`, 0xE74C3C));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔄 /reset
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    await log(logEmbed('🔄 Reset de premiada', `**Staff:** ${interaction.user.username}\nLas wins fueron reseteadas. Los pavos se mantienen.`, 0x95A5A6));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⏳ /reclamar
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'reclamar') {
    if (!staff) return interaction.reply({ content: '❌ No tenés permisos.', ephemeral: true });

    const nombre = interaction.options.getString('nombre');

    if (!data.jugadores[nombre]) {
      return interaction.reply({ content: `❌ No existe el jugador **${nombre}**.`, ephemeral: true });
    }

    const teniaTimer = !!data.timers[nombre];

    // Marcar como reclamado y detener timer (si existía)
    data.jugadores[nombre].reclamado = true;

    if (teniaTimer) {
      try {
        const logsChannel = await client.channels.fetch(LOGS_ID);
        const timerMsg = await logsChannel.messages.fetch(data.timers[nombre].logMsgId);
        const embedRec = new EmbedBuilder()
          .setTitle('✅ Premio reclamado a tiempo')
          .setDescription(`**${nombre}** reclamó su premio de **${data.timers[nombre].pavos} pavos** ✅`)
          .setColor(0x2ECC71)
          .setTimestamp();
        await timerMsg.edit({ embeds: [embedRec] });
      } catch {}

      delete data.timers[nombre];
    }

    guardar();
    await actualizarRankingPavos();

    const embed = new EmbedBuilder()
      .setTitle('✅ Reclamo confirmado')
      .setDescription(
        `**${nombre}** reclamó su premio.\nLos pavos están **pendientes de entrega**.` +
        (teniaTimer ? '' : '\n\n⚠️ *No tenía un timer activo (ya había expirado o nunca se inició), pero se marcó como reclamado igual.*')
      )
      .setColor(0x2ECC71)
      .setFooter({ text: `Confirmado por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log(logEmbed('✅ Reclamo confirmado', `**Jugador:** ${nombre}\n**Staff:** ${interaction.user.username}` + (teniaTimer ? '' : '\n*(sin timer activo)*'), 0x2ECC71));
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
    await log(logEmbed('💰 Pavos sumados', `**Jugador:** ${nombre}\n**+${cantidad} pavos** → Total: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`, 0x9B59B6));
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
    await log(logEmbed('💰 Pavos restados', `**Jugador:** ${nombre}\n**-${cantidad} pavos** → Total: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`, 0xE74C3C));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ /canjear (descuenta pavos entregados)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    guardar();
    await actualizarRankingPavos();

    const embed = new EmbedBuilder()
      .setTitle('✅ Pavos entregados')
      .setDescription(`Se entregaron **${cantidad} pavos** a **${nombre}**\nPavos restantes: **${data.jugadores[nombre].pavos}**`)
      .setColor(0x2ECC71)
      .setFooter({ text: `Por ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await log(logEmbed('✅ Pavos entregados', `**Jugador:** ${nombre}\n**-${cantidad} pavos entregados** → Restantes: ${data.jugadores[nombre].pavos}\n**Staff:** ${interaction.user.username}`, 0x2ECC71));
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👀 /pavos_info
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'pavos_info') {
    const nombre = interaction.options.getString('nombre');
    const j = data.jugadores[nombre];

    if (!j) return interaction.reply({ content: `❌ No existe el jugador **${nombre}**.`, ephemeral: true });

    const estado = j.reclamado ? '✅ Reclamado' : '⏳ Pendiente de reclamo';
    let timerTexto = '';
    if (data.timers[nombre]) {
      const restante = formatTiempoRestante(data.timers[nombre].expira);
      timerTexto = restante ? `\n⏳ **Tiempo para reclamar:** ${restante}` : '\n❌ **Tiempo expirado**';
    }

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${nombre}`)
      .setDescription(
        `💰 **Pavos actuales:** ${j.pavos}\n` +
        `📦 **Estado:** ${estado}${timerTexto}\n` +
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
