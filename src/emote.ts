const emotes = [
  { trigger: "<3", emote: "§c❤" },
  { trigger: ":star:", emote: "§6✮" },
  { trigger: ":yes:", emote: "§a✔" },
  { trigger: ":no:", emote: "§c✖" },
  { trigger: ":java:", emote: "§b☕" },
  { trigger: ":arrow:", emote: "§e➜" },
  { trigger: ":shrug:", emote: "§e¯\\_(ツ)_/¯" },
  { trigger: ":tableflip:", emote: "§c(╯°□°）╯§f︵ §8┻━┻" },
  { trigger: "o/", emote: "§d( ﾟ◡ﾟ)/" },
  { trigger: ":123:", emote: "§a1§e2§c3" },
  { trigger: ":totem:", emote: "§b☉§e_§b☉" },
  { trigger: ":typing:", emote: "§e✎§6..." },
  { trigger: ":maths:", emote: "§a√§e(§aπ+x§e)§a=§cL" },
  { trigger: ":snail:", emote: "§e@§a'§e-§a'" },
  { trigger: ":thinking:", emote: "§6(§a0§6.§ao§c?§6)" },
  { trigger: ":gimme:", emote: "§b༼つ◕_◕༽つ" },
  { trigger: ":wizard:", emote: "§e(§b'-§e')⊃━§c☆ﾟ§d.*･｡ﾟ" },
  { trigger: ":pvp:", emote: "§e⚔" },
  { trigger: ":peace:", emote: "§a✌" },
  { trigger: ":oof:", emote: "§cOOF" },
  { trigger: ":puffer:", emote: "§e<('O')>" },
  { trigger: ":yey:", emote: "§aヽ (◕◡◕) ﾉ" },
  { trigger: ":cat:", emote: "§e= §b＾● ⋏ ●＾§e =" },
  { trigger: ":dab:", emote: "§d<§eo§d/" },
  { trigger: ":dj:", emote: "§9ヽ§5(§d⌐§c■§6_§e■§b)§3ノ§9♬" },
  { trigger: ":snow:", emote: "§b☃" },
  { trigger: "^_^", emote: "§a^_^" },
  { trigger: "h/", emote: "§eヽ(^◇^*)/" },
  { trigger: "^-^", emote: "§a^-^" },
  { trigger: ":sloth:", emote: "§6(§8・§6⊝§8・§6)" },
  { trigger: ":cute:", emote: "§e(§a✿§e◠‿◠)" },
  { trigger: ":dog:", emote: "§6(ᵔᴥᵔ)" },
];
export function emote(content: string) {
  let result = content;
  for (const { trigger, emote } of emotes) {
    result = result.replaceAll(trigger, `${emote}\u00a7r`); //§
  }
  return result;
}
