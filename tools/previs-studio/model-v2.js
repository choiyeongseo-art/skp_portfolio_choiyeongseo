// Dimensions estimated from the supplied front / side / back reference.
// Head: width 2.34, depth 1.52. Body: depth .58; skirt: depth .96.
function softBox(exponent=.35){
  const p=[],n=[],uv=[],ix=[],rows=48,cols=64;
  const power=(x,e)=>Math.sign(x)*Math.pow(Math.abs(x),e);
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const t=Math.PI*j/rows,f=2*Math.PI*i/cols;
    const v=[power(Math.sin(t),exponent)*power(Math.cos(f),exponent),power(Math.cos(t),exponent),power(Math.sin(t),exponent)*power(Math.sin(f),exponent)];
    p.push(...v);n.push(...unit(v.map(x=>power(x,2/exponent-1))));uv.push(i/cols,j/rows);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;ix.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2)}
  return mesh(p,n,uv,ix);
}
const box=softBox(.34),hairBox=softBox(.5),eyeBox=softBox(.45);
const modelParts=[];
function part(m,p,s,c){modelParts.push({m,p,s,c})}
function curve(points,r,color){
  // Continuous tube around a polyline; used for straps, laces and the wave clip.
  const p=[],n=[],uv=[],ix=[],sides=8;
  points.forEach((v,i)=>{const tangent=unit(sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)]));const axis=Math.abs(tangent[1])>.9?[1,0,0]:[0,1,0];const a=unit(cross(tangent,axis)),b=cross(tangent,a);
    for(let k=0;k<=sides;k++){const t=k/sides*Math.PI*2,normal=a.map((x,j)=>x*Math.cos(t)+b[j]*Math.sin(t));p.push(...v.map((x,j)=>x+normal[j]*r));n.push(...normal);uv.push(k/sides,i/points.length)}
    if(i<points.length-1)for(let k=0;k<sides;k++){const q=i*(sides+1)+k;ix.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1)}
  });part(mesh(p,n,uv,ix),[0,0,0],[1,1,1],color);
}
function capsule(a,b,r,color){const d=sub(b,a),len=Math.hypot(...d),y=unit(d),x=unit(cross(y,[0,0,1])),z=cross(x,y);const p=[],n=[],uv=[],ix=[],rows=24,cols=24;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const t=j/rows*Math.PI,f=i/cols*2*Math.PI,sy=Math.cos(t),v=[Math.sin(t)*Math.cos(f),sy,Math.sin(t)*Math.sin(f)],normal=[0,1,2].map(k=>x[k]*v[0]+y[k]*v[1]+z[k]*v[2]);p.push(...a.map((v,k)=>v+normal[k]*r+y[k]*(sy>0?len:0)));n.push(...normal);uv.push(i/cols,j/rows)}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;ix.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2)}part(mesh(p,n,uv,ix),[0,0,0],[1,1,1],color);
}
// Hair cap and three broad back locks overlap into one deep bob silhouette.
part(hairBox,[0,2.94,-.16],[1.14,.84,.73],'blue');
for(const x of [-.72,0,.72])part(hairBox,[x,2.62,-.32],[x===0?.46:.4,.7,.58],'blue');
part(box,[0,2.48,.23],[.92,.55,.47],'skin');
for(const s of [-1,1]){
  part(hairBox,[s*.985,2.65,-.1],[.23,.74,.55],'blue');
  part(sphere,[s*.85,3.87,-.18],[.3,.39,.27],'blue');
  part(sphere,[s*1.03,3.72,-.15],[.25,.18,.26],'blue');
  part(sphere,[s*.99,3.58,-.15],[.21,.16,.23],'blue');
  part(hairBox,[s*.61,3.13,.55],[.285,.44,.215],'blue');
  part(eyeBox,[s*.47,2.42,.716],[.145,.217,.032],'dark');
  part(eyeBox,[s*.47,2.43,.752],[.077,.15,.015],'skin');
  part(eyeBox,[s*.47,2.62,.722],[.169,.045,.027],'dark');
  part(sphere,[s*.66,2.18,.695],[.13,.045,.017],'pink');
  part(disc,[s*.29,.61,0],[.175,.3,.19],'skin');
  part(disc,[s*.29,.35,0],[.18,.075,.195],'white');
  part(box,[s*.29,.2,.06],[.23,.18,.33],'blue');
  part(box,[s*.29,.085,.09],[.242,.058,.365],'white');
  part(hairBox,[s*.29,.185,.33],[.185,.1,.1],'white');
  for(let j=0;j<3;j++){
    const y=.255+j*.041,z=.397;
    curve([[s*.29-.11,y,z],[s*.29+.11,y+.022,z]],.012,'white');
    curve([[s*.29+.11,y,z],[s*.29-.11,y+.022,z]],.012,'white');
  }
  // Flat straps and small scalloped armhole trim, front and back.
  for(let j=0;j<7;j++)part(sphere,[s*.335,1.4+j*.052,.23],[.046,.045,.046],'white');
  curve([[s*.25,1.4,.3],[s*.25,1.82,.22],[s*.25,1.9,0],[s*.25,1.81,-.24],[s*.25,1.4,-.29]],.037,'blue');
}
part(hairBox,[0,3.14,.585],[.31,.45,.2],'blue');
curve([[-.045,2.12,.71],[-.023,2.098,.72],[0,2.094,.72],[.025,2.104,.72],[.04,2.122,.71]],.013,'dark');
part(disc,[0,1.9,0],[.19,.13,.18],'skin');
part(box,[0,1.59,0],[.335,.235,.285],'blue');
part(skirt,[0,1.135,0],[.66,.285,.47],'blue');
part(skirt,[0,.89,0],[.675,.035,.48],'white');
part(skirt,[0,.855,0],[.682,.018,.487],'blue');
// Subtle raised skirt pleats, radial around the whole garment.
// Keep the skirt surface clean at preview resolution; no intersecting seam tubes.
// Crossbody bag strap, including the visible diagonal at the back.
curve([[.26,1.83,.24],[.08,1.5,.335],[-.24,1.08,.51]],.031,'blue');
curve([[.26,1.83,-.24],[.05,1.56,-.31],[-.42,1.03,-.44],[-.53,1.02,0],[-.4,1.04,.5]],.031,'blue');
part(sphere,[-.24,1.075,.565],[.295,.265,.18],'white');
for(let s of [-1,1]){part(sphere,[-.24+s*.265,1.035,.59],[.095,.14,.11],'blue');part(sphere,[-.24+s*.12,1.17,.727],[.025,.031,.013],'dark')}
part(sphere,[-.24,1.13,.75],[.052,.035,.045],'yellow');
// White wave outline and blue inset on the right temple.
const wave=[[.62,2.96,.81],[.68,3.08,.815],[.77,3.16,.82],[.89,3.18,.8],[.94,3.15,.79],[.89,3.12,.8],[.89,3.055,.805],[.95,3.025,.79],[1.02,3.06,.77],[.995,2.99,.78],[.91,2.95,.8],[.81,2.96,.82],[.75,3.005,.82],[.69,2.96,.82],[.62,2.96,.81]];
curve(wave,.027,'white');
// Prebuild all pose limbs once. Switching poses never allocates GPU buffers.
for(const pose of ['default','wave','welcome','point'])for(const s of [-1,1]){
  const start=modelParts.length,shoulder=[s*.45,1.74,.02];
  if(pose==='default'||(pose!=='welcome'&&s===-1))capsule(shoulder,[s*.84,1.16,.06],.145,'skin');
  else {
    const elbow=pose==='wave'?[.98,1.66,.22]:[s*.91,1.7,.23];
    const hand=pose==='wave'?[1.28,2.16,.35]:pose==='welcome'?[s*1.29,1.96,.34]:[1.37,1.77,.26];
    capsule(shoulder,elbow,.137,'skin');capsule(elbow,hand,.123,'skin');
    part(sphere,hand,[.15,.17,.12],'skin');
    if(pose==='point')capsule([1.39,1.82,.27],[1.61,1.84,.27],.055,'skin');
  }
  for(let i=start;i<modelParts.length;i++)modelParts[i].pose=pose;
}
function renderCharacter(){const colors={blue:rgb($('blue').value),white:[.99,.97,.92],skin:[1,.86,.75],dark:[.065,.055,.06],pink:[1,.67,.7],yellow:[1,.64,.1]};for(const p of modelParts)if(!p.pose||p.pose===$('pose').value)draw(p.m,p.p,p.s,colors[p.c])}
