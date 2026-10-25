// Jeton Sec-MS-GEC (version 2) exige par le service de lecture d'Edge. Port fidele de edge-tts (src/edge_tts/drm.py,
// MIT) : le digest est un SHA-256 a constantes modifiees suivi d'une somme CS64, il ne peut pas etre remplace par
// crypto.subtle. Toute l'arithmetique est modulo 2^32.
// Si le service change encore l'algorithme, c'est ce fichier seul qui doit suivre edge-tts.

const INITIAL = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const ETAT = [0xfd9fbea2, 0x91243ce7, 0xbe499094, 0xcd2e1e0a, 0x6c006f49, 0x04bd35ab, 0xfeb0a7e4, 0x03effbd2];
const PLANNING = [
	0xeb24bf9e, 0x1558691f, 0xa0c09ee2, 0x0cfa32ba, 0xa622ee8c, 0xd1dd9491, 0xc0dd25a0, 0xf9e70ab6, 0xf0c31573,
	0x7058ce4e, 0x7188e606, 0x00e5ab33, 0xd258b060, 0x72766564,
];
const K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
	0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
	0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
	0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
	0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
	0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
	0xc67178f2,
];
const AJUSTEMENT = 0xc9dc06a7;
const AJUSTEMENT_SIGMA0 = 0x059c0b80;
const AJUSTEMENT_SIGMA1 = 0x000b92c0;
const CS64_COEFFICIENTS = [
	0xe82e91b1, 0x44de24c6, 0x3beb65bc, 0xc89c5933, 0x8d1ec211, 0x314ef5d5, 0xe92491b1, 0xf0a5b9d5, 0x06064cf3,
	0xda79fa60, 0xbed20560, 0x89f9c9f8, 0x35fa38c6, 0xcb49e3c6,
];
const CS64_DECALAGES = [
	0xb32700d0, 0x88dff51d, 0x29514038, 0xb328cbdf, 0xd405b4d5, 0x26e55f3c, 0x607801c6, 0x82b2c1fb, 0xfa51a3da,
	0x207cc464, 0x3c3c74f3, 0xd2d14b61, 0xbb04a2c1, 0xc5626167,
];

export const TOKEN_CLIENT = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

const ror = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;
const rol16 = (x: number) => ((x << 16) | (x >>> 16)) >>> 0;
const mul = (a: number, b: number) => Math.imul(a, b) >>> 0;
const sigma0 = (x: number) => (ror(x, 7) ^ ror(x, 18) ^ (x >>> 3)) >>> 0;
const sigma1 = (x: number) => (ror(x, 17) ^ ror(x, 19) ^ (x >>> 10)) >>> 0;

function etendre(w: number[], debut = 16) {
	for (let i = debut; i < 64; i++) w[i] = (sigma1(w[i - 2]) + w[i - 7] + sigma0(w[i - 15]) + w[i - 16]) >>> 0;
}

function tours(etat: number[], w: number[], premier: number) {
	const k = premier === 14 ? K.map((v, i) => (i === 14 ? AJUSTEMENT : v)) : K;
	let [a, b, c, d, e, f, g, h] = etat;
	for (let i = premier; i < 64; i++) {
		const t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + (g ^ (e & (f ^ g))) + k[i] + w[i]) >>> 0;
		const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) | (c & (a | b)))) >>> 0;
		[a, b, c, d, e, f, g, h] = [(t1 + t2) >>> 0, a, b, c, (d + t1) >>> 0, e, f, g];
	}
	return [a, b, c, d, e, f, g, h];
}

const ajouter = (x: number[], y: number[]) => x.map((v, i) => (v + y[i]) >>> 0);

// Etat apres les 14 premiers tours, qui ne dependent que des 7 premiers octets du sel
function etatInitial(sel: Uint8Array) {
	const w = new Array<number>(14).fill(0);
	w.push((sel[0] << 16) | (sel[1] << 8) | sel[2]);
	w.push(((sel[3] << 24) | (sel[4] << 16) | (sel[5] << 8) | sel[6]) >>> 0);
	for (let i = 16; i < 30; i++) {
		let v = PLANNING[i - 16] + (i === 16 ? sigma1(w[14]) ^ AJUSTEMENT_SIGMA1 : sigma1(w[i - 2]));
		if (i >= 21) v += w[i - 7];
		if (i >= 29) v += sigma0(w[i - 15]) ^ AJUSTEMENT_SIGMA0;
		w.push(v >>> 0);
	}
	w.push((sigma1(w[28]) + w[23] + sigma0(w[15]) + w[14] + AJUSTEMENT - K[14]) >>> 0);
	etendre(w, 31);
	return ajouter(INITIAL, tours(ETAT, w, 14));
}

