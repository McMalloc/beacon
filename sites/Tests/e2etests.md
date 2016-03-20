## End-to-End-Tests
###Was sind End-to-End-Tests?
End-to-End-Tests (E2E-Tests) testen in realer Umgebung das fertige Produkt unter Simulation echter Nutzereingaben. Selbst wenn alle Komponenten ihre Unit-Testsuiten fehlerfrei bewältigen, kann es immer noch Probleme im Anwendungs- und Fugencode geben.

###Umgebung
E2E-Testsuiten sind weiterhin in Jasmine geschrieben, daher ändert sich nichts an der Struktur der Dateien. Für die steuerung der Browser ist Selenium zuständig, dessen Browsersteuerung um Angular-spezifische Methoden erweitert wird. Das nodejs Paket _Protractor_ abstrahiert das Wirrwarr und ist das einzige Paket, welches benötigt wird. Wurde bereits `npm install` im root Verzeichnis ausgeführt, ist bereits Protractor lokal installiert.

####Die Config
Im root Verzeichnis liegt die Konfigurationsdatei mit dem Namen _protractor.conf.js_

##### seleniumAddress 
Die Adresse des Selenium Servers (s. Tests ausführen), sollte auf der gleichen Maschine wie die Tests selbst laufen, also z.B. http://localhost:4444/wd/hub

##### baseUrl
Die anzusteuernde URL zum Testen, entweder ein Remote-Server oder localhost.

##### suites:
Ein Objekt, das Pfade zu den Testsuites enthält. Auch hier können Wildcards benutzt werden.

```Javascript
{ 
	partials: 'src/partials/**/protractor.js',
	general: 'src/protractor.js'
}
```
	
##### capabilities
Enthält die Property `browserName`, die Werte wie `chrome` oder `phantomjs` annehmen kann. Das sind die Browser, die angesteuert werden.

##### onPrepare
Diese hier definierte Funktion wird unmittelbare nach Initialisierung der Testumgebung und vor den eigentlichen Testsuites ausgeführt.

Beispielsweise können die Reporters (auch HTML) definiert werden:

```Javascript
// require das Paket
var jasmineReporters = require('jasmine-reporters');
		//Reporter hinzufügen, samt Options-Objekt
		jasmine.getEnv().addReporter(new jasmineReporters.TerminalReporter({

		}));
		// Aktualisieren
		jasmine.getEnv().execute();
```

Welche Optionen für welche Reporter zur Verfügung stehen, entnimmt man am besten direkt aus den Quelldateien (in node_modules/jasmine-reporters/src). Diese sind gut kommentiert, eine kompilierte Dokumentation oder genügende Tutorials gibt es nicht.

Außerdem kann der Brower konfiguriert werden. Folgender Codeblock, der die Fenstergröße setzt, soll der Veranschaulichung dienen:

```Javascript
var minWindowWidth = 1024,
	minWindowHeight = 768,
	browserName,
	platform,
	window = browser.manage().window();

browser.getCapabilities().then(function (capabilities) {
		browserName = capabilities.caps_.browserName;
		platform = capabilities.caps_.platform;
	}
).then(function getCurrentWindowSize() {
		return window.getSize();
	}
).then(function setWindowSize(dimensions) {
		var windowWidth = Math.max(dimensions.width, minWindowWidth),
			windowHeight = Math.max(dimensions.height, minWindowHeight);
		return window.setSize(windowWidth, windowHeight);
	}
).then(function getUpdatedWindowSize() {
		return window.getSize();
	}
);
```

#### Tests ausführen
In einer separaten Kommandozeile oder Shell muss der Webdriver ausgeführt werden. Er ist Teil des installierten Komplettpakets Protractor.

```Javascript
webdriver-manager start --standalone
```

Im root Verzeichnis der Anwendung kann dann mit dem einfachen Befehl `protractor` die Testsuites gestartet werden.

### Tests schreiben

Dank des gleichbleibenden Testframeworks Jasmine unterscheidet sich der Testcode für E2E-Tests in seiner Struktur kaum von den Unit-Tests. Noch immer werden die Tests in Suiten (`describe()`), Specs (`it()`) und Assertions (`expect()`).

Nichtsdestrotz gibt es zwei grundlegende Unterschiede: Zunächst stehen während der Tests nicht direkt injizierte Komponenten und globale Variablen zur Verfügung, da der Namespace des Browsers nicht zur Verfügung steht. Weiter gibt es nun Methoden zum Steuern des Browsers, um den Nutzer zu simulieren. Das heißt im Umkehrschluss, dass auch nichts injiziert werden muss, da die Anwendung in ihrer ganzheitlichen FUnktion getestet wird und das Resultat betrachtet werden kann.

