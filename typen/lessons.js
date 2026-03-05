/* ═══════════════════════════════════════════════════════════════
   LESSON DATA - TobyTypen
   28 lessen, achievement definities, keyboard layout, constanten
   ═══════════════════════════════════════════════════════════════ */

// ═══ LESSON DATA ═══
const LESSONS = [
    // Fase 1: Thuisrij (1-5)
    {
        num:1, title:"Les 1 - Thuispositie", phase:1, phaseName:"Thuisrij",
        newLetters:["f","j"], allLetters:["f","j"],
        fingerHint:"Wijsvingers! Links: F (met voelstreepje) — Rechts: J (met voelstreepje)",
        words1:["f","j","f","j","f","f","j","j","f","j","f","j","j","f","f","j"],
        words2:["fj","jf","fjfj","jfjf","ff","jj","fjf","jfj","ffjj","jjff","fjjf","jffj"],
        words3:["fjfj","jfjf","ffjj","jjff","fjf","jfj","ffj","jjf","fjjf","jffj","fjfjfj","jfjfjf"],
        boss:{emoji:"🐛",name:"Rups",hp:5}
    },
    {
        num:2, title:"Les 2 - Middelvingers", phase:1, phaseName:"Thuisrij",
        newLetters:["d","k"], allLetters:["f","j","d","k"],
        fingerHint:"Middelvingers! Links: D — Rechts: K",
        words1:["d","k","d","k","d","d","k","k","d","k","d","k","k","d","d","k"],
        words2:["dk","kd","fd","jk","dkdk","fdjk","kdfj","dfkj","fdk","jkd","kdf","djf"],
        words3:["dkfj","fjdk","kdfjdk","dkjf","fdjkfd","jkdfjk","dffk","kjfd","dkdk","fjfj"],
        boss:{emoji:"🐌",name:"Slak",hp:5}
    },
    {
        num:3, title:"Les 3 - Ringvingers", phase:1, phaseName:"Thuisrij",
        newLetters:["s","l"], allLetters:["f","j","d","k","s","l"],
        fingerHint:"Ringvingers! Links: S — Rechts: L",
        words1:["s","l","s","l","s","s","l","l","s","l","s","l","l","s","s","l"],
        words2:["sl","ls","sdf","lkj","sldk","fjls","dksl","sdkl","flds","jksl","lds","skf"],
        words3:["sdfjkl","lkjfds","sldfkj","dkslfjd","fdsljk","jkldfs","sflk","dlsj","fsjl","dkfs"],
        boss:{emoji:"🐸",name:"Kikker",hp:6}
    },
    {
        num:4, title:"Les 4 - Pinken", phase:1, phaseName:"Thuisrij",
        newLetters:["a",";"], allLetters:["a","s","d","f","j","k","l",";"],
        fingerHint:"Pinken! Links: A — Rechts: ;",
        words1:["a",";","a",";","a","a",";",";","a",";","a",";",";","a","a",";"],
        words2:["als","dal","kas","lak","jak","sla","das","klas","sal","jas","laks","ska"],
        words3:["allas","dalkas","slakas","lakdas","klasja","jaksla","daklas","saldak","jaskal","skalas"],
        boss:{emoji:"🦎",name:"Hagedis",hp:6}
    },
    {
        num:5, title:"Les 5 - Index Stretch", phase:1, phaseName:"Thuisrij",
        newLetters:["g","h"], allLetters:["a","s","d","f","g","h","j","k","l",";"],
        fingerHint:"Wijsvingers strekken! Links: G — Rechts: H",
        words1:["g","h","g","h","g","g","h","h","g","h","g","h","h","g","g","h"],
        words2:["gaf","had","glas","half","has","dag","lag","hak","gal","has","slag","gash"],
        words3:["glas","half","slag","flash","klash","ghalf","daghas","lagash","galhas","hasgal"],
        boss:{emoji:"🐲",name:"Draak",hp:8}, bigBoss:true
    },
    // Fase 2: Klinkers (6-9)
    {
        num:6, title:"Les 6 - Eerste Klinker!", phase:2, phaseName:"Klinkers",
        newLetters:["e"], allLetters:["a","s","d","f","g","h","j","k","l",";","e"],
        fingerHint:"Middelvinger links omhoog naar E!",
        words1:["e","e","e","e","e","e","e","e","e","e","e","e","e","e","e","e"],
        words2:["de","fee","les","elf","held","geld","jade","lef","hek","lek","deel","geef"],
        words3:["heelde","gesel","segel","feesje","lesse","hekje","geleed","delfs","geldas","elfde"],
        boss:{emoji:"🦇",name:"Vleermuis",hp:6}
    },
    {
        num:7, title:"Les 7 - De I", phase:2, phaseName:"Klinkers",
        newLetters:["i"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i"],
        fingerHint:"Middelvinger rechts omhoog naar I!",
        words1:["i","i","i","i","i","i","i","i","i","i","i","i","i","i","i","i"],
        words2:["die","hij","is","lid","gif","ski","ei","kiel","file","dief","lies","gilde"],
        words3:["diesel","kiddie","liefde","heide","diefje","gilde","ijdel","ields","fijde","giesel"],
        boss:{emoji:"🦂",name:"Schorpioen",hp:7}
    },
    {
        num:8, title:"Les 8 - De O", phase:2, phaseName:"Klinkers",
        newLetters:["o"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o"],
        fingerHint:"Ringvinger rechts omhoog naar O!",
        words1:["o","o","o","o","o","o","o","o","o","o","o","o","o","o","o","o"],
        words2:["doe","goed","hoe","koel","doel","olie","hoed","lood","gok","hol","sok","koe"],
        words3:["hoofd","goede","koele","olies","hoede","loods","hoekig","goedkol","doelei","hoogsig"],
        boss:{emoji:"🕷️",name:"Spin",hp:7}
    },
    {
        num:9, title:"Les 9 - De U", phase:2, phaseName:"Klinkers",
        newLetters:["u"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u"],
        fingerHint:"Wijsvinger rechts omhoog naar U!",
        words1:["u","u","u","u","u","u","u","u","u","u","u","u","u","u","u","u"],
        words2:["duf","gul","huis","kus","lui","oud","goud","fuif","koud","juf","duel","kuil"],
        words3:["huidig","kuilde","duisel","fuikel","huidje","goudui","judo","iguous","olijfkoud","uidself"],
        boss:{emoji:"🐉",name:"Draken Koning",hp:10}, bigBoss:true
    },
    // Fase 3: Bovenrij Medeklinkers (10-14)
    {
        num:10, title:"Les 10 - De R", phase:3, phaseName:"Bovenrij",
        newLetters:["r"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r"],
        fingerHint:"Wijsvinger links omhoog naar R!",
        words1:["r","r","r","r","r","r","r","r","r","r","r","r","r","r","r","r"],
        words2:["rood","dier","gras","deur","rijke","rug","ree","rek","rok","rid","ros","regio"],
        words3:["ridder","groei","grijs","ruiker","draai","kreukel","roeier","grijsde","kruisel","rigsde"],
        boss:{emoji:"🐺",name:"Wolf",hp:7}
    },
    {
        num:11, title:"Les 11 - De T", phase:3, phaseName:"Bovenrij",
        newLetters:["t"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t"],
        fingerHint:"Wijsvinger links omhoog-links naar T!",
        words1:["t","t","t","t","t","t","t","t","t","t","t","t","t","t","t","t"],
        words2:["het","stel","fiets","tegel","trek","test","kort","stoer","trots","rest","ster","tart"],
        words3:["gieter","terug","sterkte","toetsje","fietsrit","gisterdag","trotseer","testfase","sterretje","ketters"],
        boss:{emoji:"🐻",name:"Beer",hp:8}
    },
    {
        num:12, title:"Les 12 - De W", phase:3, phaseName:"Bovenrij",
        newLetters:["w"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w"],
        fingerHint:"Ringvinger links omhoog naar W!",
        words1:["w","w","w","w","w","w","w","w","w","w","w","w","w","w","w","w"],
        words2:["wie","wat","waar","wist","wit","wol","wijs","wieg","wijk","woord","wil","werk"],
        words3:["water","woord","wereld","wierook","wisselgeld","werkgroei","watertje","wijsheid","wolkje","wilskruid"],
        boss:{emoji:"🦁",name:"Leeuw",hp:8}
    },
    {
        num:13, title:"Les 13 - De P", phase:3, phaseName:"Bovenrij",
        newLetters:["p"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p"],
        fingerHint:"Pink rechts omhoog naar P!",
        words1:["p","p","p","p","p","p","p","p","p","p","p","p","p","p","p","p"],
        words2:["pet","pas","pil","pol","put","pot","prik","drop","stap","klap","plat","port"],
        words3:["plattegrip","paspoort","portier","priester","plotsklaps","dropjes","optreil","petluis","politiek","stipworp"],
        boss:{emoji:"🦅",name:"Arend",hp:8}
    },
    {
        num:14, title:"Les 14 - Q en Y", phase:3, phaseName:"Bovenrij",
        newLetters:["q","y"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y"],
        fingerHint:"Pink links omhoog naar Q — Wijsvinger rechts omhoog naar Y!",
        words1:["q","y","q","y","q","q","y","y","q","y","q","y","y","q","q","y"],
        words2:["yoga","type","yard","yeti","qat","quilt","yogi","query","yes","yet","yep","yoyo"],
        words3:["yoghurt","typist","quiltje","yuppie","queeste","yogales","typfout","yoghurtje","querytyp","yetihut"],
        boss:{emoji:"🐙",name:"Octopus",hp:12}, bigBoss:true
    },
    // Fase 4: Onderrij (15-21)
    {
        num:15, title:"Les 15 - De N", phase:4, phaseName:"Onderrij",
        newLetters:["n"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n"],
        fingerHint:"Wijsvinger rechts omlaag naar N!",
        words1:["n","n","n","n","n","n","n","n","n","n","n","n","n","n","n","n"],
        words2:["den","een","hen","nek","tent","net","eng","kin","pen","ren","tin","kan"],
        words3:["lente","winter","onder","denken","planten","golden","kindje","renner","werken","tinker"],
        boss:{emoji:"🐊",name:"Krokodil",hp:8}
    },
    {
        num:16, title:"Les 16 - De M", phase:4, phaseName:"Onderrij",
        newLetters:["m"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m"],
        fingerHint:"Wijsvinger rechts omlaag naar M!",
        words1:["m","m","m","m","m","m","m","m","m","m","m","m","m","m","m","m"],
        words2:["met","mij","men","mok","mug","mist","melk","muis","mand","mooi","mond","mars"],
        words3:["moment","morgen","melkweg","minister","modder","monster","museum","meester","middel","motoren"],
        boss:{emoji:"🦈",name:"Haai",hp:8}
    },
    {
        num:17, title:"Les 17 - De B", phase:4, phaseName:"Onderrij",
        newLetters:["b"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b"],
        fingerHint:"Wijsvinger links omlaag naar B!",
        words1:["b","b","b","b","b","b","b","b","b","b","b","b","b","b","b","b"],
        words2:["bed","bij","bot","bus","bol","brug","boot","berg","boom","best","boek","bord"],
        words3:["beter","bouwen","brood","binnen","burger","begrijp","bolder","bijtend","brugkind","boomgaard"],
        boss:{emoji:"🐗",name:"Wild Zwijn",hp:9}
    },
    {
        num:18, title:"Les 18 - De V", phase:4, phaseName:"Onderrij",
        newLetters:["v"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v"],
        fingerHint:"Wijsvinger links omlaag naar V!",
        words1:["v","v","v","v","v","v","v","v","v","v","v","v","v","v","v","v"],
        words2:["van","vel","vis","vol","vuur","voet","vier","vlot","vork","vast","vies","vet"],
        words3:["vogel","vader","voetbal","vlinder","vakker","vijver","vertrek","vinden","vuurwerk","vitamine"],
        boss:{emoji:"🐍",name:"Python",hp:9}
    },
    {
        num:19, title:"Les 19 - C en Komma", phase:4, phaseName:"Onderrij",
        newLetters:["c",","], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",","],
        fingerHint:"Middelvinger links omlaag naar C — Middelvinger rechts omlaag naar komma!",
        words1:["c",",","c",",","c","c",",",",","c",",","c",",",",","c","c",","],
        words2:["crn","cel","ach","cv","cd","kic","code","clip","correct","scan","scrum","disco"],
        words3:["computer","concert","december","fietsclub","circuit","scandium","educatie","recyclen","correct","cyclus"],
        boss:{emoji:"🦀",name:"Krab",hp:9}
    },
    {
        num:20, title:"Les 20 - X en Punt", phase:4, phaseName:"Onderrij",
        newLetters:["x","."], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x","."],
        fingerHint:"Ringvinger links omlaag naar X — Ringvinger rechts omlaag naar punt!",
        words1:["x",".","x",".","x","x",".",".","x",".","x",".",".","x","x","."],
        words2:["tex","mix","fax","hex","box","fix","fox","max","six","wax","dex","pix"],
        words3:["expres","flexibel","textiel","complex","excuus","expert","exterior","executie","examen","excursie"],
        boss:{emoji:"🦑",name:"Inktvis",hp:9}
    },
    {
        num:21, title:"Les 21 - Z en Slash", phase:4, phaseName:"Onderrij",
        newLetters:["z","/"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/"],
        fingerHint:"Pink links omlaag naar Z — Pink rechts omlaag naar /!",
        words1:["z","/","z","/","z","z","/","/","z","/","z","/","/","z","z","/"],
        words2:["zee","zon","zit","zak","zes","zin","zes","zig","zout","zij","zus","zoom"],
        words3:["zeilen","zondag","ziekenhuis","bezorgen","verzorgen","puzzel","zwemmen","zoeken","zilveren","zenuwachtig"],
        boss:{emoji:"👹",name:"Demon",hp:12}, bigBoss:true
    },
    // Fase 5: Hoofdletters & Specials (22-24)
    {
        num:22, title:"Les 22 - Hoofdletters", phase:5, phaseName:"Hoofdletters",
        newLetters:["Shift"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/"],
        fingerHint:"Gebruik Shift met je pink! Links-Shift voor rechterhand letters, Rechts-Shift voor linkerhand.",
        words1:["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"],
        words2:["Jan","Piet","Amsterdam","huis","Rotterdam","school","Groningen","water","Delft","brood","Arnhem","fiets"],
        words3:["Nederland","kat en hond","Europa","de school","Sinterklaas","mijn boek","Amsterdam","de winter","Rotterdam","lekker warm"],
        boss:{emoji:"🧙",name:"Tovenaar",hp:10}
    },
    {
        num:23, title:"Les 23 - Cijfers", phase:5, phaseName:"Hoofdletters",
        newLetters:["1","2","3","4","5","6","7","8","9","0"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/","1","2","3","4","5","6","7","8","9","0"],
        fingerHint:"Cijfers staan op de bovenste rij. Gebruik dezelfde vingers als de letterrij eronder!",
        words1:["1","2","3","4","5","6","7","8","9","0","1","2","3","4","5","0"],
        words2:["100","2023","42","365","007","1984","2000","99","55","12","31","77"],
        words3:["artikel 5","nummer 10","pagina 42","Route 66","groep 8","level 99","jaar 2026","code 007","stap 1","poort 80"],
        boss:{emoji:"🤖",name:"Robot",hp:10}
    },
    {
        num:24, title:"Les 24 - Leestekens", phase:5, phaseName:"Hoofdletters",
        newLetters:["!","?","'","\"","-"], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/","!","?","'","\"","-"],
        fingerHint:"Leestekens maken je zinnen compleet!",
        words1:["!","?","'","\"","-","!","?","'","\"","-","!","?","'","\"","-","!"],
        words2:["hallo!","wie?","dat's","niet-waar","ja!","nee?","zo'n","non-stop","wow!","hoe?","top!","klaar?"],
        words3:["hoe gaat het?","wat leuk!","non-fictie","hallo daar!","klaar?","mooi zo!","stop!","waarom niet?","ga je mee?","heel goed!"],
        boss:{emoji:"👾",name:"Alien Koning",hp:14}, bigBoss:true
    },
    // Fase 6: Snelheid (25-28) — all letters + numbers + punctuation learned
    {
        num:25, title:"Les 25 - Korte Woorden Sprint", phase:6, phaseName:"Snelheid",
        newLetters:[], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/","1","2","3","4","5","6","7","8","9","0","!","?","'","\"","-"],
        fingerHint:"Tijd om snel te typen! Korte woorden zo snel mogelijk!",
        words1:["de","het","een","en","is","op","in","van","dat","dit","met","aan","als","bij","nog","wel"],
        words2:["kan","zal","mag","wil","zou","was","had","ben","heb","kom","doe","zie","zeg","geef","ga","sta"],
        words3:["goed","snel","mooi","lang","kort","warm","koud","veel","soms","heel","best","fijn","leuk","gaaf","Ja!","nee?"],
        boss:{emoji:"⚡",name:"Bliksem",hp:10}
    },
    {
        num:26, title:"Les 26 - Zinnen Typen", phase:6, phaseName:"Snelheid",
        newLetters:[], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/","1","2","3","4","5","6","7","8","9","0","!","?","'","\"","-"],
        fingerHint:"Nu gaan we hele zinnen typen!",
        words1:["de kat zit op de mat","hij rent heel snel","ik kan goed typen","de zon schijnt vandaag"],
        words2:["de hond blaft luid","wij gaan naar school","het is mooi weer","zij leest een boek","hij fietst naar huis","Toby speelt graag"],
        words3:["mooi land","de trein","kopje thee","pak je jas","in het park","het weekend","naar school","goede morgen","lekker weer","tot straks","Heel goed!","veel plezier"],
        boss:{emoji:"🌪️",name:"Tornado",hp:10}
    },
    {
        num:27, title:"Les 27 - Snelheidstest", phase:6, phaseName:"Snelheid",
        newLetters:[], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/","1","2","3","4","5","6","7","8","9","0","!","?","'","\"","-"],
        fingerHint:"Typ zo snel en zo goed mogelijk!",
        words1:["snel","vlug","rap","goed","fijn","mooi","leuk","best","warm","koud","lang","kort","snel","vlug","rap","goed"],
        words2:["de snelle vos springt","oefening baart kunst","alle begin is moeilijk","na regen komt zon","de aanhouder wint","goed gedaan!"],
        words3:["de beste typer","elke dag beter","tien vingers","snel typen","ga zo door","goed bezig","bijna klaar","heel knap","Super!","top score","nog even","klaar?"],
        boss:{emoji:"🔥",name:"Vuurgeest",hp:12}
    },
    {
        num:28, title:"Les 28 - Eindexamen!", phase:6, phaseName:"Snelheid",
        newLetters:[], allLetters:["a","s","d","f","g","h","j","k","l",";","e","i","o","u","r","t","w","p","q","y","n","m","b","v","c",",","x",".","z","/","1","2","3","4","5","6","7","8","9","0","!","?","'","\"","-"],
        fingerHint:"Het eindexamen! Laat zien wat je geleerd hebt!",
        words1:["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"],
        words2:["gefeliciteerd met je diploma","je bent nu een echte typer","Toby is trots op je!","blijf oefenen voor snelheid","het toetsenbord is je vriend","typen is een superpower"],
        words3:["je bent geweldig","blijf oefenen","goed gedaan","alle letters","super trots","eindexamen","heel knap","typen is leuk","de beste","Klaar!","top resultaat","kampioen"],
        boss:{emoji:"🏆",name:"Eindbaas",hp:15}, bigBoss:true
    }
];

// ═══ ACHIEVEMENT DEFINITIONS ═══
const ACHIEVEMENT_DEFS = [
    {id:"first_steps", icon:"👶", name:"Eerste Stappen", desc:"Les 1 voltooid", check: s => s.lessonStars[1] >= 1},
    {id:"home_row", icon:"🏠", name:"Thuisrij Held", desc:"Alle fase 1 lessen voltooid", check: s => [1,2,3,4,5].every(n => s.lessonStars[n] >= 1)},
    {id:"home_row_master", icon:"🏆", name:"Thuisrij Meester", desc:"Alle fase 1 lessen 3 sterren", check: s => [1,2,3,4,5].every(n => s.lessonStars[n] >= 3)},
    {id:"vowel_king", icon:"👑", name:"Klinker Koning", desc:"Alle klinker-lessen voltooid", check: s => [6,7,8,9].every(n => s.lessonStars[n] >= 1)},
    {id:"top_row", icon:"⬆️", name:"Bovenrij Baas", desc:"Alle fase 3 lessen voltooid", check: s => [10,11,12,13,14].every(n => s.lessonStars[n] >= 1)},
    {id:"bottom_row", icon:"⬇️", name:"Onderrij Held", desc:"Alle fase 4 lessen voltooid", check: s => [15,16,17,18,19,20,21].every(n => s.lessonStars[n] >= 1)},
    {id:"caps_master", icon:"🔠", name:"Hoofdletter Held", desc:"Alle fase 5 lessen voltooid", check: s => [22,23,24].every(n => s.lessonStars[n] >= 1)},
    {id:"speed_demon", icon:"⚡", name:"Snelheidsduivel", desc:"40+ WPM bereikt", check: s => s.stats.fastestWPM >= 40},
    {id:"speed_king", icon:"🏎️", name:"Snelheidskoning", desc:"60+ WPM bereikt", check: s => s.stats.fastestWPM >= 60},
    {id:"perfect_lesson", icon:"💎", name:"Perfecte Les", desc:"Een les zonder fouten", check: s => s.stats.perfectLessons > 0},
    {id:"combo_10", icon:"🔥", name:"Op Dreef!", desc:"10 combo streak", check: s => s.stats.bestCombo >= 10},
    {id:"combo_25", icon:"💥", name:"Onstopbaar!", desc:"25 combo streak", check: s => s.stats.bestCombo >= 25},
    {id:"combo_50", icon:"🌟", name:"Vuurwerk!", desc:"50 combo streak", check: s => s.stats.bestCombo >= 50},
    {id:"combo_100", icon:"✨", name:"Legendarisch!", desc:"100 combo streak", check: s => s.stats.bestCombo >= 100},
    {id:"week_streak", icon:"📅", name:"Weekstrijder", desc:"7 dagen op rij", check: s => s.currentStreak >= 7},
    {id:"month_streak", icon:"🗓️", name:"Maandkampioen", desc:"30 dagen op rij", check: s => s.currentStreak >= 30},
    {id:"halfway", icon:"🎯", name:"Halve Weg!", desc:"14 lessen voltooid", check: s => Object.values(s.lessonStars).filter(v => v >= 1).length >= 14},
    {id:"all_lessons", icon:"🎓", name:"Afgestudeerd!", desc:"Alle 28 lessen voltooid", check: s => Object.values(s.lessonStars).filter(v => v >= 1).length >= 28},
    {id:"all_stars", icon:"⭐", name:"Alle Sterren!", desc:"Alle lessen 3 sterren", check: s => Object.values(s.lessonStars).filter(v => v >= 3).length >= 28},
    {id:"boss1", icon:"🐲", name:"Drakentemmer", desc:"Fase 1 eindbaas verslagen", check: s => s.lessonStars[5] >= 1},
    {id:"boss2", icon:"🐉", name:"Drakenkoning Verslagen", desc:"Fase 2 eindbaas verslagen", check: s => s.lessonStars[9] >= 1},
    {id:"boss3", icon:"🐙", name:"Octopus Overwonnen", desc:"Fase 3 eindbaas verslagen", check: s => s.lessonStars[14] >= 1},
    {id:"boss4", icon:"👹", name:"Demon Verslager", desc:"Fase 4 eindbaas verslagen", check: s => s.lessonStars[21] >= 1},
    {id:"boss5", icon:"👾", name:"Alien Vernietiger", desc:"Fase 5 eindbaas verslagen", check: s => s.lessonStars[24] >= 1},
    {id:"boss_final", icon:"🏆", name:"Eindbaas Verslagen!", desc:"Het eindexamen gehaald!", check: s => s.lessonStars[28] >= 1},
    {id:"letters_1000", icon:"⌨️", name:"Duizendpoot", desc:"1000 letters getypt", check: s => s.stats.totalLetters >= 1000},
    {id:"letters_10000", icon:"🖥️", name:"Typemachine", desc:"10.000 letters getypt", check: s => s.stats.totalLetters >= 10000},
    {id:"words_100", icon:"📝", name:"Woordenboek", desc:"100 woorden getypt", check: s => s.stats.totalWords >= 100},
    {id:"words_1000", icon:"📚", name:"Bibliotheek", desc:"1000 woorden getypt", check: s => s.stats.totalWords >= 1000},
    {id:"level_5", icon:"🌱", name:"Groeiend Talent", desc:"Level 5 bereikt", check: s => s.level >= 5},
    {id:"level_10", icon:"🌿", name:"Gevorderd!", desc:"Level 10 bereikt", check: s => s.level >= 10},
    {id:"level_20", icon:"🌳", name:"Expert!", desc:"Level 20 bereikt", check: s => s.level >= 20},
    {id:"level_50", icon:"🏔️", name:"Meester!", desc:"Level 50 bereikt", check: s => s.level >= 50},
];

// ═══ KEYBOARD LAYOUT ═══
const KB_ROWS = [
    [{k:'1',f:'pinky'},{k:'2',f:'ring'},{k:'3',f:'middle'},{k:'4',f:'index'},{k:'5',f:'index'},{k:'6',f:'index'},{k:'7',f:'index'},{k:'8',f:'middle'},{k:'9',f:'ring'},{k:'0',f:'pinky'}],
    [{k:'q',f:'pinky'},{k:'w',f:'ring'},{k:'e',f:'middle'},{k:'r',f:'index'},{k:'t',f:'index'},{k:'y',f:'index'},{k:'u',f:'index'},{k:'i',f:'middle'},{k:'o',f:'ring'},{k:'p',f:'pinky'}],
    [{k:'a',f:'pinky'},{k:'s',f:'ring'},{k:'d',f:'middle'},{k:'f',f:'index'},{k:'g',f:'index'},{k:'h',f:'index'},{k:'j',f:'index'},{k:'k',f:'middle'},{k:'l',f:'ring'},{k:';',f:'pinky'}],
    [{k:'z',f:'pinky'},{k:'x',f:'ring'},{k:'c',f:'middle'},{k:'v',f:'index'},{k:'b',f:'index'},{k:'n',f:'index'},{k:'m',f:'index'},{k:',',f:'middle'},{k:'.',f:'ring'},{k:'/',f:'pinky'}],
];

// ═══ LEVEL THRESHOLDS ═══
const LEVEL_THRESHOLDS = [0];
for (let i = 1; i <= 100; i++) LEVEL_THRESHOLDS.push(Math.floor(800 * Math.pow(i, 1.3)));

// ═══ FINGER MAP ═══
const FINGER_MAP = {};
KB_ROWS.forEach(row => row.forEach(({k,f}) => { FINGER_MAP[k] = f; }));
FINGER_MAP[' '] = 'thumb';

// ═══ BOSS MONSTERS (big bosses) ═══
const BIG_BOSS_EMOJIS = {5:"🐲",9:"🐉",14:"🐙",21:"👹",24:"👾",28:"🏆"};
