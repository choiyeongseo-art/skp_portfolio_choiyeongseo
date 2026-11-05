
const canvas = document.querySelector("[data-noise-canvas]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function startNoiseAtmosphere() {
  if (!canvas || reduceMotion || navigator.connection?.saveData) return;
  try {
  const THREE = await import('./vendor/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2(.5, .5) } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec2 uPointer;float line(float y,float w){return smoothstep(w,0.,abs(y));}void main(){vec2 p=vUv;float d=distance(p,uPointer);float wave=sin(p.x*34.+uTime*1.7)*.012+sin(p.x*83.-uTime*2.1)*.004;float signal=line(p.y-.33-wave,.006)+line(p.y-.68+wave*.7,.003);float scan=step(.985,fract(p.y*150.+uTime*.8))*.12;float pulse=exp(-d*8.)*.18;vec3 blue=vec3(.25,.48,1.);float a=signal*.5+scan+pulse;gl_FragColor=vec4(blue,a);}`
  });
  scene.add(new THREE.Mesh(geometry, material));
  const resize = () => { const box=canvas.getBoundingClientRect(); renderer.setSize(box.width,box.height,false); };
  window.addEventListener("resize", resize); resize();
  window.addEventListener("pointermove", (event) => material.uniforms.uPointer.value.set(event.clientX/window.innerWidth,1-event.clientY/window.innerHeight), { passive: true });
  const clock = new THREE.Clock();
  let raf = 0, inView = false, previous = 0;
  const draw = now => {
    raf = 0;
    if (!inView || document.hidden) return;
    raf = requestAnimationFrame(draw);
    if (now - previous < 32) return;
    previous = now;
    material.uniforms.uTime.value=clock.getElapsedTime(); renderer.render(scene,camera);
  };
  function sync() {
    if (inView && !document.hidden && !raf) raf = requestAnimationFrame(draw);
    if ((!inView || document.hidden) && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }).observe(canvas);
  } catch { canvas.hidden = true; }
}
if (canvas) {
  const loader = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { loader.disconnect(); startNoiseAtmosphere(); }
  }, {rootMargin: '100px'});
  loader.observe(canvas);
}
