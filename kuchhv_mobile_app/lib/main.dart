import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => DemoAppState(),
      child: const KuchhVApp(),
    ),
  );
}

const _orange = Color(0xFFFF5722);
const _ink = Color(0xFF1E293B);
const _green = Color(0xFF059669);

class KuchhVApp extends StatelessWidget {
  const KuchhVApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KuchhV',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _orange,
          primary: _orange,
          secondary: const Color(0xFFFF9800),
          surface: const Color(0xFFF6F7FB),
        ),
        scaffoldBackgroundColor: const Color(0xFFF6F7FB),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: _ink,
          centerTitle: false,
        ),
      ),
      home: const MainSuperShell(),
    );
  }
}

enum DemoRole { customer, vendor, partner }

extension DemoRoleDetails on DemoRole {
  String get label => switch (this) {
        DemoRole.customer => 'Customer',
        DemoRole.vendor => 'Vendor',
        DemoRole.partner => 'Rider',
      };

  String get demoName => switch (this) {
        DemoRole.customer => 'Rahul Kumar',
        DemoRole.vendor => 'Ranchi Super Mart',
        DemoRole.partner => 'Amit Rider',
      };

  IconData get icon => switch (this) {
        DemoRole.customer => Icons.person_outline,
        DemoRole.vendor => Icons.storefront_outlined,
        DemoRole.partner => Icons.delivery_dining,
      };
}

class DemoProduct {
  DemoProduct({
    required this.id,
    required this.name,
    required this.shop,
    required this.category,
    required this.price,
    required this.mrp,
    required this.deliveryTime,
    required this.rating,
    required this.emoji,
    required this.color,
    this.stock = 20,
  });

  final int id;
  final String name;
  final String shop;
  final String category;
  final double price;
  final double mrp;
  final String deliveryTime;
  final double rating;
  final String emoji;
  final Color color;
  int stock;
}

class DemoOrder {
  DemoOrder({
    required this.id,
    required this.customer,
    required this.items,
    required this.total,
    required this.address,
    this.status = 'Pending partner',
    this.partner,
  });

  final String id;
  final String customer;
  final String items;
  final double total;
  final String address;
  String status;
  String? partner;
}

class DemoBid {
  DemoBid({required this.partnerName, required this.amount});

  final String partnerName;
  final double amount;
}

class DemoRequest {
  DemoRequest({
    required this.id,
    required this.customer,
    required this.description,
    required this.budget,
  });

  final String id;
  final String customer;
  final String description;
  final double budget;
  final List<DemoBid> bids = [];
  DemoBid? acceptedBid;
}

