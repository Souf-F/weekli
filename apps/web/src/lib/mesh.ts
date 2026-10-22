// Fond mesh gradient anime en WebGL : des taches de couleur qui derivent lentement
// et se melangent, avec un leger grain. Sans WebGL, le degrade CSS du body reste visible.

const COULEURS = [
	[0.898, 0.894, 0.886], // platine #E5E4E2
	[0.902, 0.878, 0.941], // lavande #E6E0F0
	[0.788, 0.745, 0.867], // lavande profonde #C9BEDD
	[0.435, 0.306, 0.216], // moka #6F4E37
	[0.722, 0.624, 0.553], // moka clair #B89F8D
];

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 res;
uniform float t;
uniform vec2 m;
uniform float s;
uniform vec3 c[5];

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
	vec2 uv = gl_FragCoord.xy / res;
	float ratio = res.x / res.y;
	vec2 q = vec2(uv.x * ratio, uv.y);

	// Deformation douce pour des formes organiques
	q += 0.08 * vec2(sin(q.y * 3.1 + t * 0.6), cos(q.x * 2.7 - t * 0.5));

	// Chaque couleur suit une trajectoire lente ; le moka reste vers les bords bas
	vec2 pts[5];
	pts[0] = vec2(0.20 * ratio + 0.15 * sin(t * 0.21), 0.80 + 0.10 * cos(t * 0.17));
	pts[1] = vec2(0.75 * ratio + 0.18 * cos(t * 0.19), 0.75 + 0.12 * sin(t * 0.23));
	pts[2] = vec2(0.50 * ratio + 0.25 * sin(t * 0.13), 0.45 + 0.15 * cos(t * 0.29));
	pts[3] = vec2(0.90 * ratio + 0.10 * sin(t * 0.17), 0.05 + 0.10 * cos(t * 0.21));
	pts[4] = vec2(0.10 * ratio + 0.15 * cos(t * 0.15), 0.15 + 0.12 * sin(t * 0.19));

	// Parallaxe : la souris et le scroll decalent les taches a des profondeurs differentes
	for (int i = 0; i < 5; i++) {
		float profondeur = 0.03 + 0.02 * float(i);
		pts[i] += m * profondeur;
		pts[i].y += s * (0.05 + 0.025 * float(i));
	}

	float poids[5];
	poids[0] = 1.0; poids[1] = 1.0; poids[2] = 0.9; poids[3] = 0.4; poids[4] = 0.6;

	vec3 col = vec3(0.0);
	float total = 0.0;
	for (int i = 0; i < 5; i++) {
		float d = distance(q, pts[i]);
		float w = poids[i] / pow(d * d + 0.02, 1.6);
		col += c[i] * w;
		total += w;
	}
	col /= total;

	col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.035; // grain
	gl_FragColor = vec4(col, 1.0);
}
`;

// Lance l'animation sur le canvas et renvoie une fonction de nettoyage (pour useEffect)
export function lancerMesh(canvas: HTMLCanvasElement, surPret: () => void): () => void {
	const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
	if (!gl) return () => {};

	const compiler = (type: number, source: string) => {
		const s = gl.createShader(type)!;
		gl.shaderSource(s, source);
		gl.compileShader(s);
		return s;
	};
	const prog = gl.createProgram()!;
	gl.attachShader(prog, compiler(gl.VERTEX_SHADER, VERTEX));
	gl.attachShader(prog, compiler(gl.FRAGMENT_SHADER, FRAGMENT));
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
	gl.useProgram(prog);

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const p = gl.getAttribLocation(prog, "p");
	gl.enableVertexAttribArray(p);
	gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

	gl.uniform3fv(gl.getUniformLocation(prog, "c"), COULEURS.flat());
	const uRes = gl.getUniformLocation(prog, "res");
	const uT = gl.getUniformLocation(prog, "t");
	const uM = gl.getUniformLocation(prog, "m");
	const uS = gl.getUniformLocation(prog, "s");

	// Position de souris lissee, entre -1 et 1
	const souris = { x: 0, y: 0, cx: 0, cy: 0 };
	const surSouris = (e: PointerEvent) => {
		souris.x = (e.clientX / innerWidth) * 2 - 1;
		souris.y = -((e.clientY / innerHeight) * 2 - 1);
	};

	// Demi resolution : le degrade est flou par nature, le GPU travaille 4 fois moins
	const redimensionner = () => {
		canvas.width = Math.round(innerWidth * 0.5);
		canvas.height = Math.round(innerHeight * 0.5);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform2f(uRes, canvas.width, canvas.height);
	};
	redimensionner();
	addEventListener("resize", redimensionner);
	addEventListener("pointermove", surSouris);

	const fixe = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const depart = performance.now();
	let image = 0;
	const dessiner = (maintenant: number) => {
		souris.cx += (souris.x - souris.cx) * 0.04;
		souris.cy += (souris.y - souris.cy) * 0.04;
		gl.uniform2f(uM, souris.cx, souris.cy);
		gl.uniform1f(uS, Math.min(scrollY / innerHeight, 3));
		gl.uniform1f(uT, fixe ? 8 : (maintenant - depart) / 1000);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		if (!fixe) image = requestAnimationFrame(dessiner);
	};
	image = requestAnimationFrame(dessiner);
	surPret();

	return () => {
		cancelAnimationFrame(image);
		removeEventListener("resize", redimensionner);
		removeEventListener("pointermove", surSouris);
	};
}
