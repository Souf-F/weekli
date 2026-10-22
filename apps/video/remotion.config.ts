import { Config } from "@remotion/cli/config";

// Rendu H.264 de bonne qualite, pret pour LinkedIn et YouTube
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");

// Le decor 3D (Three.js) a besoin du GPU : ANGLE passe par Metal sur macOS
Config.setChromiumOpenGlRenderer("angle");
