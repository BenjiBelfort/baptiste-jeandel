// src/scripts/generate-humans.js
import fs from "node:fs";
import path from "node:path";

const today = new Date().toISOString().slice(0, 10);

const content = `/* TEAM */
Site owner: Baptiste Jeandel
Developer: Benjamin Tisserand
Contact: ecrireabaptiste@gmail.com

/* SITE */
Last update: ${today}
Language: French [fr]
Doctype: HTML5
Standards: W3C Validated
Components: Astro, TailwindCSS, Netlify

/* THANKS */
Thanks to the open source community ♥
`;

const out = path.resolve("public/humans.txt");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, content, "utf-8");
console.log("✅ humans.txt généré :", today);
