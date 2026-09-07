'use client';
import { useEffect,useRef,useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildApartment } from './apartment-model';
export type ViewMode='walk'|'dollhouse'|'photos';
export default function Viewport({mode,room,reset,daylight,onReady,onPosition}:{mode:ViewMode;room:string;reset:number;daylight:boolean;onReady:(n:number)=>void;onPosition:(x:number,z:number)=>void}){
 const host=useRef<HTMLDivElement>(null);const engine=useRef<any>(null);const ready=useRef(onReady);ready.current=onReady;const report=useRef(onPosition);report.current=onPosition;const [error,setError]=useState('');
 useEffect(()=>{
  if(!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true})}catch{setError('3D rendering is unavailable in this browser. You can still explore every source photograph.');return}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;el.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive apartment. Drag to look around. Use W A S D or arrow keys to move.');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#bfcbd0');const camera=new THREE.PerspectiveCamera(58,1,.035,160);const model=buildApartment();scene.add(model.group);
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.35;
  const hemi=new THREE.HemisphereLight('#f1f8ff','#929487',1.75);scene.add(hemi);const sun=new THREE.DirectionalLight('#fff4dc',2.6);sun.position.set(-5,9,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:14,bottom:-14,near:.1,far:45});sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;scene.add(sun);sun.target.position.set(3,0,4);scene.add(sun.target);
  const fill=new THREE.DirectionalLight('#dbeeff',.65);fill.position.set(9,5,11);scene.add(fill);
  for(const p of [[2.4,2.3,5.6],[5.9,2.3,8],[1.3,2.3,1.7],[5.8,2.3,1.7],[3.5,2.3,1.6]]){const l=new THREE.PointLight('#fff2db',4,6,2);l.position.set(...p as [number,number,number]);scene.add(l)}
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI/2-.04;controls.minDistance=3;controls.maxDistance=28;
  let currentMode:ViewMode='dollhouse',yaw=0,pitch=0,drag=false,px=0,py=0,frame=0,last=performance.now(),count=0;let walkTarget:THREE.Vector3|null=null;const keys=new Set<string>();
  function rotation(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0)}
  function setView(m:ViewMode,r:string){currentMode=m;controls.enabled=m==='dollhouse';model.ceiling.visible=m==='walk';model.context.visible=m==='walk';walkTarget=null;keys.clear();if(m==='dollhouse'){camera.position.set(10.8,13.4,14.6);controls.target.set(2.8,0,5.2);camera.fov=45;camera.lookAt(controls.target);controls.update()}else{const p=model.rooms.find(v=>v.id===r)||model.rooms[0];camera.position.set(...p.position);const delta=new THREE.Vector3(...p.target).sub(camera.position);yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));camera.fov=68;rotation()}camera.updateProjectionMatrix();report.current(camera.position.x,camera.position.z)}
  function safe(x:number,z:number){const inBody=x>.19&&x<6.92&&z>.19&&z<7.73;const inKitchen=x>4.98&&x<6.92&&z>=7.73&&z<10.8;const balcony=x>-1.2&&x<.25&&z>5.1&&z<7.7;if(!inBody&&!inKitchen&&!balcony)return false;return !model.colliders.some(c=>x>c.minX-.15&&x<c.maxX+.15&&z>c.minZ-.15&&z<c.maxZ+.15)}
  function move(dx:number,dz:number){const x=camera.position.x+dx,z=camera.position.z+dz;if(safe(x,camera.position.z))camera.position.x=x;if(safe(camera.position.x,z))camera.position.z=z}
  function down(e:PointerEvent){if(currentMode!=='walk')return;renderer.domElement.focus();drag=true;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);walkTarget=null}
  function pointer(e:PointerEvent){if(!drag||currentMode!=='walk')return;yaw-=(e.clientX-px)*.0032;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-py)*.0032,-1.35,1.35);px=e.clientX;py=e.clientY;rotation()}
  function up(){drag=false}
  function kd(e:KeyboardEvent){if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||document.querySelector('[data-slot=dialog-content]')||(e.target instanceof Element&&e.target.closest('[role=tablist]'))||currentMode!=='walk')return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());e.preventDefault();walkTarget=null}}
  const ku=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());const clear=()=>{keys.clear();drag=false};
  function gesture(e:Event){const d=(e as CustomEvent).detail;if(d.action==='stop')keys.clear();else keys.add(d.action)}
  const raycaster=new THREE.Raycaster();function teleport(e:MouseEvent){if(currentMode!=='walk')return;const rect=el.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const target=new THREE.Vector3();raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),target);if(target.distanceTo(camera.position)<8&&safe(target.x,target.z))walkTarget=new THREE.Vector3(target.x,1.58,target.z)}
  const canvas=renderer.domElement;canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('dblclick',teleport);window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);window.addEventListener('blur',clear);window.addEventListener('atlas-move',gesture);
  function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(el);resize();
  function animate(t:number){frame=requestAnimationFrame(animate);const dt=Math.min((t-last)/1000,.04);last=t;if(currentMode==='dollhouse')controls.update();else if(currentMode==='walk'){let f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);let r=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);const speed=1.55*dt/(f&&r?Math.SQRT2:1);move((-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed);if(walkTarget){const dir=walkTarget.clone().sub(camera.position);if(dir.length()<.08)walkTarget=null;else{dir.normalize().multiplyScalar(dt*1.8);move(dir.x,dir.z)}}}if(currentMode!=='photos')renderer.render(scene,camera);if(++count%20===0)report.current(camera.position.x,camera.position.z)}
  engine.current={setView,light:(day:boolean)=>{sun.intensity=day?2.6:.7;hemi.intensity=day?1.75:1.1;renderer.toneMappingExposure=day?1.0:1.05},camera,scene,renderer,model};setView('dollhouse','living');animate(performance.now());let meshes=0;model.group.traverse(o=>{if((o as THREE.Mesh).isMesh)meshes++});ready.current(meshes);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('blur',clear);window.removeEventListener('atlas-move',gesture);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',pointer);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('dblclick',teleport);scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material){const ms=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of ms)m.dispose()}});env.dispose();pmrem.dispose();renderer.dispose();canvas.remove();engine.current=null}
 },[]);
 useEffect(()=>{engine.current?.setView(mode,room)},[mode,room,reset]);useEffect(()=>{engine.current?.light(daylight)},[daylight]);
 return <div ref={host} className="viewport">{error&&<div className="render-error">{error}</div>}</div>
}





