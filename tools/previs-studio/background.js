let backgroundData=null,backgroundTexture=null,backgroundAspect=1,bgLoadVersion=0;
async function setBackground(data){
  const version=++bgLoadVersion;
  if(!data){if(backgroundTexture)gl.deleteTexture(backgroundTexture);backgroundTexture=null;backgroundData=null;$('bgName').textContent='선택한 이미지 없음';return}
  if(!/^data:image\/(png|jpeg);base64,/.test(data))throw Error('PNG 또는 JPG만 지원합니다.');
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('이미지를 읽을 수 없습니다.'));image.src=data});
  if(version!==bgLoadVersion)return;
  const max=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE)),scale=Math.min(1,max/image.width,max/image.height),source=document.createElement('canvas');source.width=Math.max(1,Math.round(image.width*scale));source.height=Math.max(1,Math.round(image.height*scale));source.getContext('2d').drawImage(image,0,0,source.width,source.height);
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
  if(backgroundTexture)gl.deleteTexture(backgroundTexture);backgroundTexture=t;backgroundAspect=image.width/image.height;backgroundData=data;$('bgName').textContent=`배경 이미지 · ${image.width} × ${image.height}`;
}
function renderBackground(){if(!backgroundTexture)return;const aspect=canvas.width/canvas.height,zoom=+$('bgScale').value/100;let w,h;if($('bgFit').value==='contain'){w=Math.min(1,backgroundAspect/aspect);h=Math.min(1,aspect/backgroundAspect)}else{w=Math.max(1,backgroundAspect/aspect);h=Math.max(1,aspect/backgroundAspect)}
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniformMatrix4fv(loc.vp,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));gl.bindTexture(gl.TEXTURE_2D,backgroundTexture);draw(board,[+$('bgX').value/100,-+$('bgY').value/100,0],[w*zoom,h*zoom,1],[1,1,1],true);gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
$('bgUpload').onclick=()=>$('bgFile').click();$('bgFile').onchange=async e=>{const f=e.target.files[0];try{if(!f)return;if(!['image/png','image/jpeg'].includes(f.type))throw Error('PNG 또는 JPG 파일을 선택하세요.');if(f.size>25*1024*1024)throw Error('25MB 이하의 이미지를 선택하세요.');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(f)});await setBackground(data);$('status').textContent='배경 이미지 적용 완료'}catch(err){$('status').textContent=err.message||'이미지 불러오기 실패'}e.target.value=''};
$('bgRemove').onclick=()=>setBackground(null);
