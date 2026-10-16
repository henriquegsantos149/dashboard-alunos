// Heuristic gender inference from Brazilian Portuguese first names.
// Returns "Masculino" | "Feminino" | "" when undetermined.

const strip = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Explicit overrides (common ambiguous or non-rule-following names)
const MALE = new Set<string>([
  "joshua","elias","jonas","tobias","matias","ozeias","isaias","jeremias",
  "andre","andrew","felipe","jose","jorge","luis","luiz","jair","valter","walter",
  "ze","hugo","caio","ivo","theo","tito","leo","ico","kaio","murilo",
  "icaro","igor","ian","yuri","iuri","ney","uel","vitor","victor","heitor",
  "nicolas","lucas","mateus","matheus","gabriel","rafael","raphael","miguel",
  "davi","david","deivid","arthur","artur","bernardo","henrique","enzo","benicio",
  "ravi","noah","levi","samuel","daniel","emanuel","manuel","manoel",
  "joao","joaquim","gustavo","eduardo","ricardo","leonardo","fernando",
  "rodrigo","marcelo","marcos","marco","paulo","pedro","tiago","thiago",
  "diego","diogo","bruno","cristiano","cristian","christian","alex","alexandre",
  "alexsandro","alessandro","sergio","sergi","cesar","cezar","celso","silas",
  "anderson","wellington","wesley","wallace","wallacy","willian","william","wilson",
  "robson","rubens","ruben","raul","renato","reinaldo","ronaldo","ronaldinho",
  "otavio","octavio","fabio","fabricio","flavio","francisco","franco","fran",
  "guilherme","gilberto","gil","douglas","dario","derek","denis","denilson",
  "edson","edenilson","edivaldo","edivan","edmilson","edmar","emerson","erick","everton",
  "kleber","cleber","claudio","caetano","cassio","clayton","cleiton","cleyton",
  "antonio","antoine","ari","arif","arnaldo","arnoldo","alvaro","amauri","americo",
  "moises","moyses","aaron","aron","abel","abraao","adriano","ademar","aderbal",
  "adilson","adriel","afonso","agnaldo","aguinaldo","ailton","airton","alan","allan","allony",
  "alberto","albano","aldo","aldair","alceu","alcides","aldemir","alex","alfredo",
  "amilton","amilcar","amaro","amarildo","anibal","anselmo","aparicio","arcelino",
  "argemiro","aristides","arlindo","armando","arnoldo","arquimedes","ascenso","ataide",
  "audes","audir","aureo","ayrton","baltazar","benedito","benjamim","benjamin",
  "beno","bento","beto","brian","bryan","caique","callebe","calebe","camilo",
  "camargo","carlito","carlos","carmelo","cassiano","ceferino","celio","cicero",
  "cid","cirilo","cirino","claudemir","claudinei","claudiomar","clovis","conrado",
  "cornelio","crispim","custodio","damasceno","damian","damiao","danilo","darci",
  "darcy","decio","delcio","demetrio","derli","derlin","didier","diomedes","dirceu",
  "domingos","domingo","donato","donizete","dorival","dyego","edgar","edinaldo",
  "edinei","edineu","edmundo","edivaldo","edivan","edmilson","edno","edran","edsel",
  "edu","eduardo","efraim","egas","egidio","elder","eleuterio","elias","eliezer",
  "elinaldo","elio","eliseu","elizeu","ely","elysio","elyseu","emanoel","enio",
  "enrique","enriquez","epitacio","ericson","ericsson","ernani","ernesto","ervino",
  "esmeraldo","estanislau","estefano","estevao","euclides","eudes","euripedes","eustaquio",
  "evair","evaldo","evandro","evanildo","evaristo","everaldo","ezequiel","fabiano",
  "fabricio","fagner","federico","felipe","felippe","felisberto","felix","fernao","ferdinando",
  "fidel","fidelis","filipe","filippe","fioravante","firmino","flavio","florentino",
  "florisvaldo","francelino","francelio","franciscano","francisco","franklim","franklin",
  "frederico","gabino","gabriel","gaspar","gelson","genival","genecy","geninho","geraldo",
  "germano","getulio","gideon","gilberto","gilcimar","gildasio","gildo","gilmar","gilson",
  "gilvan","gilvani","glaucio","gleison","goncalo","gonzalo","gracino","gualter","guido",
  "guimar","guimer","gumercindo","gusta","gustavo","hamilton","harold","halex","helder","helder",
  "helio","henrique","heraldo","herbert","herminio","heron","heros","herley","helbecy","herval","hilario",
  "hilton","hipolito","hiran","hirton","horacio","hosana","hosannah","hubert","huberto",
  "humberto","humbert","humbertto","iago","iberto","ibsen","idalecio","idelfonso","idilio",
  "ignacio","ilarino","ildefonso","ilo","ilson","ilton","imanol","inacio","ino","ireno",
  "irineu","isaac","isac","isaias","isidoro","isidio","ismael","israel","ivair","ivaldo","ivan",
  "ivanildo","ivo","jacinto","jacir","jaco","jacomo","jacques","jaime","jamerson","james",
  "janderson","jansen","jardel","jefferson","jeferson","jeronimo","jessé","jesse","jethro",
  "jhonatan","jhony","jonatan","jhonas","joab","joacir","joao","joaquim","jociel","joel","jonh",
  "john","johnny","jonas","jonathas","jonatas","jorge","jose","josias","josimar","josue",
  "juarez","julio","julian","juliano","junio","junior","jurandir","jurandi","jusce","juvencio",
  "kaique","kayke","kayky","kelvin","kennedy","kenedy","kenny","kevin","klaus","laercio","laerte",
  "lairton","lamartine","landerson","lazaro","leandro","leocadio","leonel","leoni","leonidas",
  "leopoldo","levy","libano","lidio","lincoln","lindolfo","lineu","lisandro","loris","lourenco",
  "lourival","luan","lucas","lucca","luciano","lucio","ludgero","ludovico","luigi","luiz","luis",
  "luiziano","lupercio","lupi","macedo","macnadblay","magdiel","magnus","mailson","mailton","manfred","manoel",
  "manuel","mauricio","mauricio","maurinho","mauro","max","maximiliano","maycon","maykon","melvin",
  "messias","michel","michael","mikael","milton","misael","modesto","moises","moncho","muniz",
  "murilo","nabor","narciso","natanael","natan","nayton","nelson","nelio","nemias","nemias",
  "nerivaldo","nestor","newton","nicacio","nicodemos","nikolas","nilo","nilson","nilton","ninoaldo",
  "noe","norberto","noronha","nuno","obed","octavio","odair","odilon","oduvaldo","olavio","olavo",
  "olegario","olimpio","olinto","olivar","oliver","olivio","olivio","omar","oneide","onorio","oriovaldo",
  "orlando","orlando","orozimbo","ortiz","osamu","osmar","osmir","osni","osny","osvaldo","oswaldo",
  "otacilio","otavio","otoniel","ovidio","ozeias","ozires","pablo","pacheco","panta","paris","paschoal",
  "pascoal","paterno","patricio","paulino","patrick","paulo","pedrinho","pedro","peregrino","peri","pericles","peterson",
  "pio","placido","plinio","policarpo","pompeu","priam","quintiliano","quirino","racine","rafael","raimundo",
  "ramon","raphael","raul","randy","reginaldo","reginatto","reinaldo","remi","remy","renan","renato","renaud","reneu",
  "ricardo","richard","ricieri","rinaldo","ringo","robair","robert","roberto","robson","rodolfo","rodrigo",
  "rogerio","rolando","rolf","romario","romeu","romildo","romualdo","ronaldo","roni","ronnie","rony","roque",
  "rosalvo","roselvo","ruan","rubens","ruben","ruan","rufino","ruy","sabino","saimon","saint","saint-clair",
  "salomao","salvador","samir","samuel","sandro","santiago","santino","santos","saulo","sebastian","sebastiano",
  "sebastiao","seraphim","sergio","servulo","setembrino","severino","sidnei","sidney","silas","silvano","silverio",
  "silvio","simao","simon","sinval","sirley","sotero","soter","spartacus","stanislau","stanley","stefano","steven",
  "sueverson","sylvio","tadeu","talles","tales","tarciso","tarcisio","tarik","tarso","telmo","tenorio","teodorico","teodoro",
  "tercio","terio","terto","theo","theofilo","tiao","tibor","timoteo","tito","tobias","tomas","tomaz","ubaldo","ubirajara",
  "ubiratan","ulisses","ulrich","uriel","uziel","vagner","vagno","valdecir","valdemar","valdir","valdo","valdomiro","valeriano",
  "valerio","valery","valter","wanderson","wanderley","wagner","walace","walder","waldemar","waldenir","waldir","walfrido",
  "walisson","walison","wallace","wallacy","wallisson","walmir","wando","warley","washington","wedson","welder","welinton","wellington",
  "welton","wendell","wender","werickson","werley","werner","weverton","wesley","weverton","whashington","whesley","wilame",
  "wilberto","wilcker","willian","william","willians","wilson","wilton","winston","wladimir","wlamir","wolnei","xavier","yago",
  "yair","yan","yanick","yann","yannick","yann","yannis","yago","yago","yuri","zacarias","zaccaria","zadoque","zaqueu","zebedeu",
  "zeca","zedequias","zenildo","zenilton","zenobio","zequinha","ziraldo","zoroastro"
]);

