# MB Kreicas svetainė

Vieno puslapio (SPA stiliaus) svetainių rinkinys, sukurtas pristatyti naudotus ir naujus automobilius lietuviškai kalbančiam vartotojui.

## Struktūra
- `index.html` – pagrindinis puslapis su išskirtiniais pasiūlymais.
- `cars.html` – visas automobilių katalogas su paieška ir filtrais.
- `car.html?slug=...` – individualaus automobilio puslapis.
- `about.html`, `contact.html` – informaciniai puslapiai.
- `login.html` – administratoriaus prisijungimo puslapis.
- `admin.html` – paprasta valdymo sąsaja (localStorage pagrindu).
- `assets/data/cars.json` – numatytas 11 automobilių sąrašas.
- `assets/css` ir `assets/js` – stiliai bei interaktyvumas.

## Naudojimas
1. Paleiskite bet kokį statinį serverį (pvz., `npx serve -l tcp://0.0.0.0:3000 .`) šio katalogo šaknyje arba atidarykite `index.html` naršyklėje. Naudojant `0.0.0.0` adresą svetainė taps pasiekiama ir kitiems tame pačiame tinkle esantiems įrenginiams (pvz., telefonu).
2. Prisijunkite per `login.html` naudodami numatytą slaptažodį **MBKreicas2024!** (rekomenduojama jį keisti).
3. Į „Admin“ skiltį pateksite po prisijungimo (`admin.html`). Čia galite:
   - Pridėti naują automobilį be kodo redagavimo.
   - Redaguoti esamus automobilius ir saugoti pakeitimus naršyklės atmintyje.
   - Eksportuoti / importuoti JSON failą visam automobilių sąrašui.
   - Atstatyti numatytą sąrašą, įkeliant `assets/data/cars.json` duomenis.
   - Pakeisti administratoriaus slaptažodį (saugomas localStorage) arba atsijungti.

> Pastaba: visi pakeitimai (įskaitant nuotraukas ir slaptažodį) saugomi tik tame įrenginyje, kuriame atliekamas redagavimas. Norėdami pasidalinti automobilių sąrašu su kitais įrenginiais, eksportuokite JSON ir importuokite jį kituose įrenginiuose.

## Pritaikymas mobiliesiems
Svetainė kurta „mobile-first“ principu, naudojant šiuolaikinius CSS (flex/grid) sprendimus ir animuotas sąsajas.

## Licencija
Projektas pateikiamas demonstraciniais tikslais.
