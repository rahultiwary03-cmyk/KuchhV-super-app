import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const KuchhVApp(),
    ),
  );
}

class KuchhVApp extends StatelessWidget {
  const KuchhVApp({super.key});

  @override
  Widget build(BuildContext context) {
    const brand = Color(0xFFFF5722);
    return MaterialApp(
      title: 'KuchhV',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: brand),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFFFFBF8),
      ),
      home: const AuthScreen(),
    );
  }
}

enum AppRole { customer, vendor, partner }

extension AppRoleLabel on AppRole {
  String get label {
    switch (this) {
      case AppRole.customer:
        return 'Customer';
      case AppRole.vendor:
        return 'Vendor';
      case AppRole.partner:
        return 'Partner';
    }
  }
}

class DemoUser {
  DemoUser({
    required this.name,
    required this.phone,
    required this.password,
    required this.role,
  });

  final String name;
  final String phone;
  final String password;
  final AppRole role;
}

class DemoProduct {
  DemoProduct({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.stock,
  });

  final int id;
  final String name;
  final String category;
  final double price;
  int stock;
}

class DemoOrder {
  DemoOrder({
    required this.id,
    required this.customer,
    required this.items,
    required this.total,
    required this.address,
  });

  final String id;
  final String customer;
  final String items;
  final double total;
  final String address;
  String status = 'Waiting for partner';
  String? partner;
}

class DemoBid {
  DemoBid({required this.partner, required this.amount});

  final String partner;
  final double amount;
}

class DemoRequest {
  DemoRequest({
    required this.id,
    required this.customer,
    required this.description,
    required this.offeredPrice,
  });

  final String id;
  final String customer;
  final String description;
  final double offeredPrice;
  final List<DemoBid> bids = [];
  String? acceptedPartner;
}

class AppState extends ChangeNotifier {
  final List<DemoUser> _users = [
    DemoUser(
      name: 'Demo Customer',
      phone: 'customer',
      password: 'demo',
      role: AppRole.customer,
    ),
    DemoUser(
      name: 'Demo Vendor',
      phone: 'vendor',
      password: 'demo',
      role: AppRole.vendor,
    ),
    DemoUser(
      name: 'Demo Partner',
      phone: 'partner',
      password: 'demo',
      role: AppRole.partner,
    ),
  ];

  final List<DemoProduct> products = [
    DemoProduct(
      id: 1,
      name: 'Aashirvaad Atta 5kg',
      category: 'Grocery',
      price: 260,
      stock: 20,
    ),
    DemoProduct(
      id: 2,
      name: 'Amul Butter 500g',
      category: 'Grocery',
      price: 275,
      stock: 15,
    ),
    DemoProduct(
      id: 3,
      name: 'Paneer Butter Masala Combo',
      category: 'Food',
      price: 220,
      stock: 50,
    ),
    DemoProduct(
      id: 4,
      name: 'Hyderabadi Veg Biryani',
      category: 'Food',
      price: 180,
      stock: 40,
    ),
    DemoProduct(
      id: 5,
      name: 'Paracetamol 650mg Strip',
      category: 'Medicines',
      price: 30,
      stock: 100,
    ),
    DemoProduct(
      id: 6,
      name: 'City Bike Taxi (5 KM)',
      category: 'Rides',
      price: 65,
      stock: 99,
    ),
    DemoProduct(
      id: 7,
      name: 'Electrician Home Visit',
      category: 'Services',
      price: 199,
      stock: 99,
    ),
  ];

  final List<DemoOrder> orders = [];
  final List<DemoRequest> requests = [];
  final Map<int, int> cart = {};
  DemoUser? currentUser;
  bool partnerOnline = true;
  int _nextProductId = 8;
  int _nextOrderId = 1001;
  int _nextRequestId = 101;

  bool login(String phone, String password) {
    for (final user in _users) {
      if (user.phone == phone && user.password == password) {
        currentUser = user;
        notifyListeners();
        return true;
      }
    }
    return false;
  }

  bool signUp(String name, String phone, String password, AppRole role) {
    if (_users.any((user) => user.phone == phone)) return false;
    final user = DemoUser(
      name: name,
      phone: phone,
      password: password,
      role: role,
    );
    _users.add(user);
    currentUser = user;
    notifyListeners();
    return true;
  }

