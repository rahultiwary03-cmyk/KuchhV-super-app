import 'package:flutter_test/flutter_test.dart';
import 'package:kuchhv_mobile_app/services/voice_intent_parser.dart';

void main() {
  const catalog = [
    VoiceCatalogItem(id: 1, name: 'Aashirvaad Shuddh Atta (5 Kg)', category: 'Grocery'),
    VoiceCatalogItem(id: 2, name: 'Amul Pasteurised Butter (500g)', category: 'Grocery'),
    VoiceCatalogItem(
      id: 3,
      name: 'Paneer Butter Masala + 3 Butter Naan',
      category: 'Food',
    ),
    VoiceCatalogItem(id: 4, name: 'Special Hyderabadi Veg Biryani', category: 'Food'),
    VoiceCatalogItem(
      id: 5,
      name: 'Paracetamol 650mg (15 Tablets)',
      category: 'Medicines',
    ),
    VoiceCatalogItem(
      id: 6,
      name: 'Electrician Home Visit & Repair',
      category: 'Services',
    ),
  ];
  final parser = VoiceIntentParser();

  test('parses multiple Hinglish items, quantities, and checkout request', () {
    final intent = parser.parse('do atta aur 1 butter checkout', catalog);

    expect(intent.lines.map((line) => (line.item.id, line.quantity)), [
      (1, 2),
      (2, 1),
    ]);
    expect(intent.checkout, isTrue);
  });

  test('parses Bengali and Tamil catalog aliases with native numerals', () {
    final bengali = parser.parse('২ আটা আর ১ মাখন', catalog);
    final tamil = parser.parse('இரண்டு பன்னீர்', catalog);

    expect(bengali.lines.map((line) => (line.item.id, line.quantity)), [
      (1, 2),
      (2, 1),
    ]);
    expect(tamil.lines.single.item.id, 3);
    expect(tamil.lines.single.quantity, 2);
  });

  test('does not carry a previous item quantity past a conjunction', () {
    final intent = parser.parse('2 atta and butter', catalog);

    expect(intent.lines.map((line) => (line.item.id, line.quantity)), [
      (1, 2),
      (2, 1),
    ]);
  });

  test('does not treat service offerings as shoppable catalog items', () {
    final intent = parser.parse('electrician', catalog);

    expect(intent.lines, isEmpty);
    expect(intent.hasAction, isFalse);
  });

  test('recognizes a cart-clear command', () {
    final intent = parser.parse('clear cart', catalog);

    expect(intent.clearCart, isTrue);
    expect(intent.hasAction, isTrue);
  });
}
