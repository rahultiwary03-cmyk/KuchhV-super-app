class VoiceCatalogItem {
  const VoiceCatalogItem({
    required this.id,
    required this.name,
    required this.category,
    this.stock,
    this.alreadyInCart = 0,
    this.price,
  });

  final int id;
  final String name;
  final String category;
  final int? stock;
  final int alreadyInCart;
  final double? price;
}

class VoiceOrderLine {
  const VoiceOrderLine({required this.item, required this.quantity});

  final VoiceCatalogItem item;
  final int quantity;
}

class VoiceOrderIntent {
  const VoiceOrderIntent({
    this.lines = const [],
    this.checkout = false,
    this.clearCart = false,
  });

  final List<VoiceOrderLine> lines;
  final bool checkout;
  final bool clearCart;

  bool get hasAction => lines.isNotEmpty || checkout || clearCart;
}

class VoiceIntentParser {
  static const _aliasesByName = <String, List<String>>{
    'atta': [
      'atta',
      'aata',
      'गेहूं का आटा',
      'गेहूँ का आटा',
      'आटा',
      'গমের আটা',
      'আটা',
      'கோதுமை மாவு',
      'गव्हाचे पीठ',
      'ઘઉંનો લોટ',
      'గోధుమ పిండి',
      'ಗೋಧಿ ಹಿಟ್ಟು',
      'ഗോതമ്പ് പൊടി',
      'ਕਣਕ ਦਾ ਆਟਾ',
    ],
    'paneer': [
      'paneer butter masala',
      'paneer',
      'पनीर बटर मसाला',
      'पनीर',
      'পনির',
      'பன்னீர்',
      'પનીર',
      'పనీర్',
      'ಪನೀರ್',
      'പനീർ',
      'ਪਨੀਰ',
    ],
    'butter': [
      'butter',
      'makkhan',
      'मक्खन',
      'মাখন',
      'வெண்ணெய்',
      'लोणी',
      'માખણ',
      'వెన్న',
      'ಬೆಣ್ಣೆ',
      'വെണ്ണ',
      'ਮੱਖਣ',
    ],
    'biryani': [
      'veg biryani',
      'biryani',
      'बिरयानी',
      'বিরিয়ানি',
      'பிரியாணி',
      'बिर्याणी',
      'બિરયાની',
      'బిర్యానీ',
      'ಬಿರಿಯಾನಿ',
      'ബിരിയാണി',
      'ਬਿਰਿਆਨੀ',
    ],
    'paracetamol': [
      'paracetamol',
      'पैरासिटामोल',
      'প্যারাসিটামল',
      'பாராசிட்டமால்',
      'पॅरासिटामॉल',
      'પેરાસિટામોલ',
      'పారాసిటమాల్',
      'ಪ್ಯಾರಾಸಿಟಮಾಲ್',
      'പാരസിറ്റമോൾ',
      'ਪੈਰਾਸੀਟਾਮੋਲ',
    ],
    'first aid': [
      'first aid kit',
      'first aid',
      'thermometer',
      'फर्स्ट एड किट',
      'प्राथमिक उपचार',
      'ফার্স্ট এইড',
      'முதலுதவி',
      'પ્રાથમિક સારવાર',
      'ప్రథమ చికిత్స',
      'ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ',
      'പ്രഥമശുശ്രൂഷ',
      'ਮੁੱਢਲੀ ਸਹਾਇਤਾ',
    ],
  };

  static const _numberWords = <String, int>{
    'one': 1,
    'a': 1,
    'an': 1,
    'ek': 1,
    'एक': 1,
    'दो': 2,
    'do': 2,
    'দুই': 2,
    'দুটি': 2,
    'rendu': 2,
    'இரண்டு': 2,
    'तीन': 3,
    'teen': 3,
    'তিন': 3,
    'மூன்று': 3,
    'चार': 4,
    'chaar': 4,
    'চার': 4,
    'நான்கு': 4,
    'पांच': 5,
    'पाँच': 5,
    'paanch': 5,
    'পাঁচ': 5,
    'ஐந்து': 5,
    'छह': 6,
    'छः': 6,
    'छয়': 6,
    'ஆறு': 6,
    'सात': 7,
    'সাত': 7,
    'ஏழு': 7,
    'आठ': 8,
    'আট': 8,
    'எட்டு': 8,
    'नौ': 9,
    'নয়': 9,
    'ஒன்பது': 9,
    'दस': 10,
    'দশ': 10,
    'பத்து': 10,
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
    'nine': 9,
    'ten': 10,
    'এক': 1,
    'একটি': 1,
    'একটা': 1,
    'তিনটি': 3,
    'চারটি': 4,
    'ஒரு': 1,
    'ஒன்று': 1,
    'மூணு': 3,
    'நாலு': 4,
    'ஐஞ்சு': 5,
    'दोन': 2,
    'पाच': 5,
    'એક': 1,
    'બે': 2,
    'ત્રણ': 3,
    'ચાર': 4,
    'પાંચ': 5,
    'ఒకటి': 1,
    'నాలుగు': 4,
    'రెండు': 2,
    'ಮೂರು': 3,
    'ನಾಲ್ಕು': 4,
    'ಒಂದು': 1,
    'ಎರಡು': 2,
    'ಐದು': 5,
    'രണ്ട്': 2,
    'മൂന്ന്': 3,
    'നാല്': 4,
    'ഒന്ന്': 1,
    'അഞ്ച്': 5,
    'ਇੱਕ': 1,
    'ਦੋ': 2,
    'ਤਿੰਨ': 3,
    'ਚਾਰ': 4,
    'ਪੰਜ': 5,
  };