const FEMALE = new Set<string>([
  "abigail","ada","adela","adelaide","adelia","adelina","adelinda","adelma","adriana","adriane","aglaia","aida",
  "aila","ailsa","ainoa","aisha","aida","alana","alba","alessandra","alexandra","alessia","alfonsa","alice","alicia",
  "alina","aline","alessandra","aliete","alicia","alida","aliny","alisson","alma","alodia","aloisia","alvarina",
  "alzira","amabile","amalia","amanda","amelia","amilcar","ana","anabela","anabel","anabelle","anabella","anaclara",
  "anaide","anaisa","anaides","anajara","analaura","analice","analu","analuiza","analucia","anamaria","anapaula","anaraquel",
  "anaregina","anarosa","ancila","ancinha","andrea","andreia","andressa","andresa","andrina","angela","angelica","angelina",
  "angelita","anita","anelise","anny","aparecida","apoena","arabela","araci","aretha","ariane","ariadna","ariadne","arianne",
  "ariete","arlete","ariete","arlinda","armanda","arminda","arminia","aspasia","assuncao","astrid","aubrey","audrey","augusta",
  "aurea","aurelia","aurora","ayla","barbara","beatriz","belarmina","belinda","belisa","belmira","benedita","benigna","benilda",
  "berenice","bernadete","bernardete","bernardina","bertilia","betania","betina","betsabe","bia","bianca","bibiana","blandina",
  "branca","brena","brenda","briana","briane","brigida","brigitte","brisa","bruna","buena","cacilda","camila","camile","candida",
  "carina","carine","carla","carlene","carlinha","carlita","carlota","carmem","carmen","carmela","carmelita","carmen","carol",
  "carolina","caroline","cassia","cassiana","catalina","catarina","catiana","catiana","cecilia","celeste","celestina","celia",
  "celiane","celina","celinha","celma","celsa","cendy","cesaria","cibele","cibelle","cida","cilene","cilia","cinthia","cintia","clara",
  "clarice","clarissa","claudete","claudia","claudiana","claudina","claudinete","claudine","cleia","cleide","clementina","cleonice",
  "cleria","cleusa","clotilde","conceicao","constanca","consuelo","corina","cora","cordelia","cosma","cremilda","cristal","cristhiane",
  "cristiana","cristiane","cristina","cristine","cristal","creuza","creusa","creusina","custodia","dafne","dagmar","daiane","daiana",
  "daira","daise","daisi","daisy","dalia","dalila","dalva","damaris","dana","danara","dandara","daniela","daniella","danielle","danitza",
  "danubia","dara","darcia","darcy","darly","daysi","debora","deborah","deia","deisa","deise","deisi","deisiane","deisy","delaide","delcia",
  "delfina","delia","delinda","delma","delmira","delza","demetria","denilda","denise","denisia","derli","desiree","detinha","deusa","deusdete",
  "diamantina","diana","diane","dileta","dilma","dilza","dilcia","dina","dinah","dinalva","dinara","dione","dione","dirce","dirceia","disolina",
  "dolores","domiciana","domingas","dominga","dominique","donaria","donata","donilia","dora","doraci","doralice","doraliza","dorinha","dorisvaldina",
  "dorita","dorli","dorvalina","drica","drielle","drielly","duda","dulce","dulcineia","durvalina","ebe","edda","edelma","edelvira","edelweiss","edenia",
  "edes","edileia","edileuza","edilma","edilsa","edina","edineia","edith","edivania","edme","edmeia","edna","ednalva","ednamar","edneia","ednir","edyr",
  "efigenia","elaine","elane","elba","eleida","eleonora","elenice","elenir","elenita","eliana","eliane","elia","eliete","elinete","elisa","elisabete","elisangela",
  "elisete","elismar","elismara","eliza","elizabeth","elizandra","elizangela","elizete","elizia","ella","elma","elnice","elodia","elodie","eloah","eloisa",
  "elsa","elsie","elsineide","elucia","elvira","elza","ema","emanuela","emanuelle","emelia","emerenciana","emilene","emiliana","emilse","emily","emma",
  "engracia","enilda","ennya","enrica","enza","epifania","erica","ericka","erika","erina","erinete","erlinda","ermelinda","ermenegilda","ermesinda","ernestina",
  "esmeralda","esperanza","estela","estefanea","estefania","estefani","estefany","ester","esther","estrela","etel","etelvina","etiene","euda","eudora",
  "eudoxia","eufemia","eufrasia","eufrosina","eugenia","eujenia","eulalia","eulina","eunice","euridice","eutalia","eva","evandra","evangelina","evanilda","evanir",
  "evaristos","evelin","evelina","evelyn","evencia","everalda","evilly","evilasia","ezilda","fabia","fabiana","fabiele","fabiola","fagia","fani","fany","fatima","faustina",
  "felicidade","felicia","felipa","felisbella","fernanda","fia","fiama","fiamma","fidelina","filipa","filomena","fioralba","fiorella","flaviana","flavia","flora",
  "florbela","florencia","florentina","florinda","floriza","flaviany","frana","francelia","francesca","francina","francinea","francineide","francisca","francisleide",
  "frida","gabi","gabriela","gabriella","gabrielle","gaia","galatea","gardenia","gehilde","gema","gemina","geni","genoveva","georgea","georgia","georgiana","geralda",
  "geni","germana","gertrudes","gessica","gessika","ghisleine","gianna","gigia","gigliola","gilberta","gicelly","gilda","gilka","gillian","gilmara","gilsa","gilsamara","gilvanete",
  "gina","ginete","gioconda","giovana","giovanna","gisela","gisele","giselle","gislaine","gislane","gizelda","gisselle","glaci","gladis","gladys","glaucia","glauce",
  "gleci","glenda","gloria","graca","graciana","graciane","graciela","graciliana","gracilene","gracimara","graziela","grasielly","graziella","grazielle","greice",
  "greiciane","griselda","gunilla","gulnara","habiba","hadassa","haide","haleluia","halima","hanan","hanna","hannah","harue","hayley","hebe","heda","hedaia","helainy",
  "heleieth","helen","helena","helga","helia","helida","heliana","heliete","heloise","heloisa","helva","hemily","henedina","henriette","henriqueta","heralda","herena",
  "hermelinda","hermione","hertha","hilary","hilda","hildegard","hildegarda","hildelina","hilma","ho","horacia","horalia","hortencia","hosana","huilma","ianca","iandra",
  "iane","iara","ida","idalia","idalina","idalva","idelza","ielda","iemena","iennifer","iesa","ieshi","ifigenia","igara","ilana","ilba","ilca","ildalice","ilde","ilona",
  "ilse","iluminada","ilza","iman","ilse","imelda","imira","imre","ina","inacia","ines","inez","ingrid","inocencia","iolanda","iomar","iona","ione","ionete","irani","ireci",
  "irene","ireny","iria","irinea","irma","irondina","iris","isa","isabel","isabela","isabella","isabelle","isabelly","isabely","isadora","isaltina","isamara","isaura","isaura",
  "isidora","isis","ismaela","ismenia","isolda","isolde","isolina","ita","itamara","itana","ivane","ivani","ivania","ivanise","ivanira","ivete","ivone","ivonete","jacira","jacqueline",
  "jaciara","jaciane","jacileuza","jacinta","jaqueline","jamile","janaira","janaina","janayna","jandira","jandyra","jane","janeide","janete","janice","jaqueline","jardelina","jasmim",
  "jasmin","jaucira","jeane","jecica","jeisa","jelica","jenair","jeni","jennifer","jeniffer","jenny","jeralda","jerusa","jesica","jessica","jessika","jessamy","jessamy","jheny","jheniffer",
  "jhennifer","jhulia","jia","joana","joanna","joanira","joaquina","jobea","jocasta","jocelia","jocelina","joceli","joceline","joelma","joelza","jolanda","jolie","joline","jordana","jordana","jovita","joyce",
  "juci","jucilene","juciara","jucira","judiane","judite","julia","julyana","juliana","julianne","julieta","juliete","juliana","juliana","jumara","jumira","junia","jurema","justa","justina","jussara","jussiana","jutta",
  "kaiane","kaila","kaillan","kalita","kaline","kalina","kamila","kamile","kamilla","karen","karin","karina","karine","karla","karol","karolina","karoline","kassia","katarina","katarine","katharina","katherine","kathleen",
  "kathryn","kathy","katia","katiane","katiely","katlen","katleen","katlin","katrine","katy","keila","keisi","keissi","kelci","kelen","kelle","kelly","kely","kemia","kenia","kelma","kerolayne","kethelyn","kethleen","kethellen",
  "ketlen","ketlin","ketlyn","ketly","kethlyn","ketelyn","kethellyn","ketury","keturah","keysa","keyse","keyte","keyti","keziah","khadija","khadijah","kheila","kiara","kiely","kim","kimberly","kira","kirsten","kissia","klara","klaudia",
  "klysmara","kotia","kris","krislaine","krissia","krisya","krista","kristina","kristine","krystal","kyra","kyria","ladia","laia","laila","laine","lais","laisa","laissa","lala","lalla","lana","laodicea","lara","larissa","laryssa",
  "latifa","laudelina","laudicea","laudicea","laura","laureana","lauralice","lauren","lauretta","lauriane","lauriene","lauriete","laurinda","lauris","laurita","laury","lauyrane","lavinia","lazara","lea","leandra","leanira",
  "leda","leia","leidi","leila","leiliane","lenice","lenina","lenir","lenita","lenore","leny","leoarda","leoma","leonarda","leonarda","leoncia","leonice","leonila","leonilda","leonor","leontina","leoparda","leticia","leyde","lia",
  "liana","liane","libia","libna","lice","lia","ligia","ligiane","lila","lilac","lili","lilian","liliane","lilibeth","lilliane","lilly","lily","lina","linda","lindaura","linder","lindiane","lindina","lindinalva","lindovice","linete","linhares",
  "lirian","lisa","lisbete","lisbeth","lisete","lisiane","lisi","lismaria","liszt","lis","liubia","liz","liza","lizandra","lizel","lizete","lizia","lizianne","lizzie","lo","loide","loiane","lolita","lorna","lorraine","lorrayne","lorene","loredana","lorelay","loreta","loretta","loraine","lourdes",
  "lourdes","lou","luana","luane","luara","luca","lucca","lucelia","lucena","lucia","luciana","luciane","lucielma","lucila","lucilene","lucilia","lucimar","lucimara","lucimeire","lucineia","lucinete","lucineide","lucineli","luciola","ludimila","ludmila","ludmilla","luedi","luene","luiza","luisa","lujza","luma","luna","lupita","luzaide","luzdivina","luzia","lyandra","lyandra","lygia","lyna","mabel","macaria","macarena","madalena","madelaine","madelene","madeline","madonna","mafalda","magali","magaly","magda","magdalena","magnolia","maia","maira","mairy","majori","majorie","mali","malu","manoela","manuela","mara","maraisa","maraiza","maral","marcela","marcele","marceli","marcelia","marceliana","marcelina","marcia","marciana","marciane","marcileine","marcilene","marcionila","marcondes","mareli","margarete","margareth","margarida","margaux","margie","margot","maria","mariah","marialice","mariam","marian","mariana","marianna","marianne","mariangela","mariane","maricel","maricelma","maricia","maridete","mariela","mariella","marielle","marilane","marilena","marilene","marilete","marilia","mariliana","mariliene","marilis","marilse","marilu","marilucia","marilurde","marilus","marilza","marina","marineide","marines","marinete","marinez","marioneide","marisa","marisete","marisol","marissa","marivone","marizalda","marizete","marlandes","marlei","marlen","marlene","marleny","marlete","marli","marlia","marlinete","marliene","marliete","marlucia","marluce","marluci","marluza","marsha","marta","martina","mary","maryam","maryana","matilde","mauricia","mavi","maxima","maybe","maycon","maysa","mayara","mayra","mayte","mecia","melania","melba","melinda","melisa","melissa","melita","melo","melodia","mercedes","mercia","meri","meriane","meribelma","merilene","merlena","mia","micaela","micaella","michele","michelle","michelly","michely","mihaela","mila","milagros","milagres","milena","mileide","milene","milexa","milexis","milly","mima","mimi","mimosa","mina","mira","mirabel","mirana","miranda","mirca","mireia","mireille","mirella","mirelle","mirelli","miria","miriam","mirian","mirla","mirlene","mirna","mirta","misael","missa","mitsuko","modesta","monica","monique","montserrat","morgana","morgan","muriel","myhaela","myrian","mylena","myrian","mytri","nadia","nadina","nadine","nadira","naely","naia","nair","naide","najara","nala","nancy","narcisa","nascimento","natacha","natalia","natalina","natanieli","natania","nathalia","nathalie","nathaly","nayara","nayanne","nayara","nayda","nayla","nazare","nazira","ndira","neda","neide","neila","neiva","neiviane","neli","nelinha","nelita","nelma","nemia","nena","nere","nereida","nereide","neri","nerica","nessa","neta","nete","neuci","neusa","neuza","neuzeli","neuzelina","neva","nevia","neyde","ngozi","nicea","nicia","nicki","nicole","nicolly","niedja","nieli","nilcia","nilda","nilma","nilsa","nilse","nilsea","nilse","nilza","nina","nirbe","nirvana","nise","nisete","nisia","nivalda","nivea","noala","nobel","noela","noelia","noelma","noemi","noemia","noeli","noele","noelia","noemie","noemy","nora","norah","norma","novalice","novonila","nubia","numa","nyu","obsedio","oclea","odacia","odete","odila","ofelia","oksana","olaria","olda","olga","olinda","olivia","olympia","oneida","onelia","onesilda","ophelia","oralha","orlandina","orquidea","ortenila","osana","oscarina","osvalda","ozeli","palmira","paloma","pamela","pamella","pandora","paola","paty","patricia","paulina","paulineide","paulinha","paulista","paz","pearl","penelope","peolla","perci","perla","perpetua","persida","petra","petronila","phebe","philomena","phoebe","piedade","pierangela","pia","pilar","pina","pirella","placida","poliana","polina","polly","ponciana","portia","preciosa","priscila","priscilla","priscylla","prisca","priscia","puricelia","queila","quenia","queren","queridinha","quetzal","quiara","quinha","quinta","quitelia","quiteria","racquel","rachel","raelle","raffaella","raella","rafa","rafaela","rafaella","rafhaela","rahel","raika","raila","raimundineide","raina","raissa","ramila","ramira","raphaela","raquel","raqueline","rauliane","rauliene","rauliete","raviana","raylene","rebeca","regiane","regianne","regina","reginalda","reginete","reisla","rejane","remediosa","renan","renara","renata","renatha","renathe","renilda","reni","renia","renilda","reseda","reta","reusa","ricardina","richeli","richelle","rigoberta","rilda","rilza","rima","rinalda","rita","rithianne","ritielli","robelma","roberta","robina","robinete","rocio","rocio","rocirene","rolanda","romana","romelia","romilda","romilde","romilia","romina","romualda","ronara","ronia","ronilda","ros","rosa","rosaline","rosalia","rosalva","rosalvo","rosana","rosane","rosangela","rosanira","rosaria","rosaria","rosario","rosario","rosaura","roseclair","rose","roseane","roseni","rosenilde","rosicleia","rosicler","rosie","roseli","rosely","roselma","rosemary","rosemberg","rosemeire","rosemere","rosi","rosiane","rosiani","rosicleide","rosicleia","rosicler","rosilane","rosilda","rosilei","rosilene","rosilia","rosileia","rosilma","rosimar","rosimara","rosimari","rosimeire","rosineide","rosinete","rosineli","rosirene","rositene","rosita","rossana","rossi","rossy","roxana","roxane","roxanne","ruana","rubia","rubiana","rubiane","rubieli","rufina","rui","ruth","rute","ruthelia","sabina","sabine","sabrina","sadia","safira","sahara","sairaim","saide","sairah","sairaim","sakura","sallete","salete","salomé","salome","salua","salwa","salvina","samanta","samantha","samara","samia","samida","samira","samile","sandra","sandriane","sandrieli","sandrielly","sandrina","sandy","sania","sanielly","sanira","santuza","sara","sarah","sarai","sasha","saudia","savana","savanah","savina","scharllene","schirley","sebastiana","seila","seila","selene","selenita","selia","selma","selva","semia","sena","seni","sephora","serena","serenia","serenita","serfa","sevahy","severa","shaday","shahrzad","shakira","sharon","shawnee","sheila","sheila","shelda","shelma","sherlei","sherley","shirla","shirlei","shirleia","shirley","shirleydy","shirly","sianai","sibele","sibelle","sibila","sicleia","sidcleia","sidnea","sidney","sidnea","sidonia","sigrid","sileia","silmara","silmare","silmari","silvana","silvane","silvania","silveria","silvia","silvina","silvinha","simone","simonia","sirilea","sirlandia","sirlei","sirley","sirlene","sissi","sissy","sissi","slade","sofia","solane","solange","soleda","soledad","solene","solimar","solinete","solinete","solita","solleny","solrad","sonia","sonya","soraia","soraya","spendide","stael","stavroula","stefani","stefania","stefanie","stefany","steffani","stela","stelinha","stella","stephanie","stephany","steyce","sthefanny","sthefani","sthefany","subih","sue","sueli","suellen","suely","sumaia","sumara","susana","susane","susete","sussara","suyene","suzana","suzane","suzanne","suzelaine","suzete","suzelene","suzilei","suzy","sybil","sybila","sybilla","sybille","sylvana","sylvia","syria","tabata","taciane","tacita","taciara","taciene","tafnes","tahiana","tahnee","tahnna","taiana","taiara","taina","tainara","tainahra","taiomara","taisa","taissa","taiza","taize","talia","talita","talyta","tamara","tamires","tamisa","tania","tanara","tarianne","tarcila","tarsila","tatiana","tatiane","tatiele","tauane","tauany","tauany","tauasse","tatuapa","tauane","tay","tayana","tayna","tayane","tayara","taynara","tayane","taynara","tayse","tayze","teclia","tecla","telma","tereza","teresa","teresinha","tetsuko","theca","thais","thaina","thainara","thaisa","thaisi","thalia","thales","thalia","thalia","thalita","thamires","thamiris","thandia","thany","thany","thaty","thatiana","thatiane","thawanny","thaty","thayara","thaynara","thayse","thelma","thereza","therese","theresa","tia","tiara","tiele","timea","tininha","tisuko","tixa","tomasa","tomara","tonia","torcuata","trindade","tshelsy","tula","tulia","tunia","ualquiria","ubelda","ubirata","udelfa","udite","ueli","uelinda","ulfa","uia","ulayna","ulda","ulema","ulmar","ulrica","ulla","una","unaiza","unica","upala","ura","uri","urbelia","urbica","ursula","urna","ursicia","urtara","ushi","usrea","uta","utebia","uxia","vaitsa","valdecia","valdeci","valdeleia","valdelice","valdeli","valdeluce","valdemira","valdice","valdelice","valdineia","valeria","valeska","valessa","vandelea","vandeli","vanderleia","vanderli","vandineia","vanea","vanece","vanesca","vanessa","vania","vanira","vanise","varlene","veda","vedrana","velma","venancia","venancia","venencia","venilde","venina","venusiana","vera","vereila","verena","verginia","veridiana","verlandi","veronica","verusca","vianney","viani","vicelda","vicencia","vicenta","vicentina","vicki","victoria","vida","vidalia","vidalina","vienne","vilani","vilene","vilma","vilmari","vinicia","violante","violeta","violetta","virgilia","virginia","virma","viseilda","vitalice","vitoria","viviam","viviane","vivian","viviani","vivila","vladia","vladmira","vlaska","wagdar","walda","waldemira","waldete","waldineide","walderez","wallesca","walquiria","wanda","wanderleia","wanderli","wanessa","weiby","weila","welerine","wendalice","wendolyn","wenita","wesleya","wesleyana","whitney","wialana","wilana","wilcineia","wilcleia","wildna","wileia","wilelma","willa","willene","wilma","wilmary","wilsa","wioleta","witnei","wivian","yadira","yajaira","yamile","yara","yamara","yara","yarena","yari","yasmim","yasmin","yasna","yedda","yeda","yelena","yeli","yelina","yenie","yesenia","yessica","ymara","yniabel","yolanda","yoli","yonda","yongda","yorba","yulissa","yumi","yumiko","yuki","yuko","yuri","yuriko","yuria","yuvanka","ywanka","zaida","zaidi","zaila","zaira","zayra","zalete","zaida","zalmira","zamara","zaqueia","zarah","zayda","zayra","zayrla","zelia","zelinda","zelma","zelmara","zelma","zenaide","zenaida","zeneida","zeni","zenilda","zenia","zenobia","zenair","zenilda","zerlinda","zezete","zezilda","zhanna","zilah","zilda","zildete","zineide","zinilda","ziva","zizinha","zoe","zoelia","zoraide","zoraida","zoraia","zoraima","zorina","zubia","zuelma","zuilda","zuila","zuilda","zuima","zulair","zuleia","zuleica","zuleide","zuleika","zulia","zulma","zumira","zuza"
]);

export function inferGenderFromName(name: string): "Masculino" | "Feminino" | "" {
  if (!name) return "";
  const clean = strip(name).replace(/[^a-z\s]/g, " ").trim();
  if (!clean) return "";
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (!tokens.length) return "";
  // Use first token (skip 1-2 letter particles like "de", "da")
  let first = tokens[0];
  if (first.length <= 2 && tokens.length > 1) first = tokens[1];

  if (MALE.has(first)) return "Masculino";
  if (FEMALE.has(first)) return "Feminino";

  // Try compound (e.g. "maria-jose")
  for (const t of tokens.slice(0, 3)) {
    if (MALE.has(t)) return "Masculino";
    if (FEMALE.has(t)) return "Feminino";
  }

  // Heuristic by suffix
  const last = first.slice(-1);
  const last2 = first.slice(-2);
  if (["a"].includes(last) && !["ca","ka"].includes(last2)) return "Feminino";
  if (last2 === "ce" || last2 === "te" || last2 === "ne") {
    // ambiguous-ish, lean female (Alice, Beatrice, Janete, Eliane)
    return "Feminino";
  }
  if (["o","u","i","l","r","s","n","m","z"].includes(last)) return "Masculino";
  if (last === "e") return "Masculino";

  return "";
}
