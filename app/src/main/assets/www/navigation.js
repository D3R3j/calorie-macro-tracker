import {icon} from './icons.js';
export function mountNavigation(){
  const $=id=>document.getElementById(id),menu=$('appMenu'),toggle=$('menuToggle'),about=$('aboutDialog');
  const sync=()=>{toggle.setAttribute('aria-expanded',String(menu.open));document.documentElement.classList.toggle('menu-open',menu.open)};
  const close=()=>{menu.close();sync()};
  toggle.onclick=()=>{menu.showModal();sync()};
  $('menuClose').onclick=close;menu.addEventListener('close',sync);
  menu.addEventListener('click',e=>{if(e.target!==menu)return;const rect=menu.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)close()});
  function goTo(id){const target=$(id);if(!target)return;if(target.tagName==='DETAILS')target.open=true;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}
  let version=document.documentElement.dataset.appVersion;
  try{if(window.AndroidFiles?.getVersion)version=window.AndroidFiles.getVersion()}catch{}
  for(const node of document.querySelectorAll('[data-version-label]'))node.textContent='Версия '+version;
  function showAbout(note=''){$('aboutUpdateNote').textContent=note;$('aboutUpdateNote').hidden=!note;about.showModal()}
  $('aboutClose').onclick=()=>about.close();
  $('aboutMethod').onclick=()=>{about.close();requestAnimationFrame(()=>goTo('methodology'))};
  $('sourceLink').onclick=e=>{if(window.AndroidFiles?.openRepository){e.preventDefault();window.AndroidFiles.openRepository()}};
  menu.addEventListener('click',e=>{const button=e.target.closest('[data-menu-action]');if(!button)return;const action=button.dataset.menuAction;close();
    if(action==='goto'){requestAnimationFrame(()=>goTo(button.dataset.target));return}
    // Keep picker actions in the original user gesture for WebView and browsers.
    if(action==='export'){$('export').click();return}
    if(action==='import'){$('import').click();return}
    requestAnimationFrame(()=>{
      if(action==='goals')$('goalBtn').click();
      if(action==='theme')$('themeToggle').click();
      if(action==='help')$('helpBtn').click();
      if(action==='about')showAbout();
      if(action==='updates'){
        if(window.AndroidFiles?.checkUpdates)window.AndroidFiles.checkUpdates();
        else showAbout('Проверка и установка APK доступна в Android-приложении. Новую версию можно найти в вашем GitHub-репозитории.');
      }
    });
  });
  for(const node of document.querySelectorAll('[data-icon]'))node.innerHTML=icon(node.dataset.icon);
}