function digest(donnees: Uint8Array) {
	const longueur = 57 + donnees.length;
	const reste = donnees.subarray(7);
	const remplissage = (((55 - longueur) % 64) + 64) % 64;
	const bloc = new Uint8Array(reste.length + 1 + remplissage + 8);
	bloc.set(reste);
	bloc[reste.length] = 0x80;
	new DataView(bloc.buffer).setBigUint64(bloc.length - 8, BigInt(longueur) * 8n);
	const vue = new DataView(bloc.buffer);
	let etat = etatInitial(donnees);
	for (let o = 0; o < bloc.length; o += 64) {
		const w = Array.from({ length: 16 }, (_, i) => vue.getUint32(o + 4 * i));
		etendre(w);
		etat = ajouter(etat, tours(etat, w, 0));
	}
	return etat;
}

function cs64(donnees: Uint8Array, [cleA, cleB]: number[]) {
	const a = (cleA | 1) >>> 0;
	const b = (cleB | 1) >>> 0;
	const facteurs = [mul(a, 0x82893933), mul(b, 0x82893933)];
	const termes = CS64_COEFFICIENTS.map((c, i) => mul(c, facteurs[i % 2]));
	const decalages = [...CS64_DECALAGES];
	const brut = new Uint8Array(Math.ceil((donnees.length + 1) / 8) * 8);
	brut.set(donnees, 1);
	const vue = new DataView(brut.buffer);
	for (let i = 0; i < brut.length / 4; i++) {
		const mot = vue.getUint32(4 * i, true);
		let terme = mul(mot, i % 2 ? b : a);
		let decalage = mul(rol16(mot), i % 2 ? 0xc31713db : 0xef0569fb);
		if (i === 0) {
			terme = (terme + mul(0xf2f90b1a, facteurs[0])) >>> 0;
			decalage = (decalage + 0x0b1a0000) >>> 0;
		}
		termes.push(terme);
		decalages.push(decalage);
	}
	let [somme, dernier, etat, acc] = [0, 0, 0, 0];
	for (let i = 0; i < termes.length; i += 2) {
		const [x, y] = [termes[i], termes[i + 1]];
		let q = mul(rol16((decalages[i] + x) >>> 0), 0x76f50f34);
		somme = (somme + ((mul(rol16(q), 0xc3efea97) + q) >>> 0)) >>> 0;
		q = mul(rol16((decalages[i + 1] + y) >>> 0), 0x1881ce3c);
		dernier = (mul(rol16(q), 0x35bd1ec9) + q) >>> 0;
		somme = (somme + dernier) >>> 0;

		etat = (mul(etat, a) + x) >>> 0;
		for (const m of [0xcf98b111, 0x87085b9f, 0x12ceb96d, 0x257e1d83]) etat = mul(rol16(etat), m);
		acc = (acc + etat) >>> 0;
		let t = (mul(etat, b) + y) >>> 0;
		t = mul(rol16(t), 0xa27416f5);
		t = mul(rol16(t), 0xd38396ff);
		etat = mul(rol16(mul(rol16(t), 0x7c932b89)), 0xbfa49f69);
		acc = (acc + etat) >>> 0;
	}
	return [(dernier ^ etat) >>> 0, (somme ^ acc) >>> 0];
}

// Les deux premiers mots du digest (big-endian) sont relus en little-endian par CS64
const inverserOctets = (n: number) =>
	(((n & 255) << 24) | (((n >>> 8) & 255) << 16) | (((n >>> 16) & 255) << 8) | (n >>> 24)) >>> 0;

const hexLe = (n: number) =>
	[0, 8, 16, 24].map((s) => ((n >>> s) & 255).toString(16).padStart(2, "0")).join("").toUpperCase();

// `maintenant` en secondes Unix ; la fenetre de validite est de 5 minutes
export function jetonGec(maintenant: number) {
	let ticks = Math.floor(maintenant) + 11644473600;
	ticks -= ticks % 300;
	const donnees = new TextEncoder().encode(`${BigInt(ticks) * 10_000_000n}${TOKEN_CLIENT}`);
	const empreinte = digest(donnees);
	const hex = empreinte.map((n) => n.toString(16).padStart(8, "0")).join("").toUpperCase();
	const [x, y] = cs64(donnees, [inverserOctets(empreinte[0]), inverserOctets(empreinte[1])]);
	return `${hexLe(x)}${hexLe(y)}-${hex}`;
}

