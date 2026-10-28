// A neutral standing mannequin, with its left palm facing upward.
const humanStart=modelParts.length;
part(sphere,[.67,4.04,0],[.34,.45,.32],'skin');
part(sphere,[.67,3.98,.315],[.055,.08,.045],'skin');
part(disc,[.67,3.57,0],[.14,.18,.14],'skin');
part(hairBox,[.67,2.95,0],[.47,.61,.27],'shirt');
part(hairBox,[.67,2.22,0],[.4,.22,.25],'pants');
for(const x of [.42,.92]){
 capsule([x,2.17,0],[x,1.18,.02],.18,'pants');
 capsule([x,1.18,.02],[x,.27,.02],.145,'pants');
 part(hairBox,[x,.13,.15],[.18,.12,.32],'shoe');
}
capsule([.23,3.35,0],[-.07,2.68,.35],.15,'shirt');
capsule([-.07,2.68,.35],[-.77,2.62,.8],.115,'skin');
part(sphere,[-.99,2.64,.84],[.28,.08,.24],'skin');
for(let i=0;i<4;i++)capsule([-1.11,2.64,.68+i*.105],[-1.43+(i===0||i===3?.05:0),2.65,.68+i*.105],.047,'skin');
capsule([-.9,2.65,1.025],[-1.12,2.65,1.16],.065,'skin');
capsule([1.11,3.35,0],[1.29,2.65,.04],.15,'shirt');
capsule([1.29,2.65,.04],[1.18,2.03,.16],.11,'skin');
part(sphere,[1.17,1.91,.16],[.115,.19,.105],'skin');
const humanParts=modelParts.splice(humanStart);
const palmPosition=[-1.04,2.726,.84];
function renderHumanScene(){
 const colors={skin:[.86,.79,.69],shirt:rgb($('humanColor').value),pants:[.34,.4,.47],shoe:[.94,.94,.91]};
 for(const p of humanParts)draw(p.m,p.p,p.s,colors[p.c]);
 // Keep the soles on the same palm surface when changing the figure size.
 groupScale=+$('figureSize').value;groupOffset=[palmPosition[0],palmPosition[1]-.027*groupScale,palmPosition[2]];
 try{renderCharacter()}finally{groupScale=1;groupOffset=[0,0,0]}
}
function applyPalmScene(){stop();$('human').value='palm';$('mode').value='model';$('pose').value='default';$('platform').value='no';$('yaw').value='-12';$('pitch').value='8';$('distance').value='8.2';$('offset').value='0';$('figureSize').value='.3';$('starVisible').value='no';$('heartVisible').value='no';$('editTarget').value='camera';sync();$('status').textContent='손바닥 위 캐릭터 구도 적용 완료'}
$('palmPreset').onclick=applyPalmScene;
$('human').onchange=()=>{if($('human').value==='palm'){$('mode').value='model';sync()}};
$('mode').addEventListener('change',()=>{if($('mode').value==='board'){$('human').value='no';sync()}});
