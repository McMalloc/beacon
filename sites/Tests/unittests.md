## Unit-Tests

### Was sind Unit-Tests?

Unit-Tests garantieren die Funktion isolierbarer _Komponenten_, da sie unabhängig von der gesamten Anwendung getestet werden können. Eine _Unit_ sind dabei Programmbausteine, die beliebig von anderen Komponenten aufrufbar sind, im Frontend z.B. Funktionsbibliotheken, Services, Filter und im Backend Model- oder Controllerinstanzen. Mehrere Tests werden zu einer _Testsuite_ zusammen gefasst, wobei eine Suite aus mehreren _Specs_ besteht, die einer einzelnen Anforderung (aus der SRS oder dem Lastenheft) entspricht. Ein Spec gilt als bestanden, wenn alle darin enthaltenden _Expectations_ wahr sind.

Folgende Kriterien sind hilfreich, um entscheiden zu können, ob für eine Komponente ein Unit-Test hilfreich sein kann^[Sind konkret zu entscheiden.]:

* Macht es Sinn, die Komponente auch in potenzielle andere Programmteile zu integrieren (Angular-Slang: _injizieren_)?
* Lässt sich die Komponente headless, also ohne graphische Umgebung testen? (rein funktionale Eigenschaften vs. Rendering- und formbezogenen Aufgaben)
* Stellt die Komponente eine Schnittstelle bzw. einen Datenadapter dar?
* Enthält die Komponente nicht triviale Funktionen? Eine Angular Direktive, die beispielsweise nur ein JQuery-Plugin auf ein übergebenes DOM-Element anwendet, kann indirekt in einem E2E-Test (s. da) getestet werden.

### Umgebung für Unit-Tests

Um schnelle Iterationen zu ermöglichen, die Systemressourcen niedrig zu halten und potenziell nach erfolgreichem git push automatisch testen zu können, werden die Unit-Tests headless, also ohne Render-Engine durchgeführt. Die benutzten Bibliotheken wie JQuery und Angular haben selbst stringente Testsuiten für die verschiedenen Javascript-Umgebungen und so kann es nur in Grenzfällen zu abweichendem Verhalten kommen.

Die Unit-Tests werden vom Testrunner Karma ausgeführt. Karma ist eine nodejs-Anwendung, die mit Hilfe der Javascript-Bibliothek Jasmine sog. _behaviour driven tests_ in einem echten Browser ausführt. Als "echten" Browser nutzen wir PhantomJS, der ohne Rendering den Code in Webkits V8-Engine ausführt. 

#### Lokale und globale Binarys

