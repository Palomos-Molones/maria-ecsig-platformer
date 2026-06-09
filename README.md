# Maria a Ecsig

Joc 2D de plataformes al navegador fet amb React 19, Vite, TypeScript i Phaser. La protagonista és la Maria, que recorre una oficina fictícia d'Ecsig, empresa del sector elèctric dedicada a ERPs.

## Joc

- 5 nivells amb dificultat progressiva: Desenvolupament, Suport, Facturació, Infraestructura i Direcció.
- 5 vides inicials i música retro 8-bit activada quan comença la partida.
- Controls de teclat: fletxes o WASD per moure, espai per saltar.
- Controls tàctils en pantalles mòbils: botons esquerra, dreta i salt.
- Factures elèctriques per recollir, plataformes mòbils, cables i quadres elèctrics com obstacles.
- Bugs voladors, devs maliciosos a terra i boss final CEO al nivell Direcció.
- Pantalla inicial, game over i victòria amb augment i cita amb el DevOps.
- Canvas responsive amb sprites bitmap propis: Maria té animacions d'idle, cursa, salt i caiguda, i el mapa usa textures pixel-art 90s/Y2K generades per al projecte.

## Instal·lació

```bash
npm ci
```

## Execució local

```bash
npm run dev
```

Per provar un nivell concret en local o a Pages, afegeix `?level=1`, `?level=2`, `?level=3`, `?level=4` o `?level=5` a la URL i prem `Jugar`.

## Validació

```bash
npm run lint
npm run typecheck
npm run build
```

## Desplegament

El repo inclou GitHub Actions:

- `CI`: s'executa a cada pull request amb `npm ci`, lint, typecheck i build.
- `Deploy GitHub Pages`: publica automàticament `dist/` a GitHub Pages quan hi ha push a `main`.

La configuració de Vite aplica el `base` `/maria-ecsig-platformer/` durant GitHub Actions perquè els assets resolguin correctament a Pages.