Die API ist [hier](https://angular.github.io/protractor/#/api) dokumentiert , in den (Angular Docs)[https://docs.angularjs.org/api] gibt es weiterhin zu vielen dokumentierten Komponenten beispielhafte Protractor-Tests. Beispielsweise kann im `beforeEach()` Block mit `browser.get(url)` die URL für die Anwendung aufgerufen werden.

Im folgenden sollen übliche Aufgaben und deren Lösungen betrachtet werden.

### Rezepte
#### Elemente zählen und überprüfen
Wie kann eine dynamische Anzahl von Elementen überprüft werden, idealerweise aus einer Netzwerkressource?

Steuert man den Browser zur Anwendung, wird erst nach dem Pageload der AJAX Call zur Datenbank durchgeführt. Würde man nun mit einem Selektor die Elemente zählen wollen, wären die zu Grunde liegenden Daten womöglich noch gar nicht ihren Weg zurück zum Success-Handler gefunden haben. Protractor wrappt dazu viele Methodenaufrufe in Promises, die asynchron aufgelöst werden können. Dann können die Elemente gezählt und durchiteriert werden. Abgehen von Bugs in Protractor werden nach dem Auswerten aller Scopes bis zum Auflösen aller Promises gewartet.

```javascript
var panelcount_q = element.all(by.css('.panel')).count();
```
Alle Elemente mit der CSS-Klasse `.panel` werden abgerufen und eine Zählung beauftragt. `all()` gibt ein Promise zurück, das aufgelöst wird, sobald Angular alle anderen Promises (in unserem Fall von `$http`) aufgelöst hat. Dieses Promise wird dann an `count()` übergeben, was wiederum auf das Promise wartet und ein anderes zurückgibt.

```javascript
panelcount_q.then(function(panelcount) {
			expect(panelcount).toBe(4);
		});
```
`then()` wartet auf das Promise und übergibt das Resultat an die übergebene Funktion. Das Resultat kann nun in einer Assertion verarbeitet werden. Will man die Zahlen im Test nicht hardcoden, kann vorher auch die Anzahl direkt via XMLHttpRequest abgerufen werden:

```javascript
var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
		var expected_panelcount = JSON.parse(xhr.responseText).length
        it("Korrekte Anzahl wird gezeichnet", function() {
			describe(....)
		});
    }
}
xhr.open('GET', 'http://example.com', true);
xhr.send(null);
```
#### Auf die Client-Umgebung zugreifen
Manchmal möchte man direkt auf die CLient-Umgebung, konkret das `window` Objekt zugreifen oder sonstige Abfragen stellen, für die man sonst die Entwicklerkonsole benutzt hat. Da das Testscript nicht im Browser läuft (wie bei Karmas Unit-Tests), sondern in nodejs, ist dies nicht möglich. Folgender Trick bietet einen Workaround:

```javascript
expect(
	browser.executeScript('return window.location.hash;')
)
.toMatch( /(#\/lastgang\?p=%7B%22id%22:)(1|2|3|4)(%7D)/ );
```
`executeScript()` führt den übergebenen Code aus und returnt das, was auch im Code hinter dem ersten return Statement steht. So kann wie hier die Hashroute gematcht werden.

Denkt man das weiter, könnte man einen Service implementieren, der scope Variablen in einem Testobjekt registriert und beim Build, also in der minifizierten, obfuskierten und bereinigtem Code vom Taskrunner erkannt und gestrichen wird, sodass diese Beobachtungsobjekte nicht im finalen Produkt auftauchen.

#### Steuereingaben simulieren
Es gibt grundsätzlich zwei Möglichkeiten, bei einem Element ein Input-Event auszulösen:

```javascript
dropdown = element(by.id("jqxDropDownList0"));
dropdown.click().then(function() { ... });
```

Manchmal kann jedoch nicht so direkt auf das zugegriffen werden, auf das geklickt wird, wie z.B. beim Dropdownmenü eines der Listenelemente. In diesem Fall kann der Cursor direkt gesteuert werden:

```javascript
browser.actions()
	.mouseMove(dropdown, {x: 50, y: 70}) // relativ zum letzten Klick
	.click()
	.perform()
	.then(function() { ... })
```

#### Auf Elemente warten
Protractor versucht grundsätzlich, alle laufenden Promises aufzulösen, bevor Assertions überprüft werden. Manchmal klappt das nicht oder es sind keine Angular-internen Prozesse, die asynchron ablaufen. In diesem Fall kann man Protractor anweisen, auf ein bestimmte Bedingung zu warten.

```javascript
browser.wait(function() {
           return browser.driver.isElementPresent(by.id("jqxDropDownList0"));
        }).then(function() { ... })
```

`browser.wait()` führt die übergebene Funktion so lange aus, bis der zurückgegebene Wert wahr gleicht, in diesem Beispiel eine webdriver Funktion (^1), die auf ein Objekt mit einer bestimmten ID wartet. (^2) `wait()` gibt ein Promise zurück, auf dessen Auflösung dann mit `then()` behandelt werden kann.

Klappt das alles nicht, kann auf die `browser.sleep(int ms)` Funktion zurückgegriffen werden.

(^1) `browser` ist ebenso eine webdriver Funktion, die Protractor so wrappt, dass sie auf Angular zugeschnitten ist. Im Falle von `browser.driver` ist es eine reine Webdriver FUnktion, die beispielsweise nicht auf Promises wartet.
(^2) Protractor wartet nicht auf JQWidgets, weswegen die Assertions ausgelöst werden, ohne das beispielsweise das Widgets mit Daten gefüllt worden ist.