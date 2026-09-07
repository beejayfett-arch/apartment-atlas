import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export type Collider = { minX:number; maxX:number; minZ:number; maxZ:number };
export type Room = { id:string; name:string; position:[number,number,number]; target:[number,number,number] };

// All coordinates are metres: x is right and z is down in the supplied floor plan.
// Hidden surfaces and heights are inferred; room extents follow the marketing plan.
export function buildApartment() {
  const group = new THREE.Group(); group.name='Apartment';
  const ceiling = new THREE.Group(); ceiling.name='Ceilings'; group.add(ceiling);
  const outerWalls = new THREE.Group(); outerWalls.name='Exterior walls'; group.add(outerWalls);
  const colliders:Collider[]=[];
  const materials:Record<string,THREE.Material>={};
  let seed=371;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  function canvasTexture(kind:string, base:string) {
    const c=document.createElement('canvas'); c.width=c.height=512; const ctx=c.getContext('2d')!;
    ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
    if(kind==='tile') {
      for(let i=0;i<6500;i++){const x=rand()*512,y=rand()*512;ctx.fillStyle=`rgba(102,108,101,${rand()*.04})`;ctx.beginPath();ctx.ellipse(x,y,rand()*42+3,rand()*11+1,rand()*3,0,7);ctx.fill()}
      for(let i=0;i<35;i++){ctx.strokeStyle=`rgba(101,110,104,${rand()*.14})`;ctx.lineWidth=rand()*3;ctx.beginPath();const x=rand()*512,y=rand()*512;ctx.moveTo(x,y);ctx.bezierCurveTo(x+60,y-10,x+120,y+40,x+200,y-65);ctx.stroke()}
      ctx.strokeStyle='#8a8e88';ctx.lineWidth=7;ctx.strokeRect(0,0,512,512);ctx.strokeStyle='#535a55';ctx.lineWidth=3;ctx.strokeRect(0,0,512,512);
    } else if(kind==='wood') {
      for(let i=0;i<1900;i++){ctx.strokeStyle=`rgba(${rand()>.5?'52,29,12':'227,187,124'},${rand()*.14})`;ctx.lineWidth=rand()*2+.25;const y=rand()*512;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(160,y+rand()*8,350,y-rand()*9,512,y+rand()*5);ctx.stroke()}
      for(let i=0;i<6;i++){ctx.strokeStyle='rgba(58,36,16,.1)';ctx.strokeRect(0,i*85,512,85)}
    } else if(kind==='fabric'||kind==='rug'||kind==='carpet') {
      for(let y=0;y<512;y+=3){ctx.strokeStyle=`rgba(255,255,255,${.035+rand()*.08})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke()}
      for(let x=0;x<512;x+=3){ctx.strokeStyle=`rgba(0,0,0,${rand()*.09})`;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke()}
      if(kind==='rug'){ctx.strokeStyle='rgba(87,94,89,.42)';for(let i=0;i<8;i++){ctx.lineWidth=i%2?1:3;ctx.strokeRect(12+i*5,12+i*5,488-i*10,488-i*10)} for(let x=75;x<480;x+=90)for(let y=75;y<480;y+=90){ctx.save();ctx.translate(x,y);for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.ellipse(15,0,23,7,0,0,7);ctx.stroke()}ctx.restore()}}
    } else if(kind==='floral') {
      for(let i=0;i<125;i++){ctx.save();ctx.translate(rand()*512,rand()*512);ctx.rotate(rand()*6.28);ctx.strokeStyle='rgba(81,60,74,.4)';ctx.beginPath();ctx.moveTo(0,-25);ctx.bezierCurveTo(12,0,-8,13,0,30);ctx.stroke();for(let j=-2;j<3;j++){ctx.fillStyle=j%2?'rgba(137,92,120,.55)':'rgba(90,58,89,.38)';ctx.beginPath();ctx.ellipse(j%2?8:-8,j*9,10,4,j%2?-.6:.7,0,7);ctx.fill()}ctx.restore()}
    } else if(kind==='leather') {
      for(let i=0;i<28000;i++){ctx.fillStyle=`rgba(255,255,255,${rand()*.06})`;ctx.fillRect(rand()*512,rand()*512,1,1)}
    } else if(kind==='brick') {
      for(let y=0;y<512;y+=34)for(let x=-64;x<512;x+=104){ctx.fillStyle=`hsl(${25+rand()*10} 40% ${48+rand()*19}%)`;ctx.fillRect(x+(y%68?52:0)+2,y+2,100,30);for(let j=0;j<25;j++){ctx.fillStyle='rgba(60,35,15,.07)';ctx.fillRect(x+(y%68?52:0)+rand()*100,y+rand()*30,10,2)}}
    }
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
  }
  function mat(name:string,color:string,roughness=.72,metalness=0,kind?:string){
    const m=new THREE.MeshStandardMaterial({color,roughness,metalness});if(kind){m.color.set('#ffffff');m.map=canvasTexture(kind,color);m.bumpMap=m.map;m.bumpScale=kind==='fabric'||kind==='carpet'? .008:.0017}m.userData.referenceMaterial=name;materials[name]=m;return m;
  }
  const wall=mat('paint','#eeeae1',.9),white=mat('joinery','#f6f4ed',.45),trim=mat('trim','#fcfcf7',.55),dark=mat('charcoal','#25282a',.45),black=mat('black hardware','#202122',.35,.4),steel=mat('stainless','#a4adb0',.27,.82),glass=new THREE.MeshPhysicalMaterial({color:'#d0e3e4',roughness:.06,metalness:0,transparent:true,opacity:.17,side:THREE.DoubleSide,depthWrite:false}),wood=mat('oak','#a97a4d',.52,0,'wood'),walnut=mat('walnut','#805838',.5,0,'wood'),tile=mat('marble tile','#d0d2cb',.62,0,'tile'),carpet=mat('carpet','#b9afa0',.97,0,'carpet'),leather=mat('leather','#343431',.6,0,'leather'),linen=mat('linen','#c9bea9',.96,0,'fabric'),cushion=mat('cushion','#967765',.97,0,'fabric'),throwMat=mat('ochre throws','#875635',1,0,'fabric'),rug=mat('rug','#b8b9b1',1,0,'rug'),floral=mat('floral duvet','#e4dce0',1,0,'floral'),brick=mat('balcony brick','#b88d67',.98,0,'brick');
  const leafMat=mat('leaves','#3f6436',.78),leafLight=mat('young leaves','#73934b',.72),potMat=mat('terracotta','#a75736',.9),soilMat=mat('soil','#35332a',1);
  const sphere=new THREE.SphereGeometry(1,20,12);
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,parent:THREE.Object3D=group){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
  function ell(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,parent:THREE.Object3D=group){const mesh=new THREE.Mesh(sphere,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
  function cyl(x:number,y:number,z:number,r:number,h:number,m:THREE.Material,parent:THREE.Object3D=group,r2?:number){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r2??r,h,32),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
  function line(a:number[],b:number[],r:number,m:THREE.Material,parent:THREE.Object3D=group){const start=new THREE.Vector3(...a as [number,number,number]),end=new THREE.Vector3(...b as [number,number,number]);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,start.distanceTo(end),8),m);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());mesh.castShadow=true;parent.add(mesh);return mesh}
  function rounded(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,r=.06,parent:THREE.Object3D=group){
    r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape(),a=-w/2+r,b=-h/2+r; s.moveTo(a,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,b);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(a,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,b);s.quadraticCurveTo(-w/2,-h/2,a,-h/2);
    const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.35,bevelSegments:3,steps:1,curveSegments:6});g.translate(0,0,-(d-2*r)/2);g.computeVertexNormals();const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function softCushion(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,parent:THREE.Object3D=group){
    const g=new THREE.SphereGeometry(1,44,28);const pos=g.attributes.position;
    const signed=(v:number,e:number)=>Math.sign(v)*Math.pow(Math.abs(v),e);
    for(let i=0;i<pos.count;i++){const a=pos.getX(i),b=pos.getY(i),c=pos.getZ(i);const fold=1+.008*Math.sin(a*28+b*33)*Math.sin(c*25);pos.setXYZ(i,signed(a,.34)*w/2*fold,signed(b,.4)*h/2*fold,signed(c,.34)*d/2*fold)}g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function drapedThrow(x:number,z:number,w:number,d:number,turn=false,phase=0){
    const g=new THREE.PlaneGeometry(w,d,48,40),pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){const u=pos.getX(i),v=pos.getY(i);const front=Math.max(0,(-u/w-.4)/.1);const ripple=.008*Math.sin(v*43+u*7+phase)+.009*Math.sin(v*22-u*8+phase)+.004*Math.sin(u*37+v*15);const bunch=.023*Math.exp(-Math.pow((v-d*.25)*9,2))*Math.sin(u*20+phase);const y=.716+ripple+bunch-.11*front*front+.029*Math.exp(-Math.pow((u-w*.31)*12,2));pos.setXYZ(i,u+.009*Math.sin(v*22+phase),y,v+.012*Math.sin(u*20+phase))}g.computeVertexNormals();
    const mm=throwMat.clone();mm.color.setHSL(.065,.08,.85+Math.sin(phase)*.05);mm.side=THREE.DoubleSide;const mesh=new THREE.Mesh(g,mm);mesh.position.set(x,0,z);if(turn)mesh.rotation.y=-Math.PI/2;mesh.castShadow=true;mesh.receiveShadow=true;sofa.add(mesh);
    for(let i=0;i<25;i++){const v=-d/2+i*d/24;const p=new THREE.Vector3(-w/2,.59+.012*Math.sin(v*62),v),q=new THREE.Vector3(-w/2-.025,.56+.013*Math.sin(v*40),v+.012);if(turn){p.applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);q.applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2)}p.add(new THREE.Vector3(x,0,z));q.add(new THREE.Vector3(x,0,z));line(p.toArray(),q.toArray(),.0024,throwMat,sofa)}
  }
  function obstacle(x:number,z:number,w:number,d:number){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2})}
  let floorLayer=0; // A sub-millimetre layer offset avoids coincident finish surfaces in wet rooms and the carpeted bedroom.
  function floor(x:number,z:number,w:number,d:number,m:THREE.MeshStandardMaterial,repeat=.43,rotate=false){const mm=m.clone();if(m.map){mm.map=m.map.clone();mm.map.repeat.set(w/repeat,d/repeat);if(rotate){mm.map.center.set(.5,.5);mm.map.rotation=Math.PI/4;}mm.bumpMap=mm.map}const mesh=box(x,-.065+(floorLayer++)*.0007,z,w,.13,d,mm);return mesh}
  floor(3.55,3.95,7.1,7.9,tile,.48,true);floor(5.95,9.45,2.3,3.1,tile,.36);floor(5.8,1.75,2.6,3.5,carpet,.6);floor(-.7,6.4,1.4,3,brick,.75);floor(3.55,1.25,1.7,2.5,tile,.34);floor(5.95,10.35,2.3,1.3,tile,.36);
  function wallSeg(x:number,z:number,w:number,d:number,h=2.55,y=h/2,outer=false){const p=outer?outerWalls:group;const a=box(x,y,z,w,h,d,wall,p);a.name='Wall';if(y-h/2<.1)obstacle(x,z,w,d);if(y-h/2<.1){box(x,.055,z,w+.009,.11,d+.013,trim,p);box(x,2.47,z,w+.035,.045,d+.035,trim,p);box(x,2.51,z,w+.06,.035,d+.06,trim,p)}return a}
  // Window-bearing outside edges, with real openings rather than painted rectangles.
  function windowWall(axis:'x'|'z',constant:number,start:number,end:number,openStart:number,openEnd:number,sill:number,top:number){
    const outer=true;if(axis==='x') {wallSeg((start+openStart)/2,constant,openStart-start,.13,2.55,1.275,outer);wallSeg((openEnd+end)/2,constant,end-openEnd,.13,2.55,1.275,outer);wallSeg((openStart+openEnd)/2,constant,openEnd-openStart,.13,sill,sill/2,outer);wallSeg((openStart+openEnd)/2,constant,openEnd-openStart,.13,2.55-top,(2.55+top)/2,outer);windowFrame(axis,constant,openStart,openEnd,sill,top)}
    else {wallSeg(constant,(start+openStart)/2,.13,openStart-start,2.55,1.275,outer);wallSeg(constant,(openEnd+end)/2,.13,end-openEnd,2.55,1.275,outer);wallSeg(constant,(openStart+openEnd)/2,.13,openEnd-openStart,sill,sill/2,outer);wallSeg(constant,(openStart+openEnd)/2,.13,openEnd-openStart,2.55-top,(2.55+top)/2,outer);windowFrame(axis,constant,openStart,openEnd,sill,top)}
  }
  function windowFrame(axis:'x'|'z',constant:number,start:number,end:number,sill:number,top:number){const p=outerWalls;const c=(start+end)/2,w=end-start,h=top-sill,y=(top+sill)/2;const g=new THREE.Group();if(axis==='x')g.position.set(c,0,constant);else{g.position.set(constant,0,c);g.rotation.y=Math.PI/2}p.add(g);
    box(0,y,0,w,h,.035,glass,g);for(const x of [-w/2,w/2])box(x,y,0,.055,h+.08,.095,trim,g);for(const yy of[sill,top])box(0,yy,0,w+.1,.055,.095,trim,g);box(0,y,-.013,.036,h,.043,black,g);for(const x of[-w/2+.026,w/2-.026])box(x,y,0,.02,h,.04,black,g);for(const yy of[sill+.025,top-.025])box(0,yy,0,w,.017,.04,black,g);box(0,sill-.025,.055,w+.12,.04,.18,trim,g);cyl(0,top+.055,0,.035,w+.1,trim,g).rotation.z=Math.PI/2;box(0,top-.06,.015,w,.12,.01,linen,g);box(.08,y-.15,.032,.015,.14,.022,black,g);
  }
  windowWall('x',0,0,2.7,.45,2.1,1.04,2.22);windowWall('x',0,2.7,4.4,2.83,4.22,1.35,2.3);windowWall('x',0,4.4,7.1,4.85,6.65,1.04,2.22);
  wallSeg(0,2.45,.14,4.9,2.55,1.275,true);wallSeg(7.1,1.75,.14,3.5,2.55,1.275,true);
  windowWall('z',7.1,3.5,6.75,4.05,5.9,1.03,2.23);windowWall('z',7.1,6.75,9.7,7.85,9.15,1.14,2.21);windowWall('z',7.1,9.7,11,10.05,10.75,1.23,2.18);
  wallSeg(5.95,11,2.3,.14,2.55,1.275,true);wallSeg(4.8,9.45,.14,3.1,2.55,1.275,true);
  // Balcony glazing: wide fixed pane and open access door at the entry end.
  windowWall('z',0,4.9,6.85,5.02,6.85,.2,2.28);wallSeg(0,7.37,.13,1.02,.25,2.425,true);box(0,1.14,7.9,.06,2.28,.07,trim,outerWalls);box(0,1.14,6.85,.06,2.28,.07,trim,outerWalls);
  // Pleated, floor-length ivory curtains flank the balcony glazing in both living references.
  line([.14,2.36,4.99],[.14,2.36,7.8],.016,steel,outerWalls);
  for(const zc of[5.08,6.72,7.76]) {
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[];const nx=28,ny=24;
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const t=i/nx,v=j/ny,w=.23+.05*Math.sin(v*Math.PI);vertices.push(.11+.032*Math.cos(t*8*Math.PI)+v*.016,2.29-v*2.2,zc+(t-.5)*w);uv.push(t,v)}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;indices.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1)}
    const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));cg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));cg.setIndex(indices);cg.computeVertexNormals();const cm=linen.clone();cm.color.set('#eeede2');cm.side=THREE.DoubleSide;const curtain=new THREE.Mesh(cg,cm);curtain.castShadow=true;curtain.receiveShadow=true;outerWalls.add(curtain);
    for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.021,.004,6,12),steel);ring.position.set(.14,2.32,zc-.09+i*.045);ring.rotation.y=Math.PI/2;outerWalls.add(ring)}
  }
  // Living entrance, internal bedroom doors, and a central bathroom corridor.
  wallSeg(1.85,7.9,3.7,.14,2.55,1.275,true);wallSeg(4.7,7.9,.2,.14,2.55,1.275,true);wallSeg(4.15,7.9,.9,.14,.38,2.36,true);
  wallSeg(2.7,1.75,.14,3.5);wallSeg(4.4,1.75,.14,3.5);wallSeg(3.55,2.5,1.7,.13,.45,2.325);wallSeg(2.74,2.5,.08,.13);wallSeg(4.01,2.5,.78,.13);
  wallSeg(.92,3.5,1.84,.13);wallSeg(2.62,3.5,.16,.13);wallSeg(2.19,3.5,.7,.13,.4,2.35);
  wallSeg(4.49,3.5,.18,.13);wallSeg(6.27,3.5,1.66,.13);wallSeg(5.01,3.5,.86,.13,.4,2.35);
  wallSeg(4.8,6.96,.13,1.88);wallSeg(4.8,3.8,.13,.6);
  wallSeg(5.15,9.7,.7,.13);wallSeg(6.76,9.7,.68,.13);wallSeg(5.955,9.7,.91,.13,.4,2.35);
  function doorway(x:number,z:number,w:number,rotation=0,door=true,hingeSide=-1,swing=1){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;group.add(g);for(const xx of[-w/2,w/2]){box(xx,1.08,0,.06,2.16,.17,trim,g);box(xx,1.09,.1,.035,2.18,.025,trim,g)}box(0,2.16,0,w+.07,.065,.17,trim,g);
    if(door){const hinge=new THREE.Group();hinge.position.set(hingeSide*w/2,0,0);hinge.rotation.y=swing*hingeSide*Math.PI*.44;g.add(hinge);const leaf=box(-hingeSide*w/2,1.05,0,w-.06,2.1,.038,white,hinge);g.updateMatrixWorld(true);const leafBounds=new THREE.Box3().setFromObject(leaf);colliders.push({minX:leafBounds.min.x,maxX:leafBounds.max.x,minZ:leafBounds.min.z,maxZ:leafBounds.max.z});box(-hingeSide*w*.82,1,.038,.12,.025,.024,steel,hinge);for(const yy of[.25,1,1.8])box(-hingeSide*.025,yy,0,.025,.07,.06,steel,hinge);}
  }
  doorway(2.19,3.5,.7,0,true,1,-1);doorway(5.01,3.5,.86,0,true,-1,-1);doorway(3.2,2.5,.84,0,true,1,-1);doorway(5.96,9.7,.88,0,true,-1,1);doorway(4.15,7.9,.9,Math.PI,false);box(4.15,1.04,7.94,.82,2.08,.045,white,outerWalls);box(4.46,1.04,7.9,.11,.028,.05,steel,outerWalls);
  for(const [x,z,w,d]of [[3.55,3.95,7.1,7.9],[5.95,9.45,2.3,3.1]]){box(x,2.595,z,w,.09,d,wall,ceiling)}
  function switchPlate(x:number,y:number,z:number,rotation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;group.add(g);rounded(0,0,0,.08,.11,.012,trim,.008,g);box(0,0,.01,.027,.045,.004,white,g)}
  function socket(x:number,z:number,rotation=0){const g=new THREE.Group();g.position.set(x,.27,z);g.rotation.y=rotation;group.add(g);box(0,0,0,.14,.085,.012,trim,g);for(const s of[-1,1]){box(s*.034,.005,.008,.018,.005,.002,dark,g).rotation.z=s*.4;box(s*.034,-.018,.008,.004,.012,.002,dark,g)}}
  switchPlate(3.52,1.2,7.81,Math.PI);switchPlate(2.57,1.2,3.59);socket(.07,4.1,Math.PI/2);socket(2.3,3.59);socket(6.5,3.59);socket(5.5,.08);socket(1.5,.08);
  function fan(x:number,z:number){const g=new THREE.Group();g.position.set(x,2.35,z);group.add(g);cyl(0,.12,0,.046,.18,white,g);ell(0,0,0,.15,.085,.15,white,g);ell(0,-.08,0,.113,.073,.113,new THREE.MeshStandardMaterial({color:'#fffceb',emissive:'#fff3d3',emissiveIntensity:.3,roughness:.4}),g);for(let i=0;i<3;i++){const b=new THREE.Group();b.rotation.y=i*Math.PI*2/3+.25;g.add(b);const blade=box(.33,.005,.035,.61,.025,.135,trim,b);blade.rotation.y=.16;blade.rotation.z=.035}g.name='Ceiling fan'}
  fan(2.4,5.6);fan(1.3,1.7);fan(5.8,1.7);
  function ceilingLight(x:number,z:number){cyl(x,2.5,z,.125,.055,trim);const m=new THREE.MeshStandardMaterial({color:'#fffbed',emissive:'#fff3d5',emissiveIntensity:.45});ell(x,2.46,z,.13,.045,.13,m)}ceilingLight(5.95,7.8);ceilingLight(3.55,1.4);ceilingLight(5.95,10.3);
  // Plants have individual curved stems and leaf blades, rather than flat billboards.
  function plant(x:number,z:number,h=.65,r=.13){const p=new THREE.Group();p.position.set(x,0,z);group.add(p);cyl(0,r,0,r,r*2,potMat,p,r*.75);cyl(0,r*1.96,0,r*.88,.015,soilMat,p);for(let i=0;i<9;i++){const angle=i*2.4,top=r*2+h*(.45+rand()*.55),xx=Math.cos(angle)*h*.3,zz=Math.sin(angle)*h*.3;line([0,r*1.9,0],[xx,top,zz],.006,leafMat,p);for(let j=0;j<3;j++){const t=.5+j*.21,leaf=ell(xx*t+(j%2?.045:-.045),r*2+(top-r*2)*t,zz*t,h*.11,h*.025,h*.052,i%3?leafMat:leafLight,p);leaf.rotation.z=(j%2?1:-1)*.4;leaf.rotation.y=angle;}}return p}
  plant(.55,4.8,.78,.13);plant(1.32,3.92,.6,.115);plant(4.45,4.02,.8,.14);plant(-.92,5.15,.6,.14);
  // Dark L-shaped sectional with cream seats, individual seams and warm throws.
  const sofa=new THREE.Group();group.add(sofa);sofa.name='Reference L-shaped leather sofa';
  // Preserve the photographed L configuration while maintaining the plan's entry and hall circulation.
  sofa.scale.set(.95,1,.85);sofa.position.set(-.15,0,.34);
  rounded(3.64,.3,6.07,.92,.45,2.5,leather,.05,sofa);rounded(2.78,.3,7.23,2.62,.45,.9,leather,.05,sofa);
  rounded(4.02,.66,6.05,.17,.84,2.65,leather,.05,sofa);rounded(2.78,.65,7.61,2.62,.82,.17,leather,.05,sofa);
  rounded(3.63,.65,4.78,.95,.64,.17,leather,.05,sofa);rounded(1.48,.65,7.2,.17,.64,.95,leather,.05,sofa);
  const pillowMats=[mat('warm taupe pillow','#8d7666',.97,0,'fabric'),mat('brown pillow','#806455',.97,0,'fabric'),mat('sand pillow','#b0a38e',.97,0,'fabric')];
  for(let i=0;i<3;i++){softCushion(3.58,.57,5.23+i*.79,.77,.22,.75,linen,sofa);const c=softCushion(3.81,.865+[0,.01,-.01][i],5.23+i*.79,[.29,.24,.3][i],[.51,.57,.5][i],[.74,.76,.71][i],pillowMats[i],sofa);c.rotation.z=[.34,.24,.38][i];c.rotation.x=[-.09,.035,.11][i];box(3.157,.33,5.23+i*.79,.005,.39,.004,linen,sofa)}
  for(let i=0;i<2;i++){softCushion(1.99+i*.8,.57,7.16,.75,.22,.72,linen,sofa);const c=softCushion(1.99+i*.8,.85+i*.025,7.42,.74,.52+i*.035,.29,pillowMats[i],sofa);c.rotation.x=-.24-i*.09;c.rotation.z=i?.06:-.1}
  for(let i=0;i<3;i++)drapedThrow(3.52+[.018,-.025,.01][i],[5.22,6.12,6.87][i],[.77,.86,.74][i],[.47,.6,.55][i],false,i*1.7);
  drapedThrow(1.98,7.12,.82,.53,true,.8);drapedThrow(2.83,7.08,.74,.64,true,3.5);
  const accent=softCushion(1.71,.93,7.24,.56,.51,.22,cushion,sofa);accent.rotation.set(-.17,-.18,-.18);
  for(const [x,z]of[[1.6,7.2],[3.8,7.4],[3.8,4.92],[3.22,4.92]])box(x,.075,z,.09,.12,.09,dark,sofa);
  // Collider envelopes include arms/back upholstery and follow the same transform as the full sectional.
  const sofaObstacles=[{x:3.655,z:6.07,w:1.03,d:2.75},{x:2.745,z:7.25,w:2.81,d:.97}];
  for(const c of sofaObstacles)obstacle(c.x*.95-.15,c.z*.85+.34,c.w*.95,c.d*.85);
  const rugM=rug.clone();const rugMesh=box(2.05,.015,5.91,2.38,.023,2.6,rugM);rugMesh.rotation.y=-.035;
  // Media cabinet, live-looking ocean screen drawn locally, and timber occasional table.
  const tv=new THREE.Group();tv.position.set(.32,0,5.83);tv.rotation.y=Math.PI/2;group.add(tv);
  box(0,.29,0,1.2,.52,.38,leather,tv);box(0,.565,0,1.24,.035,.42,black,tv);for(const x of[-.59,0,.59])box(x,.3,.21,.025,.48,.025,steel,tv);box(0,.29,.2,1.15,.018,.02,steel,tv);for(const x of[-.3,.3]){box(x,.31,.218,.022,.32,.018,glass,tv);cyl(x,.42,.239,.019,.019,steel,tv).rotation.x=Math.PI/2}
  for(let i=0;i<12;i++)box(-.44+i*.045,.18,.02,.032,.17,.16,i%2?wood:linen,tv);
  rounded(0,1.055,0,1.08,.63,.035,black,.012,tv);
  const ocean=document.createElement('canvas');ocean.width=768;ocean.height=420;const oc=ocean.getContext('2d')!;const grad=oc.createLinearGradient(0,0,350,420);grad.addColorStop(0,'#127d91');grad.addColorStop(.56,'#37aaab');grad.addColorStop(.7,'#c4ddd0');grad.addColorStop(.73,'#e4dfc9');grad.addColorStop(1,'#d5bb98');oc.fillStyle=grad;oc.fillRect(0,0,768,420);for(let i=0;i<7000;i++){const x=rand()*768,y=rand()*280;oc.fillStyle=`rgba(232,251,241,${rand()*.36})`;oc.fillRect(x,y,rand()*10+1,rand()*2+1)}for(let y=180;y<305;y+=16){oc.strokeStyle='rgba(246,253,242,.55)';oc.lineWidth=2;oc.beginPath();for(let x=0;x<768;x+=5)oc.lineTo(x,y+Math.sin(x*.034+y)*9);oc.stroke()}
  const oceanT=new THREE.CanvasTexture(ocean);oceanT.colorSpace=THREE.SRGBColorSpace;const screenM=new THREE.MeshBasicMaterial({map:oceanT});box(0,1.055,.025,1.038,.58,.002,screenM,tv);for(const x of[-.35,.35]){line([x,.75,0],[x-.08,.59,.13],.012,black,tv);line([x,.75,0],[x+.08,.59,-.1],.012,black,tv)}obstacle(.32,5.83,.43,1.25);
  box(.58,.48,6.82,.7,.055,.37,walnut);for(const x of[.29,.87])for(const z of[6.67,6.97])line([x,.04,z],[x*.95+.025,.46,z],.025,walnut);
  // White workstation visible opposite the sectional.
  box(1.2,.755,3.91,1.54,.055,.6,white);for(const x of[.48,1.93])box(x,.38,3.91,.055,.72,.53,white);box(1.72,.44,3.93,.37,.52,.49,white);for(let i=0;i<3;i++){box(1.72,.27+i*.16,4.185,.34,.145,.016,white);box(1.72,.31+i*.16,4.2,.105,.012,.018,steel)}
  box(1.12,1.06,3.82,.59,.38,.04,dark);box(1.12,1.06,3.848,.54,.33,.002,new THREE.MeshStandardMaterial({color:'#1d2021',roughness:.25}));box(1.12,.84,3.79,.04,.14,.04,steel);box(1.12,.792,3.81,.2,.018,.13,steel);box(1.09,.795,4.05,.43,.015,.14,black);for(let i=0;i<13;i++)for(let j=0;j<4;j++)box(.9+i*.029,.805,4.003+j*.027,.022,.003,.019,dark);ell(1.44,.806,4.06,.034,.018,.054,dark);
  const chair=new THREE.Group();chair.position.set(1.1,0,4.6);group.add(chair);rounded(0,.49,0,.48,.09,.46,black,.04,chair);rounded(0,.83,.2,.44,.62,.065,leather,.03,chair);cyl(0,.25,0,.035,.45,steel,chair);for(let i=0;i<5;i++){let a=i*Math.PI*2/5;line([0,.1,0],[Math.sin(a)*.3,.08,Math.cos(a)*.3],.023,black,chair);ell(Math.sin(a)*.3,.052,Math.cos(a)*.3,.038,.04,.05,black,chair)}for(const x of[-.29,.29]){line([x,.49,0],[x,.68,0],.018,black,chair);rounded(x,.68,.015,.045,.035,.28,black,.01,chair)}obstacle(1.2,3.91,1.6,.6);
  // Built-in robes; one bedroom is deliberately empty as photographed.
  for(const x of[.9,6.27]){box(x,1.17,3.17,1.72,2.34,.56,white);for(const xx of[x-.42,x+.42]){box(xx,1.17,2.872,.82,2.23,.018,white);box(xx+.3,1.05,2.852,.018,.24,.027,steel)}box(x,2.36,3.17,1.8,.045,.61,trim);obstacle(x,3.17,1.8,.6)}
  // Timber bed with floral linen in the carpeted right bedroom.
  const bedroomFurniture = new THREE.Group(); bedroomFurniture.position.x=7.1; bedroomFurniture.scale.x=-1; group.add(bedroomFurniture);
  box(1.15,.29,1.27,2.14,.15,1.64,wood,bedroomFurniture);for(const x of[.13,2.17])for(const z of[.49,2.05])box(x,.26,z,.1,.5,.1,wood,bedroomFurniture);
  // The reference headboard has open vertical timber slats below a broad top rail.
  const verticalWood=wood.clone();verticalWood.map=wood.map!.clone();verticalWood.map.center.set(.5,.5);verticalWood.map.rotation=Math.PI/2;verticalWood.bumpMap=verticalWood.map;
  for(const z of[.47,2.07])box(.12,.7,z,.11,1.08,.105,verticalWood,bedroomFurniture);box(.12,1.12,1.27,.11,.15,1.64,wood,bedroomFurniture);box(.12,1.22,1.27,.17,.065,1.73,wood,bedroomFurniture);box(.12,.72,1.27,.09,.105,1.61,wood,bedroomFurniture);for(let i=0;i<11;i++)box(.12,.914,.56+i*.142,.068,.3,.058,verticalWood,bedroomFurniture);
  rounded(1.15,.48,1.27,2.03,.31,1.56,linen,.075,bedroomFurniture);rounded(1.17,.66,1.28,2.01,.12,1.55,floral,.065,bedroomFurniture);for(const z of[.87,1.67]){const p=rounded(.44,.77,z,.48,.16,.67,floral,.07,bedroomFurniture);p.rotation.z=-.09}
  box(2.18,.2,1.27,.06,.28,1.65,wood,bedroomFurniture);obstacle(5.95,1.27,2.14,1.64);box(.45,.58,2.61,.65,.05,.44,white,bedroomFurniture);box(.45,.3,2.61,.57,.55,.4,white,bedroomFurniture);
  // Galley cabinetry: east-side fridge and sink, west-side cooking run.
  function cabinet(x:number,z:number,w:number,d:number,face:'east'|'west',drawers=false){box(x,.445,z,w,.79,d,white);box(x,.065,z,w-.08,.13,d-.05,dark);rounded(x,.875,z,w+.055,.065,d+.04,white,.025);const fx=x+(face==='east'?1:-1)*(w/2+.013);const splits=drawers?4:1;for(let i=0;i<splits;i++){const h=.72/splits;box(fx,.13+h/2+i*h,z,.022,h-.015,d-.035,white);box(fx+(face==='east'?.019:-.019),.13+h*.72+i*h,z,.028,.016,drawers?d*.43:.12,black)}obstacle(x,z,w,d)}
  cabinet(5.12,7.03,.61,.83,'east');cabinet(5.12,8.84,.61,1.5,'east');cabinet(6.79,8.73,.61,1.66,'west');cabinet(6.79,7.62,.61,.48,'west',true);
  // Freestanding electric oven, coil burners and stainless hood.
  box(5.12,.44,7.78,.6,.84,.62,steel);box(5.44,.43,7.78,.018,.48,.49,black);box(5.46,.43,7.78,.012,.37,.39,new THREE.MeshStandardMaterial({color:'#293035',metalness:.35,roughness:.2}));box(5.49,.66,7.78,.045,.034,.5,steel);for(const z of[7.57,7.71,7.85,7.99])cyl(5.462,.79,z,.022,.018,black).rotation.z=Math.PI/2;box(5.12,.877,7.78,.6,.035,.64,steel);for(const x of[4.98,5.27])for(const z of[7.63,7.94]){cyl(x,.9,z,.106,.008,black);for(let k=0;k<5;k++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.032+k*.013,.003,6,32),steel);ring.rotation.x=Math.PI/2;ring.position.set(x,.906,z);group.add(ring)}}
  box(5.1,1.68,7.78,.64,.065,.72,steel);box(4.95,1.84,7.78,.3,.27,.52,steel);
  for(const z of[6.98,8.6,9.2]){box(5.015,1.96,z,.4,.69,.57,white);box(5.23,1.96,z,.025,.65,.535,white);box(5.25,1.91,z-.16,.025,.19,.02,black)}
  box(5.02,1.73,6.94,.43,.43,.67,white);box(5.245,1.75,6.94,.027,.31,.54,black);box(5.263,1.75,6.99,.005,.23,.36,new THREE.MeshStandardMaterial({color:'#576164',roughness:.3,metalness:.2}));for(let i=0;i<5;i++)box(5.267,1.66+i*.041,6.719,.008,.018,.027,trim);
  // Countertop sink lip, inset dark basin, mixer and dish rack.
  rounded(6.78,.916,8.63,.49,.016,.75,steel,.07);rounded(6.78,.926,8.64,.38,.016,.53,new THREE.MeshStandardMaterial({color:'#687a80',metalness:.9,roughness:.28}),.065);cyl(6.78,.94,8.64,.034,.003,dark);
  const faucetCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(7,.9,8.36),new THREE.Vector3(7,1.19,8.36),new THREE.Vector3(6.83,1.22,8.36),new THREE.Vector3(6.8,1.11,8.36)]);const tap=new THREE.Mesh(new THREE.TubeGeometry(faucetCurve,24,.012,8,false),black);group.add(tap);line([6.97,.94,8.39],[6.92,1.03,8.39],.013,black);
  for(let i=0;i<10;i++)line([6.57,.98,9.02+i*.032],[6.98,.98,9.02+i*.032],.003,steel);for(const x of[6.57,6.98])line([x,.98,9.02],[x,.98,9.32],.004,steel);
  rounded(6.72,1.0,6.9,.71,1.99,.69,steel,.025);box(6.348,1.26,6.9,.022,1.34,.64,steel);box(6.348,.34,6.9,.022,.45,.64,steel);box(6.329,.607,6.9,.025,.035,.66,black);box(6.316,.66,6.9,.025,.028,.53,black);box(6.316,.55,6.9,.025,.028,.53,black);obstacle(6.72,6.9,.76,.72);
  // Small circular walnut dining table, white console and plant shelf.
  cyl(6.21,.75,4.77,.52,.045,walnut);for(let i=0;i<3;i++){const a=i*2*Math.PI/3;line([6.21+Math.sin(a)*.38,.04,4.77+Math.cos(a)*.38],[6.21+Math.sin(a)*.29,.72,4.77+Math.cos(a)*.29],.035,walnut)}obstacle(6.21,4.77,1.04,1.04);
  box(5.28,.745,4.1,.64,.045,.84,white);for(const z of[3.73,4.47])box(5.28,.37,z,.58,.7,.035,white);box(5.45,.45,4.1,.25,.025,.72,white);box(5.45,.24,4.1,.25,.025,.72,white);
  const tablePlant=plant(6.55,4.04,.24,.07);tablePlant.position.y=.92;
  // White bath, glass screen, black rain shower, vanity and toilet.
  box(3.55,.27,.47,1.57,.54,.78,white);rounded(3.55,.56,.47,1.54,.045,.78,white,.06);rounded(3.55,.583,.48,1.32,.009,.58,new THREE.MeshStandardMaterial({color:'#cdd4d2',roughness:.2}),.1);box(3.55,.29,.88,1.58,.48,.035,white);
  for(let i=0;i<4;i++)box(3.55,.12+i*.105,.902,1.55,.003,.002,linen);
  const showerPane=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.85),new THREE.MeshBasicMaterial({color:'#d2e0df',transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false}));showerPane.position.set(3.95,1.25,.91);showerPane.name='Clear shower screen';group.add(showerPane);box(4.33,1.26,.91,.018,1.88,.018,steel);for(const y of[.73,1.73])box(4.32,y,.915,.045,.065,.028,black);
  line([4.23,.67,.35],[4.23,2.1,.35],.014,black);line([4.23,2.1,.35],[3.98,2.17,.35],.015,black);cyl(3.97,2.15,.35,.13,.025,black);for(let i=0;i<5;i++)for(let j=0;j<5;j++)cyl(3.89+i*.038,2.133,.27+j*.038,.004,.004,steel);
  const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(4.22,1.55,.37),new THREE.Vector3(4.11,.8,.38),new THREE.Vector3(4.05,1.12,.38),new THREE.Vector3(4.18,1.67,.38)]);group.add(new THREE.Mesh(new THREE.TubeGeometry(hose,30,.009,8,false),black));box(4.21,.69,.36,.04,.04,.24,black);
  box(4.02,.42,1.31,.6,.75,.47,white);rounded(4.02,.85,1.31,.65,.18,.51,white,.015);rounded(4.02,.948,1.31,.49,.007,.34,new THREE.MeshStandardMaterial({color:'#bdcacb',roughness:.25}),.07);line([4.2,.94,1.17],[4.2,1.14,1.17],.014,black);line([4.2,1.13,1.17],[4.02,1.13,1.17],.014,black);box(4.318,1.6,1.32,.1,.83,.62,white);const mirror=new Reflector(new THREE.PlaneGeometry(.56,.75),{color:0xc5ced0,textureWidth:512,textureHeight:512,clipBias:.003});mirror.position.set(4.25,1.6,1.32);mirror.rotation.y=-Math.PI/2;mirror.name='Bathroom mirror';group.add(mirror);obstacle(4.02,1.31,.65,.55);
  rounded(4.13,.72,2.04,.36,.45,.57,white,.075);ell(3.91,.42,2.03,.39,.2,.28,white);ell(4,.25,2.03,.19,.25,.19,white);ell(3.87,.57,2.03,.35,.045,.275,white);box(4.15,.96,2.03,.12,.012,.08,steel);obstacle(3.99,2.03,.72,.59);
  // Bathroom tile reveals and grout lines retain the small renovated-room character.
  for(let y=.2;y<2.3;y+=.32){box(3.55,y,.08,1.65,.003,.002,linen);box(4.315,y,1.2,.003,.003,2.4,linen)}for(let x=2.8;x<4.4;x+=.4)box(x,1.1,.082,.003,2.2,.002,linen);
  // Laundry fixtures are inferred, and clearly identified in UI metadata.
  box(6.65,.44,10.45,.63,.86,.62,white);box(6.65,.89,10.45,.66,.055,.65,white);cyl(6.65,.93,10.45,.23,.016,steel);box(6.15,.46,10.61,.61,.89,.61,white);const laundryRing=new THREE.Mesh(new THREE.TorusGeometry(.2,.035,12,48),steel);laundryRing.rotation.y=0;laundryRing.position.set(6.15,.45,10.289);group.add(laundryRing);cyl(6.15,.45,10.277,.168,.018,dark).rotation.x=Math.PI/2;
  obstacle(3.55,.47,1.57,.78);obstacle(1.1,4.6,.52,.55);obstacle(.58,6.82,.7,.37);obstacle(6.65,10.45,.63,.62);obstacle(6.15,10.61,.61,.61);
  // Balcony safety rail and authentic orange brick surrounds.
  box(-1.4,.52,6.4,.13,1.04,3.13,brick);box(-.7,.52,4.9,1.4,1.04,.13,brick);box(-.7,.52,7.9,1.4,1.04,.13,brick);box(-1.4,1.08,6.4,.17,.055,3.2,trim);for(const z of[4.9,7.9])box(-.7,1.08,z,1.55,.055,.17,trim);obstacle(-1.4,6.4,.13,3.13);obstacle(-.7,4.9,1.4,.13);obstacle(-.7,7.9,1.4,.13);
  // Soft natural context at real windows, not a fabricated photo projection.
  const context = new THREE.Group();context.name='Inferred exterior context';group.add(context);const trunkM=mat('bark','#73705a',1),treeM=mat('tree foliage','#687956',1);
  function tree(x:number,z:number,h:number){line([x,-2,z],[x,h,z],.07,trunkM,context);for(let i=0;i<12;i++){const a=i*2.4,y=h*(.25+rand()*.75),xx=x+Math.cos(a)*(.5+rand()),zz=z+Math.sin(a)*(.5+rand());line([x,y-.6,z],[xx,y,zz],.025,trunkM,context);ell(xx,y,zz,.5+rand()*.45,.35+rand()*.3,.5+rand()*.45,treeM,context)}}tree(1.2,-3,4.2);tree(5.6,-4.5,3.7);tree(-3.6,5.2,4);tree(-4.2,8,3.6);
  const rooms:Room[]=[
    {id:'living',name:'Living room',position:[.94,1.58,6.15],target:[2.8,1.04,5.65]},
    {id:'kitchen',name:'Kitchen',position:[5.92,1.58,6.03],target:[5.96,1.2,9.3]},
    {id:'dining',name:'Dining nook',position:[5.18,1.58,5.5],target:[6.3,1,4.6]},
    {id:'bedroom',name:'Bedroom 1',position:[5.07,1.58,2.59],target:[6.3,1,1.3]},
    {id:'bedroom2',name:'Bedroom 2',position:[2.12,1.58,2.56],target:[.9,1.1,.7]},
    {id:'bathroom',name:'Bathroom',position:[2.99,1.58,1.52],target:[4.02,1.12,1.06]},
    {id:'balcony',name:'Balcony',position:[-.65,1.58,7.12],target:[-2.4,1.5,5.7]},
    {id:'laundry',name:'Laundry',position:[5.96,1.58,9.99],target:[6.65,.9,10.5]},
  ];
  return { group, colliders, rooms, ceiling, ceilings:ceiling, outerWalls, context, materials };
}





