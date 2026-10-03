class Product {
  const Product({
    required this.id,
    required this.name,
    required this.price,
    this.description = '',
  });

  final String id;
  final String name;
  final double price;
  final String description;

  factory Product.fromJson(Map<String, dynamic> json) {
    final rawPrice = json['price'];
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      price: rawPrice is num ? rawPrice.toDouble() : double.parse('$rawPrice'),
      description: json['description'] as String? ?? '',
    );
  }
}
