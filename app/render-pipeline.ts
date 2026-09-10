import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/examples/jsm/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';

// Short-range occlusion supplies contact detail, not painted shadows or broad dark halos.
export function createRenderPipeline(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,mobile:boolean){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:mobile?2:4});
 const composer=new EffectComposer(renderer,target),render=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera,1,1),output=new OutputPass();
 ao.updateGtaoMaterial({radius:.23,distanceExponent:1.4,thickness:.35,samples:mobile?8:16});ao.updatePdMaterial({radius:4,samples:mobile?8:16});ao.blendIntensity=.55;
 composer.addPass(render);composer.addPass(ao);composer.addPass(output);
 const transparent:THREE.Object3D[]=[];
 const aoRender=ao.render.bind(ao);
 ao.render=(...args:Parameters<GTAOPass['render']>)=>{transparent.forEach(o=>o.visible=false);try{aoRender(...args)}finally{transparent.forEach(o=>o.visible=true)}};
 function renderFrame(){
  // Glass should not masquerade as an opaque wall in the AO depth buffer.
  transparent.length=0;scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.visible||!m.isMesh)return;const materials=Array.isArray(m.material)?m.material:[m.material];if(materials.every(v=>v.transparent&&v.opacity<.3)||(m as any).isReflector)transparent.push(o)});
  composer.render();
 }
 return {render:renderFrame,resize(w:number,h:number){composer.setSize(w,h);const pixelRatio=renderer.getPixelRatio();ao.setSize(Math.round(w*pixelRatio*(mobile?.55:.8)),Math.round(h*pixelRatio*(mobile?.55:.8)))},dispose(){ao.dispose();output.dispose();composer.dispose()}};
}
