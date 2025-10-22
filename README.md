Flight Prototype - Realistic version (module-based)
==================================================

Ce prototype améliore le rendu et la logique de vol :
- Terrain procédural (léger), ciel, soleil avec ombres
- Avion procédural avec meilleur comportement de décollage
- Caméra chase, HUD, joystick mobile, throttle

Important - actions à faire avant d'ouvrir :
1) **Télécharge la version module de Three.js** et place-la à côté de index.html, nommée EXACTEMENT :
   three.module.js

   URL recommandée (copie-colle dans ton navigateur) :
   https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js

2) Lance un serveur local (obligatoire pour utiliser les modules) :
   - Avec Python (simple) : `python -m http.server`
   - Avec VSCode Live Server : "Go Live"
   - Avec Node : `npx http-server`

3) Ouvre ensuite dans ton navigateur :
   http://localhost:8000/  (ou le port affiché par ton serveur)

Notes :
- Le prototype n'inclut pas d'actifs externes (textures ou modèles glTF) pour rester léger.
- Si tu veux, je peux ajouter un modèle glTF léger et une texture d'herbe : dis-le moi et je l'ajoute au ZIP.
