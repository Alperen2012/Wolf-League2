const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent 
  ] 
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const playerSchema = new mongoose.Schema({
  name: String,
  gen: Number,
  transferValue: Number,
  salary: Number,
  role: String, // Takım rolü için ekledik
  contractEndSeason: Number // Sözleşme bitiş sezonu
});

const Player = mongoose.model('Player', playerSchema);

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return; // Botun kendi mesajlarına cevap vermemesi için

  console.log(`Received message: ${message.content}`);

  // w!yardım komutu
  if (message.content.startsWith('w!yardım')) {
    message.reply(`
      **Komutlar:**
      - w!antrenman <oyuncu adı> : Antrenman komutunu kullanmak için.
      - w!çalış <alan1> <alan2> <alan3> : Antrenman çalışmaları başlatmak için.
      - w!oluştur @kullanıcı <Futbolcu İsmi> : Yeni bir futbolcu oluşturmak için.
      - w!teknikdirektör @kullanıcı <Futbolcu İsmi> <takım> : Teknik direktör oluşturmak için.
      - w!kadro-kur <ilk 11 ve yedekler> : İlk 11 ve yedekleri belirlemek için.
      - w!antrenmankur #kanal : Antrenman kanalını ayarlamak için.
      - w!serbestrol @rol : Oyuncunun serbest kalacağı rolü belirlemek için.
      - w!oluşturma : Özelliklerle futbolcu oluşturmak için.
      - w!sıfırlıa : Veritabanını sıfırlamak için.
    `);
  }

  // w!antrenman komutu
  if (message.content.startsWith('w!antrenman')) {
    const args = message.content.split(' ').slice(1);
    if (args.length < 1) {
      return message.reply('Kullanım: w!antrenman <oyuncu adı>');
    }

    const playerName = args[0];
    const player = await Player.findOne({ name: playerName });

    if (!player) {
      return message.reply('Oyuncu bulunamadı.');
    }

    message.reply(`Antrenman başladı! ${playerName} için çalışılacak alanları belirtin: w!çalış <alan1> <alan2> <alan3> (En fazla 3 alan seçilebilir)`);
  }

  // w!çalış komutu
  if (message.content.startsWith('w!çalış')) {
    const args = message.content.split(' ').slice(1);
    if (args.length < 1 || args.length > 3) {
      return message.reply('Kullanım: w!çalış <alan1> <alan2> <alan3> (En fazla 3 alan seçilebilir)');
    }

    const [workout1, workout2, workout3] = args;
    const workoutEffects = {
      Crossing: 0.5, Finishing: 0.5, HeadingAccuracy: 0.5, ShortPassing: 0.5, Volleys: 0.5,
      Skill: 0.5, Dribbling: 0.5, Curve: 0.5, FKAccuracy: 0.5, LongPassing: 0.5, BallControl: 0.5,
      Movement: 0.5, Acceleration: 0.5, SprintSpeed: 0.5, Agility: 0.5, Reactions: 0.5, Balance: 0.5,
      Power: 0.5, ShotPower: 0.5, Jumping: 0.5, Stamina: 0.5, Strength: 0.5, LongShots: 0.5,
      Mentality: 0.5, Aggression: 0.5, Interceptions: 0.5, AttPosition: 0.5, Vision: 0.5, Penalties: 0.5,
      Composure: 0.5, Defending: 0.5, DefensiveAwareness: 0.5, StandingTackle: 0.5, SlidingTackle: 0.5,
      Goalkeeping: 0.5, GKDivining: 0.5, GKHandling: 0.5, GKKicking: 0.5, GKPositioning: 0.5, GKReflexes: 0.5
    };

    let totalEffect = 0;
    [workout1, workout2, workout3].forEach(workout => {
      if (workoutEffects[workout]) {
        totalEffect += workoutEffects[workout];
      }
    });

    const playerName = message.content.split(' ')[1];
    const player = await Player.findOne({ name: playerName });

    if (!player) {
      return message.reply('Oyuncu bulunamadı.');
    }

    player.gen = Math.min(player.gen + totalEffect * 10, 100); // Max gen değeri 100
    await player.save();

    message.reply(`${playerName} oyuncusunun gen değeri antrenman sonucunda ${player.gen} olarak güncellendi.`);
  }

  // w!oluştur komutu
  if (message.content.startsWith('w!oluştur')) {
    const args = message.content.split(' ').slice(1);
    const [userMention, playerName] = args;
    const userId = userMention.replace('<@', '').replace('>', '');
    const user = client.users.cache.get(userId);

    if (!user) {
      return message.reply('Kullanıcı bulunamadı.');
    }

    if (!playerName) {
      return message.reply('Futbolcu ismi belirtmelisiniz.');
    }

    const player = new Player({
      name: playerName,
      gen: 50, // Başlangıç gen değeri
      transferValue: 0,
      salary: 0,
      role: 'Serbest', // Varsayılan rol
      contractEndSeason: null // Varsayılan sözleşme bitiş sezonu
    });

    await player.save();
    message.reply(`Yeni futbolcu ${playerName} oluşturuldu.`);
  }

  // w!teknikdirektör komutu
  if (message.content.startsWith('w!teknikdirektör')) {
    const args = message.content.split(' ').slice(1);
    const [userMention, playerName, teamMention] = args;
    const userId = userMention.replace('<@', '').replace('>', '');
    const user = client.users.cache.get(userId);
    const teamId = teamMention.replace('<@&', '').replace('>', '');
    const teamRole = message.guild.roles.cache.get(teamId);

    if (!user) {
      return message.reply('Kullanıcı bulunamadı.');
    }

    if (!playerName) {
      return message.reply('Futbolcu ismi belirtmelisiniz.');
    }

    if (!teamRole) {
      return message.reply('Takım rolü bulunamadı.');
    }

    // Teknik direktör oluşturma işlemi burada yapılacak
    message.reply(`${playerName} teknik direktörü olarak atandı ve ${teamRole.name} takımında görev yapacak.`);
  }

  // w!kadro-kur komutu
  if (message.content.startsWith('w!kadro-kur')) {
    const args = message.content.split(' ').slice(1);
    const squad = args.join(' ').split(';');
    if (squad.length < 2) {
      return message.reply('Kullanım: w!kadro-kur <ilk 11> ; <yedekler>');
    }

    const [firstEleven, substitutes] = squad;
    message.reply(`**İlk 11:** ${firstEleven}\n**Yedekler:** ${substitutes}`);
  }

  // w!antrenmankur komutu
  if (message.content.startsWith('w!antrenmankur')) {
    const args = message.content.split(' ').slice(1);
    const channelName = args[0];
    const channel = message.guild.channels.cache.find(ch => ch.name === channelName);

    if (!channel) {
      return message.reply('Belirttiğiniz kanal bulunamadı.');
    }

    message.reply(`Antrenman kanalı olarak ${channelName} ayarlandı.`);
  }

  // w!serbestrol komutu
  if (message.content.startsWith('w!serbestrol')) {
    const args = message.content.split(' ').slice(1);
    const roleMention = args[0];
    const roleId = roleMention.replace('<@&', '').replace('>', '');
    const role = message.guild.roles.cache.get(roleId);

    if (!role) {
      return message.reply('Rol bulunamadı.');
    }

    message.reply(`Serbest rol olarak ${role.name} ayarlandı.`);
  }

  // w!oluşturma komutu
  if (message.content.startsWith('w!oluşturma')) {
    const playerName = message.content.split(' ')[1];
    if (!playerName) {
      return message.reply('Futbolcu ismi belirtmelisiniz.');
    }

    message.reply(`Futbolcu ${playerName} oluşturuluyor...`);
    // Özelliklerin DM üzerinden gönderilmesi işlemi
  }

  // w!sıfırlıa komutu
  if (message.content.startsWith('w!sıfırlıa')) {
    await Player.deleteMany({});
    message.reply('Veritabanı sıfırlandı.');
  }
});

client.login(process.env.DISCORD_TOKEN);