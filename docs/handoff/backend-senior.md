# Handoff backend : B15 (route POST /api/voix)

Date : 2026-10-25. Rien n'est commite par cette session.

## Livraison

- `POST /api/voix`, corps strict `{ texte, scene }` (texte de 1 a 400 caracteres apres trim, `scene` en `[a-z0-9_-]` de 64 max, champs inconnus rejetes). Reponse `200 audio/mpeg`. Session et Origin comme les autres routes `/api`.
- Erreurs : `400` corps invalide, `401` sans session, `429` limite, `502 { erreur: "Voix indisponible" }` si Microsoft echoue (le front bascule sur Kokoro).
- Voix `fr-FR-VivienneMultilingualNeural`, WebSocket sortant (fetch avec `Upgrade`) vers le service de lecture d'Edge. Seule la phrase part dans le SSML (echappee), `scene` et l'identite ne sont jamais transmises.
- Jeton `Sec-MS-GEC` en version 2 (`lib/voix-gec.ts`) : port de `drm.py` d'edge-tts (le v1, simple SHA-256, est refuse en 403 aujourd'hui). Verifie identique a edge-tts sur 2 instants (test).
- Cache KV `voix:<sha256(voix, texte)>`, 90 jours. Limite : 60 phrases par heure et par compte, compteur KV `voix-quota:<id>:<heure>` (le binding de limitation Cloudflare ne gere que 10 ou 60 s). Seules les phrases envoyees a Microsoft comptent, le cache reste servi.
- Journal : uniquement le message d'erreur technique, jamais le texte.

## Verification reelle (2026-10-25)

Appel isole depuis Node avec le jeton v2 : connexion acceptee, `turn.start`, `response`, `turn.end`, 13 392 octets de MP3 pour "Bonjour, ceci est un test.". Non verifie dans workerd (en-tetes Origin et Cookie sur le fetch WebSocket sortant) : a confirmer au premier `wrangler dev`.

## Effacement

`voix` n'est PAS ajoute a `effacerDonnees` : le cache est indexe par l'empreinte (voix, texte), partage entre comptes et sans identifiant d'utilisateur, donc non rattachable a un compte. Il expire seul en 90 jours. Seul le compteur horaire contient l'id, il expire en 2 h.

## Tests

`npx tsc --noEmit` vert. `npx vitest run` : 18 fichiers, 208 tests verts (dont `routes/__tests__/voix.test.ts` : succes, 502 x3 cas, cache, limite 429, validation, 401 ; `lib/__tests__/voix-gec.test.ts`).

## Limites connues

- Service non officiel : coupure ou changement d'algorithme possible (suivre edge-tts, `VERSION_CHROMIUM` et `voix-gec.ts`). Le compteur n'est pas atomique (depassement de quelques phrases en rafale).
- Aucune dependance ajoutee. Le texte des pubs part chez Microsoft : a citer dans la page Confidentialite (F12).