  void loginAsDemo(AppRole role) {
    currentUser = _users.firstWhere((user) => user.role == role);
    notifyListeners();
  }

  void logout() {
    currentUser = null;
    notifyListeners();
  }

  void addToCart(DemoProduct product) {
    final quantity = cart[product.id] ?? 0;
    if (quantity >= product.stock) return;
    cart[product.id] = quantity + 1;
    notifyListeners();
  }

  void removeFromCart(DemoProduct product) {
    final quantity = cart[product.id] ?? 0;
    if (quantity <= 1) {
      cart.remove(product.id);
    } else {
      cart[product.id] = quantity - 1;
    }
    notifyListeners();
  }

  double get cartTotal {
    return cart.entries.fold<double>(0, (total, entry) {
      final product = products.firstWhere((item) => item.id == entry.key);
      return total + product.price * entry.value;
    });
  }

  void placeOrder(String address) {
    final user = currentUser;
    if (user == null || cart.isEmpty || address.trim().isEmpty) return;

    final descriptions = <String>[];
    for (final entry in cart.entries) {
      final product = products.firstWhere((item) => item.id == entry.key);
      product.stock -= entry.value;
      descriptions.add('${product.name} × ${entry.value}');
    }
    orders.insert(
      0,
      DemoOrder(
        id: 'ORD-${_nextOrderId++}',
        customer: user.name,
        items: descriptions.join(', '),
        total: cartTotal,
        address: address.trim(),
      ),
    );
    cart.clear();
    notifyListeners();
  }

  void addProduct(String name, String category, double price, int stock) {
    products.add(
      DemoProduct(
        id: _nextProductId++,
        name: name,
        category: category,
        price: price,
        stock: stock,
      ),
    );
    notifyListeners();
  }

  void createRequest(String description, double offeredPrice) {
    final user = currentUser;
    if (user == null) return;
    requests.insert(
      0,
      DemoRequest(
        id: 'REQ-${_nextRequestId++}',
        customer: user.name,
        description: description.trim(),
        offeredPrice: offeredPrice,
      ),
    );
    notifyListeners();
  }

  bool submitBid(DemoRequest request, double amount) {
    final user = currentUser;
    if (user == null ||
        request.acceptedPartner != null ||
        request.bids.any((bid) => bid.partner == user.name)) {
      return false;
    }
    request.bids.add(DemoBid(partner: user.name, amount: amount));
    notifyListeners();
    return true;
  }

  void acceptBid(DemoRequest request, DemoBid bid) {
    if (request.acceptedPartner != null) return;
    request.acceptedPartner = bid.partner;
    notifyListeners();
  }

  void acceptOrder(DemoOrder order) {
    final user = currentUser;
    if (user == null || order.partner != null) return;
    order.partner = user.name;
    order.status = 'Accepted by partner';
    notifyListeners();
  }

