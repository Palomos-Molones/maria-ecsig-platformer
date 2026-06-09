# Maria a Ecsig

Joc 2D de plataformes al navegador fet amb React 19, Vite, TypeScript i Phaser. La protagonista és la Maria, que recorre una oficina fictícia d'Ecsig, empresa del sector elèctric dedicada a ERPs.

## Joc

- 3 nivells amb dificultat progressiva: Desenvolupament, Suport i Direcció.
- Controls de teclat: fletxes o WASD per moure, espai per saltar.
- Factures elèctriques per recollir, bugs i tickets com enemics, cables i quadres elèctrics com obstacles.
- Pantalla inicial, game over i victòria.
- Canvas responsive i assets generats amb Phaser, sense dependències d'imatges externes.

## Instal·lació

```bash
npm ci
```

## Execució local

```bash
npm run dev
```

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
