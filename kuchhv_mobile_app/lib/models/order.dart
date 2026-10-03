class Order {
  const Order({
    required this.id,
    required this.status,
    required this.totalAmount,
  });

  final String id;
  final String status;
  final double totalAmount;

  factory Order.fromJson(Map<String, dynamic> json) {
    final rawAmount = json['total_amount'];
    return Order(
      id: json['id'] as String,
      status: json['status'] as String,
      totalAmount:
          rawAmount is num ? rawAmount.toDouble() : double.parse('$rawAmount'),
    );
  }
}