class DemoAppState extends ChangeNotifier {
  DemoAppState() {
    products.addAll([
      DemoProduct(
        id: 1,
        name: 'Aashirvaad Shuddh Atta (5 Kg)',
        shop: 'Ranchi Super Mart',
        category: 'Grocery',
        price: 245,
        mrp: 285,
        deliveryTime: '12 mins',
        rating: 4.8,
        emoji: '🌾',
        color: const Color(0xFFFFF3E0),
        stock: 20,
      ),
      DemoProduct(
        id: 2,
        name: 'Amul Pasteurised Butter (500g)',
        shop: 'Fresh Dairy Hub',
        category: 'Grocery',
        price: 265,
        mrp: 280,
        deliveryTime: '10 mins',
        rating: 4.9,
        emoji: '🧈',
        color: const Color(0xFFFFF8E1),
        stock: 15,
      ),
      DemoProduct(
        id: 3,
        name: 'Paneer Butter Masala + 3 Butter Naan',
        shop: 'Kaveri Restaurant',
        category: 'Food',
        price: 219,
        mrp: 299,
        deliveryTime: '25 mins',
        rating: 4.7,
        emoji: '🍛',
        color: const Color(0xFFFFEBEE),
        stock: 50,
      ),
      DemoProduct(
        id: 4,
        name: 'Special Hyderabadi Veg Biryani',
        shop: 'Biryani Mahal',
        category: 'Food',
        price: 179,
        mrp: 240,
        deliveryTime: '20 mins',
        rating: 4.6,
        emoji: '🍲',
        color: const Color(0xFFFCE4EC),
        stock: 40,
      ),
      DemoProduct(
        id: 5,
        name: 'Paracetamol 650mg (15 Tablets)',
        shop: 'Apollo 24x7 Meds',
        category: 'Medicines',
        price: 32,
        mrp: 40,
        deliveryTime: '15 mins',
        rating: 4.9,
        emoji: '💊',
        color: const Color(0xFFE0F2F1),
        stock: 100,
      ),
      DemoProduct(
        id: 6,
        name: 'First Aid & Thermometer Kit',
        shop: 'City Care Pharmacy',
        category: 'Medicines',
        price: 199,
        mrp: 299,
        deliveryTime: '18 mins',
        rating: 4.7,
        emoji: '🩺',
        color: const Color(0xFFE8F5E9),
        stock: 25,
      ),
      DemoProduct(
        id: 7,
        name: 'Instant Bike Taxi (Up to 5 KM)',
        shop: 'KuchhV Moto',
        category: 'Rides',
        price: 49,
        mrp: 70,
        deliveryTime: '3 mins',
        rating: 4.8,
        emoji: '🏍️',
        color: const Color(0xFFE3F2FD),
        stock: 99,
      ),
      DemoProduct(
        id: 8,
        name: 'City Auto Rickshaw Drop',
        shop: 'KuchhV Auto',
        category: 'Rides',
        price: 85,
        mrp: 110,
        deliveryTime: '5 mins',
        rating: 4.7,
        emoji: '🛺',
        color: const Color(0xFFF3E5F5),
        stock: 99,
      ),
      DemoProduct(
        id: 9,
        name: 'Electrician Home Visit & Repair',
        shop: 'KuchhV Home Pro',
        category: 'Services',
        price: 149,
        mrp: 249,
        deliveryTime: '35 mins',
        rating: 4.8,
        emoji: '⚡',
        color: const Color(0xFFFFFDE7),
        stock: 99,
      ),
      DemoProduct(
        id: 10,
        name: 'AC Foam Jet Servicing',
        shop: 'CoolCare Experts',
        category: 'Services',
        price: 449,
        mrp: 699,
        deliveryTime: '45 mins',
        rating: 4.9,
        emoji: '❄️',
        color: const Color(0xFFE1F5FE),
        stock: 99,
      ),
    ]);

    final sampleOrder = DemoOrder(
      id: 'KV-8821',
      customer: 'Rahul Kumar',
      items: 'Paneer Butter Masala + 3 Butter Naan',
      total: 219,
      address: 'Main Road, Ranchi',
      status: 'Out for delivery',
      partner: 'Amit Rider',
    );
    orders.add(sampleOrder);
    final sampleRequest = DemoRequest(
      id: 'REQ-501',
      customer: 'Rahul Kumar',
      description: 'Fresh rasgulla and birthday candles from Firayalal Chowk',
      budget: 280,
    );
    sampleRequest.bids.add(DemoBid(partnerName: 'Suresh Rider', amount: 290));
    requests.add(sampleRequest);
  }

  final String city = 'Ranchi, Jharkhand';
  final double demoWalletBalance = 450;
  final List<DemoProduct> products = [];
  final List<DemoOrder> orders = [];
  final List<DemoRequest> requests = [];
  final Map<int, int> cart = {};

  DemoRole activeRole = DemoRole.customer;
  bool partnerOnline = true;
  bool vendorOnline = true;
  int _nextProductId = 11;
  int _nextOrderId = 8822;
  int _nextRequestId = 502;

  int get cartItems => cart.values.fold(0, (sum, quantity) => sum + quantity);

  double get cartTotal => cart.entries.fold<double>(0, (total, entry) {
        final product = products.firstWhere((item) => item.id == entry.key);
        return total + product.price * entry.value;
      });

  void setRole(DemoRole role) {
    activeRole = role;
    notifyListeners();
  }

  void updateCart(DemoProduct product, int delta) {
    final current = cart[product.id] ?? 0;
    final next = current + delta;
    if (next <= 0) {
      cart.remove(product.id);
    } else if (next <= product.stock) {
      cart[product.id] = next;
    }
    notifyListeners();
  }

  void placeOrder(String address) {
    if (cart.isEmpty || address.trim().isEmpty) return;

    final summary = <String>[];
    for (final entry in cart.entries) {
      final product = products.firstWhere((item) => item.id == entry.key);
      product.stock -= entry.value;
      summary.add('${product.name} × ${entry.value}');
    }
    orders.insert(
      0,
      DemoOrder(
        id: 'KV-${_nextOrderId++}',
        customer: DemoRole.customer.demoName,
        items: summary.join(', '),
        total: cartTotal,
        address: address.trim(),
      ),
    );
    cart.clear();
    notifyListeners();
  }

