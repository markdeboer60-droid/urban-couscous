# Otto Visser & Partners – Website

Statische website voor Otto Visser & Partners accountantskantoor in Sneek, gebouwd met [Eleventy (11ty)](https://www.11ty.dev/).

## Installatie

```bash
# Zorg dat Node.js 18+ is geïnstalleerd
node --version

# Installeer dependencies
npm install

# Start de ontwikkelserver (met live reload)
npm run dev

# Bouw de productiesite naar _site/
npm run build
```

De site is beschikbaar op `http://localhost:8080` tijdens development.

---

## Een nieuwsbericht toevoegen

1. Maak een nieuw bestand aan in `site/content/nieuws/`:

```
site/content/nieuws/JJJJ-MM-DD-slug-van-artikel.md
```

2. Vul de frontmatter in (kopieer dit sjabloon):

```markdown
---
layout: base
title: "Titel van het nieuwsbericht"
date: 2026-04-01
dateModified: 2026-04-01
tag: Fiscaal
excerpt: "Korte samenvatting (max 155 tekens) die op de overzichtspagina verschijnt."
dienst: fiscaal-advies
permalink: /nieuws/slug-van-artikel/
---

{% block schema %}
<!-- Schema wordt automatisch via het layout opgebouwd -->
{% endblock %}

{% block content %}
{% set breadcrumbs = [{ "name": "Nieuws", "url": "/nieuws/" }, { "name": title }] %}
{% include "partials/breadcrumb.njk" %}

<section class="artikel-hero">
  <div class="container">
    <div class="artikel-meta">
      <time datetime="2026-04-01">1 april 2026</time>
      <span class="nieuws-tag">Fiscaal</span>
    </div>
    <h1>{{ title }}</h1>
    <p class="artikel-excerpt">{{ excerpt }}</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="artikel-body">
      <p>Hier komt de tekst van het artikel.</p>

      <div class="dienst-teaser">
        <h3>Meer weten over fiscaal advies?</h3>
        <p>Neem contact op voor een vrijblijvend gesprek.</p>
        <a href="/diensten/fiscaal-advies/" class="btn btn-primary">Meer over fiscaal advies</a>
      </div>
    </div>
  </div>
</section>
{% endblock %}
```

3. Klaar! Bij de volgende build verschijnt het artikel op `/nieuws/slug-van-artikel/` en bovenaan de overzichtspagina `/nieuws/`.

**Beschikbare `dienst` waarden** (voor de automatische koppeling):
- `jaarrekening`, `belastingaangifte`, `loonadministratie`, `fiscaal-advies`
- `bedrijfsoverdracht`, `administratie`, `financieringsadvies`
- `startersbegeleiding`, `erf-en-schenkbelasting`

---

## Een column toevoegen

Zelfde principe als nieuws, maar in de map `site/content/columns/`:

```
site/content/columns/JJJJ-MM-DD-slug-van-column.md
```

Frontmatter sjabloon:

```markdown
---
layout: base
title: "Titel van de column"
date: 2026-04-01
dateModified: 2026-04-01
auteur: "Mark de Boer"
auteur_url: /over-ons/
excerpt: "Korte samenvatting van de column."
dienst: fiscaal-advies
permalink: /columns/slug-van-column/
---
```

Columns verschijnen op `/columns/` en worden gekoppeld aan de bijbehorende servicepagina.

---

## Een nieuwe medewerker toevoegen aan /over-ons/

Open `site/over-ons/index.njk` en zoek de sectie met class `team-grid`. Voeg een nieuwe `team-card` toe:

```html
<div class="team-card">
  <div class="team-avatar">
    <!-- Foto optioneel: -->
    <img src="/assets/img/naam-medewerker.jpg" alt="[Naam] – [functie]" width="96" height="96" loading="lazy">
    <!-- Of een placeholder icon: -->
    <!-- <span aria-hidden="true" style="font-size:2.5rem">👤</span> -->
  </div>
  <h3>Voornaam Achternaam</h3>
  <div class="team-titel">Titel (bijv. MSc AA)</div>
  <div class="team-rol">Functie</div>
  <p style="font-size:0.875rem; color:var(--muted); margin-top:0.75rem">
    Korte beschrijving van specialisaties.
  </p>
</div>
```

Plaats het profielfoto bestand in `site/assets/img/`.

---

## Een nieuwe lokale landingspagina toevoegen

1. Maak een nieuwe map aan, bijv. `site/accountant-drachten/`
2. Maak het bestand `site/accountant-drachten/index.njk` aan met dit sjabloon:

```markdown
---
layout: lokaal
title: "Accountant Drachten | Otto Visser & Partners"
description: "Accountant voor ondernemers in Drachten. Otto Visser & Partners. Bel 0515 740 810."
permalink: /accountant-drachten/
stad: "Drachten"
h1: "Accountant voor ondernemers in Drachten"
intro: "Korte introductie specifiek voor Drachten en omgeving."
body: |
  <p>Unieke tekst over de regio Drachten. Beschrijf de lokale economie,
  welke sectoren er actief zijn en hoe Otto Visser & Partners de regio bedient.
  Vermijd copy-paste van andere pagina's.</p>

faq:
  - q: "Hebben jullie een kantoor in Drachten?"
    a: "Nee, ons kantoor is in Sneek op circa X minuten van Drachten. We komen ook bij klanten langs in Drachten."
  - q: "Welke diensten bieden jullie aan in Drachten?"
    a: "Alle diensten: jaarrekening, belastingaangifte, loonadministratie, fiscaal advies en meer."
  - q: "Vraag 3"
    a: "Antwoord 3"
  - q: "Vraag 4"
    a: "Antwoord 4"
---
```

3. Voeg de pagina toe aan de footer in `site/_includes/partials/footer.njk` onder de regio-navigatie.
4. Klaar!

---

## Sitestructuur

```
site/
├── _includes/
│   ├── layouts/
│   │   ├── base.njk          # Hoofd-layout (alle pagina's)
│   │   ├── dienst.njk        # Layout voor servicepagina's
│   │   └── lokaal.njk        # Layout voor lokale landingspagina's
│   └── partials/
│       ├── header.njk        # Sticky navigatie
│       ├── footer.njk        # Footer met NAP en links
│       └── breadcrumb.njk    # Breadcrumb navigatie
├── _data/
│   └── site.json             # Globale sitedata (NAP, diensten, partners)
├── assets/
│   ├── css/main.css          # Alle stijlen
│   └── js/main.js            # Vanilla JavaScript
├── content/
│   ├── nieuws/               # Nieuwsberichten (Markdown)
│   └── columns/              # Columns (Markdown)
├── diensten/                 # 9 servicepagina's
├── accountant-*/             # Lokale landingspagina's
├── over-ons/, contact/       # Overige pagina's
├── nieuws/, columns/         # Overzichtspagina's
└── index.njk                 # Homepage
```

## Design tokens

Alle kleuren staan als CSS custom properties in de `<head>` van `base.njk`:

| Token          | Waarde    | Gebruik                    |
|----------------|-----------|----------------------------|
| `--brightblue` | `#2ca7e0` | Accenten, links             |
| `--mediumblue` | `#0283c4` | Primaire knoppen, CTAs      |
| `--darkblue`   | `#135d9e` | Headings in blauwe context  |
| `--ink`        | `#0b1220` | Primaire tekst              |
| `--muted`      | `#5b6474` | Secundaire tekst            |
| `--line`       | `#e7ebf2` | Borders, scheidingslijnen   |
| `--lb1`        | `#ecf7fc` | Lichte blauwe achtergrond   |
| `--green`      | `#19c359` | Succes-indicatoren          |
