# ============================================================
# SS INDUSTRIES - WEBSITE AI ASSISTANT
# VERSION 1.0
# Python-only standalone engine
# ============================================================

import re
import difflib

ASSISTANT_NAME = "SS Assist"
COMPANY_NAME = "SS Industries"
ONLINE_SEARCH_ENABLED = False

COMPANY_PROFILE = {
    "name": "SS Industries",
    "website": "ssindustriesindia.co.in",
    "description": (
        "SS Industries provides industrial products and services with a strong "
        "focus on safety. Services include electrical systems, firefighting, "
        "turnkey projects, paint shops and ducting, CED plants and machinery, "
        "PLC panels and programming, burner sale/service, and Heat Storm "
        "gas/diesel burner and heat-system solutions. Products/services are "
        "provided up to Patna according to current service coverage."
    ),
    "website_sections": [
        "Electrical Systems",
        "Firefighting Systems",
        "Turnkey Project Execution",
        "Paint Shops & Ducting Work",
        "CED Coating Plants & Machinery",
        "Manual, Semi-Automatic & Automatic CED Plants",
        "PLC Panels & PLC Programming",
        "Burners - Sale & Service",
        "Heat Storm Gas/Diesel Burner & Heat Systems",
        "Products & Services up to Patna",
        "Free Initial Fire-System Guidance",
        "Get Your Quote",
        "Contact information"
    ]
}