  void togglePartnerOnline(bool value) {
    partnerOnline = value;
    notifyListeners();
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLogin = true;
  AppRole _role = AppRole.customer;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    final state = context.read<AppState>();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;
    if (phone.isEmpty || password.isEmpty) {
      _showMessage('Enter your phone/username and password.');
      return;
    }

    final success = _isLogin
        ? state.login(phone, password)
        : state.signUp(
            _nameController.text.trim(),
            phone,
            password,
            _role,
          );
    if (!success) {
      _showMessage(
        _isLogin
            ? 'Login failed. Use a demo account or sign up.'
            : 'That phone/username is already registered.',
      );
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.currentUser;
    if (user != null) {
      return _dashboardFor(user.role);
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Icon(
                        Icons.bolt,
                        size: 52,
                        color: Color(0xFFFF5722),
                      ),
                      Text(
                        'KuchhV Super App',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Interactive local demo — data resets when the app closes.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      SegmentedButton<bool>(
                        segments: const [
                          ButtonSegment(value: true, label: Text('Login')),
                          ButtonSegment(value: false, label: Text('Sign up')),
                        ],
                        selected: {_isLogin},
                        onSelectionChanged: (selection) =>
                            setState(() => _isLogin = selection.first),
                      ),
                      const SizedBox(height: 16),
                      if (!_isLogin) ...[
                        TextField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Name',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                      ],
                      TextField(
                        controller: _phoneController,
                        decoration: InputDecoration(
                          labelText: 'Phone or username',
                          hintText: _isLogin ? 'customer' : null,
                          border: const OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          hintText: 'demo',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      if (!_isLogin) ...[
                        const SizedBox(height: 10),
                        DropdownButtonFormField<AppRole>(
                          value: _role,
                          decoration: const InputDecoration(
                            labelText: 'Account type',
                            border: OutlineInputBorder(),
                          ),
                          items: AppRole.values
                              .map(
                                (role) => DropdownMenuItem(
                                  value: role,
                                  child: Text(role.label),
                                ),
                              )
                              .toList(),
                          onChanged: (role) {
                            if (role != null) setState(() => _role = role);
                          },
                        ),
                      ],
                      const SizedBox(height: 14),
                      FilledButton(
                        onPressed: _submit,
                        child: Text(_isLogin ? 'Sign in' : 'Create account'),
                      ),
                      const Divider(height: 30),
                      const Text(
                        'Quick demo login',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        alignment: WrapAlignment.center,
                        spacing: 8,
                        children: AppRole.values
                            .map(
                              (role) => ActionChip(
                                avatar: Icon(_roleIcon(role), size: 18),
                                label: Text(role.label),
                                onPressed: () => state.loginAsDemo(role),
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

Widget _dashboardFor(AppRole role) {
  switch (role) {
    case AppRole.customer:
      return const CustomerDashboard();
    case AppRole.vendor:
      return const VendorDashboard();
    case AppRole.partner:
      return const PartnerDashboard();
  }
}

IconData _roleIcon(AppRole role) {
  switch (role) {
    case AppRole.customer:
      return Icons.person_outline;
    case AppRole.vendor:
      return Icons.storefront_outlined;
    case AppRole.partner:
      return Icons.delivery_dining;
  }
}

class _RoleScaffold extends StatelessWidget {
  const _RoleScaffold({
    required this.title,
    required this.child,
    this.floatingActionButton,
  });

  final String title;
  final Widget child;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          TextButton.icon(
            onPressed: () {
              state.logout();
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            icon: const Icon(Icons.swap_horiz),
            label: const Text('Switch role'),
          ),
        ],
      ),
      body: child,
      floatingActionButton: floatingActionButton,
    );
  }
}

class CustomerDashboard extends StatefulWidget {
  const CustomerDashboard({super.key});

  @override
  State<CustomerDashboard> createState() => _CustomerDashboardState();
}

class _CustomerDashboardState extends State<CustomerDashboard> {
  String _category = 'Grocery';
  static const _categories = [
    'Grocery',
    'Food',
    'Medicines',
    'Rides',
    'Services',
  ];

  Future<void> _checkout(AppState state) async {
    if (state.cart.isEmpty) return;
    final address = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Checkout'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Order total: ₹${state.cartTotal.toStringAsFixed(2)}'),
            const SizedBox(height: 12),
            TextField(
              controller: address,
              decoration: const InputDecoration(
                labelText: 'Delivery address',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(
              dialogContext,
              address.text.trim().isNotEmpty,
            ),
            child: const Text('Place demo order'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (confirmed == true && address.text.trim().isNotEmpty) {
      state.placeOrder(address.text);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demo order placed for the partner feed.')),
      );
    }
    address.dispose();
  }

  Future<void> _createRequest(AppState state) async {
    final description = TextEditingController();
    final price = TextEditingController();
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Custom request'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: description,
              decoration: const InputDecoration(
                labelText: 'What do you need?',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: price,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Offered price (₹)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Broadcast demo request'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    final amount = double.tryParse(price.text.trim());
    if (created == true &&
        description.text.trim().isNotEmpty &&
        amount != null &&
        amount > 0) {
      state.createRequest(description.text, amount);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Demo request added to the partner bidding feed.'),
        ),
      );
    } else if (created == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter an item and a valid price.')),
      );
    }
    description.dispose();
    price.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.currentUser!;
    final visibleProducts =
        state.products.where((item) => item.category == _category).toList();
    final myRequests =
        state.requests.where((item) => item.customer == user.name).toList();

    return _RoleScaffold(
      title: 'Hi, ${user.name}',
      floatingActionButton: state.cart.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _checkout(state),
              icon: const Icon(Icons.shopping_cart_checkout),
              label: Text(
                'Checkout · ₹${state.cartTotal.toStringAsFixed(0)}',
              ),
            ),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: Colors.deepOrange.shade50,
            child: ListTile(
              leading: const Icon(Icons.bolt, color: Colors.deepOrange),
              title: const Text('Need something not in the catalog?'),
              subtitle: const Text('Create a request and receive partner bids.'),
              trailing: IconButton(
                tooltip: 'Create request',
                onPressed: () => _createRequest(state),
                icon: const Icon(Icons.add_circle_outline),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _categories
                  .map(
                    (category) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(category),
                        selected: category == _category,
                        onSelected: (_) => setState(() => _category = category),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 8),
          for (final product in visibleProducts)
            Card(
              child: ListTile(
                title: Text(product.name),
                subtitle: Text(
                  '₹${product.price.toStringAsFixed(0)} · Stock ${product.stock}',
                ),
                trailing: IconButton.filled(
                  tooltip: 'Add to cart',
                  onPressed: product.stock <= (state.cart[product.id] ?? 0)
                      ? null
                      : () => state.addToCart(product),
                  icon: const Icon(Icons.add_shopping_cart),
                ),
              ),
            ),
          if (state.cart.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Your cart', style: Theme.of(context).textTheme.titleLarge),
            for (final entry in state.cart.entries)
              ListTile(
                title: Text(
                  state.products
                      .firstWhere((product) => product.id == entry.key)
                      .name,
                ),
                subtitle: Text('Quantity: ${entry.value}'),
                trailing: IconButton(
                  tooltip: 'Remove one',
                  onPressed: () => state.removeFromCart(
                    state.products.firstWhere(
                      (product) => product.id == entry.key,
                    ),
                  ),
                  icon: const Icon(Icons.remove_circle_outline),
                ),
              ),
          ],
          const SizedBox(height: 20),
          Text('My custom requests', style: Theme.of(context).textTheme.titleLarge),
          if (myRequests.isEmpty)
            const _EmptyCard(text: 'Your custom requests will appear here.')
          else
            for (final request in myRequests)
              _RequestCard(request: request, allowAccept: true),
        ],
      ),
    );
  }
}

class VendorDashboard extends StatelessWidget {
  const VendorDashboard({super.key});

  Future<void> _addProduct(BuildContext context) async {
    final name = TextEditingController();
    final price = TextEditingController();
    final stock = TextEditingController(text: '20');
    String category = 'Grocery';
    final added = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add product'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Product name'),
              ),
              TextField(
                controller: price,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Price (₹)'),
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
                      (value) =>
                          DropdownMenuItem(value: value, child: Text(value)),
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
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Add'),
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
    if (added == true) {
      final parsedPrice = double.tryParse(price.text.trim());
      final parsedStock = int.tryParse(stock.text.trim());
      if (name.text.trim().isNotEmpty &&
          parsedPrice != null &&
          parsedPrice > 0 &&
          parsedStock != null &&
          parsedStock >= 0) {
        context.read<AppState>().addProduct(
              name.text.trim(),
              category,
              parsedPrice,
              parsedStock,
            );
      } else if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a name, valid price, and stock.')),
        );
      }
    }
    name.dispose();
    price.dispose();
    stock.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.currentUser!;
    return _RoleScaffold(
      title: '${user.name} · Shop manager',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addProduct(context),
        icon: const Icon(Icons.add),
        label: const Text('Add product'),
      ),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Catalog & inventory',
              style: Theme.of(context).textTheme.titleLarge),
          for (final product in state.products)
            Card(
              child: ListTile(
                title: Text(product.name),
                subtitle: Text(
                  '${product.category} · ₹${product.price.toStringAsFixed(0)}',
                ),
                trailing: Text('Stock: ${product.stock}'),
              ),
            ),
          const SizedBox(height: 20),
          Text('Incoming orders',
              style: Theme.of(context).textTheme.titleLarge),
          if (state.orders.isEmpty)
            const _EmptyCard(text: 'Orders placed by customers appear here.')
          else
            for (final order in state.orders)
              _OrderCard(order: order, showAccept: false),
        ],
      ),
    );
  }
}

