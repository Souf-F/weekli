// Duree de conservation des donnees d'un utilisateur dans KV (RGPD) : 90 jours, renouvelee a chaque ecriture.
// Ne concerne pas les TTL courts (session, etat OAuth), qui ont leur propre duree.
export const CONSERVATION_SECONDES = 60 * 60 * 24 * 90;

// Duree de vie d'une autorisation MCP (jeton de rafraichissement), fixe : pas renouvelee a chaque rafraichissement
export const GRANT_MCP_SECONDES = 60 * 60 * 24 * 30;

// Une entree (brouillon, pub) plus ancienne que la conservation est retiree a la lecture, meme si la cle KV vit encore
export const perimee = (date: string | undefined) => Date.parse(date ?? "") < Date.now() - CONSERVATION_SECONDES * 1000;
