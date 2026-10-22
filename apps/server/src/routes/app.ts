import { Hono } from "hono";
import type { AppEnv } from "../types";
import { api } from "./api";
import { auth } from "./auth";
import { oauthMcp } from "./oauth-mcp";

// Tout ce qui n'est ni /mcp ni un fichier du site passe par ici
export const app = new Hono<AppEnv>();

app.route("/", oauthMcp); // /authorize et /callback : OAuth des clients MCP
app.route("/auth", auth); // connexion GitHub du site
app.route("/api", api); // API du tableau de bord

app.notFound((c) => c.json({ erreur: "Introuvable" }, 404));