class PartnerDashboard extends StatelessWidget {
  const PartnerDashboard({super.key});

  Future<void> _submitBid(
    BuildContext context,
    DemoRequest request,
  ) async {
    final controller = TextEditingController(
      text: request.offeredPrice.toStringAsFixed(0),
    );
    final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Submit your bid'),
        content: TextField(
          controller: controller,
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
            child: const Text('Submit bid'),
          ),
        ],
      ),
    );
    if (!context.mounted) {
      controller.dispose();
      return;
    }
    final amount = double.tryParse(controller.text.trim());
    if (submitted == true && amount != null && amount > 0) {
      final accepted = context.read<AppState>().submitBid(request, amount);
      if (context.mounted && !accepted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('A bid was already submitted or this request closed.'),
          ),
        );
      }
    } else if (submitted == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid bid amount.')),
      );
    }
    controller.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.currentUser!;
    final openOrders = state.orders.where((order) => order.partner == null);
    final openRequests =
        state.requests.where((request) => request.acceptedPartner == null);

    return _RoleScaffold(
      title: '${user.name} · Partner feed',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(state.partnerOnline ? 'You are online' : 'You are offline'),
            subtitle: const Text('Toggle availability for this demo session.'),
            value: state.partnerOnline,
            onChanged: state.togglePartnerOnline,
          ),
          const Divider(),
          Text('Customer orders',
              style: Theme.of(context).textTheme.titleLarge),
          if (openOrders.isEmpty)
            const _EmptyCard(text: 'New customer orders appear here.')
          else
            for (final order in openOrders)
              _OrderCard(order: order, showAccept: state.partnerOnline),
          const SizedBox(height: 20),
          Text('Custom request bids',
              style: Theme.of(context).textTheme.titleLarge),
          if (openRequests.isEmpty)
            const _EmptyCard(text: 'New custom requests appear here.')
          else
            for (final request in openRequests)
              Card(
                child: ListTile(
                  title: Text('${request.id} · ${request.description}'),
                  subtitle: Text(
                    'Offered ₹${request.offeredPrice.toStringAsFixed(2)}'
                    ' · ${request.bids.length} bid(s)',
                  ),
                  trailing: state.partnerOnline
                      ? FilledButton(
                          onPressed: () => _submitBid(context, request),
                          child: const Text('Bid'),
                        )
                      : const Text('Offline'),
                ),
              ),
        ],
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
    final state = context.watch<AppState>();
    return Card(
      child: ListTile(
        title: Text('${order.id} · ₹${order.total.toStringAsFixed(2)}'),
        subtitle: Text(
          '${order.customer}: ${order.items}\n'
          '${order.address}\n${order.status}'
          '${order.partner == null ? '' : ' · ${order.partner}'}',
        ),
        isThreeLine: true,
        trailing: showAccept && order.partner == null
            ? FilledButton(
                onPressed: () => state.acceptOrder(order),
                child: const Text('Accept'),
              )
            : null,
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.allowAccept,
  });

  final DemoRequest request;
  final bool allowAccept;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${request.id} · ${request.description}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text('Offered: ₹${request.offeredPrice.toStringAsFixed(2)}'),
            if (request.acceptedPartner != null)
              Text('Accepted by ${request.acceptedPartner}')
            else if (request.bids.isEmpty)
              const Text('Waiting for partner bids')
            else
              for (final bid in request.bids)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('${bid.partner} · ₹${bid.amount.toStringAsFixed(2)}'),
                  trailing: allowAccept
                      ? TextButton(
                          onPressed: () => state.acceptBid(request, bid),
                          child: const Text('Accept bid'),
                        )
                      : null,
                ),
          ],
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(text),
      ),
    );
  }
}
