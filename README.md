# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).


Pour l'architecture du projet :
tree -a -L 5 -I "node_modules|.git|dist|.vercel|.astro|.vscode|.DS_Store"
dans le terminal (régler L3 L4 L5 pour la profondeur)

A faire avant mise en ligne
- changer le nom de domaine partout
- vérifier tous les restes de https://baptiste-j-dev.netlify.app/

A faire plus tard :
- image og pour chaque activité
- Breadcrumb ?
- virer les champs radio inutiles dans les formulaires avec radio (info dans le mail pas utile)
ajouter un ignore dans le webhook :

            const IGNORE = new Set([
            'form-name', 'bot-field', 'payload', 'token',
            'parle', 'supports', 'accompagnement', 'truc-etc'
            ]);

ça c'est très bien :
Propre (côté formulaire) : tu fais en sorte que les name= “techniques” (ceux de tes radios ou inputs temporaires) ne partent jamais. Par exemple :
tu les retires (removeAttribute('name')) juste avant le submit,
ou tu les renommes en name="_parle" → comme ça tu peux ignorer tout ce qui commence par _ côté webhook.
Ça te donnerait un IGNORE générique :
js
Copier le code
if (k.startsWith('_')) return false; // on jette tous les champs “techniques”
👉 Résultat : plus besoin de courir après chaque coquille une par une