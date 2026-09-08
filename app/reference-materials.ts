import * as THREE from 'three';

// AI-derived material maps use the original photographs as references.
// These are appearance reconstructions, not measured PBR scans.
export async function applyReferenceMaterials(group:THREE.Object3D,isDisposed:()=>boolean) {
 const loader=new THREE.TextureLoader();
 const files:Record<string,string>={'marble tile':'floor-marble-albedo.png','rug':'rug-vintage-albedo.png','leather':'leather-charcoal-albedo.png','oak':'oak-photo-albedo.png','walnut':'oak-photo-albedo.png','balcony brick':'brick-photo-albedo.png','floral duvet':'floral-photo-albedo.png','ochre throws':'throw-photo-albedo.png'};
 const textures:THREE.Texture[]=[];
 const results=await Promise.allSettled(Object.entries(files).map(async([name,file])=>{
  const texture=await loader.loadAsync('/textures/'+file);
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;textures.push(texture);
  return [name,texture] as const;
 }));
 if(isDisposed()){textures.forEach(t=>t.dispose());return ()=>{}}
 const byName=new Map(results.flatMap(r=>r.status==="fulfilled"?[r.value]:[]));const visited=new Set<THREE.Material>();
 group.traverse(object=>{
  const mesh=object as THREE.Mesh;if(!mesh.material)return;
  for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(visited.has(m))continue;visited.add(m);
   const material=m as THREE.MeshStandardMaterial;
   const name=material.userData.referenceMaterial;
   const source=byName.get(name);if(!source)continue;
   const map=source.clone();const previous=material.map;
   if(previous){map.repeat.copy(previous.repeat);map.offset.copy(previous.offset);map.center.copy(previous.center);map.rotation=previous.rotation;}
   if(name==='marble tile')map.repeat.multiplyScalar(.5); // Map contains two tiles per edge.
   if(name==='balcony brick')map.repeat.set(.92/1.3,.912/1.3);
   if(name==='floral duvet')map.repeat.set(2,1.55);
   if(name==='ochre throws')map.repeat.set(2.2,1.5);
   if(name==='leather')map.repeat.set(1.4,1.4);
   if(name==='oak'||name==='walnut'){map.center.set(.5,.5);map.rotation+=Math.PI/2;map.repeat.set(2,1);}
   map.needsUpdate=true;textures.push(map);
   material.map=map;material.bumpMap=map;material.color.set(name==='walnut'?'#b7a18a':'#ffffff');
   material.bumpScale=name==='balcony brick'?.007:name==='marble tile'?.0035:name==='leather'?.0006:name==='oak'||name==='walnut'?.0008:.001;
   material.roughness=name==='leather'?.38:name==='marble tile'?.4:name==='oak'||name==='walnut'?.38:.98;
   if(name==='floral duvet'){material.bumpMap=null;material.bumpScale=0;}if(name==='ochre throws'){material.bumpScale=.0004;material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat fabricLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb=(mix(vec3(fabricLuma),diffuseColor.rgb,0.70)*0.78+vec3(0.18)*0.22)*vec3(0.94,0.90,0.85);');};material.customProgramCacheKey=()=> 'soft-copper-fabric-v1';}
   material.needsUpdate=true;
  }
 });
 return ()=>textures.forEach(t=>t.dispose());
}