  void createCustomRequest(String description, double budget) {
    requests.insert(
      0,
      DemoRequest(
        id: 'REQ-${_nextRequestId++}',
        customer: DemoRole.customer.demoName,
        description: description.trim(),
        budget: budget,
      ),
    );
    notifyListeners();
  }

  bool submitBid(DemoRequest request, double amount) {
    if (request.acceptedBid != null ||
        request.bids.any((bid) => bid.partnerName == DemoRole.partner.demoName)) {
      return false;
    }
    request.bids.add(
      DemoBid(partnerName: DemoRole.partner.demoName, amount: amount),
    );
    notifyListeners();
    return true;
  }

  void acceptBid(DemoRequest request, DemoBid bid) {
    if (request.acceptedBid != null) return;
    request.acceptedBid = bid;
    notifyListeners();
  }

  void acceptOrder(DemoOrder order) {
    if (order.partner != null) return;
    order.partner = DemoRole.partner.demoName;
    order.status = 'Out for delivery';
    notifyListeners();
  }

  void addProduct({
    required String name,
    required String category,
    required double price,
    required int stock,
  }) {
    products.insert(
      0,
      DemoProduct(
        id: _nextProductId++,
        name: name.trim(),
        shop: DemoRole.vendor.demoName,
        category: category,
        price: price,
        mrp: price,
        deliveryTime: '15 mins',
        rating: 5,
        emoji: '🛍️',
        color: const Color(0xFFFFF3E0),
        stock: stock,
      ),
    );
    notifyListeners();
  }

  void setPartnerOnline(bool online) {
    partnerOnline = online;
    notifyListeners();
  }

  void setVendorOnline(bool online) {
    vendorOnline = online;
    notifyListeners();
  }
}

class MainSuperShell extends StatefulWidget {
  const MainSuperShell({super.key});

  @override
  State<MainSuperShell> createState() => _MainSuperShellState();
}

class _MainSuperShellState extends State<MainSuperShell> {
  int _selectedTab = 0;

