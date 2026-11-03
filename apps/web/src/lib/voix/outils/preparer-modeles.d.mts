export declare const REVISION: string;
export declare const SOURCES: Record<"modele" | "voix", { fichier: string; depot: string; sha256: string }>;
export declare function plagesEspeak(scriptModule: string): { plages: [number, number][]; tailleComplete: number };