SERVICES = {
    "electrical_systems": {
        "number": "01",
        "name": "Electrical Systems",
        "aliases": [
            "electrical", "electrical system", "electrical systems",
            "electric system", "electric", "wiring", "power system",
            "electrical work", "industrial electrical"
        ],
        "short_description": (
            "Industrial electrical systems cover the electrical "
            "infrastructure required for power distribution, control, "
            "equipment operation and related industrial activities."
        ),
        "what_is_it": (
            "An industrial electrical system is the collection of electrical "
            "equipment and infrastructure used to receive, distribute, "
            "control and safely use electrical power in an industrial facility."
        ),
        "why_needed": (
            "Industrial machines and plant systems need a reliable electrical "
            "supply and suitable control and protection arrangements. "
            "A properly planned electrical system helps equipment operate "
            "safely and reliably."
        ),
        "how_it_works": (
            "Electrical power is received and distributed through suitable "
            "electrical infrastructure. Distribution equipment, cables, "
            "control equipment and protective devices work together to "
            "deliver power to the required loads while providing control "
            "and protection."
        ),
        "important_components": [
            "Power distribution equipment", "Electrical panels",
            "Cables and wiring", "Control systems", "Protective devices",
            "Switchgear", "Industrial electrical equipment",
            "Earthing and safety arrangements"
        ],
        "typical_activities": [
            "Industrial electrical installation", "Cable laying",
            "Cable termination", "Panel-related work",
            "Electrical maintenance", "Fault checking",
            "Troubleshooting", "Inspection of electrical systems"
        ],
        "website_answer": (
            "SS Industries' website presents Electrical Systems as one "
            "of its industrial service areas. The service relates to "
            "industrial electrical installation, power distribution, "
            "control and maintenance-related work."
        ),
        "image": "images/electrical-systems.jpg"
    },

    "firefighting_systems": {
        "number": "02",
        "name": "Firefighting Systems",
        "aliases": [
            "fire fighting", "firefighting", "fire fighting system",
            "firefighting system", "fire safety", "fire protection",
            "fire system", "fire alarm", "sprinkler", "hydrant"
        ],
        "short_description": (
            "Firefighting systems are designed to detect, control and "
            "help protect people, equipment and buildings from fire hazards."
        ),
        "what_is_it": (
            "A firefighting system is a combination of equipment and "
            "arrangements intended to detect fire, raise an alarm, "
            "control a fire and provide suitable means for firefighting."
        ),
        "why_needed": (
            "Industrial facilities can contain machinery, electrical "
            "equipment, combustible materials and other fire hazards. "
            "Fire protection arrangements help reduce the potential "
            "impact of a fire and support emergency response."
        ),
        "how_it_works": (
            "Depending on the system, fire protection can involve detection, "
            "alarm, water-based suppression, firefighting equipment and "
            "manual emergency response. Different systems perform different "
            "functions and are selected according to the facility and risk."
        ),
        "important_components": [
            "Fire detection equipment", "Fire alarm systems",
            "Fire hydrant systems", "Fire sprinkler systems",
            "Fire pumps", "Fire extinguishing equipment",
            "Piping and valves", "Emergency firefighting equipment"
        ],
        "typical_activities": [
            "Fire protection system planning", "Equipment supply",
            "Firefighting system installation", "Hydrant system work",
            "Sprinkler system work", "Fire alarm and detection systems",
            "Inspection", "Testing", "Maintenance"
        ],
        "website_answer": (
            "SS Industries presents Firefighting Systems as an industrial "
            "service area involving fire protection equipment and systems "
            "such as firefighting, detection, hydrant and sprinkler-related "
            "solutions."
        ),
        "image": "images/firefighting-systems.jpg"
    },

    "turnkey_project_execution": {
        "number": "03",
        "name": "Turnkey Project Execution",
        "aliases": [
            "turnkey", "turnkey project", "turnkey projects",
            "project execution", "project management",
            "complete project", "industrial project"
        ],
        "short_description": (
            "Turnkey project execution involves coordinating major stages "
            "of an industrial project from planning and preparation through "
            "execution, testing and completion."
        ),
        "what_is_it": (
            "A turnkey project is a project approach where the required "
            "project activities are coordinated toward delivering a "
            "completed and operational result according to the agreed scope."
        ),
        "why_needed": (
            "Industrial projects involve many interconnected activities. "
            "Coordinating engineering, fabrication, installation, site work "
            "and testing can help maintain an organized project workflow."
        ),
        "how_it_works": (
            "The project is divided into stages such as requirement "
            "understanding, planning, engineering, procurement or fabrication, "
            "installation, testing and completion. The exact scope depends "
            "on the project."
        ),
        "important_components": [
            "Requirement analysis", "Project planning",
            "Engineering coordination", "Fabrication", "Installation",
            "Site coordination", "Testing", "Commissioning support",
            "Completion and handover"
        ],
        "typical_activities": [
            "Project planning", "Technical coordination", "Fabrication",
            "Installation", "Site supervision", "Quality checking",
            "Testing", "Commissioning support", "Project completion"
        ],
        "website_answer": (
            "SS Industries presents Turnkey Project Execution as a service "
            "area focused on coordinating industrial project activities "
            "according to project scope and requirements."
        ),
        "image": "images/turnkey-project.jpg"
    },

    "paint_shops_ducting": {
        "number": "04",
        "name": "Paint Shops & Ducting Work",
        "aliases": [
            "paint shop", "paint shops", "painting",
            "industrial paint shop", "ducting", "duct work",
            "air duct", "ventilation", "exhaust", "paint booth"
        ],
        "short_description": (
            "Industrial paint shop and ducting work can involve fabrication "
            "and installation of paint-shop structures, ventilation, ducting "
            "and air-management arrangements."
        ),
        "what_is_it": (
            "An industrial paint shop is an area designed for controlled "
            "painting or coating operations. Ducting and ventilation systems "
            "can be used to manage airflow and exhaust according to the "
            "facility design."
        ),
        "why_needed": (
            "Painting operations require suitable environmental and airflow "
            "arrangements. Proper ventilation and exhaust planning can help "
            "manage air movement and support industrial painting operations."
        ),
        "how_it_works": (
            "Air movement systems guide or remove air through designed "
            "ducting paths. The exact arrangement depends on the paint-shop "
            "layout, process requirements, airflow requirements and site."
        ),
        "important_components": [
            "Paint shop structure", "Ducting",
            "Ventilation arrangements", "Exhaust arrangements",
            "Air movement systems", "Supporting structures",
            "Industrial fabrication"
        ],
        "typical_activities": [
            "Paint shop fabrication", "Paint shop installation",
            "Ducting fabrication", "Ducting installation",
            "Ventilation work", "Exhaust arrangements",
            "Supporting structural work", "Modification and maintenance"
        ],
        "website_answer": (
            "SS Industries presents Paint Shops & Ducting Work as an "
            "industrial service area covering paint-shop-related fabrication "
            "and ducting or air-management work."
        ),
        "image": "images/paint-shop-ducting.jpg"
    },

    "ced_coating_plants": {
        "number": "05",
        "name": "CED Coating Plants & Machinery",
        "aliases": [
            "ced", "ced coating", "ced plant", "ced plants",
            "ced coating plant", "electro deposition", "electrodeposition",
            "cathodic electro deposition", "coating plant",
            "coating machinery"
        ],
        "short_description": (
            "CED, or Cathodic Electro Deposition, is an industrial coating "
            "process used to apply a controlled protective coating to "
            "conductive components."
        ),
        "what_is_it": (
            "CED stands for Cathodic Electro Deposition. It is an "
            "electrocoating process in which electrical potential is used "
            "to help deposit coating material onto a conductive component."
        ),
        "why_needed": (
            "CED coating can provide controlled and relatively uniform "
            "coating coverage and is commonly associated with industrial "
            "corrosion-protection and finishing processes."
        ),
        "how_it_works": (
            "A conductive component is immersed in a coating bath and an "
            "electrical potential is applied. Charged coating particles "
            "move toward the component and deposit on its surface. The "
            "actual industrial process includes multiple preparation, "
            "rinsing, coating and curing stages depending on the plant design."
        ),
        "process_overview": [
            "Component preparation", "Pre-treatment", "Rinsing",
            "CED coating bath", "Post-rinse stages",
            "Curing or baking", "Inspection", "Final finishing"
        ],
        "important_components": [
            "Process tanks", "CED coating system",
            "Electrical rectifier/power system", "Piping", "Pumps",
            "Filtration arrangements", "Conveyor/material handling",
            "Control system", "Curing oven or heating system",
            "Supporting equipment"
        ],
        "typical_activities": [
            "CED plant design", "Plant fabrication", "Plant installation",
            "CED machinery", "Material handling systems",
            "Electrical and control support", "Testing",
            "Commissioning support", "Maintenance and servicing"
        ],
        "website_answer": (
            "SS Industries presents CED Coating Plants & Machinery as "
            "a specialized industrial service area involving CED plant "
            "and machinery-related solutions."
        ),
        "image": "images/ced-coating-plant.jpg"
    }
}


