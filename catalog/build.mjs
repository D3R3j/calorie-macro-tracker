import {createReadStream, readFileSync, writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {join} from 'node:path';

const [usdaDir, tempoFile] = process.argv.slice(2);
if (!usdaDir || !tempoFile) throw Error('Usage: node catalog/build.mjs <SR Legacy CSV directory> <TempoLife CSV>');

const here = new URL('.', import.meta.url);
const rows = file => readFileSync(new URL(file, here), 'utf8').trim().split(/\r?\n/)
  .filter(line => line && !line.startsWith('#')).map(line => line.split('\t'));
const legacy = rows('legacy.tsv').map(([id, source, name, category, pieceGrams], index) => {
  if (Number(id) !== index) throw Error('Legacy ID out of order: ' + id);
  return {source, name, category, pieceGrams: pieceGrams && Number(pieceGrams)};
});
const selection = rows('usda-selection.tsv').map(([source, name, category, pieceGrams]) =>
  ({source, name, category, pieceGrams: pieceGrams && Number(pieceGrams)}));
const ingredients = [...legacy, ...selection];
const aliases = new Map();
for (const [source, ...names] of rows('aliases.tsv')) {
  if (aliases.has(source) || !ingredients.some(food => food.source === source) || !names.length || names.some(name => !name.trim())) {
    throw Error('Invalid alias row: ' + source);
  }
  aliases.set(source, names);
}

// One source row must stay paired with all four values. USDA's Energy field is in kcal.
const fields = new Map([['1008', 'k'], ['1003', 'p'], ['1004', 'f'], ['1005', 'c']]);
const usda = new Map(ingredients.filter(({source}) => /^\d+$/.test(source)).map(({source}) => [source, {}]));
const nutrients = createInterface({input: createReadStream(join(usdaDir, 'food_nutrient.csv')), crlfDelay: Infinity});
for await (const line of nutrients) {
  const [, id, nutrient, amount] = line.split(',', 4).map(field => field.replaceAll('"', ''));
  const food = usda.get(id);
  const key = fields.get(nutrient);
  if (!food || !key || !amount) continue;
  const value = Number(amount);
  if (food[key] !== undefined && food[key] !== value) throw Error('Conflicting USDA nutrient: ' + id + ' ' + key);
  food[key] = value;
}

const tempo = new Map();
const tempoIds = new Set(ingredients.filter(({source}) => source.startsWith('tempo:')).map(({source}) => source.slice(6)));
for (const line of readFileSync(tempoFile, 'utf8').split(/\r?\n/)) {
  const id = line.split(',', 1)[0];
  if (!tempoIds.has(id)) continue;
  const columns = [...line.matchAll(/(?:^|,)(?:"((?:""|[^"])*)"|([^,"]*))/g)].map(match => match[1] ?? match[2]);
  const [k, p, c, f] = columns.slice(4, 8).map(Number);
  tempo.set(id, {k, p, f, c});
}

