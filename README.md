# MB Kreicas svetainė

Vieno puslapio (SPA stiliaus) svetainių rinkinys, sukurtas pristatyti naudotus ir naujus automobilius lietuviškai kalbančiam vartotojui.

## Struktūra
- `index.html` – pagrindinis puslapis su išskirtiniais pasiūlymais.
- `cars.html` – visas automobilių katalogas su paieška ir filtrais.
- `car.html?slug=...` – individualaus automobilio puslapis.
- `about.html`, `contact.html` – informaciniai puslapiai.
- `assets/data/cars.json` – numatytas 11 automobilių sąrašas.
- `assets/css` ir `assets/js` – stiliai bei interaktyvumas.

## Naudojimas
1. Paleiskite bet kokį statinį serverį (pvz., `npx serve -l tcp://0.0.0.0:3000 .`) šio katalogo šaknyje arba atidarykite `index.html` naršyklėje. Naudojant `0.0.0.0` adresą svetainė taps pasiekiama ir kitiems tame pačiame tinkle esantiems įrenginiams (pvz., telefonu).
2. Naršykite katalogą `cars.html` puslapyje ir filtruokite automobilius pagal iš anksto užpildytus išskleidžiamuosius meniu.

## Pritaikymas mobiliesiems
Svetainė kurta „mobile-first“ principu, naudojant šiuolaikinius CSS (flex/grid) sprendimus ir animuotas sąsajas.

## Licencija
Projektas pateikiamas demonstraciniais tikslais.
