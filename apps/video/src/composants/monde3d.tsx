// Decor 3D continu sous toute la video : un fond en degrade liquide et une sculpture organique
// qui se deplace d'une scene a l'autre. Rendu par Three.js, pilote image par image par Remotion.
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { Easing, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { debuts } from "../temps";
import { IPS, TRANSITION } from "../theme";
import type { Script, Visuel } from "../types";
import { scenesSombres } from "./scenes";

// Bruit simplex 3D (Ashima Arts, licence MIT), base de toutes les deformations
const BRUIT = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
	const vec2 C=vec2(1.0/6.0,1.0/3.0);
	const vec4 D=vec4(0.0,0.5,1.0,2.0);
	vec3 i=floor(v+dot(v,C.yyy));
	vec3 x0=v-i+dot(i,C.xxx);
	vec3 g=step(x0.yzx,x0.xyz);
	vec3 l=1.0-g;
	vec3 i1=min(g.xyz,l.zxy);
	vec3 i2=max(g.xyz,l.zxy);
	vec3 x1=x0-i1+C.xxx;
	vec3 x2=x0-i2+C.yyy;
	vec3 x3=x0-D.yyy;
	i=mod289(i);
	vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
	float n_=0.142857142857;
	vec3 ns=n_*D.wyz-D.xzx;
	vec4 j=p-49.0*floor(p*ns.z*ns.z);
	vec4 x_=floor(j*ns.z);
	vec4 y_=floor(j-7.0*x_);
	vec4 x=x_*ns.x+ns.yyyy;
	vec4 y=y_*ns.x+ns.yyyy;
	vec4 h=1.0-abs(x)-abs(y);
	vec4 b0=vec4(x.xy,y.xy);
	vec4 b1=vec4(x.zw,y.zw);
	vec4 s0=floor(b0)*2.0+1.0;
	vec4 s1=floor(b1)*2.0+1.0;
	vec4 sh=-step(h,vec4(0.0));
	vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
	vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
	vec3 p0=vec3(a0.xy,h.x);
	vec3 p1=vec3(a0.zw,h.y);
	vec3 p2=vec3(a1.xy,h.z);
	vec3 p3=vec3(a1.zw,h.w);
	vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
	p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
	vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
	m=m*m;
	return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// Couleurs Weekli en lineaire approximatif pour les shaders
const PALETTE = /* glsl */ `
const vec3 LAVANDE=vec3(0.902,0.878,0.941);
const vec3 PLATINE=vec3(0.898,0.894,0.886);
const vec3 LAVANDE_PRO=vec3(0.788,0.745,0.867);
const vec3 MOKA_CLAIR=vec3(0.722,0.624,0.553);
const vec3 MOKA=vec3(0.435,0.306,0.216);
const vec3 ESPRESSO=vec3(0.165,0.110,0.075);
const vec3 NUIT=vec3(0.078,0.051,0.035);
const vec3 PRUNE=vec3(0.231,0.165,0.247);
`;

// Fond : degrade liquide plein ecran (bruit replie sur lui-meme), clair ou sombre selon la scene
const fondVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position.xy,0.9999,1.0); }
`;
const fondFragment = /* glsl */ `
uniform float uTemps; uniform float uSombre; uniform float uElan; uniform vec2 uRatio;
varying vec2 vUv;
${BRUIT}
${PALETTE}
void main(){
	vec2 p=(vUv-0.5)*uRatio*1.4;
	float t=uTemps*0.08+uElan*0.6;
	vec2 q=vec2(snoise(vec3(p,t)),snoise(vec3(p+5.2,t*1.1)));
	vec2 r=vec2(snoise(vec3(p+1.7*q+vec2(1.7,9.2),t*0.9)),snoise(vec3(p+1.7*q+vec2(8.3,2.8),t*0.8)));
	float f=snoise(vec3(p+1.4*r,t*0.7))*0.5+0.5;
	float g=clamp(length(q)*0.8,0.0,1.0);
	vec3 clair=mix(LAVANDE,PLATINE,f);
	clair=mix(clair,LAVANDE_PRO,smoothstep(0.35,0.9,g)*0.75);
	clair=mix(clair,MOKA_CLAIR,smoothstep(0.62,1.0,f*r.x+0.4)*0.55);
	vec3 sombre=mix(NUIT,ESPRESSO,f);
	sombre=mix(sombre,PRUNE,smoothstep(0.3,0.9,g)*0.8);
	sombre=mix(sombre,MOKA,smoothstep(0.6,1.0,f*r.y+0.45)*0.6);
	vec3 c=mix(clair,sombre,uSombre);
	// Vignettage doux
	float v=smoothstep(1.25,0.25,length((vUv-0.5)*vec2(1.2,1.0)));
	c*=mix(0.82,1.0,v);
	gl_FragColor=vec4(c,1.0);
}
`;

// Sculpture : sphere deformee par le bruit, eclairage nacre (reflets irises et contour lumineux)
const sculptureVertex = /* glsl */ `
uniform float uTemps; uniform float uAmplitude; uniform float uFreq;
varying vec3 vNormale; varying vec3 vVue; varying float vRelief;
${BRUIT}
float relief(vec3 p){
	return snoise(p*uFreq+vec3(uTemps*0.22))*uAmplitude+snoise(p*uFreq*1.9-vec3(uTemps*0.35))*uAmplitude*0.12;
}
vec3 deplacer(vec3 p){ return p+normalize(p)*relief(p); }
void main(){
	vec3 p=deplacer(position);
	// Normale recalculee par differences finies sur la surface deformee
	vec3 tangente=normalize(cross(normal,vec3(0.0,1.0,0.001)));
	vec3 bitangente=normalize(cross(normal,tangente));
	float e=0.01;
	vec3 pa=deplacer(position+tangente*e);
	vec3 pb=deplacer(position+bitangente*e);
	vec3 n=normalize(cross(pa-p,pb-p));
	if(dot(n,normal)<0.0) n=-n;
	vNormale=normalize(normalMatrix*n);
	vec4 mv=modelViewMatrix*vec4(p,1.0);
	vVue=normalize(-mv.xyz);
	vRelief=relief(position);
	gl_Position=projectionMatrix*mv;
}
`;
const sculptureFragment = /* glsl */ `
uniform float uSombre; uniform float uTemps;
varying vec3 vNormale; varying vec3 vVue; varying float vRelief;
${PALETTE}
void main(){
	vec3 n=normalize(vNormale);
	vec3 l=normalize(vec3(-0.5,0.8,0.6));
	float diff=max(dot(n,l),0.0);
	float fres=pow(1.0-max(dot(n,vVue),0.0),2.6);
	vec3 h=normalize(l+vVue);
	float spec=pow(max(dot(n,h),0.0),70.0);
	// Corps : clair et nacre sur fond clair, chocolat profond sur fond sombre
	vec3 corpsClair=mix(MOKA_CLAIR,PLATINE,diff*0.85+0.15);
	corpsClair=mix(corpsClair,LAVANDE_PRO,smoothstep(-0.2,0.3,vRelief)*0.5);
	vec3 corpsSombre=mix(NUIT,MOKA,diff*0.9);
	corpsSombre=mix(corpsSombre,PRUNE,smoothstep(-0.2,0.3,vRelief)*0.6);
	vec3 c=mix(corpsClair,corpsSombre,uSombre);
	// Irisation discrete sur les bords
	vec3 iris=0.5+0.5*cos(6.2831*(fres*0.9+vRelief*0.6+vec3(0.0,0.18,0.38)+uTemps*0.03));
	c=mix(c,mix(c,iris*vec3(0.95,0.9,1.0),0.35),fres);
	c+=fres*mix(vec3(1.0,0.97,1.0),LAVANDE_PRO*1.2,uSombre)*0.55;
	c+=spec*0.65;
	gl_FragColor=vec4(c,1.0);
}
`;

// Ou se place la sculpture pour chaque type de scene : x et y en fraction de l'ecran, z en profondeur
type Pose = { x: number; y: number; z: number; echelle: number; amplitude: number };
const POSES: Record<Visuel["type"], Pose> = {
	accroche: { x: 0.78, y: 0.5, z: -0.5, echelle: 1.15, amplitude: 0.3 },
	probleme: { x: -0.85, y: -0.75, z: -2, echelle: 1.1, amplitude: 0.38 },
	revelation: { x: 0, y: 0.1, z: -2.6, echelle: 1.7, amplitude: 0.16 },
	fonctionnalites: { x: 0.92, y: 0.88, z: -1.5, echelle: 0.9, amplitude: 0.25 },
	terminal: { x: -0.9, y: 0.82, z: -1.5, echelle: 1.05, amplitude: 0.3 },
	capture: { x: 0.9, y: -0.88, z: -2, echelle: 1.2, amplitude: 0.22 },
	chiffres: { x: 0.9, y: 0.95, z: -1.2, echelle: 1.05, amplitude: 0.32 },
	architecture: { x: -0.92, y: -0.88, z: -1.8, echelle: 0.85, amplitude: 0.24 },
	chronologie: { x: 0.95, y: 0.15, z: -0.8, echelle: 1.1, amplitude: 0.24 },
	code: { x: -0.9, y: 0.85, z: -1.4, echelle: 0.95, amplitude: 0.22 },
	citation: { x: 0.8, y: -0.7, z: -0.4, echelle: 1.15, amplitude: 0.2 },
	appel: { x: 0, y: -1.05, z: -3, echelle: 1.9, amplitude: 0.3 },
};

const adoucir = Easing.bezier(0.65, 0, 0.35, 1);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// Etat du decor a l'image `frame` : pose interpolee entre la scene precedente et la courante
function etat(frame: number, script: Script) {
	const starts = debuts(script);
	let i = 0;
	while (i + 1 < starts.length && frame >= starts[i + 1]) i++;
	const duree = TRANSITION + 16;
	const k = i === 0 ? 1 : adoucir(Math.min(1, Math.max(0, (frame - starts[i]) / duree)));
	const avant = script.segments[Math.max(0, i - 1)].visuel.type;
	const maintenant = script.segments[i].visuel.type;
	const a = POSES[avant];
	const b = POSES[maintenant];
	const sombre = (t: Visuel["type"]) => (scenesSombres.includes(t) ? 1 : 0);
	// Pendant la transition, la camera plonge vers l'avant puis se pose
	const elan = i === 0 ? 0 : Math.sin(Math.PI * k);
	return {
		x: lerp(a.x, b.x, k),
		y: lerp(a.y, b.y, k),
		z: lerp(a.z, b.z, k),
		echelle: lerp(a.echelle, b.echelle, k),
		amplitude: (lerp(a.amplitude, b.amplitude, k) + elan * 0.15) * 1.6,
		sombre: lerp(sombre(avant), sombre(maintenant), k),
		elan,
		cumul: i + k, // nombre de transitions passees, pour faire tourner la sculpture a chaque changement
	};
}

// Poussieres lumineuses deterministes autour de la sculpture
function poussieres(nombre: number) {
	let s = 11;
	const alea = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
	const pos = new Float32Array(nombre * 3);
	for (let i = 0; i < nombre; i++) {
		pos[i * 3] = alea() * 9;
		pos[i * 3 + 1] = alea() * 6;
		pos[i * 3 + 2] = alea() * 4 - 1;
	}
	return pos;
}

function Decor({ script }: { script: Script }) {
	const frame = useCurrentFrame();
	const { width, height } = useVideoConfig();
	const { camera } = useThree();
	const t = frame / IPS;
	const e = etat(frame, script);

	const fond = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: fondVertex,
				fragmentShader: fondFragment,
				uniforms: { uTemps: { value: 0 }, uSombre: { value: 0 }, uElan: { value: 0 }, uRatio: { value: new THREE.Vector2(1, 1) } },
				depthWrite: false,
				depthTest: false,
			}),
		[],
	);
	const sculpture = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: sculptureVertex,
				fragmentShader: sculptureFragment,
				uniforms: { uTemps: { value: 0 }, uAmplitude: { value: 0.2 }, uFreq: { value: 0.5 }, uSombre: { value: 0 } },
			}),
		[],
	);
	const satellite = useMemo(() => sculpture.clone(), [sculpture]);
	const geometrie = useMemo(() => new THREE.IcosahedronGeometry(1.6, 96), []);
	const petite = useMemo(() => new THREE.IcosahedronGeometry(0.42, 40), []);
	const points = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(poussieres(220), 3));
		return g;
	}, []);

	// Mise a jour des uniformes pour cette image
	const ratio = width / height;
	fond.uniforms.uTemps.value = t;
	fond.uniforms.uSombre.value = e.sombre;
	fond.uniforms.uElan.value = e.cumul;
	fond.uniforms.uRatio.value.set(Math.max(ratio, 1), Math.max(1 / ratio, 1));
	for (const m of [sculpture, satellite]) {
		m.uniforms.uTemps.value = t;
		m.uniforms.uSombre.value = e.sombre;
	}
	sculpture.uniforms.uAmplitude.value = e.amplitude;
	satellite.uniforms.uAmplitude.value = 0.06;
	satellite.uniforms.uFreq.value = 1.4;

	// Conversion des fractions d'ecran en coordonnees du monde (camera a z = 10, champ de 35 degres)
	const demiHauteur = Math.tan(THREE.MathUtils.degToRad(17.5)) * 10;
	const demiLargeur = demiHauteur * ratio;
	camera.position.set(0, 0, 10 - e.elan * 1.6);
	camera.lookAt(0, 0, 0);
	const angle = t * 0.18 + e.cumul * 1.1;

	return (
		<>
			<mesh material={fond} frustumCulled={false} renderOrder={-1}>
				<planeGeometry args={[2, 2]} />
			</mesh>
			<group position={[e.x * demiLargeur * 0.9, e.y * demiHauteur * 0.9, e.z]} scale={e.echelle * Math.min(1, ratio * 1.1)}>
				<mesh geometry={geometrie} material={sculpture} rotation={[angle * 0.6, angle, 0]} />
				{/* Anneau fin et lune qui orbitent autour de la sculpture */}
				<mesh rotation={[1.2 + Math.sin(t * 0.3) * 0.15, angle * 0.4, 0.3]}>
					<torusGeometry args={[2.35, 0.012, 8, 220]} />
					<meshBasicMaterial color={e.sombre > 0.5 ? "#c9bedd" : "#6f4e37"} transparent opacity={0.55} />
				</mesh>
				<mesh geometry={petite} material={satellite} position={[Math.cos(t * 0.7 + 1) * 2.35, Math.sin(t * 0.7 + 1) * 0.8, Math.sin(t * 0.7 + 1) * 2.0]} />
			</group>
			<points geometry={points} rotation={[0, t * 0.03, 0]} position={[0, Math.sin(t * 0.2) * 0.2, 0]}>
				<pointsMaterial size={0.035} color={e.sombre > 0.5 ? "#e6e0f0" : "#6f4e37"} transparent opacity={0.55} sizeAttenuation />
			</points>
		</>
	);
}

export function Monde3D({ script }: { script: Script }) {
	const { width, height } = useVideoConfig();
	return (
		<ThreeCanvas width={width} height={height} camera={{ fov: 35, position: [0, 0, 10], near: 0.1, far: 50 }} gl={{ antialias: true }}>
			<Decor script={script} />
		</ThreeCanvas>
	);
}