  static const _titles = [
    'KuchhV',
    'Orders & bids',
    'Vendor hub',
    'Rider console',
  ];

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    final showCart = _selectedTab == 0 && state.cartItems > 0;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_titles[_selectedTab],
                style: const TextStyle(fontWeight: FontWeight.w900)),
            if (_selectedTab == 0)
              Text(
                state.city,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.black54,
                    ),
              ),
          ],
        ),
        actions: [
          PopupMenuButton<DemoRole>(
            tooltip: 'Switch demo role',
            initialValue: state.activeRole,
            onSelected: state.setRole,
            itemBuilder: (context) => DemoRole.values
                .map(
                  (role) => PopupMenuItem(
                    value: role,
                    child: Row(
                      children: [
                        Icon(role.icon, size: 20),
                        const SizedBox(width: 10),
                        Text('Preview as ${role.label}'),
                      ],
                    ),
                  ),
                )
                .toList(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: CircleAvatar(
                backgroundColor: _orange.withOpacity(0.12),
                foregroundColor: _orange,
                child: Icon(state.activeRole.icon),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          const _DemoNotice(),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: const [
                CustomerHomeTab(),
                OrdersAndBidsTab(),
                VendorHubTab(),
                PartnerConsoleTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showCart)
            _CartCheckoutBar(
              onCheckout: () => _openCheckout(context, state),
            ),
          NavigationBar(
            selectedIndex: _selectedTab,
            onDestinationSelected: (index) =>
                setState(() => _selectedTab = index),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Customer',
              ),
              NavigationDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long),
                label: 'Orders',
              ),
              NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront),
                label: 'Vendor',
              ),
              NavigationDestination(
                icon: Icon(Icons.delivery_dining_outlined),
                selectedIcon: Icon(Icons.delivery_dining),
                label: 'Rider',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DemoNotice extends StatelessWidget {
  const _DemoNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFFFF3E0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      child: const Text(
        'DEMO PREVIEW · Sample catalog, wallet and orders; no real payment or delivery.',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Color(0xFF8A3B12),
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class CustomerHomeTab extends StatefulWidget {
  const CustomerHomeTab({super.key});

  @override
  State<CustomerHomeTab> createState() => _CustomerHomeTabState();
}

class _CustomerHomeTabState extends State<CustomerHomeTab> {
  String _category = 'All';
  String _search = '';

  static const _categories = [
    ('All', '🔥'),
    ('Grocery', '🛒'),
    ('Food', '🍔'),
    ('Medicines', '💊'),
    ('Rides', '🚕'),
    ('Services', '🛠️'),
  ];

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    final products = state.products.where((product) {
      final matchesCategory =
          _category == 'All' || product.category == _category;
      final matchesSearch =
          product.name.toLowerCase().contains(_search.toLowerCase()) ||
              product.shop.toLowerCase().contains(_search.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Container(
            margin: const EdgeInsets.fromLTRB(14, 8, 14, 10),
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFE64A19), _orange, Color(0xFFFF9800)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.all(Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.location_on, color: Colors.white),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        state.city,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Demo wallet ₹${state.demoWalletBalance.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 17),
                const Text(
                  'Your neighbourhood,\none quick tap away.',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    height: 1.1,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  onChanged: (value) => setState(() => _search = value.trim()),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    hintText: 'Search groceries, food, rides…',
                    prefixIcon: const Icon(Icons.search, color: _orange),
                    contentPadding: const EdgeInsets.symmetric(vertical: 4),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(15),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 2, 14, 8),
            child: _CustomRequestBanner(
              onTap: () => _openCustomRequest(context, state),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 92,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              children: [
                for (final category in _categories)
                  _CategoryTile(
                    title: category.$1,
                    emoji: category.$2,
                    selected: _category == category.$1,
                    onTap: () => setState(() => _category = category.$1),
                  ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _category == 'All' ? 'Popular near you' : '$_category Express',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: _ink,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                const Text(
                  '⚡ 10–25 mins',
                  style: TextStyle(
                    color: _orange,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (products.isEmpty)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: Center(child: Text('No products found. Try another search.')),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 22),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _ProductCard(product: products[index]),
                childCount: products.length,
              ),
            ),
          ),
      ],
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.title,
    required this.emoji,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String emoji;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 70,
        margin: const EdgeInsets.symmetric(horizontal: 5),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(
                  colors: [_orange, Color(0xFFFF9800)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                )
              : null,
          color: selected ? null : Colors.white,
          borderRadius: BorderRadius.circular(17),
          border: Border.all(
            color: selected ? _orange : const Color(0xFFE8E9EE),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 25)),
            const SizedBox(height: 4),
            Text(
              title == 'Medicines' ? 'Meds' : title,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : _ink,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CustomRequestBanner extends StatelessWidget {
  const _CustomRequestBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _ink,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Row(
            children: [
              const Icon(Icons.bolt, color: Color(0xFFFFB74D), size: 30),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'KUCHHV CUSTOM ORDER',
                      style: TextStyle(
                        color: Color(0xFFFFB74D),
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Need something special?',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      'Name your item and offer a price.',
                      style: TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});

  final DemoProduct product;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    final quantity = state.cart[product.id] ?? 0;
    final discount = product.mrp > 0
        ? ((product.mrp - product.price) / product.mrp * 100).round()
        : 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 11),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(19),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.035),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 74,
            height: 82,
            decoration: BoxDecoration(
              color: product.color,
              borderRadius: BorderRadius.circular(16),
            ),
            alignment: Alignment.center,
            child: Text(product.emoji, style: const TextStyle(fontSize: 35)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star, color: Color(0xFFFFA000), size: 14),
                    const SizedBox(width: 2),
                    Text(
                      product.rating.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        '⏱ ${product.deliveryTime}',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: _green,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  product.shop,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.black54, fontSize: 10),
                ),
                const SizedBox(height: 5),
                Row(
                  children: [
                    Text(
                      '₹${product.price.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: _ink,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      '₹${product.mrp.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 10,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                    if (discount > 0) ...[
                      const SizedBox(width: 5),
                      Text(
                        '$discount% off',
                        style: const TextStyle(
                          color: _green,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 5),
          _QuantityControl(
            quantity: quantity,
            canAdd: quantity < product.stock,
            onAdd: () => state.updateCart(product, 1),
            onRemove: () => state.updateCart(product, -1),
          ),
        ],
      ),
    );
  }
}

class _QuantityControl extends StatelessWidget {
  const _QuantityControl({
    required this.quantity,
    required this.canAdd,
    required this.onAdd,
    required this.onRemove,
  });

  final int quantity;
  final bool canAdd;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    if (quantity == 0) {
      return OutlinedButton(
        onPressed: canAdd ? onAdd : null,
        style: OutlinedButton.styleFrom(
          foregroundColor: _orange,
          side: const BorderSide(color: _orange),
          padding: const EdgeInsets.symmetric(horizontal: 9),
          minimumSize: const Size(48, 36),
        ),
        child: const Text('ADD', style: TextStyle(fontWeight: FontWeight.w900)),
      );
    }
    return Container(
      decoration: BoxDecoration(
        color: _orange,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _CounterButton(icon: Icons.remove, onTap: onRemove),
          Text(
            '$quantity',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
          _CounterButton(icon: Icons.add, onTap: canAdd ? onAdd : null),
        ],
      ),
    );
  }
}

class _CounterButton extends StatelessWidget {
  const _CounterButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 34),
      padding: EdgeInsets.zero,
      onPressed: onTap,
      icon: Icon(icon, color: Colors.white, size: 17),
    );
  }
}

class _CartCheckoutBar extends StatelessWidget {
  const _CartCheckoutBar({required this.onCheckout});

  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
      child: Material(
        color: _green,
        borderRadius: BorderRadius.circular(17),
        child: InkWell(
          onTap: onCheckout,
          borderRadius: BorderRadius.circular(17),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            child: Row(
              children: [
                Text(
                  '${state.cartItems} ITEMS',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '₹${state.cartTotal.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Spacer(),
                const Text(
                  'View cart',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(width: 5),
                const Icon(Icons.arrow_forward, color: Colors.white, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> _openCheckout(BuildContext context, DemoAppState state) async {
  final address = TextEditingController(
    text: 'Main Road, Near Firayalal, Ranchi',
  );
  var paymentMethod = 'Cash on delivery (demo)';

  final placed = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => StatefulBuilder(
      builder: (sheetContext, setSheetState) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Superfast checkout',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 10),
                Text(
                  '${state.cartItems} items · ₹${state.cartTotal.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: _green,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: address,
                  decoration: const InputDecoration(
                    labelText: 'Delivery address',
                    prefixIcon: Icon(Icons.location_on_outlined),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: paymentMethod,
                  decoration: const InputDecoration(
                    labelText: 'Demo payment method',
                    prefixIcon: Icon(Icons.account_balance_wallet_outlined),
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'Cash on delivery (demo)',
                      child: Text('Cash on delivery (demo)'),
                    ),
                    DropdownMenuItem(
                      value: 'UPI (demo only)',
                      child: Text('UPI (demo only)'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setSheetState(() => paymentMethod = value);
                    }
                  },
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: address.text.trim().isEmpty
                        ? null
                        : () => Navigator.pop(sheetContext, true),
                    icon: const Icon(Icons.check),
                    label: Text(
                      'Place demo order · ₹${state.cartTotal.toStringAsFixed(0)}',
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: _green,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
  if (placed == true && address.text.trim().isNotEmpty) {
    state.placeOrder(address.text);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Demo order placed. Open Rider to accept it.'),
        ),
      );
    }
  }
  address.dispose();
}

Future<void> _openCustomRequest(
  BuildContext context,
  DemoAppState state,
) async {
  final description = TextEditingController();
  final budget = TextEditingController();
  final created = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'KuchhV Custom Order',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 5),
              const Text('Describe the item and set your demo offer.'),
              const SizedBox(height: 14),
              TextField(
                controller: description,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'What should the rider pick up?',
                  hintText: 'For example, a specific item from a local shop',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: budget,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Your offer (₹)',
                  prefixIcon: Icon(Icons.currency_rupee),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => Navigator.pop(sheetContext, true),
                  icon: const Icon(Icons.radar),
                  label: const Text('Create demo request'),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
  final amount = double.tryParse(budget.text.trim());
  if (created == true &&
      description.text.trim().isNotEmpty &&
      amount != null &&
      amount > 0) {
    state.createCustomRequest(description.text, amount);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Demo request created. Riders can now place bids.'),
        ),
      );
    }
  } else if (created == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Enter an item description and valid offer.')),
    );
  }
  description.dispose();
  budget.dispose();
}

class OrdersAndBidsTab extends StatelessWidget {
  const OrdersAndBidsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionHeading(
          title: 'Custom requests & partner bids',
          subtitle: 'Compare rider offers in this demo.',
        ),
        if (state.requests.isEmpty)
          const _EmptyState(
            icon: Icons.bolt,
            title: 'No custom requests yet',
            subtitle: 'Create a request from the Customer tab.',
          )
        else
          for (final request in state.requests)
            _RequestCard(request: request),
        const SizedBox(height: 16),
        _SectionHeading(
          title: 'Standard catalog orders',
          subtitle: 'Order status updates in this app preview.',
        ),
        if (state.orders.isEmpty)
          const _EmptyState(
            icon: Icons.receipt_long,
            title: 'No orders yet',
            subtitle: 'Add something to your cart and check out.',
          )
        else
          for (final order in state.orders)
            _OrderCard(order: order, showAccept: false),
      ],
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: _ink,
                  fontWeight: FontWeight.w900,
                ),
          ),
          Text(subtitle, style: const TextStyle(color: Colors.black54)),
        ],
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.request});

  final DemoRequest request;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    request.id,
                    style: const TextStyle(
                      color: _orange,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _StatusChip(
                  label: request.acceptedBid == null ? 'Bidding' : 'Accepted',
                  color: request.acceptedBid == null ? Colors.orange : _green,
                ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              request.description,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            Text('Your offer: ₹${request.budget.toStringAsFixed(0)}'),
            if (request.acceptedBid != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Accepted ₹${request.acceptedBid!.amount.toStringAsFixed(0)}'
                  ' from ${request.acceptedBid!.partnerName}',
                  style: const TextStyle(
                    color: _green,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              )
            else if (request.bids.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Waiting for partner bids',
                  style: TextStyle(color: Colors.black54),
                ),
              )
            else
              for (final bid in request.bids)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.delivery_dining, color: _green),
                  title: Text(
                    '${bid.partnerName} · ₹${bid.amount.toStringAsFixed(0)}',
                  ),
                  trailing: TextButton(
                    onPressed: () => state.acceptBid(request, bid),
                    child: const Text('Accept bid'),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.showAccept});

  final DemoOrder order;
  final bool showAccept;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    final isPending = order.partner == null;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${order.id} · ₹${order.total.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _StatusChip(
                  label: order.status,
                  color: isPending ? Colors.orange : _green,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(order.items),
            const SizedBox(height: 4),
            Text(
              '📍 ${order.address}',
              style: const TextStyle(color: Colors.black54, fontSize: 12),
            ),
            Text(
              '🛵 Rider: ${order.partner ?? 'Searching for a rider'}',
              style: const TextStyle(
                color: _orange,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (showAccept && isPending && state.partnerOnline) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: () => state.acceptOrder(order),
                  icon: const Icon(Icons.check),
                  label: const Text('Accept order'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 140),
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class VendorHubTab extends StatelessWidget {
  const VendorHubTab({super.key});

  Future<void> _showAddProduct(BuildContext context) async {
    final name = TextEditingController();
    final price = TextEditingController();
    final stock = TextEditingController(text: '20');
    var category = 'Grocery';
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('Add item to demo catalog'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Item name'),
                ),
                TextField(
                  controller: price,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration:
                      const InputDecoration(labelText: 'Selling price (₹)'),
                ),
                TextField(
                  controller: stock,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Stock'),
                ),
                DropdownButton<String>(
                  value: category,
                  isExpanded: true,
                  items: const [
                    'Grocery',
                    'Food',
                    'Medicines',
                    'Rides',
                    'Services',
                  ]
                      .map(
                        (value) => DropdownMenuItem(
                          value: value,
                          child: Text(value),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() => category = value);
                    }
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Publish item'),
            ),
          ],
        ),
      ),
    );

    if (!context.mounted) {
      name.dispose();
      price.dispose();
      stock.dispose();
      return;
    }
    final parsedPrice = double.tryParse(price.text.trim());
    final parsedStock = int.tryParse(stock.text.trim());
    if (saved == true &&
        name.text.trim().isNotEmpty &&
        parsedPrice != null &&
        parsedPrice > 0 &&
        parsedStock != null &&
        parsedStock >= 0) {
      context.read<DemoAppState>().addProduct(
            name: name.text,
            category: category,
            price: parsedPrice,
            stock: parsedStock,
          );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Product added to the demo catalog.')),
      );
    } else if (saved == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter a name, valid price, and non-negative stock.'),
        ),
      );
    }
    name.dispose();
    price.dispose();
    stock.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    final activeOrders =
        state.orders.where((order) => order.partner == null).length;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [_orange, Color(0xFFFF9800)],
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Expanded(
                child: _Metric(
                  label: 'DEMO SALES',
                  value: '₹${_demoSales(state).toStringAsFixed(0)}',
                ),
              ),
              Expanded(
                child: _Metric(
                  label: 'OPEN ORDERS',
                  value: '$activeOrders',
                ),
              ),
              Expanded(
                child: _Metric(
                  label: 'STORE',
                  value: state.vendorOnline ? 'ONLINE' : 'OFFLINE',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text(
            'Store availability',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: const Text('Demo toggle; not synced to the backend.'),
          value: state.vendorOnline,
          activeTrackColor: _green,
          onChanged: state.setVendorOnline,
        ),
        Row(
          children: [
            Expanded(
              child: Text(
                'Live store catalog',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ),
            FilledButton.icon(
              onPressed: () => _showAddProduct(context),
              icon: const Icon(Icons.add),
              label: const Text('Add'),
            ),
          ],
        ),
        const SizedBox(height: 6),
        for (final product in state.products)
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: product.color,
                child: Text(product.emoji),
              ),
              title: Text(
                product.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text(
                '${product.category} · ₹${product.price.toStringAsFixed(0)}',
              ),
              trailing: Text('Stock ${product.stock}'),
            ),
          ),
      ],
    );
  }

  double _demoSales(DemoAppState state) {
    return state.orders.fold<double>(
      0,
      (total, order) => total + order.total,
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 9,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class PartnerConsoleTab extends StatelessWidget {
  const PartnerConsoleTab({super.key});

  Future<void> _sendBid(BuildContext context, DemoRequest request) async {
    final amount = TextEditingController(
      text: request.budget.toStringAsFixed(0),
    );
    final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Send partner bid'),
        content: TextField(
          controller: amount,
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Your price (₹)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Send bid'),
          ),
        ],
      ),
    );
    if (!context.mounted) {
      amount.dispose();
      return;
    }
    final bid = double.tryParse(amount.text.trim());
    if (submitted == true && bid != null && bid > 0) {
      final success = context.read<DemoAppState>().submitBid(request, bid);
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('A bid was already sent or this request was accepted.'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Demo bid sent to the customer.')),
        );
      }
    } else if (submitted == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid bid amount.')),
      );
    }
    amount.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoAppState>();
    final openOrders = state.orders.where((order) => order.partner == null);
    final openRequests =
        state.requests.where((request) => request.acceptedBid == null);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            color: _ink,
            borderRadius: BorderRadius.circular(19),
          ),
          child: Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Demo rider earnings',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '₹940',
                      style: TextStyle(
                        color: Color(0xFFFFD54F),
                        fontSize: 25,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              Chip(
                backgroundColor:
                    state.partnerOnline ? _green : Colors.blueGrey,
                label: Text(
                  state.partnerOnline ? 'ON DUTY' : 'OFFLINE',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text(
            'Available for demo requests',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: const Text('This switch only changes the local preview.'),
          value: state.partnerOnline,
          activeTrackColor: _green,
          onChanged: state.setPartnerOnline,
        ),
        const SizedBox(height: 8),
        Text(
          'Incoming customer orders',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        if (openOrders.isEmpty)
          const _EmptyState(
            icon: Icons.delivery_dining,
            title: 'No open orders',
            subtitle: 'New demo checkouts appear here.',
          )
        else
          for (final order in openOrders)
            _OrderCard(order: order, showAccept: true),
        const SizedBox(height: 14),
        Text(
          'Custom requests · send a bid',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        if (openRequests.isEmpty)
          const _EmptyState(
            icon: Icons.bolt,
            title: 'No open requests',
            subtitle: 'Customer requests appear here.',
          )
        else
          for (final request in openRequests)
            Card(
              margin: const EdgeInsets.only(top: 8),
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFFFF3E0),
                  child: Icon(Icons.flash_on, color: _orange),
                ),
                title: Text(
                  '${request.id} · ${request.description}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  'Customer offer ₹${request.budget.toStringAsFixed(0)}'
                  ' · ${request.bids.length} bid(s)',
                ),
                trailing: state.partnerOnline
                    ? FilledButton(
                        onPressed: () => _sendBid(context, request),
                        child: const Text('Bid'),
                      )
                    : const Text('Offline'),
              ),
            ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          Icon(icon, color: _orange, size: 30),
          const SizedBox(height: 6),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
