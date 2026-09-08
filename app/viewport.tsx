'use client';
import { useEffect,useRef,useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createApartmentLighting } from './apartment-lighting';
import { buildApartment } from './apartment-model';
import { applyReferenceMaterials } from './reference-materials';
import { applyExterior } from './exterior';
export type ViewMode='walk'|'dollhouse'|'photos';
export default function Viewport({mode,room,reset,daylight,onReady,onPosition}:{mode:ViewMode;room:string;reset:number;daylight:boolean;onReady:(n:number)=>void;onPosition:(x:number,z:number)=>void}){
 const host=useRef<HTMLDivElement>(null);const engine=useRef<any>(null);const ready=useRef(onReady);ready.current=onReady;const report=useRef(onPosition);report.current=onPosition;const [error,setError]=useState('');
 useEffect(()=>{
  if(!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true})}catch{setError('3D rendering is unavailable in this browser. You can still explore every source photograph.');return}
  const mobile=window.matchMedia("(pointer:coarse)").matches;renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1.25:1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;el.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive apartment. Drag to look around. Use W A S D or arrow keys to move.');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#bfcbd0');const camera=new THREE.PerspectiveCamera(58,1,.035,160);const model=buildApartment();scene.add(model.group);let disposed=false;let releaseTextures=()=>{};let releaseExterior=()=>{};const lighting=createApartmentLighting(renderer,scene,model,{probeSize:mobile?64:128});applyReferenceMaterials(model.group,()=>disposed).then(release=>{releaseTextures=release;lighting.refresh();renderDirty=true}).catch(()=>console.warn("Reference materials could not load; using procedural fallback."));
  applyExterior(model.context,()=>disposed).then(release=>{releaseExterior=release;lighting.refresh();renderDirty=true}).catch(()=>console.warn("Outdoor panorama unavailable."));
  let renderDirty=true;const renderedPosition=new THREE.Vector3(Infinity,0,0),renderedQuaternion=new THREE.Quaternion();if(mobile)lighting.sun.shadow.mapSize.set(1024,1024);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI/2-.04;controls.minDistance=3;controls.maxDistance=28;
  let currentMode:ViewMode='dollhouse',yaw=0,pitch=0,drag=false,px=0,py=0,frame=0,last=performance.now(),count=0;let walkTarget:THREE.Vector3|null=null;const keys=new Set<string>();
  function rotation(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0)}
  function setView(m:ViewMode,r:string){currentMode=m;renderDirty=true;renderer.shadowMap.needsUpdate=true;controls.enabled=m==='dollhouse';model.ceiling.visible=m==='walk';model.context.visible=m==='walk';walkTarget=null;keys.clear();if(m==='dollhouse'){camera.position.set(10.8,13.4,14.6);controls.target.set(2.8,0,5.2);camera.fov=45;camera.lookAt(controls.target);controls.update()}else{const p=model.rooms.find(v=>v.id===r)||model.rooms[0];camera.position.set(...p.position);const delta=new THREE.Vector3(...p.target).sub(camera.position);yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));camera.fov=68;rotation()}camera.updateProjectionMatrix();report.current(camera.position.x,camera.position.z)}
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
  function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();renderDirty=true};const observer=new ResizeObserver(resize);observer.observe(el);resize();
  function animate(t:number){frame=requestAnimationFrame(animate);const dt=Math.min((t-last)/1000,.04);last=t;if(document.hidden)return;if(currentMode==='dollhouse')controls.update();else if(currentMode==='walk'){let f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);let r=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);const speed=1.55*dt/(f&&r?Math.SQRT2:1);move((-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed);if(walkTarget){const dir=walkTarget.clone().sub(camera.position);if(dir.length()<.08)walkTarget=null;else{dir.normalize().multiplyScalar(dt*1.8);move(dir.x,dir.z)}}}if(currentMode!=='photos'&&(renderDirty||lighting.pending>0||!camera.position.equals(renderedPosition)||!camera.quaternion.equals(renderedQuaternion))){lighting.step();renderer.render(scene,camera);renderedPosition.copy(camera.position);renderedQuaternion.copy(camera.quaternion);renderDirty=false;}if(++count%20===0)report.current(camera.position.x,camera.position.z)}
  engine.current={setView,light:(day:boolean)=>{lighting.setDaylight(day);renderDirty=true},camera,scene,renderer,model};setView('dollhouse','living');animate(performance.now());let meshes=0;model.group.traverse(o=>{if((o as THREE.Mesh).isMesh)meshes++});ready.current(meshes);
  return()=>{disposed=true;lighting.dispose();releaseExterior();releaseTextures();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('blur',clear);window.removeEventListener('atlas-move',gesture);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',pointer);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('dblclick',teleport);scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material){const ms=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of ms)m.dispose()}});renderer.dispose();canvas.remove();engine.current=null}
 },[]);
 useEffect(()=>{engine.current?.setView(mode,room)},[mode,room,reset]);useEffect(()=>{engine.current?.light(daylight)},[daylight]);
 return <div ref={host} className="viewport">{error&&<div className="render-error">{error}</div>}</div>
}