SERVICES["plc_panels"] = {
    "number": "06",
    "name": "PLC Panels & Programming",
    "aliases": ["plc", "plc panel", "plc panels", "plc programming", "plc program", "automation", "industrial automation", "control panel"],
    "short_description": "SS Industries provides PLC panel sale/supply and PLC programming for industrial control and automation requirements.",
    "what_is_it": "A PLC (Programmable Logic Controller) is an industrial control system used to monitor inputs and control machines or processes according to programmed logic.",
    "why_needed": "PLC-based control can help automate industrial processes and coordinate machine operations in a controlled way.",
    "how_it_works": "A PLC receives signals from sensors or other inputs, executes programmed logic, and sends control outputs to connected equipment.",
    "important_components": ["PLC", "Control panel", "Input/output modules", "Programming", "Sensors and signals", "Control outputs"],
    "typical_activities": ["PLC panel sale/supply", "PLC programming", "Industrial automation/control support"],
    "website_answer": "SS Industries provides PLC panel sale/supply and PLC programming according to industrial requirements.",
    "image": "images/plc-panel.jpg"
}

SERVICES["burners_heat_storm"] = {
    "number": "07",
    "name": "Burners & Heat Storm",
    "aliases": ["burner", "burners", "gas burner", "diesel burner", "burner sale", "burner service", "burner maintenance", "heat storm", "heatstorm", "heat system", "gas diesel burner"],
    "short_description": "SS Industries provides burner sale and service, including gas and diesel burner solutions, and its own Heat Storm gas/diesel burner and heat-system solution.",
    "what_is_it": "A burner is equipment used to safely generate heat by controlled combustion of a suitable fuel. The exact burner type depends on the application and fuel requirement.",
    "why_needed": "Industrial heating processes require suitable and properly maintained heating equipment.",
    "how_it_works": "A burner controls fuel and air for combustion to generate heat. Exact operation depends on burner design, fuel and application.",
    "important_components": ["Burner", "Fuel supply", "Air supply", "Ignition/control system", "Safety controls"],
    "typical_activities": ["All-types burner sale/supply", "Burner service", "Burner maintenance/support", "Gas burner solutions", "Diesel burner solutions", "Heat Storm sale and service"],
    "website_answer": "SS Industries provides sale and service for all types of burners according to requirement. The company also provides its own Heat Storm gas/diesel burner and heat-system solution with sale and service support.",
    "image": "images/heat-storm-burner.jpg"
}

