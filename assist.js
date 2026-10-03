/* ==================================================================== */
/*  SS Assist - fully client-side knowledge engine (assist.js)           */
/*                                                                       */
/*  Pure in-page JavaScript port of the local Python engine               */
/*  website_ai/ss_ai_assist.py :: ask_ai().                              */
/*                                                                       */
/*  - Runs entirely inside the webpage: NO server, NO localhost,          */
/*    NO network requests, NO device/app APIs.                           */
/*  - Knowledge (company profile, services, quick replies) is loaded     */
/*    from assist_data.js (window.SS_ASSIST_DATA), generated 1:1         */
/*    from the original Python data so answers stay identical.           */
/* ==================================================================== */
(function () {
    'use strict';

    var D = window.SS_ASSIST_DATA || {};
    var ASSISTANT_NAME = D.ASSISTANT_NAME || 'SS Assist';
    var COMPANY_NAME = D.COMPANY_NAME || 'SS Industries';
    var COMPANY_PROFILE = D.COMPANY_PROFILE || {};
    var SERVICES = D.SERVICES || {};

    /* ----------------------- text helpers ---------------------------- */

    var REPLACEMENTS = [
        ['fier', 'fire'], ['fir', 'fire'], ['fightingg', 'fighting'],
        ['electricals', 'electrical'], ['eletrical', 'electrical'],
        ['electrcal', 'electrical'], ['turnky', 'turnkey'],
        ['turnkei', 'turnkey'], ['ductng', 'ducting'],
        ['ductingg', 'ducting'], ['coatingg', 'coating'],
        ['machinary', 'machinery'], ['mashinery', 'machinery'],
        ['quation', 'quotation'], ['quotaton', 'quotation'],
        ['webiste', 'website'], ['wesite', 'website'],
        ['plcprograming', 'plc programming'],
        ['plcprogrmming', 'plc programming'],
        ['bruner', 'burner'], ['buner', 'burner'],
        ['heatstorm', 'heat storm'],
        ['cedplant', 'ced plant'], ['cedplnt', 'ced plant']
    ];

    function escapeRe(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function isAscii(s) {
        return /^[\x00-\x7F]*$/.test(s);
    }

    /* Python str.strip(chars) equivalent */
    function pyStrip(s, chars) {
        return String(s).replace(
            new RegExp('^[' + escapeRe(chars) + ']+|[' + escapeRe(chars) + ']+$', 'g'),
            ''
        );
    }

    /* Exact port of ss_ai_assist.normalize_text() */
    function normalizeText(text) {
        var t = String(text == null ? '' : text).toLowerCase().trim();
        for (var i = 0; i < REPLACEMENTS.length; i++) {
            var wrong = REPLACEMENTS[i][0];
            var correct = REPLACEMENTS[i][1];
            t = t.replace(new RegExp('\\b' + escapeRe(wrong) + '\\b', 'g'), correct);
        }
        return t.replace(/\s+/g, ' ');
    }

    /* Exact port of ss_ai_assist.contains_word():
       whole-word match for ASCII phrases, plain substring for Hindi. */
    function containsWord(text, phrase) {
        if (isAscii(phrase)) {
            return new RegExp('\\b' + escapeRe(phrase) + '\\b').test(text);
        }
        return String(text).indexOf(phrase) !== -1;
    }

    /* ---------------- difflib-compatible similarity ------------------ */
    /* Port of Python difflib.SequenceMatcher(None, a, b).ratio() for
       short strings (autojunk only kicks in at length >= 200, which
       never happens for our aliases/questions). */

    function longestMatch(a, b) {
        var m = a.length, n = b.length;
        var best = { size: 0, i: 0, j: 0 };
        if (!m || !n) { return best; }
        var prev = new Array(n), cur = new Array(n), k;
        for (k = 0; k < n; k++) { prev[k] = 0; }
        for (var i = 0; i < m; i++) {
            for (var j = 0; j < n; j++) {
                cur[j] = 0;
                if (a.charCodeAt(i) === b.charCodeAt(j)) {
                    cur[j] = (j > 0 ? prev[j - 1] : 0) + 1;
                    /* strictly greater -> earliest (i, j) wins, like difflib */
                    if (cur[j] > best.size) {
                        best.size = cur[j];
                        best.i = i - cur[j] + 1;
                        best.j = j - cur[j] + 1;
                    }
                }
            }
            var swap = prev; prev = cur; cur = swap;
        }
        return best;
    }

    function matchingLength(a, b) {
        if (!a.length || !b.length) { return 0; }
        var best = longestMatch(a, b);
        if (!best.size) { return 0; }
        return best.size +
            matchingLength(a.slice(0, best.i), b.slice(0, best.j)) +
            matchingLength(a.slice(best.i + best.size), b.slice(best.j + best.size));
    }

    function similarity(a, b) {
        a = String(a); b = String(b);
        if (a === b) { return 1; }
        var total = a.length + b.length;
        if (!total) { return 1; }
        return (2 * matchingLength(a, b)) / total;
    }

    /* ---------------- service matching (score >= 0.55) --------------- */

    function bestServiceMatch(userText) {
        var text = normalizeText(userText);
        var bestKey = null;
        var bestScore = 0;

        Object.keys(SERVICES).forEach(function (key) {
            var service = SERVICES[key];
            var aliases = [service.name].concat(service.aliases || []);
            aliases.forEach(function (alias) {
                var aliasN = normalizeText(alias);
                var score;
                if (containsWord(text, aliasN)) {
                    /* alias fully present -> strong match; longer = better */
                    score = 0.90 + Math.min(aliasN.length, 30) / 1000;
                } else {
                    score = similarity(text, aliasN);
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestKey = key;
                }
            });
        });

        if (bestScore >= 0.55) {
            return { key: bestKey, score: bestScore };
        }
        return { key: null, score: 0 };
    }

    /* ---------------- canned responses (verbatim) --------------------- */

    function companyAnswer() {
        return (COMPANY_PROFILE.name || COMPANY_NAME) +
            ' industrial products और services प्रदान करती है, ' +
            'जिसमें safety पर विशेष ध्यान दिया जाता है।\n\n' +
            (COMPANY_PROFILE.description || '') + '\n\n' +
            'Website: ' + (COMPANY_PROFILE.website || '');
    }

    function quotationResponse() {
        return 'Quotation के लिए कृपया website के **Get Your Quote** section का उपयोग करें ' +
            '(' + (COMPANY_PROFILE.website || '') + ') या website के Contact section से ' +
            'SS Industries की team से संपर्क करें।\n\n' +
            'Quotation के लिए अपनी requirement (service/product, location और approximate scope) ' +
            'साथ में बताएँ, ताकि team सही जानकारी दे सके।';
    }

    function greetingResponse() {
        return 'नमस्ते! मैं ' + ASSISTANT_NAME + ' हूँ, ' + COMPANY_NAME + ' का assistant।\n\n' +
            'आप Electrical Systems, Firefighting, Turnkey Projects, Paint Shops & Ducting, ' +
            'CED Plants, PLC Panels, Burners/Heat Storm या quotation के बारे में पूछ सकते हैं।';
    }

    function websiteInformation() {
        return COMPANY_NAME + ' की website पर industrial products और services से जुड़े मुख्य sections मौजूद हैं:\n\n' +
            '01. Electrical Systems\n' +
            '02. Firefighting Systems\n' +
            '03. Turnkey Project Execution\n' +
            '04. Paint Shops & Ducting Work\n' +
            '05. CED Coating Plants & Machinery\n' +
            '06. PLC Panels & Programming\n' +
            '07. Burners & Heat Storm\n\n' +
            'CED में Manual, Semi-Automatic और Automatic plant solutions की जानकारी उपलब्ध है। Products/services की current coverage Patna तक है।\n\n' +
            'Website में Get Your Quote और contact-related sections भी हैं।';
    }

    /* ---------------- service response builder ----------------------- */

    function serviceResponse(serviceKey, originalText) {
        var service = SERVICES[serviceKey];
        var t = normalizeText(originalText);

        function anyIn(list) {
            return list.some(function (w) { return t.indexOf(w) !== -1; });
        }
        function bullets(items) {
            return (items || []).map(function (item) { return '• ' + item; }).join('\n');
        }

        var body;
        if (anyIn(['what is', 'kya hai', 'kya hota', 'meaning', 'matlab', 'क्या है'])) {
            body = service.what_is_it;
        } else if (anyIn(['why', 'kyu', 'kyon', 'zaroorat', 'need', 'क्यों'])) {
            body = service.why_needed;
        } else if (anyIn(['how', 'kaise', 'kaam kaise', 'work', 'कैसे'])) {
            body = service.how_it_works;
        } else if (anyIn(['component', 'parts', 'part ', 'equipment'])) {
            body = 'Important components:\n' + bullets(service.important_components);
        } else if (anyIn(['activity', 'activities', 'work do', 'kaam', 'provide', 'services'])) {
            body = 'Typical activities:\n' + bullets(service.typical_activities);
        } else {
            body = service.website_answer + '\n\n' + service.short_description;
        }

        return '**' + service.number + '. ' + service.name + '**\n\n' + body;
    }

    /* ---------------- suggestion (difflib close matches) -------------- */

    function suggestion(text) {
        var allPhrases = {};
        var order = [];

        Object.keys(SERVICES).forEach(function (key) {
            var service = SERVICES[key];
            var add = function (alias) {
                var k = normalizeText(alias);
                if (!(k in allPhrases)) { order.push(k); }
                allPhrases[k] = service.name;
            };
            add(service.name);
            (service.aliases || []).forEach(add);
        });

        var scored = [];
        order.forEach(function (k) {
            var s = similarity(text, k);
            if (s >= 0.6) { scored.push({ key: k, score: s }); }
        });
        scored.sort(function (x, y) {
            if (y.score !== x.score) { return y.score - x.score; }
            return x.key < y.key ? -1 : (x.key > y.key ? 1 : 0);
        });

        var names = [];
        scored.slice(0, 3).forEach(function (it) {
            var n = allPhrases[it.key];
            if (names.indexOf(n) === -1) { names.push(n); }
        });

        if (!names.length) { return null; }
        return 'क्या आप इनमें से किसी के बारे में पूछ रहे हैं?\n' +
            names.map(function (n) { return '• ' + n; }).join('\n');
    }

    /* ---------------- intent / safety --------------------------------- */

    function detectIntent(text) {
        if (['quote', 'quotation', 'price', 'cost', 'rate',
            'estimate', 'quotation chahiye', 'price batao'].some(function (w) {
                return containsWord(text, w);
            })) {
            return 'quotation';
        }
        if (['website', 'web site', 'site ke', 'site mein', 'website mein'].some(function (w) {
                return containsWord(text, w);
            })) {
            return 'website';
        }
        if (['ss industries', 'company', 'company ke', 'company kya'].some(function (w) {
                return containsWord(text, w);
            })) {
            return 'company';
        }
        return 'service';
    }

    var EMERGENCY_WORDS = ['emergency', 'emergancy', 'fire', 'smoke', 'burning',
        'short circuit', 'wire cut', 'wire broken', 'live wire', 'electric shock',
        'shock', 'sparking', 'spark', 'aag', 'आग', 'धुआं', 'तार कट', 'तार खुल', 'करंट'];

    function emergencySafetyResponse(text) {
        var hit = EMERGENCY_WORDS.some(function (w) { return containsWord(text, w); });
        if (!hit) { return null; }
        return '⚠️ **Safety First**\n\n' +
            'अगर यह emergency है, कृपया सबसे पहले अपनी और आसपास के लोगों की सुरक्षा को प्राथमिकता दें। सुरक्षित हो तो power supply को qualified person से isolate/off करवाएँ और खतरे वाली जगह से दूर रहें।\n\n' +
            '• कटे या खुले electrical wire को हाथ न लगाएँ।\n' +
            '• Burner या electrical equipment को बिना उचित guidance के touch या operate न करें।\n' +
            '• Active fire या गंभीर खतरे में local emergency service और qualified professional की मदद लें।\n\n' +
            'SS Industries की initial fire-system guidance free है; लेकिन यह emergency service या qualified professional का replacement नहीं है।';
    }

    /* ---------------- main entry (port of ask_ai) --------------------- */

    var GREETINGS = ['hi', 'hii', 'hiii', 'hello', 'hey', 'namaste',
        'namaskar', 'hlo', 'helo', 'नमस्ते'];

    function ask(userText) {
        var raw = String(userText == null ? '' : userText);

        if (!raw.trim()) {
            return { type: 'text', answer: 'कृपया अपना सवाल लिखें।' };
        }

        var text = normalizeText(raw);

        if (GREETINGS.indexOf(pyStrip(text, '!. ')) !== -1) {
            return { type: 'text', answer: greetingResponse() };
        }

        var safety = emergencySafetyResponse(text);
        if (safety) {
            return { type: 'safety', answer: safety };
        }

        var intent = detectIntent(text);

        if (intent === 'website') {
            return { type: 'text', answer: websiteInformation() };
        }
        if (intent === 'company') {
            return { type: 'text', answer: companyAnswer() };
        }
        if (intent === 'quotation') {
            return { type: 'action', action: 'GET_QUOTE', answer: quotationResponse() };
        }

        var match = bestServiceMatch(raw);

        if (match.key) {
            var service = SERVICES[match.key];
            var result = {
                type: 'service',
                service: service.name,
                confidence: Math.round(match.score * 100) / 100,
                answer: serviceResponse(match.key, raw)
            };
            if (service.image) { result.image = service.image; }
            return result;
        }

        var suggestionText = suggestion(text);
        if (suggestionText) {
            return { type: 'suggestion', answer: suggestionText };
        }

        return {
            type: 'unknown',
            answer: 'मैं SS Industries की website और उपलब्ध company information से संबंधित जानकारी दे सकता हूँ।\n\n' +
                'आप Electrical Systems, Firefighting Systems, Turnkey Projects, Paint Shops & Ducting, CED Plants, PLC Panels & Programming, Burners, Heat Storm, Free Fire-System Guidance या quotation के बारे में पूछ सकते हैं।'
        };
    }

    /* Public API used by script.js — same shape as the Python ask_ai(). */
    window.SSAssistEngine = {
        ask: ask,
        normalize: normalizeText,
        source: 'client-side'
    };
}());