  static const _checkoutPhrases = [
    'checkout',
    'check out',
    'place order',
    'order now',
    'চেকআউট',
    'অর্ডার করুন',
    'এখন অর্ডার',
    'ऑर्डर करें',
    'अभी ऑर्डर',
    'चेकआउट',
    'ஆர்டர் செய்',
    'இப்போ ஆர்டர்',
    'செக்அவுட்',
    'आता ऑर्डर',
    'ઓર્ડર કરો',
    'ఆర్డర్ చేయి',
    'ಆರ್ಡರ್ ಮಾಡಿ',
    'ഓർഡർ ചെയ്യൂ',
    'ਆਰਡਰ ਕਰੋ',
  ];

  static const _clearCartPhrases = [
    'clear cart',
    'empty cart',
    'remove everything',
    'कार्ट खाली',
    'সব মুছে',
    'கார்ட்டை காலி',
  ];

  VoiceOrderIntent parse(
    String transcript,
    List<VoiceCatalogItem> catalog,
  ) {
    final text = _normalize(transcript);
    if (text.isEmpty) return const VoiceOrderIntent();

    final eligibleItems = catalog
        .where((item) => const {'Grocery', 'Food', 'Medicines'}
            .contains(item.category))
        .toList();
    final matches = <_AliasMatch>[];
    for (final item in eligibleItems) {
      for (final alias in _aliasesFor(item)) {
        final normalizedAlias = _normalize(alias);
        if (normalizedAlias.isEmpty) continue;
        final expression = RegExp(
          '(^|\\s)${RegExp.escape(normalizedAlias)}(?=\\s|\$)',
        );
        for (final match in expression.allMatches(text)) {
          final start = match.start + (match.group(1)?.length ?? 0);
          matches.add(
            _AliasMatch(
              item: item,
              alias: normalizedAlias,
              start: start,
              end: match.end,
            ),
          );
        }
      }
    }

    matches.sort((left, right) {
      final position = left.start.compareTo(right.start);
      if (position != 0) return position;
      return right.alias.length.compareTo(left.alias.length);
    });

    final selected = <_AliasMatch>[];
    for (final match in matches) {
      if (selected.any(
        (prior) => match.start < prior.end && match.end > prior.start,
      )) {
        continue;
      }
      selected.add(match);
    }

    final quantities = <int, int>{};
    final itemById = <int, VoiceCatalogItem>{};
    for (final match in selected) {
      final quantity = _quantityNear(text, match.start, match.end);
      quantities.update(
        match.item.id,
        (current) => current + quantity,
        ifAbsent: () => quantity,
      );
      itemById[match.item.id] = match.item;
    }

    final lines = quantities.entries
        .map(
          (entry) => VoiceOrderLine(
            item: itemById[entry.key]!,
            quantity: entry.value,
          ),
        )
        .toList();
    return VoiceOrderIntent(
      lines: lines,
      checkout: _checkoutPhrases.any(text.contains),
      clearCart: _clearCartPhrases.any(text.contains),
    );
  }

  List<String> _aliasesFor(VoiceCatalogItem item) {
    final name = _normalize(item.name);
    for (final entry in _aliasesByName.entries) {
      if (name.contains(entry.key)) return entry.value;
    }
    return name
        .split(' ')
        .where((word) => word.length > 3)
        .toSet()
        .toList();
  }

  int _quantityNear(String text, int start, int end) {
    final before = text.substring(0, start).trim().split(' ');
    final after = text.substring(end).trim().split(' ');
    const conjunctions = {
      'and',
      'aur',
      'और',
      'আর',
      'এবং',
      'மற்றும்',
      'ane',
      'અને',
      'మరియు',
      'ಮತ್ತು',
      'आणि',
      'ਤੇ',
    };
    for (final token in before.reversed.take(4)) {
      if (conjunctions.contains(token)) break;
      final digits = int.tryParse(token);
      if (digits != null && digits > 0) return digits.clamp(1, 99).toInt();
      final word = _numberWords[token];
      if (word != null) return word;
    }
    if (after.isNotEmpty && conjunctions.contains(after.first)) return 1;
    for (final token in after.take(2)) {
      final digits = int.tryParse(token);
      if (digits != null && digits > 0) return digits.clamp(1, 99).toInt();
      final word = _numberWords[token];
      if (word != null) return word;
      if (conjunctions.contains(token)) break;
    }
    return 1;
  }

  String _normalize(String value) {
    var normalized = value.toLowerCase().replaceAll(RegExp(r'[,.!?।]+'), ' ');
    const digits = {
      '०': '0',
      '१': '1',
      '२': '2',
      '३': '3',
      '४': '4',
      '५': '5',
      '६': '6',
      '७': '7',
      '८': '8',
      '९': '9',
      '০': '0',
      '১': '1',
      '২': '2',
      '৩': '3',
      '৪': '4',
      '৫': '5',
      '৬': '6',
      '৭': '7',
      '৮': '8',
      '৯': '9',
      '௦': '0',
      '௧': '1',
      '௨': '2',
      '௩': '3',
      '௪': '4',
      '௫': '5',
      '௬': '6',
      '௭': '7',
      '௮': '8',
      '௯': '9',
    };
    digits.forEach((native, ascii) {
      normalized = normalized.replaceAll(native, ascii);
    });
    return normalized.replaceAll(RegExp(r'\s+'), ' ').trim();
  }
}

class _AliasMatch {
  const _AliasMatch({
    required this.item,
    required this.alias,
    required this.start,
    required this.end,
  });

  final VoiceCatalogItem item;
  final String alias;
  final int start;
  final int end;
}