SERVICES["free_fire_guidance"] = {
    "number": "08",
    "name": "Free Fire-System Guidance",
    "aliases": ["free guidance", "free consultation", "fire problem", "fire system problem", "fire system issue", "fire safety problem", "fire advisor", "fire advice"],
    "short_description": "For fire-system issues, visitors can take initial guidance from an SS Industries advisor free of charge.",
    "what_is_it": "SS Industries keeps initial guidance for fire-system problems free of charge.",
    "why_needed": "Early guidance can help a customer understand the next safe step when a fire-system issue is reported.",
    "how_it_works": "The visitor can contact an SS Industries advisor for initial guidance. The assistant must not replace a qualified professional or emergency service in an active emergency.",
    "important_components": ["Initial guidance", "Safety-first response", "Advisor contact", "Qualified professional support when required"],
    "typical_activities": ["Initial fire-system guidance", "Safety-first guidance", "Advisor support"],
    "website_answer": "If a visitor has a fire-system problem, SS Industries offers initial guidance from an advisor free of charge.",
    "image": "images/firefighting-systems.jpg"
}

QUICK_REPLIES = {
    "1": "What is SS Industries?",
    "2": "What products and services do you provide?",
    "3": "What is Electrical Systems?",
    "4": "What are Firefighting Systems?",
    "5": "What is Turnkey Project Execution?",
    "6": "What are Paint Shops & Ducting?",
    "7": "What is CED Coating?",
    "8": "Do you make Manual, Semi-Automatic and Automatic CED Plants?",
    "9": "Do you sell PLC Panels and provide PLC Programming?",
    "10": "Do you provide burner sale and service?",
    "11": "Tell me about Heat Storm",
    "12": "I have a fire-system problem. Can I get free guidance?",
    "13": "How can I get a quotation?",
    "14": "Tell me about the website",
    "15": "Show available services"
}


def normalize_text(text):
    text = text.lower().strip()

    replacements = {
        "fier": "fire",
        "fir": "fire",
        "fightingg": "fighting",
        "electricals": "electrical",
        "eletrical": "electrical",
        "electrcal": "electrical",
        "turnky": "turnkey",
        "turnkei": "turnkey",
        "ductng": "ducting",
        "ductingg": "ducting",
        "coatingg": "coating",
        "machinary": "machinery",
        "mashinery": "machinery",
        "quation": "quotation",
        "quotaton": "quotation",
        "webiste": "website",
        "wesite": "website",
        "plcprograming": "plc programming",
        "plcprogrmming": "plc programming",
        "bruner": "burner",
        "buner": "burner",
        "heatstorm": "heat storm",
        "heatsorm": "heat storm",
        "cedplant": "ced plant",
        "cedplnt": "ced plant",
    }

    for wrong, correct in replacements.items():
        text = re.sub(r"\b" + re.escape(wrong) + r"\b", correct, text)

    return re.sub(r"\s+", " ", text)