// Label examples are named reference products. Values are per 100 g.
const labels = {
  smetana: [204, 2.5, 20, 3.4, 'https://prostokvashino.ru/product/smetana-20-300-g/'],
  cream: [118, 2.7, 10, 4.2, 'https://prostokvashino.ru/product/slivki-10--205-g/'],
  tvorog: [117, 15, 5, 3, 'https://prostokvashino.ru/product/tvorog-5-200-g/'],
  kefir: [51, 3, 2.5, 4, 'https://prostokvashino.ru/product/kefir-2-5-930-g/'],
  isolate: [369, 86, 0.9, 2.8, 'https://nz.myprotein.com/p/sports-nutrition/myprotein-impact-whey-isolate-unflavoured-1kg-au-localised/15370280/'],
  ryazhenka: [58, 3, 3.2, 4.2, 'https://prostokvashino.ru/product/ryazhenka-3-2-930-ml/'],
  bakedMilk: [60, 3, 3.2, 4.7, 'https://prostokvashino.ru/product/moloko-toplenoe-3-2-930-g/'],
  milk32: [59, 2.9, 3.2, 4.7, 'https://prostokvashino.ru/product/moloko-pasterizovannoe-3-2--1-4-l/'],
  curd9: [157, 16, 9, 3, 'https://prostokvashino.ru/product/tvorog-rassypchatyi-9-320-g/'],
  borodinsky: [198.1, 6.8, 1.3, 39.8, 'https://vkusvill.ru/goods/khleb-borodinskiy-111206/'],
  barleyGroats: [313, 10, 1.3, 65.4, 'https://www.makfa.ru/catalog/krupy-makfa/tradicionnaya/'],
  wheatPoltava: [330, 12, 1, 66, 'https://en.uvelka.ru/products/boil-in-bag-cereals/wheat-groats/'],
  wheatArtek: [329, 11, 1.2, 68.5, 'https://www.makfa.ru/catalog/krupy-makfa/pshenica-makfa/'],
  barleyPorridge: [79.8, 2.6, 0.3, 15.6, 'https://www.mkgtu.ru/vikon/sveden/files/Gigiena_ritania_%281%29.pdf'],
  semolinaMilk: [121, 3, 8.5, 8.8, 'https://vkusvill.ru/media/recipes/mannaya-kasha-na-moloke.html'],
  riceMilk: [98, 1.5, 4, 14, 'https://vkusvill.ru/goods/kasha-risovaya-molochnaya-72848/'],
  oatmealMilk: [59.5, 2.8, 1.5, 8.7, 'https://vkusvill.ru/goods/kasha-ovsyanaya-na-bezlaktoznom-moloke-bez-dobavleniya-sakhara-100348/'],
  friendship: [112.9, 1.5, 4.1, 17.5, 'https://vkusvill.ru/goods/kasha-pshenno-risovaya-na-moloke-78288/'],
  // MR 2.4.0162-19, cards 6.1 and 6.4. Values for a 150 g cooked portion, scaled to 100 g.
  milletMilk: [115.33, 3.53, 3.6, 17.07, 'https://nshds-akbash.tvoysadik.ru/file/card?id=5051#:~:text=Каша%20пшенная%20молочная%20жидкая'],
  buckwheatMilk: [108, 3.8, 3.6, 15.2, 'https://nshds-akbash.tvoysadik.ru/file/card?id=5051#:~:text=Каша%20гречневая%20молочная%20жидкая'],
  // Lapshina et al. yield table: 400 g of wheat groats per kg of cooked loose porridge.
  wheatPorridge: [132, 4.8, 0.4, 26.4, 'https://djvu.online/file/06xrTFFQoDvWn#:~:text=Пшеничная'],
  // School recipe, 160 g serving cooked with water, sugar and butter.
  semolinaWater: [100.63, 2.13, 2.48, 17.39, 'https://32.dagestanschool.ru/file/download?id=1113'],
  milk15: [44, 3, 1.5, 4.7, 'https://prostokvashino.ru/product/moloko-pasterizovannoe-1-5-930-ml/'],
  kefir1: [37, 3, 1, 4, 'https://prostokvashino.ru/product/kefir-1-930-g/'],
  kefir32: [57, 3, 3.2, 4, 'https://prostokvashino.ru/product/kefir-3-2-930-g/'],
  sour10: [117, 2.8, 10, 3.9, 'https://prostokvashino.ru/product/smetana-10-300-g/'],
  sour15: [160, 2.7, 15, 3.6, 'https://prostokvashino.ru/product/smetana-15-300-g/'],
  brinedCucumber: [11.4, 0.6, 0.2, 1.8, 'https://vkusvill.ru/goods/ogurtsy-solenye-bochkovye-16516/'],
  russianCheese: [354, 24.5, 28.5, 0, 'https://vkusnoteevo.ru/produkcziya/syr/syr-rossijskij-50-1000-g/'],
};

const names = new Set();
const sources = new Set();
const output = ingredients.map(({source, name, category, pieceGrams}) => {
  const nameKey = name.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
  if (names.has(nameKey) || sources.has(source)) throw Error('Duplicate entry: ' + name + ' (' + source + ')');
  names.add(nameKey);
  sources.add(source);
  const [kind, ref] = source.split(':');
  const label = kind === 'label' ? labels[ref] : undefined;
  const nutrition = usda.get(source) ?? tempo.get(ref) ??
    (label ? {k: label[0], p: label[1], f: label[2], c: label[3]} :
      source === 'pure:creatine' ? {k: 0, p: 0, f: 0, c: 0} : undefined);
  if (!nutrition || !['k', 'p', 'f', 'c'].every(key => Number.isFinite(nutrition[key]) && nutrition[key] >= 0) ||
      nutrition.k > 900 || nutrition.p + nutrition.f + nutrition.c > 100.5) {
    throw Error('Missing or invalid nutrition: ' + name + ' (' + source + ') ' + JSON.stringify(nutrition));
  }
  const provenance = label?.[4] ?? (usda.has(source) ? 'fdc:' + source : source);
  return [name, nutrition.k, nutrition.p, nutrition.f, nutrition.c, category, provenance, pieceGrams ?? null,
    ...(aliases.has(source) ? [aliases.get(source)] : [])];
});
if (output.length < 300) throw Error('Catalog has fewer than 300 entries');
const content = '// Generated by catalog/build.mjs. Keep numeric IDs stable for saved recipes.\n' +
  'export const foods = [\n' + output.map(row => '  ' + JSON.stringify(row) + ',').join('\n') +
  '\n].map(([name,k,p,f,c,category,source,pieceGrams,aliases],id)=>({id,name,k,p,f,c,category,source,pieceGrams,aliases}));\n';
writeFileSync(new URL('../app/src/main/assets/www/foods.js', here), content);
console.log(output.length + ' food profiles');
