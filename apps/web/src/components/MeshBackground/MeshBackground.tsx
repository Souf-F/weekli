import { useEffect, useRef, useState } from "react";
import { lancerMesh } from "@/lib/mesh";
import styles from "./MeshBackground.module.css";

// Fond WebGL fixe derriere toute l'application
export function MeshBackground() {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [pret, setPret] = useState(false);

	useEffect(() => (canvas.current ? lancerMesh(canvas.current, () => setPret(true)) : undefined), []);

	return <canvas ref={canvas} className={`${styles.fond} ${pret ? styles.pret : ""}`} aria-hidden="true" />;
}
