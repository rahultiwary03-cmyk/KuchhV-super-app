import 'package:flutter/foundation.dart';

import '../models/product.dart';

class CartProvider extends ChangeNotifier {
  final Map<String, _CartLine> _items = {};

  List<_CartLine> get items => List.unmodifiable(_items.values);
  int get itemCount =>
      _items.values.fold(0, (count, line) => count + line.quantity);
  double get total =>
      _items.values.fold(0, (sum, line) => sum + line.product.price * line.quantity);

  void add(Product product) {
    final line = _items[product.id];
    if (line == null) {
      _items[product.id] = _CartLine(product);
    } else {
      line.quantity++;
    }
    notifyListeners();
  }

  void removeOne(String productId) {
    final line = _items[productId];
    if (line == null) return;
    if (line.quantity <= 1) {
      _items.remove(productId);
    } else {
      line.quantity--;
    }
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}

class _CartLine {
  _CartLine(this.product);

  final Product product;
  int quantity = 1;
}
