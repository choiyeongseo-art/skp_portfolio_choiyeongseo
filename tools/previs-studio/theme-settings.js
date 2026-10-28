const preferencesDialog=document.getElementById('preferencesDialog');
const themeRadios=[...document.querySelectorAll('input[name=studioTheme]')];
function syncThemeChoices(){for(const radio of themeRadios)radio.checked=radio.value===document.documentElement.dataset.theme}
function applyStudioTheme(theme){
 if(!['light','dark'].includes(theme))return;
 document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;
 try{localStorage.setItem('naru-studio-theme',theme)}catch{}
 syncThemeChoices();
}
document.getElementById('preferencesButton').onclick=()=>{syncThemeChoices();preferencesDialog.showModal()};
for(const id of ['closePreferences','donePreferences'])document.getElementById(id).onclick=()=>preferencesDialog.close();
for(const radio of themeRadios)radio.addEventListener('change',()=>{if(radio.checked)applyStudioTheme(radio.value)});
preferencesDialog.addEventListener('click',e=>{if(e.target!==preferencesDialog)return;const r=preferencesDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)preferencesDialog.close()});
window.addEventListener('storage',e=>{if(e.key==='naru-studio-theme'){const theme=e.newValue==='light'?'light':'dark';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;syncThemeChoices()}});
syncThemeChoices();
