import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export const catalog=[
 {id:'upholstered-bed',name:'Upholstered queen bed',category:'Bedroom',size:'1.76 × 2.22 m',note:'Inferred design · padded channel headboard'},
 {id:'linen-sofa',name:'Linen three-seat sofa',category:'Seating',size:'2.18 × 0.9 m',note:'Loose cushions · timber feet'},
 {id:'armchair',name:'Bouclé armchair',category:'Seating',size:'0.82 × 0.84 m',note:'Curved arms · upholstered back'},
 {id:'ottoman',name:'Upholstered ottoman',category:'Seating',size:'0.72 × 0.52 m',note:'Piped cushion · oak feet'},
 {id:'coffee-table',name:'Oak coffee table',category:'Tables',size:'1.1 × 0.58 m',note:'Rounded top · lower shelf'},
 {id:'round-table',name:'Round dining table',category:'Tables',size:'1.04 m diameter',note:'Walnut top · tapered legs'},
 {id:'nightstand',name:'Oak bedside drawers',category:'Bedroom',size:'0.48 × 0.42 m',note:'Two drawers · brass pulls'},
 {id:'bookshelf',name:'Open oak bookcase',category:'Storage',size:'0.8 × 0.32 m',note:'Five shelves · books and ceramics'},
 {id:'floor-lamp',name:'Linen floor lamp',category:'Lighting',size:'0.42 m diameter',note:'Fabric shade · brass stem'},
 {id:'plant',name:'Potted indoor plant',category:'Decor',size:'0.65 × 0.65 m',note:'Branching foliage · terracotta pot'},
 {id:'woven-rug',name:'Woven area rug',category:'Decor',size:'2 × 2.8 m',note:'Textured weave · bordered edges'},
];
export type FurnitureRecord={id:string;kind:string;name:string;x:number;z:number;rotation:number;visible:boolean};
export function makeFurniture(kind:string){
 const g=new THREE.Group();g.name=catalog.find(v=>v.id===kind)?.name||kind;
 const fabricCanvas=document.createElement('canvas');fabricCanvas.width=fabricCanvas.height=128;const ctx=fabricCanvas.getContext('2d')!;ctx.fillStyle='#c9beac';ctx.fillRect(0,0,128,128);for(let i=0;i<128;i+=2){ctx.fillStyle=i%4?'#beb39f':'#d0c5b3';ctx.fillRect(i,0,1,128);ctx.globalAlpha=.22;ctx.fillRect(0,i,128,1);ctx.globalAlpha=1}const weave=new THREE.CanvasTexture(fabricCanvas);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(4,4);weave.colorSpace=THREE.SRGBColorSpace;
 const fabric=new THREE.MeshStandardMaterial({map:weave,bumpMap:weave,bumpScale:.0007,roughness:.97}),oak=new THREE.MeshStandardMaterial({color:'#9b7048',roughness:.62}),white=new THREE.MeshStandardMaterial({color:'#eee9dc',roughness:.96}),brass=new THREE.MeshStandardMaterial({color:'#a38a52',metalness:.72,roughness:.3}),dark=new THREE.MeshStandardMaterial({color:'#343936',roughness:.7});
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material=fabric,r=.025){const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o}
 function cyl(x:number,y:number,z:number,r:number,h:number,m:THREE.Material,r2=r){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r2,h,32),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o}
 function legs(w:number,d:number,h:number){for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])cyl(x,h/2,z,.026,h,oak,.036)}
 function pillow(x:number,y:number,z:number,w:number,h:number,d:number){const geometry=new THREE.SphereGeometry(1,36,24),p=geometry.attributes.position;const soft=(v:number,e:number)=>Math.sign(v)*Math.pow(Math.abs(v),e);for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i);p.setXYZ(i,soft(a,.48)*w/2,soft(b,.7)*h/2+.004*Math.sin(c*14+a*11)*Math.max(0,b),soft(c,.48)*d/2)}geometry.computeVertexNormals();const o=new THREE.Mesh(geometry,white);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);o.rotation.set(-.09,.02,.025);return o}
 if(kind==='upholstered-bed'){
  legs(1.5,1.94,.14);box(0,.27,0,1.76,.3,2.16);box(0,.5,.035,1.58,.23,2.02,white,.09);box(0,.69,-1.035,1.76,1.23,.16,fabric,.07);
  for(let i=0;i<8;i++)box(-.752+i*.215,.8,-.933,.204,.94,.085,fabric,.05);
  pillow(-.4,.685,-.64,.67,.17,.45);pillow(.4,.69,-.62,.67,.19,.45);
  const cloth=new THREE.PlaneGeometry(1.88,1.64,64,48),cp=cloth.attributes.position;for(let i=0;i<cp.count;i++){const u=cp.getX(i),v=cp.getY(i),edge=Math.max(0,(Math.abs(u)-.76)/.18);cp.setXYZ(i,Math.sign(u)*(Math.min(Math.abs(u),.76)+.07*Math.sin(edge*Math.PI/2)),.65-.25*(1-Math.cos(edge*Math.PI/2))+.009*Math.sin(u*8+v*5)+.004*Math.sin(v*27+u*13),v+.22)}cloth.computeVertexNormals();const clothMaterial=white.clone();clothMaterial.side=THREE.DoubleSide;const cover=new THREE.Mesh(cloth,clothMaterial);cover.castShadow=cover.receiveShadow=true;g.add(cover);box(0,.671,.57,1.64,.025,.55,fabric,.01);
 }else if(kind==='linen-sofa'||kind==='armchair'){
  const w=kind==='armchair'?.82:2.18,n=kind==='armchair'?1:3;legs(w-.2,.65,.15);box(0,.3,0,w,.32,.84);box(0,.65,-.35,w,.65,.18);
  for(const x of[-w/2+.09,w/2-.09])box(x,.51,0,.18,.47,.9);
  for(let i=0;i<n;i++){const x=(i-(n-1)/2)*(w-.38)/n;box(x,.49,.05,(w-.4)/n,.18,.63,white,.06);const p=box(x,.77,-.23,(w-.4)/n,.43,.19,fabric,.06);p.rotation.x=-.18+i*.025}
 }else if(kind==='ottoman'){legs(.55,.36,.14);box(0,.29,0,.72,.32,.52);box(0,.46,0,.73,.065,.53,white)}
 else if(kind==='coffee-table'){legs(.93,.43,.4);box(0,.42,0,1.1,.055,.58,oak);box(0,.16,0,.96,.035,.45,oak)}
 else if(kind==='round-table'){cyl(0,.75,0,.52,.045,oak);legs(.59,.59,.72)}
 else if(kind==='nightstand'){legs(.37,.31,.1);box(0,.31,0,.48,.46,.42,oak);for(const y of[.22,.43]){box(0,y,.215,.43,.18,.024,oak,.008);box(0,y,.242,.13,.012,.025,brass,.005)}}
 else if(kind==='bookshelf'){for(const x of[-.385,.385])box(x,.9,0,.03,1.8,.32,oak);for(let i=0;i<5;i++){box(0,.1+i*.41,0,.8,.035,.32,oak);for(let j=0;j<5;j++){const b=box(-.29+j*.065,.23+i*.41,0,.045,.23,.19,j%2?white:dark,.004);b.rotation.z=j===4?.13:0}}}
 else if(kind==='floor-lamp'){cyl(0,.025,0,.18,.05,brass);cyl(0,.73,0,.012,1.4,brass);cyl(0,1.46,0,.15,.35,white,.21);cyl(0,1.28,0,.2,.014,brass)}
 else if(kind==='plant'){const pot=new THREE.MeshStandardMaterial({color:'#a86345',roughness:1}),leaf=new THREE.MeshStandardMaterial({color:'#4c7044',roughness:.8});cyl(0,.15,0,.17,.3,pot,.12);for(let i=0;i<14;i++){const a=i*2.4,h=.42+i*.045;const l=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),leaf);l.scale.set(.13,.027,.055);l.position.set(Math.sin(a)*.2,h,Math.cos(a)*.2);l.rotation.set(.2,a,.4);g.add(l);cyl(Math.sin(a)*.08,h/2,Math.cos(a)*.08,.005,h,oak)}}
 else if(kind==='woven-rug'){box(0,.012,0,2,.022,2.8,fabric,.008);for(const x of[-.94,.94])box(x,.024,0,.018,.002,2.65,oak,.0004);for(const z of[-1.33,1.33])box(0,.024,z,1.9,.002,.018,oak,.0004)}
 g.userData.kind=kind;return g;
}