Zunächst muss nodejs in der Testumgebung installiert werden. Unter Windows und MacOS geschieht das mit dem [Installer](https://nodejs.org/en/download/), unter Linux/Debian mit dem Ausführen folgender Befehle:

```sh
#(Veraltetes) nodejs samt eigenem Paketmanager npm aus den Debian-Quellen installieren
sudo apt-get install npm
``` 
```sh
#Cache leeren
sudo npm cache clean -f
``` 
```sh
#Helferscript n global installieren
sudo npm install -g n
``` 
```sh
#n die neueste nodejs Version installieren lassen
sudo n stable
``` 
```sh
#Binary dem path zur Verfügung stellen
sudo ln -sf /usr/local/n/versions/node/<VERSION>/bin/node /usr/bin/node 
``` 

Im root des frisch gepulltem Repo dann `npm install` ausführen; es werden nun u.a. Karma und Jasmine lokal installiert. 

##### Hinweis zu Windows
Das Paket `karma-ie-launcher` muss eventuell global nachinstalliert werden und funktioniert aus dem node_modules Ordner nicht. Daher in der elevierter Kommandozeile (als Administrator ausführen) folgendes eingeben:

```sh
npm install -g karma-ie-launcher
```

Selbstverständlich muss auch der Internet Explorer installiert sein.

#### Die Config

Die Konfigurationsdatei ist <Projektname>.conf.js im Hauptverzeichnis. Es folgt ein kurzer Überblick über die wichtigsten Konfigurationsparameter.

##### frameworks
Hier werden die Test-Frameworks eingetragen. Wir nutzen Jasmine, möglich wäre z.B. auch Mocca oder QUnit. Hierfür sollten dann extra COnfig-Dateien angelegt werden, die dann separat ausgeführt werden. Das Test-Framework stellt Funktionen zur Strukturierung der SUites und zum Vergleichen von Assertions bereit.

##### files und exclude
Hier werden alle zu [^Walter2002] inkludierenden Javascript-Dateien gelistet, **in der Reihenfolge, wie sie auch in der Webanwendung selbst in die index.html eingebettet werden**, um erfüllte Abhängigkeiten zu gewährleisten. Zuletzt werden die Dateien mit den Testsuiten aufgenommen.

Unter exclude aufgeführte^[Noch eine Fußnote! 1992, Berlin.] Dateien werden ignoriert. In den Configs aus den Repos sind das zumeist die Testsuiten für die E2E-Tests (protractor.js).

Unter beiden kann mit der Wildcard * gearbeitet werden, z.B. matcht `src/**/*.js` alle Javascript-Dateien in beliebig tiefer Ordnerstruktur im src-Ordner.

##### reporters
Mögliche Werte sind hier `verbose` (etwas ausführlicher) oder `dots` einfacher; diese Scripte geben die Testresultate in der Kommandozeile aus.

##### browsers
In diesem Array werden die Browser aufgeführt, die getestet werden sollen. 

*`PhantomJS` headless Webkit-Browser (entsprichtweitestgehend Chrome, Safari und Konquerer)
*`IE` Internet Explorer (weicht vor allem in älteren Versionen von den anderen Browsern ab, daher nach Möglichekit mittesten)
*`Firefox`, `Chrome`

##### client
Unter dem Key `args` können Strings von der Kommandozeile in die Testsuiten geschleust werden. Die Strings aus dem übergebenem Array stehen dann unter `window.__karma__.config.args[0..n]` bereit.

##### singleRun
Sollte `true` sein, damit die hier beschriebene Methode zum Ausführen der Tests funktioniert. 

#### Ausführen
Ausgeführt werden die Testsuites mit

```sh
karma start <Projektname>.conf.js
#bzw.
node_modules/karma/bin/karma start <Projektname>.conf.js
```

#### Ausblick
##### Grunt
Die Testkonfiguration könnte als Grunt-Task aufgenommen werden und so zentral ausgeführt werden, z.B. vor einem Build. Das würde auch die Zahl der separaten Konfigurationsdateien verringern, da diese zusätzlich von Grunt verwaltet werden würden. Außerdem können so auch Tests auf dem Server ausgeführt werden, z.B. nach jedem push.

Werden die Tests remote ausgeführt, also nicht unmittelbar in einer lesbaren Kommandozeile ausgeführt, wäre auch ein HTML Reporting wünschenswert. Das ist theoretisch mit der `reporters` Option möglich, wurde aber noch nciht weiter recherchiert.

### Tests schreiben
Pro Komponente wird im gleichen Ordner eine Datei `jasmineSpec.js` angelegt. Durchgehend gleiche Namen garantieren, das der Minifier im Buildprozess diese Dateien identifizieren und ausschließen kann.

Wichtig ist, zu beachten, dass im Test (dem Body der Testmethode) nur die zuvor injizierten Komponenten sowieso globale Variablen zur Verfügung stehen. Jede Datei folgt dem gleichen Codeskelett:

```javascript
// Die Funktion describe eröffnet eine neue Suite, der erste übergebene String erscheint im Reporter zur 
// Orientierung.
describe("messstellenService test", function () {
	var n = 1;
	// Vor jedem Test wird die Anwendung "required"
    beforeEach(module("app"));
	
	// Vor jedem Test wird die zu testende Komponente injiziert und zusätzlich der $injector Service,
	// über den zusätzliche Komponenten im Laufe des Test aufgerufen werden können
    beforeEach(inject(['Messstellen', '$injector',function (_Messstellen_, $injector) {

    }]));

	// Ein it Block beschreibt einen konkreten Testfall
    it("Messpunkte haben korrekte URLs", function() {
		// Wirft expect() ein false, gilt der Test als gescheitert.
        expect(n).toBe(1)
    });

});
```

Für die verschiedenen Matcher sei auf die [Jasmine Doc](http://jasmine.github.io/2.0/introduction.html) verwiesen.

Stehen bestimmte Services zur Testzeit nicht zur Verfügung, können diese mit Hilfe von Spies simuliert werden. Eine EInführung dazu bietet ein [Tutorial von Robin Böhm](https://angularjs.de/artikel/angularjs-test).

### Rezepte
Im folgenden werden Lösungen für häufige Probleme gegeben.

#### AJAX Backend

Viele Anwendungen beinhalten einen Services, der über AJAX mit einem Webserver kommuniziert. Es ist oft weder praktisch noch möglich, während Tests tatsächlich auf die echten Rückgabedaten zu warten. Dafür stellt Angular einen _Mock Service_ bereit. Aufgerufen wird er folgendermaßen:

##### beforeEach
```Javascript
describe("a suite", function () {
    var Messstellen, $httpBackend;
    var response_json = {...};

beforeEach(inject(['Messstellen', '$injector',function (_Messstellen_, $injector) {
        Messstellen = _Messstellen_;
        $httpBackend = $injector.get('$httpBackend');
        $httpBackend.whenRoute("POST", "call.php").respond(response_json);
        $httpBackend.whenRoute("GET", "modules/localization/translation-de_DE.json").respond({});
    }]));
```

Die beforeEach()-Methode kann wie gewohnt dazu genutzt werden, den zu testenden Service (oder Factory oder Provider) vor jedem Spec zu injizieren. Der Mock Service `$httpBackend` wird via des `$injector` Services injiziert. Diese Syntax ist au sder Angular Doc übernommen, in der alltäglichen Entwicklung wird es kaum nötig werden, auf dieses internen Service direkt zuzugreifen, ausgenommen eben in diesen Unit-Tests.

Mit der `whenRoute()` Methode werden dann Response-Objekte bestimmten Routen und HTTP-Verben zugeordnet. Die Objekte können am Anfang der Suite definiert werden. **Achtung:** Der Response muss tatsächlich in [echtem JSON](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf) vorliegen, da Angulars $http-Service JSON erwartet und bei einem Javascript-Objekt einen Fehler ausgeben würde.

##### Im Spec

Weiter kann dann so getestet werden:

```Javascript
it("hole alle Messstellen", function () {
		// getData() führt im Service einen http-Call aus, der response entspricht
		// dem vorher definiertem Mock Objekt. Da der normale $http-Service ausgeführt wird,
		// kann auf das Promise mit then() gewartet werden.
        Messstellen.getData().then(function(response) {
            expect(_.isEmpty(response.messstellen)).toBe(false);
        });
        $httpBackend.flush();
    });
```

Wie man an diesem Block gut sehen kann, stehen in den Testsuites auch die üblichen Objekte, wie z.B. Underscore / lodash _\__ für die Arbeit mit Arrays, Collections, etc. zur Verfügung.

#### Regex
Um die Suiten allgemeiner zu formulieren oder Unschärfen auszugleichen, kann man auch auf reguläre Ausdrücke zurückgreifen, wie im folgenden Beispiel. Es sollen URLs verschiedener Netzwerkendpunkt auf Richtigkeit berprüft werden. Die IP kann dabei nicht getestet werden, da sie sich immer ändenr kann, der Pfad ändert soch hingegen nicht. Je nach Entwicklungsumgebung kann sich auch das Format (php oder ssi) ändern.

```Javascript
it("Messpunkte haben korrekte URLs", function() {
        _.each(messpunkte, function(mp) {
            expect(mp.url)
                .toMatch("(http://).+" +
                "(/ZAEHLERSTAND_494_" +
                mp.physikalische_position +
                ".)(ssi|php)");
        });
    });
```

[Im MDN](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions) kann man sich zu den Regex-Möglichkeiten in Javascript belesen.

[^Walter2002]: Da und da der Titel, dann erschienen, S. 23.