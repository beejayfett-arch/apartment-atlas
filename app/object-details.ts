import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function woodFinish(color='#88654b'){
 const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,512,256);
 for(let i=0;i<850;i++){const y=(i*131.7)%256;ctx.strokeStyle=i%3?'rgba(45,29,19,.045)':'rgba(230,203,162,.055)';ctx.lineWidth=.3+(i%4)*.16;ctx.beginPath();for(let x=0;x<=512;x+=8){const yy=y+Math.sin(x*.012+i*.8)*(1.2+i%4)+Math.sin(x*.031+i)*.4;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy)}ctx.stroke()}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;
 return new THREE.MeshPhysicalMaterial({map,bumpMap:map,bumpScale:.00015,roughness:.5,clearcoat:.12,clearcoatRoughness:.5});
}
export function detailBox(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material,r=.004){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh}
export function photoTable(){
 const table=new THREE.Group(),wood=woodFinish(),end=wood.clone();end.color.set('#ded0c3');end.roughness=.58;
 const profile=[new THREE.Vector2(0,.731),new THREE.Vector2(.493,.731),new THREE.Vector2(.515,.737),new THREE.Vector2(.522,.745),new THREE.Vector2(.519,.755),new THREE.Vector2(.511,.762),new THREE.Vector2(0,.762)];
 const top=new THREE.Mesh(new THREE.LatheGeometry(profile,96),[wood]);top.castShadow=top.receiveShadow=true;table.add(top);
 // The top gets planar grain instead of radial/cylinder UV stretching.
 const p=top.geometry.attributes.position,n=top.geometry.attributes.normal,uv=top.geometry.attributes.uv;for(let i=0;i<p.count;i++)if(Math.abs(n.getY(i))>.6)uv.setXY(i,p.getX(i)+.5,p.getZ(i)+.5);uv.needsUpdate=true;
 const underside=new THREE.Mesh(new THREE.CylinderGeometry(.375,.375,.052,64,1,true),end);underside.position.y=.699;table.add(underside);
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;const lower=new THREE.Vector3(Math.sin(a)*.44,.02,Math.cos(a)*.44),upper=new THREE.Vector3(Math.sin(a)*.325,.727,Math.cos(a)*.325);const leg=new THREE.Mesh(new THREE.CylinderGeometry(.023,.014,lower.distanceTo(upper),4),wood);leg.position.copy(lower).add(upper).multiplyScalar(.5);leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upper.clone().sub(lower).normalize());leg.rotateY(Math.PI/4);leg.castShadow=leg.receiveShadow=true;table.add(leg)}
 return table;
}
export function brushedSteel(){
 const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#bdbdbd';ctx.fillRect(0,0,256,256);for(let i=0;i<256;i++){const v=165+(i*43%55);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(0,i,256,1)}const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;
 return new THREE.MeshPhysicalMaterial({color:'#b7bec1',metalness:1,roughness:.46,roughnessMap:map,bumpMap:map,bumpScale:.000035,anisotropy:.35,anisotropyRotation:Math.PI/2});
}
export function botanicalPlant(h=.65,r=.13,trailing=false){
 const group=new THREE.Group();let seed=571;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 const clay=new THREE.MeshStandardMaterial({color:'#846449',roughness:.94}),soil=new THREE.MeshStandardMaterial({color:'#302d22',roughness:1}),stem=new THREE.MeshStandardMaterial({color:'#596b36',roughness:.8});
 const profile=[new THREE.Vector2(r*.69,0),new THREE.Vector2(r*.77,.008),new THREE.Vector2(r*.98,r*1.75),new THREE.Vector2(r*1.04,r*1.77),new THREE.Vector2(r*1.04,r*1.91),new THREE.Vector2(r*.9,r*1.91),new THREE.Vector2(r*.87,r*1.76),new THREE.Vector2(r*.69,.025)];const pot=new THREE.Mesh(new THREE.LatheGeometry(profile,40),clay);pot.castShadow=pot.receiveShadow=true;group.add(pot);const earth=new THREE.Mesh(new THREE.CircleGeometry(r*.88,32),soil);earth.rotation.x=-Math.PI/2;earth.position.y=r*1.76;group.add(earth);
 const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#53793c';ctx.fillRect(0,0,128,256);for(let i=0;i<3000;i++){ctx.fillStyle=i%2?'rgba(191,199,102,.07)':'rgba(28,68,26,.08)';ctx.fillRect(random()*128,random()*256,2,3)}ctx.strokeStyle='rgba(160,178,90,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(64,0);ctx.lineTo(64,256);ctx.stroke();for(let y=20;y<245;y+=23)for(const sign of[-1,1]){ctx.beginPath();ctx.moveTo(64,y);ctx.quadraticCurveTo(64+sign*23,y+11,64+sign*52,y+38);ctx.stroke()}const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const greens=[.83,1,1.12].map(v=>new THREE.MeshPhysicalMaterial({map,color:new THREE.Color(v,v, v*.91),roughness:.57,side:THREE.DoubleSide,transmission:.035,thickness:.0006,ior:1.42}));
 function twig(points:THREE.Vector3[],radius:number){const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,radius,5,false),stem);mesh.castShadow=true;group.add(mesh)}
 function leaf(origin:THREE.Vector3,size:number,angle:number,droop:number,index:number){const geometry=new THREE.PlaneGeometry(1,1,10,16),p=geometry.attributes.position;for(let i=0;i<p.count;i++){const u=p.getX(i)*2,t=p.getY(i)+.5;const outline=Math.pow(Math.sin(Math.PI*t),.65)*(1-.18*t);p.setXYZ(i,u*outline*size*.36,t*size,.075*size*Math.abs(u)*Math.sin(Math.PI*t)-size*.24*t*t+size*.012*Math.sin(t*19+index)*Math.abs(u))}geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,greens[index%3]);mesh.position.copy(origin);mesh.rotation.set(droop,angle,Math.sin(index*2.1)*.45);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh)}
 for(let branch=0;branch<(trailing?6:7);branch++){const angle=branch*2.399,reach=h*(.2+random()*.18),height=h*(.48+random()*.52),base=r*1.78;const tip=new THREE.Vector3(Math.cos(angle)*reach,base+(trailing?-height:height),Math.sin(angle)*reach);twig([new THREE.Vector3(0,base,0),new THREE.Vector3(tip.x*.45,base+(trailing?-.06:height*.56),tip.z*.5),tip],h*.006);for(let j=0;j<(trailing?7:4);j++){const t=.25+j*(trailing?.105:.21),origin=new THREE.Vector3(tip.x*t,base+(tip.y-base)*t,tip.z*t),a=angle+(j%2?1.1:-1.1),size=h*(trailing?.11:.23)*(1-t*.25)*( .85+random()*.3);const leafStart=origin.clone().add(new THREE.Vector3(Math.cos(a)*size*.13,.015,Math.sin(a)*size*.13));twig([origin,leafStart],h*.003);leaf(leafStart,size,a,trailing?1.5:1.03+random()*.55,branch*7+j)}}
 return group;
}
