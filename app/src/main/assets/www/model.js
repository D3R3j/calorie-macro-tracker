/* Reference values per 100 g of prepared edible product, approximate. */
export const foods = [
 ['Куриная грудка',31,3.6,0],['Куриное бедро',25,11,0],['Говядина',26,15,0],['Свинина',25,22,0],['Индейка',29,4,0],['Рыба белая',23,2,0],['Лосось',22,12,0],['Яйцо',12.6,10.6,1.1],['Рис варёный',2.7,.3,28],['Гречка варёная',3.6,1.1,20],['Макароны варёные',5,1.1,30],['Картофель варёный',2,.1,17],['Фасоль варёная',8.7,.5,22],['Чечевица варёная',9,.4,20],['Капуста',1.5,.2,5],['Морковь',.9,.2,8],['Лук',1.1,.1,9],['Помидор',.9,.2,3.9],['Кабачок',1.2,.3,3],['Грибы',3.1,.3,3],['Сыр',25,27,1],['Сметана 20%',2.8,20,3.2],['Сливки 10%',3,10,4],['Молоко 2,5%',3,2.5,4.7],['Творог 5%',17,5,3],['Хлеб',8,3,49],['Мука',10,1,76],['Сахар',0,0,100],['Сливочное масло',.5,82,.8]
].map(([name,p,f,c],id)=>({id,name,p,f,c}));
export const defaults={k:2450,p:150,f:70,c:305};
export const energy=v=>4*v.p+9*v.f+4*v.c;
export function estimate({weight,portion,items,oil,oilGrams,method,water}) {
 if(!Number.isFinite(weight)||weight<=0||weight>100000||!Number.isFinite(portion)||portion<=0||portion>weight) throw Error('Укажите вес блюда и порцию от 1 г до веса блюда.');
 if(!items.length||items.some(i=>!foods[i.id]||![1,3,6].includes(i.rank))) throw Error('Добавьте хотя бы один ингредиент.');
 if(!['none','known','unknown'].includes(oil)||!['boil','stew','bake','fry'].includes(method)) throw Error('Проверьте способ приготовления и масло.');
 if(!Number.isFinite(water)||water<0||water>90) throw Error('Доля воды должна быть от 0 до 90%.');
 if(oil==='known'&&(!Number.isFinite(oilGrams)||oilGrams<0||oilGrams>=weight*(1-water/100))) throw Error('Масло должно весить меньше пищевой части блюда.');
 let seed=42;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return(seed+.5)/4294967296};
 const samples=[];
 for(let s=0;s<3000;s++) {
  const weights=items.map(i=>-Math.log(rand())*i.rank),sum=weights.reduce((a,b)=>a+b,0);
  const oilMax={boil:.015,stew:.04,bake:.05,fry:.10}[method];
  const grams=oil==='known'?oilGrams:oil==='none'?0:weight*oilMax*rand();
  const solid=weight*(1-water/100)-grams;
  const v={p:0,f:grams,c:0};
  items.forEach((i,n)=>{const food=foods[i.id];for(const key of ['p','f','c'])v[key]+=food[key]*solid*weights[n]/sum/100});
  v.k=energy(v);for(const key of ['k','p','f','c'])v[key]*=portion/weight;samples.push(v);
 }
 const result={};for(const key of ['k','p','f','c']){const sorted=samples.map(v=>v[key]).sort((a,b)=>a-b);result[key]={low:sorted[150],mid:sorted[1500],high:sorted[2849]}}
 return result;
}
export function totals(entries){const out={};for(const key of ['k','p','f','c'])out[key]=['low','mid','high'].reduce((r,band)=>({...r,[band]:entries.reduce((s,e)=>s+e.result[key][band],0)}),{});return out}
