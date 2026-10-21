// Source: Bhutan National Statistics Bureau, Statistical Yearbook 2021.
// Table: List of Dzongkhags, Gewogs and Chiwogs by Codes.
// https://www.nsb.gov.bt/wp-content/uploads/dlm_uploads/2021/10/SYB-2021-Final.pdf
const bhutanLocations = {
  Bumthang: ["Chhoekhor", "Chummig", "Tang", "Ura"],
  Chhukha: [
    "Bjagchhog", "Bongo", "Chapchha", "Darla", "Dungna", "Geling",
    "Getana", "Lokchina", "Metakha", "Phuentsholing", "Sampheling",
  ],
  Dagana: [
    "Dorona", "Drujegang", "Gesarling", "Goshi", "Kana", "Karmaling",
    "Khebisa", "Lajab", "Lhamoi Zingkha", "Nichula", "Trashiding",
    "Tsangkha", "Tsendagang", "Tseza",
  ],
  Gasa: ["Khamaed", "Khatoe", "Laya", "Lunana"],
  Haa: ["Bji", "Gakiling", "Katsho", "Samar", "Sangbay", "Uesu"],
  Lhuentse: [
    "Gangzur", "Khoma", "Jarey", "Kurtoed", "Menbi", "Metsho", "Minjay",
    "Tsenkhar",
  ],
  Mongar: [
    "Balam", "Chali", "Chaskhar", "Drametse", "Drepong", "Gongdue",
    "Jurmey", "Kengkhar", "Mongar", "Narang", "Ngatshang", "Saling",
    "Shermuhoong", "Silambi", "Thangrong", "Tsakaling", "Tsamang",
  ],
  Paro: [
    "Dokar", "Dopshari", "Doteng", "Hungrel", "Lamgong", "Lungnyi",
    "Naja", "Shapa", "Tsento", "Wangchang",
  ],
  "Pema Gatshel": [
    "Chimoong", "Chokhorling", "Chongshing", "Dechheling", "Dungmaed",
    "Khar", "Nanong", "Norbugang", "Shumar", "Yurung", "Zobel",
  ],
  Punakha: [
    "Barp", "Chhubug", "Dzomi", "Goenshari", "Guma", "Kabisa",
    "Lingmukha", "Shenga Bjemi", "Talog", "Toepisa", "Toewang",
  ],
  "Samdrup Jongkhar": [
    "Dewathang", "Gomdar", "Langchenphu", "Lauri", "Martshala", "Orong",
    "Pemathang", "Phuntshothang", "Samrang", "Serthi", "Wangphu",
  ],
  Samtse: [
    "Dungtoe", "Dophoogchen", "Duenchukha", "Namgaychhoeling", "Norbugang",
    "Norgaygang", "Pemaling", "Phuentshogpelri", "Samtse", "Sangngagchhoeling",
    "Tading", "Tashicholing", "Tendruk", "Ugentse", "Yoeseltse",
  ],
  Sarpang: [
    "Chhuzagang", "Chhudzom", "Dekiling", "Gakiling", "Gelephu",
    "Jigmechholing", "Samtenling", "Senggey", "Sherzhong", "Shompangkha",
    "Tareythang", "Umling",
  ],
  Thimphu: ["Chang", "Darkala", "Genye", "Kawang", "Lingzhi", "Mewang", "Naro", "Soe"],
  Trashigang: [
    "Bartsham", "Bidung", "Kanglung", "Kangpar", "Khaling", "Lumang",
    "Merag", "Phongmed", "Radi", "Sagteng", "Samkhar", "Shongphoog",
    "Thrimshing", "Uzorong", "Yangnyer",
  ],
  Trashiyangtse: [
    "Bumdeling", "Jamkhar", "Khamdang", "Ramjar", "Toetsho", "Tomzhang",
    "Yalang", "Yangtse",
  ],
  Trongsa: ["Dragteng", "Korphoog", "Langthil", "Nubi", "Tangsibji"],
  Tsirang: [
    "Barshong", "Dunglegang", "Gosarling", "Kikhorthang", "Mendrelgang",
    "Patshaling", "Phuntenchu", "Rangthangling", "Semjong", "Sergithang",
    "Tsholingkhar", "Tsirangtoe",
  ],
  "Wangdue Phodrang": [
    "Athang", "Bjendag", "Darkar", "Dangchu", "Gangteng", "Gasetsho Gom",
    "Gasetsho Wom", "Kazhi", "Nahi", "Nyisho", "Phangyul", "Phobji",
    "Ruepisa", "Sephu", "Thedtsho",
  ],
  Zhemgang: ["Bardo", "Bjoka", "Goshing", "Nangkor", "Ngangla", "Phangkhar", "Shingkhar", "Trong"],
};

function isValidDzongkhag(name) {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(bhutanLocations, name);
}

function isValidGewog(dzongkhag, gewog) {
  return isValidDzongkhag(dzongkhag) &&
    typeof gewog === "string" &&
    bhutanLocations[dzongkhag].includes(gewog);
}

module.exports = { bhutanLocations, isValidDzongkhag, isValidGewog };
