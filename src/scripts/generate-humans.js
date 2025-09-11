// src/scripts/generate-humans.js
import fs from "node:fs";
import path from "node:path";

const today = new Date().toISOString().slice(0, 10);

const content =  `/* ÉQUIPE */
Propriétaire du site : Baptiste Jeandel
Contact : ecrireabaptiste@gmail.com
Développeur : Benjamin Tisserand
Contact : benjamin@cpep.fr

/* SITE */
Dernière mise à jour : ${today}
Langue : Français [fr]
Doctype : HTML5
Standards : W3C validés
Technologies : Astro, TailwindCSS, Netlify

/* REMERCIEMENTS */
Merci à la communauté open source ♥
Merci à tous les bêta-testeurs du site ♥
`;

const out = path.resolve("public/humans.txt");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, content, "utf-8");
console.log("✅ humans.txt généré :", today);
