// Beveled solid shapes: front, rounded rim and back all have real depth.
function puffMesh(outline){
 const p=[],n=[],uv=[],indices=[],rings=[[.001,.25],[.72,.24],[.95,.15],[1,0],[.95,-.15],[.72,-.24],[.001,-.25]],count=outline.length;
 for(const [r,z] of rings)for(const [x,y] of outline){p.push(x*r,y*r,z);n.push(0,0,0);uv.push((x+1)/2,(y+1)/2)}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<count;i++){let a=j*count+i,b=j*count+(i+1)%count,c=a+count,d=b+count;indices.push(a,c,b,b,c,d)}
 for(let i=0;i<indices.length;i+=3){let [a,b,c]=indices.slice(i,i+3),v=cross(sub(p.slice(b*3,b*3+3),p.slice(a*3,a*3+3)),sub(p.slice(c*3,c*3+3),p.slice(a*3,a*3+3)));for(const k of [a,b,c])for(let q=0;q<3;q++)n[k*3+q]+=v[q]}
 for(let i=0;i<n.length;i+=3){let v=unit(n.slice(i,i+3));n.splice(i,3,...v)}return mesh(p,n,uv,indices);
}
// Counterclockwise outlines give outward-facing surface normals.
const starOutline=Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,r=i%2?.46:1;return[Math.cos(a)*r,Math.sin(a)*r]});
const heartOutline=Array.from({length:64},(_,i)=>{const t=-i/64*Math.PI*2;return[Math.pow(Math.sin(t),3),(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16]});
const decorationMeshes={star:puffMesh(starOutline),heart:puffMesh(heartOutline)};
function decorationRotation(y,z){y*=Math.PI/180;z*=Math.PI/180;const cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);return[cz*cy,sz*cy,-sy,-sz,cz,0,cz*sy,sz*sy,cy]}
function renderDecorations(){for(const name of ['star','heart']){if($(name+'Visible').value!=='yes')continue;const size=+$(name+'Size').value;draw(decorationMeshes[name],['X','Y','Z'].map(k=>+$(name+k).value),[size,size,size],rgb($(name+'Color').value),false,decorationRotation(+$(name+'Turn').value,+$(name+'Spin').value))}}
// Drag the selected object on a plane parallel to the screen. Z remains editable.
let decorDrag=null;
const oldDown=canvas.onpointerdown,oldMove=canvas.onpointermove,oldUp=canvas.onpointerup;
canvas.onpointerdown=e=>{const name=$('editTarget').value;if(name==='camera'){oldDown(e);return}if($(name+'Visible').value!=='yes'){$('status').textContent='선택한 꾸밈 요소를 먼저 표시하세요.';return}stop();canvas.setPointerCapture(e.pointerId);decorDrag={name,x:e.clientX,y:e.clientY,pos:['X','Y','Z'].map(k=>+$(name+k).value)}};
canvas.onpointermove=e=>{if(!decorDrag){oldMove(e);return}const {name,x,y,pos}=decorDrag,yaw=+$('yaw').value*Math.PI/180,pitch=+$('pitch').value*Math.PI/180,right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)];
 const rect=canvas.getBoundingClientRect(),cameraDirection=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],target=[-+$('offset').value,1.9,0],depth=+$('distance').value-dot(sub(pos,target),cameraDirection),unitPerPixel=2*Math.max(.3,depth)*Math.tan(+$('fov').value*Math.PI/360)/rect.height;
 ['X','Y','Z'].forEach((k,i)=>{const el=$(name+k),v=pos[i]+((e.clientX-x)*right[i]-(e.clientY-y)*up[i])*unitPerPixel;el.value=Math.max(+el.min,Math.min(+el.max,v))});updateDecorationLabels();};
canvas.onpointerup=canvas.onpointercancel=()=>{decorDrag=null;oldUp()};
function updateDecorationLabels(){for(const name of ['star','heart'])for(const key of ['X','Y','Z','Size','Spin','Turn'])$(name+key+'Out').textContent=$(name+key).value;const target=$('editTarget').value;document.querySelector('.hint').textContent=target==='camera'?'드래그: 시점 회전 · 휠: 확대 / 축소':`${target==='star'?'별':'하트'} 배치 모드 · 화면 드래그: 이동 · 깊이: Z 슬라이더`;}
for(const name of ['star','heart'])for(const key of ['X','Y','Z','Size','Spin','Turn'])$(name+key).addEventListener('input',updateDecorationLabels);
$('editTarget').onchange=()=>{stop();updateDecorationLabels()};
$('pose').onchange=()=>{if($('mode').value==='board'){$('mode').value='model';sync()}$('status').textContent='캐릭터 포즈 적용 완료'};
updateDecorationLabels();
