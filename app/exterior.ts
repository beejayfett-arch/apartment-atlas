import * as THREE from 'three';

// Reconstructed surrounding view from the user's three photographs.
// Missing directions are synthesized; orientation and height are approximate.
export async function applyExterior(context:THREE.Group,isDisposed:()=>boolean){
 const map=await new THREE.TextureLoader().loadAsync('/textures/park-panorama.png');
 if(isDisposed()){map.dispose();return ()=>{}}
 map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;
 map.anisotropy=4;map.offset.y=-.12;
 // A distant inside-facing shell gives a continuous view through every opening.
 const shell=new THREE.Mesh(new THREE.SphereGeometry(65,96,48),new THREE.MeshBasicMaterial({map,side:THREE.BackSide,toneMapped:false,depthWrite:false}));
 shell.position.set(3.4,1.58,4.5);shell.rotation.y=Math.PI*.45;
 shell.name='Photo-derived park surroundings';shell.renderOrder=-1;
 for(const child of context.children)child.visible=false;
 context.add(shell);
 return ()=>{context.remove(shell);shell.geometry.dispose();shell.material.dispose();map.dispose()};
}