def similarity(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()


def best_service_match(user_text):
    text = normalize_text(user_text)
    best_key = None
    best_score = 0

    for key, service in SERVICES.items():
        for alias in [service["name"], *service["aliases"]]:
            alias_n = normalize_text(alias)

            # Alias fully present in the question -> strong match;
            # longer alias = more specific = higher score.
            if contains_word(text, alias_n):
                score = 0.90 + min(len(alias_n), 30) / 1000
            else:
                score = similarity(text, alias_n)

            if score > best_score:
                best_score = score
                best_key = key

    if best_score >= 0.55:
        return best_key, best_score

    return None, 0


def contains_word(text, phrase):
    """Whole-word match for ASCII phrases; plain substring for Hindi."""
    if phrase.isascii():
        return re.search(r"\b" + re.escape(phrase) + r"\b", text) is not None
    return phrase in text


def company_answer():
    return (
        f"{COMPANY_PROFILE['name']} industrial products और services प्रदान करती है, "
        "जिसमें safety पर विशेष ध्यान दिया जाता है।\n\n"
        f"{COMPANY_PROFILE['description']}\n\n"
        f"Website: {COMPANY_PROFILE['website']}"
    )


def quotation_response():
    return (
        "Quotation के लिए कृपया website के **Get Your Quote** section का उपयोग करें "
        f"({COMPANY_PROFILE['website']}) या website के Contact section से "
        "SS Industries की team से संपर्क करें।\n\n"
        "Quotation के लिए अपनी requirement (service/product, location और approximate scope) "
        "साथ में बताएँ, ताकि team सही जानकारी दे सके।"
    )


def get_service_image(service_key):
    return SERVICES[service_key].get("image")


def service_response(service_key, original_text):
    service = SERVICES[service_key]
    t = normalize_text(original_text)

    def bullets(items):
        return "\n".join(f"• {item}" for item in items)

    if any(w in t for w in ["what is", "kya hai", "kya hota", "meaning", "matlab", "क्या है"]):
        body = service["what_is_it"]
    elif any(w in t for w in ["why", "kyu", "kyon", "zaroorat", "need", "क्यों"]):
        body = service["why_needed"]
    elif any(w in t for w in ["how", "kaise", "kaam kaise", "work", "कैसे"]):
        body = service["how_it_works"]
    elif any(w in t for w in ["component", "parts", "part ", "equipment"]):
        body = "Important components:\n" + bullets(service["important_components"])
    elif any(w in t for w in ["activity", "activities", "work do", "kaam", "provide", "services"]):
        body = "Typical activities:\n" + bullets(service["typical_activities"])
    else:
        body = service["website_answer"] + "\n\n" + service["short_description"]

    return f"**{service['number']}. {service['name']}**\n\n{body}"


def suggestion(text):
    all_phrases = {}
    for key, service in SERVICES.items():
        all_phrases[normalize_text(service["name"])] = service["name"]
        for alias in service["aliases"]:
            all_phrases[normalize_text(alias)] = service["name"]

    matches = difflib.get_close_matches(text, list(all_phrases.keys()), n=3, cutoff=0.6)
    names = []
    for m in matches:
        if all_phrases[m] not in names:
            names.append(all_phrases[m])

    if not names:
        return None

    return "क्या आप इनमें से किसी के बारे में पूछ रहे हैं?\n" + "\n".join(f"• {n}" for n in names)


def greeting_response():
    return (
        f"नमस्ते! मैं {ASSISTANT_NAME} हूँ, {COMPANY_NAME} का assistant।\n\n"
        "आप Electrical Systems, Firefighting, Turnkey Projects, Paint Shops & Ducting, "
        "CED Plants, PLC Panels, Burners/Heat Storm या quotation के बारे में पूछ सकते हैं।"
    )


def website_information():
    return (
        f"{COMPANY_NAME} की website पर industrial products और services से जुड़े मुख्य sections मौजूद हैं:\n\n"
        "01. Electrical Systems\n"
        "02. Firefighting Systems\n"
        "03. Turnkey Project Execution\n"
        "04. Paint Shops & Ducting Work\n"
        "05. CED Coating Plants & Machinery\n"
        "06. PLC Panels & Programming\n"
        "07. Burners & Heat Storm\n\n"
        "CED में Manual, Semi-Automatic और Automatic plant solutions की जानकारी उपलब्ध है। Products/services की current coverage Patna तक है।\n\n"
        "Website में Get Your Quote और contact-related sections भी हैं।"
    )


def detect_intent(text):
    text = normalize_text(text)

    if any(contains_word(text, word) for word in [
        "quote", "quotation", "price", "cost", "rate",
        "estimate", "quotation chahiye", "price batao"
    ]):
        return "quotation"

    if any(contains_word(text, word) for word in [
        "website", "web site", "site ke", "site mein", "website mein"
    ]):
        return "website"

    if any(contains_word(text, word) for word in [
        "ss industries", "company", "company ke", "company kya"
    ]):
        return "company"

    return "service"


def emergency_safety_response(text):
    emergency_words = ["emergency", "emergancy", "fire", "smoke", "burning", "short circuit", "wire cut", "wire broken", "live wire", "electric shock", "shock", "sparking", "spark", "aag", "आग", "धुआं", "तार कट", "तार खुल", "करंट"]
    if any(contains_word(text, w) for w in emergency_words):
        return (
            "⚠️ **Safety First**\n\n"
            "अगर यह emergency है, कृपया सबसे पहले अपनी और आसपास के लोगों की सुरक्षा को प्राथमिकता दें। सुरक्षित हो तो power supply को qualified person से isolate/off करवाएँ और खतरे वाली जगह से दूर रहें।\n\n"
            "• कटे या खुले electrical wire को हाथ न लगाएँ।\n"
            "• Burner या electrical equipment को बिना उचित guidance के touch या operate न करें।\n"
            "• Active fire या गंभीर खतरे में local emergency service और qualified professional की मदद लें।\n\n"
            "SS Industries की initial fire-system guidance free है; लेकिन यह emergency service या qualified professional का replacement नहीं है।"
        )
    return None

def ask_ai(user_text):
    if not user_text.strip():
        return {
            "type": "text",
            "answer": "कृपया अपना सवाल लिखें।"
        }

    original_text = user_text
    text = normalize_text(user_text)

    if text.strip("!. ") in ["hi", "hii", "hiii", "hello", "hey", "namaste", "namaskar", "hlo", "helo", "नमस्ते"]:
        return {"type": "text", "answer": greeting_response()}

    safety_answer = emergency_safety_response(text)
    if safety_answer:
        return {"type": "safety", "answer": safety_answer}

    intent = detect_intent(text)

    if intent == "website":
        return {"type": "text", "answer": website_information()}

    if intent == "company":
        return {"type": "text", "answer": company_answer()}

    if intent == "quotation":
        return {
            "type": "action",
            "action": "GET_QUOTE",
            "answer": quotation_response()
        }

    service_key, score = best_service_match(text)

    if service_key:
        answer = service_response(service_key, original_text)
        image = get_service_image(service_key)

        result = {
            "type": "service",
            "service": SERVICES[service_key]["name"],
            "confidence": round(score, 2),
            "answer": answer
        }

        if image:
            result["image"] = image

        return result

    suggestion_text = suggestion(text)

    if suggestion_text:
        return {
            "type": "suggestion",
            "answer": suggestion_text
        }

    return {
        "type": "unknown",
        "answer": (
            "मैं SS Industries की website और उपलब्ध company information से संबंधित जानकारी दे सकता हूँ।\n\n"
            "आप Electrical Systems, Firefighting Systems, Turnkey Projects, Paint Shops & Ducting, CED Plants, PLC Panels & Programming, Burners, Heat Storm, Free Fire-System Guidance या quotation के बारे में पूछ सकते हैं।"
        )
    }


def show_quick_replies():
    print("\n" + "=" * 65)
    print("QUICK REPLIES")
    print("=" * 65)

    for key, value in QUICK_REPLIES.items():
        print(f"{key}. {value}")

    print("=" * 65)


def run_terminal():
    print("\n")
    print("=" * 65)
    print(f"   {ASSISTANT_NAME}")
    print(f"   {COMPANY_NAME}")
    print("=" * 65)

    print(
        "\nHindi + English + Hinglish supported."
        "\nInternet search: OFF"
        "\nWebsite knowledge: ON"
    )

    print("\nCommands:")
    print("  quick  = Quick replies")
    print("  image  = Example image paths")
    print("  exit   = Exit assistant")

    while True:
        print("\n")
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAI: Goodbye! 👋")
            break

        if user_input.lower() == "exit":
            print("\nAI: Goodbye! 👋")
            break

        if user_input.lower() == "quick":
            show_quick_replies()
            continue

        if user_input.lower() == "image":
            print("\nAvailable local image paths:")
            for service in SERVICES.values():
                print(f"{service['name']} -> {service['image']}")
            continue

        try:
            result = ask_ai(user_input)
        except Exception as e:
            print(f"\n[ERROR] {type(e).__name__}: {e}")
            continue

        print("\nAI:")
        print(result["answer"])

        if "image" in result:
            print(f"\n[IMAGE AVAILABLE: {result['image']}]")

        if result["type"] == "suggestion":
            print(
                "\nTip: ऊपर दिए suggestion को देखकर "
                "सही नाम से दोबारा पूछ सकते हैं।"
            )


if __name__ == "__main__":
    try:
        run_terminal()
    finally:
        input("\nBand karne ke liye Enter dabayein...")
