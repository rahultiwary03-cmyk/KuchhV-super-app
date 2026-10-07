import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/voice_intent_parser.dart';
import '../customer/voice_ordering_sheet.dart';

class RoleFeaturePage extends StatelessWidget {
  const RoleFeaturePage({
    required this.role,
    required this.tabIndex,
    required this.localMode,
    super.key,
  });

  final UserRole role;
  final int tabIndex;
  final bool localMode;

  @override
  Widget build(BuildContext context) {
    return switch (role) {
      UserRole.customer => switch (tabIndex) {
          0 => _CustomerStorefront(localMode: localMode),
          1 => _CustomRequestPage(role: role, localMode: localMode),
          2 => _ServiceBookingPage(localMode: localMode),
          3 => _OrdersPage(localMode: localMode),
          _ => _WalletRewardsPage(
              localMode: localMode,
              role: UserRole.customer,
            ),
        },
      UserRole.vendor => switch (tabIndex) {
          0 => _VendorShopPage(localMode: localMode),
          1 => _VendorCatalogPage(localMode: localMode),
          2 => _VendorOrdersPage(localMode: localMode),
          _ => _SponsoredAdsPage(localMode: localMode),
        },
      UserRole.serviceProvider => switch (tabIndex) {
          0 => _ServiceProviderRequests(localMode: localMode, mine: false),
          _ => _ServiceProviderRequests(localMode: localMode, mine: true),
        },
      UserRole.deliveryPartner => switch (tabIndex) {
          0 => _PartnerProfilePage(localMode: localMode),
          1 => _PartnerOrderTasks(localMode: localMode),
          2 => _RideTasksPage(localMode: localMode),
          3 => _CustomRequestPage(role: role, localMode: localMode),
          _ => _WalletRewardsPage(
              localMode: localMode,
              role: UserRole.deliveryPartner,
            ),
        },
    };
  }

  String _label(String key) => key
      .replaceAll('_', ' ')
      .split(' ')
      .map((part) =>
          part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

class _LocalMarketplace {
  static final _LocalMarketplace instance = _LocalMarketplace._();

  _LocalMarketplace._() {
    customRequests.add({
      'id': 'DEMO-REQ-501',
      'item_description': 'Fresh rasgulla and birthday candles',
      'offered_price': 280,
      'status': 'BROADCASTING',
      'bids': <Map<String, dynamic>>[
        {'partner_id': 'DEMO-PARTNER-1', 'bid_amount': 290, 'status': 'SUBMITTED'},
      ],
    });
    serviceBookings.add({
      'id': 'DEMO-SERVICE-1',
      'service_category': 'Electrician',
      'description': 'Install a ceiling fan',
      'service_address': 'Demo address, Ranchi',
      'status': 'REQUESTED',
    });
    partnerTasks.add({
      'id': 'DEMO-ORDER-1',
      'status': 'READY_FOR_PICKUP',
      'total_amount': 540,
      'shop': {'name': 'Neighborhood Grocery'},
    });
    rides.add({
      'id': 'DEMO-RIDE-1',
      'vehicle_type': 'BIKE',
      'estimated_fare': 86,
      'distance_km': 8.2,
      'status': 'REQUESTED',
      'pickup_latitude': '23.36',
      'pickup_longitude': '85.33',
      'drop_latitude': '23.40',
      'drop_longitude': '85.31',
    });
  }

  final cart = <String, int>{};
  final orders = <Map<String, dynamic>>[];
  final customRequests = <Map<String, dynamic>>[];
  final serviceBookings = <Map<String, dynamic>>[];
  final vendorProducts = <Map<String, dynamic>>[];
  final rides = <Map<String, dynamic>>[];
  final partnerTasks = <Map<String, dynamic>>[];
  double walletBalance = 500;
  int coins = 25;
  bool vipActive = false;

  final shops = <Map<String, dynamic>>[
    {'id': 'local-shop-grocery', 'name': 'Neighborhood Grocery', 'category': 'Groceries', 'address': 'Demo address'},
    {'id': 'local-shop-food', 'name': 'KuchhV Kitchen', 'category': 'Food', 'address': 'Demo address'},
  ];

  final products = <Map<String, dynamic>>[
    {'id': 'local-atta', 'shop_id': 'local-shop-grocery', 'name': 'Wheat flour', 'category': 'Groceries', 'price': 245.0, 'stock': 20, 'is_available': true},
    {'id': 'local-butter', 'shop_id': 'local-shop-grocery', 'name': 'Butter', 'category': 'Dairy', 'price': 265.0, 'stock': 15, 'is_available': true},
    {'id': 'local-paneer', 'shop_id': 'local-shop-food', 'name': 'Paneer curry', 'category': 'Food', 'price': 219.0, 'stock': 12, 'is_available': true},
    {'id': 'local-biryani', 'shop_id': 'local-shop-food', 'name': 'Veg biryani', 'category': 'Food', 'price': 189.0, 'stock': 10, 'is_available': true},
  ];

  double get cartTotal {
    var total = 0.0;
    for (final entry in cart.entries) {
      final product = products.firstWhere((row) => row['id'] == entry.key);
      total += _number(product['price']) * entry.value;
    }
    return total;
  }

  Map<String, dynamic>? get shopForCart {
    if (cart.isEmpty) return null;
    final first = products.firstWhere((product) => product['id'] == cart.keys.first);
    final shopId = first['shop_id'];
    if (cart.keys.any((id) => products.firstWhere((p) => p['id'] == id)['shop_id'] != shopId)) {
      return null;
    }
    return shops.firstWhere((shop) => shop['id'] == shopId);
  }
}

double _number(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}

String _string(Map<String, dynamic> map, String key, [String fallback = '—']) {
  final value = map[key];
  return value == null || value.toString().isEmpty ? fallback : value.toString();
}

List<Map<String, dynamic>> _maps(dynamic value) {
  if (value is! List) return [];
  return value.whereType<Map>().map(Map<String, dynamic>.from).toList();
}

class _CustomerStorefront extends StatefulWidget {
  const _CustomerStorefront({required this.localMode});

  final bool localMode;

  @override
  State<_CustomerStorefront> createState() => _CustomerStorefrontState();
}

class _CustomerStorefrontState extends State<_CustomerStorefront> {
  final _search = TextEditingController();
  String? _shopId;
  String? _category;
  late Future<dynamic> _shops;
  late Future<dynamic> _products;
  bool _loadingProducts = false;

  @override
  void initState() {
    super.initState();
    _shops = _loadShops();
    _products = Future<dynamic>.value(_LocalMarketplace.instance.products);
    _search.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<dynamic> _loadShops() {
    if (widget.localMode) {
      return Future<dynamic>.value(_LocalMarketplace.instance.shops);
    }
    final auth = context.read<AuthProvider>();
    return auth.api.get('/shops', accessToken: auth.accessToken);
  }

  Future<void> _selectShop(String id) async {
    setState(() {
      _shopId = id;
      _category = null;
      _loadingProducts = true;
      _products = widget.localMode
          ? Future<dynamic>.value(
              _LocalMarketplace.instance.products
                  .where((product) => product['shop_id'] == id)
                  .toList(),
            )
          : context.read<AuthProvider>().api.get(
                '/shops/$id/products',
                accessToken: context.read<AuthProvider>().accessToken,
              );
    });
    try {
      await _products;
    } finally {
      if (mounted) setState(() => _loadingProducts = false);
    }
  }

  Future<void> _openVoice(List<Map<String, dynamic>> products) async {
    if (products.isEmpty) return;
    final byIndex = <int, Map<String, dynamic>>{};
    final catalog = <VoiceCatalogItem>[];
    for (var index = 0; index < products.length; index++) {
      final product = products[index];
      byIndex[index] = product;
      catalog.add(
        VoiceCatalogItem(
          id: index,
          name: _string(product, 'name'),
          category: _string(product, 'category'),
          stock: product['stock'] is int ? product['stock'] as int : null,
          alreadyInCart: _LocalMarketplace.instance.cart[
                  _string(product, 'id')] ??
              0,
          price: _number(product['price']),
        ),
      );
    }

    class _RemoteListPage extends StatelessWidget {
      const _RemoteListPage({
        required this.title,
        required this.localMode,
        required this.localItems,
        required this.load,
        required this.emptyTitle,
        required this.emptySubtitle,
      });

      final String title;
      final bool localMode;
      final List<Map<String, dynamic>> localItems;
      final Future<dynamic> Function() load;
      final String emptyTitle;
      final String emptySubtitle;

      @override
      Widget build(BuildContext context) => FutureBuilder<dynamic>(
            future: localMode ? Future.value(localItems) : load(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return _FeatureErrorPage(
                  title: title,
                  message: _message(snapshot.error!),
                  retry: () => (context as Element).markNeedsBuild(),
                );
              }
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              final rows = _maps(snapshot.data);
              if (rows.isEmpty) {
                return _FeatureEmpty(
                  icon: Icons.inbox_outlined,
                  title: emptyTitle,
                  subtitle: emptySubtitle,
                );
              }
              return RefreshIndicator(
                onRefresh: () async => (context as Element).markNeedsBuild(),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _FeatureHeader(
                      icon: Icons.receipt_long_outlined,
                      title: title,
                      subtitle: emptySubtitle,
                    ),
                    const SizedBox(height: 12),
                    for (final row in rows)
                      _DataCard(
                        title: 'Order ${_string(row, 'id')}',
                        subtitle: '₹${_string(row, 'total_amount')} · ${_string(row, 'status')} · ${_string(row, 'created_at')}',
                      ),
                  ],
                ),
              );
            },
          );
    }

    class _Collection extends StatelessWidget {
      const _Collection({
        required this.future,
        required this.render,
        required this.emptyTitle,
        required this.emptySubtitle,
      });

      final Future<dynamic> future;
      final Widget Function(List<Map<String, dynamic>>) render;
      final String emptyTitle;
      final String emptySubtitle;

      @override
      Widget build(BuildContext context) => FutureBuilder<dynamic>(
            future: future,
            builder: (context, snapshot) {
              if (snapshot.hasError) return _FeatureError(_message(snapshot.error!));
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              final rows = _maps(snapshot.data);
              if (rows.isEmpty) {
                return _FeatureEmpty(
                  icon: Icons.inbox_outlined,
                  title: emptyTitle,
                  subtitle: emptySubtitle,
                );
              }
              return render(rows);
            },
          );
    }

    class _FeatureHeader extends StatelessWidget {
      const _FeatureHeader({
        required this.icon,
        required this.title,
        required this.subtitle,
      });

      final IconData icon;
      final String title;
      final String subtitle;

      @override
      Widget build(BuildContext context) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 42, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.black54,
                    ),
              ),
            ],
          );
    }

    class _FeatureEmpty extends StatelessWidget {
      const _FeatureEmpty({
        required this.icon,
        required this.title,
        required this.subtitle,
      });

      final IconData icon;
      final String title;
      final String subtitle;

      @override
      Widget build(BuildContext context) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Column(
              children: [
                Icon(icon, size: 42, color: Colors.black38),
                const SizedBox(height: 10),
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(subtitle, textAlign: TextAlign.center),
              ],
            ),
          );
    }

    class _FeatureError extends StatelessWidget {
      const _FeatureError(this.message);

      final String message;

      @override
      Widget build(BuildContext context) => Card(
            color: Theme.of(context).colorScheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Text(message),
            ),
          );
    }

    class _FeatureErrorPage extends StatelessWidget {
      const _FeatureErrorPage({
        required this.title,
        required this.message,
        required this.retry,
      });

      final String title;
      final String message;
      final VoidCallback retry;

      @override
      Widget build(BuildContext context) => ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _FeatureHeader(
                icon: Icons.cloud_off_outlined,
                title: title,
                subtitle: message,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: retry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          );
    }

    class _DataCard extends StatelessWidget {
      const _DataCard({required this.title, required this.subtitle});

      final String title;
      final String subtitle;

      @override
      Widget build(BuildContext context) => Card(
            child: ListTile(
              title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(subtitle),
            ),
          );
    }

    class _PageTitle extends StatelessWidget {
      const _PageTitle({required this.title, required this.onRefresh});

      final String title;
      final VoidCallback onRefresh;

      @override
      Widget build(BuildContext context) => Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh',
                  onPressed: onRefresh,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
          );
    }

    String _message(Object error) {
      final text = error.toString();
      if (text.contains('SocketException') ||
          text.contains('TimeoutException') ||
          text.contains('ClientException')) {
        return 'Could not reach KuchhV. Check your connection and try again.';
      }
      return text.replaceFirst('Exception: ', '').replaceFirst('Bad state: ', '');
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => VoiceOrderingSheet(
        catalog: catalog,
        hasItemsInCart: _LocalMarketplace.instance.cart.isNotEmpty,
        onAddToCart: (line) {
          final product = byIndex[line.item.id];
          if (product == null) return;
          final id = _string(product, 'id');
          _LocalMarketplace.instance.cart.update(
            id,
            (quantity) => quantity + line.quantity,
            ifAbsent: () => line.quantity,
          );
          if (mounted) setState(() {});
        },
        onClearCart: () {
          _LocalMarketplace.instance.cart.clear();
          if (mounted) setState(() {});
        },
      ),
    );
  }

  Future<void> _checkout(Map<String, dynamic> shop) async {
    if (_LocalMarketplace.instance.cart.isEmpty) return;
    final address = TextEditingController();
    var useVip = false;
    var coins = 0;
    String? error;
    var busy = false;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Checkout · ${_string(shop, 'name')}', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text('Items: ${_LocalMarketplace.instance.cart.length} · Subtotal ₹${_LocalMarketplace.instance.cartTotal.toStringAsFixed(2)}'),
              TextField(
                controller: address,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Delivery address'),
              ),
              if (!widget.localMode) ...[
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Use KuchhV VIP deal'),
                  value: useVip,
                  onChanged: (value) => setSheetState(() => useVip = value),
                ),
                TextFormField(
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Coins to redeem'),
                  onChanged: (value) => coins = int.tryParse(value) ?? 0,
                ),
              ],
              if (error != null) _FeatureError(error!),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        if (address.text.trim().isEmpty) {
                          setSheetState(() => error = 'Enter a delivery address.');
                          return;
                        }
                        setSheetState(() {
                          busy = true;
                          error = null;
                        });
                        try {
                          final cart = _LocalMarketplace.instance.cart;
                          final auth = sheetContext.read<AuthProvider>();
                          if (widget.localMode) {
                            _LocalMarketplace.instance.orders.insert(0, {
                              'id': 'DEMO-${DateTime.now().millisecondsSinceEpoch}',
                              'status': 'PLACED',
                              'total_amount': _LocalMarketplace.instance.cartTotal,
                              'shop': shop['name'],
                              'created_at': DateTime.now().toIso8601String(),
                            });
                            _LocalMarketplace.instance.coins += 5;
                          } else {
                            await auth.api.post(
                              '/orders',
                              accessToken: auth.accessToken,
                              body: {
                                'shop_id': shop['id'],
                                'items': [
                                  for (final item in cart.entries)
                                    {'product_id': item.key, 'quantity': item.value},
                                ],
                                'delivery_address': address.text.trim(),
                                'coins_to_redeem': coins,
                                'use_vip_deal': useVip,
                              },
                            );
                          }
                          cart.clear();
                          if (sheetContext.mounted) Navigator.pop(sheetContext);
                          if (mounted) {
                            setState(() {});
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Order placed.')),
                            );
                          }
                        } catch (exception) {
                          setSheetState(() {
                            error = _message(exception);
                            busy = false;
                          });
                        }
                      },
                child: busy ? const CircularProgressIndicator() : const Text('Place order'),
              ),
            ],
          ),
        ),
      ),
    );
    address.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
        future: _shops,
        builder: (context, snapshot) {
          if (!widget.localMode && snapshot.hasError) {
            return _FeatureErrorPage(
              title: 'Storefront unavailable',
              message: _message(snapshot.error!),
              retry: () => setState(() => _shops = _loadShops()),
            );
          }
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          final shops = _maps(snapshot.data);
          if (shops.isEmpty) {
            return const _FeatureEmpty(
              icon: Icons.store_mall_directory_outlined,
              title: 'No shops nearby yet',
              subtitle: 'Check back soon for local stores and offers.',
            );
          }
          final activeShop = shops.cast<Map<String, dynamic>?>().firstWhere(
                (shop) => shop?['id'] == _shopId,
                orElse: () => shops.first,
              )!;
          if (_shopId != activeShop['id']) {
            _shopId = activeShop['id'] as String?;
            _products = widget.localMode
                ? Future<dynamic>.value(
                    _LocalMarketplace.instance.products
                        .where((p) => p['shop_id'] == _shopId)
                        .toList(),
                  )
                : context.read<AuthProvider>().api.get(
                      '/shops/$_shopId/products',
                      accessToken: context.read<AuthProvider>().accessToken,
                    );
          }
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _shopId,
                        decoration: const InputDecoration(
                          labelText: 'Neighborhood storefront',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        items: [
                          for (final shop in shops)
                            DropdownMenuItem(
                              value: _string(shop, 'id'),
                              child: Text(
                                _string(shop, 'name'),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                        onChanged: (id) {
                          if (id != null) _selectShop(id);
                        },
                      ),
                    ),
                    IconButton(
                      tooltip: 'AI voice ordering',
                      onPressed: () async {
                        final data = await _products;
                        await _openVoice(_maps(data));
                      },
                      icon: const Icon(Icons.mic_none),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _search,
                  decoration: const InputDecoration(
                    hintText: 'Search this shop',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              Expanded(
                child: FutureBuilder<dynamic>(
                  future: _products,
                  builder: (context, productSnapshot) {
                    if (_loadingProducts ||
                        productSnapshot.connectionState != ConnectionState.done) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (productSnapshot.hasError) {
                      return _FeatureErrorPage(
                        title: 'Could not load this catalog',
                        message: _message(productSnapshot.error!),
                        retry: () => _selectShop(_shopId!),
                      );
                    }
                    final products = _maps(productSnapshot.data);
                    final categories = products
                        .map((product) => _string(product, 'category'))
                        .toSet()
                        .toList()
                      ..sort();
                    final visible = products.where((product) {
                      final query = _search.text.toLowerCase();
                      return (_category == null ||
                              product['category'] == _category) &&
                          ('${product['name']} ${product['category']}')
                              .toLowerCase()
                              .contains(query);
                    }).toList();
                    return ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                      children: [
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              ChoiceChip(
                                label: const Text('All categories'),
                                selected: _category == null,
                                onSelected: (_) => setState(() => _category = null),
                              ),
                              for (final category in categories)
                                Padding(
                                  padding: const EdgeInsets.only(left: 8),
                                  child: ChoiceChip(
                                    label: Text(category),
                                    selected: _category == category,
                                    onSelected: (_) => setState(() => _category = category),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        for (final product in visible)
                          _ProductTile(
                            product: product,
                            quantity: _LocalMarketplace.instance.cart[
                                    _string(product, 'id')] ??
                                0,
                            onAdd: () => setState(() {
                              final id = _string(product, 'id');
                              _LocalMarketplace.instance.cart.update(
                                id,
                                (quantity) => quantity + 1,
                                ifAbsent: () => 1,
                              );
                            }),
                            onRemove: () => setState(() {
                              final cart = _LocalMarketplace.instance.cart;
                              final id = _string(product, 'id');
                              if ((cart[id] ?? 0) <= 1) {
                                cart.remove(id);
                              } else {
                                cart[id] = cart[id]! - 1;
                              }
                            }),
                          ),
                        if (visible.isEmpty)
                          const _FeatureEmpty(
                            icon: Icons.search_off,
                            title: 'No matching products',
                            subtitle: 'Try a different category or search term.',
                          ),
                      ],
                    );
                  },
                ),
              ),
              if (_LocalMarketplace.instance.cart.isNotEmpty)
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: FilledButton.icon(
                      onPressed: _LocalMarketplace.instance.shopForCart == null
                          ? null
                          : () => _checkout(
                                _maps(snapshot.data).firstWhere(
                                  (shop) =>
                                      shop['id'] ==
                                      _LocalMarketplace
                                          .instance.shopForCart?['id'],
                                  orElse: () => activeShop,
                                ),
                              ),
                      icon: const Icon(Icons.shopping_cart_checkout),
                      label: Text(
                        _LocalMarketplace.instance.shopForCart == null
                            ? 'Cart has items from different shops'
                            : 'Checkout · ${_LocalMarketplace.instance.cart.values.fold<int>(0, (sum, count) => sum + count)} items · ₹${_LocalMarketplace.instance.cartTotal.toStringAsFixed(2)}',
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      );
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.product,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
  });

  final Map<String, dynamic> product;
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          title: Text(_string(product, 'name'), style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text('${_string(product, 'category')} · ₹${_number(product['price']).toStringAsFixed(2)} · ${_string(product, 'stock', 'Available')} in stock'),
          trailing: quantity == 0
              ? IconButton(onPressed: onAdd, icon: const Icon(Icons.add_circle_outline))
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(onPressed: onRemove, icon: const Icon(Icons.remove_circle_outline)),
                    Text('$quantity'),
                    IconButton(onPressed: onAdd, icon: const Icon(Icons.add_circle_outline)),
                  ],
                ),
        ),
      );
}

class _CustomRequestPage extends StatefulWidget {
  const _CustomRequestPage({required this.role, required this.localMode});

  final UserRole role;
  final bool localMode;

  @override
  State<_CustomRequestPage> createState() => _CustomRequestPageState();
}

class _CustomRequestPageState extends State<_CustomRequestPage> {
  final _description = TextEditingController();
  final _amount = TextEditingController();
  late Future<dynamic> _requests;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _requests = _load();
  }

  @override
  void dispose() {
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<dynamic> _load() {
    if (widget.localMode) {
      final data = _LocalMarketplace.instance.customRequests;
      return Future<dynamic>.value(
        widget.role == UserRole.deliveryPartner
            ? data.where((request) => request['status'] == 'BROADCASTING').toList()
            : data,
      );
    }
    final auth = context.read<AuthProvider>();
    final path = widget.role == UserRole.deliveryPartner
        ? '/custom-requests/feed'
        : '/custom-requests/customer';
    return auth.api.get(path, accessToken: auth.accessToken);
  }

  Future<void> _createRequest() async {
    final description = _description.text.trim();
    final amount = double.tryParse(_amount.text);
    if (description.isEmpty || amount == null || amount < 0) {
      _showMessage('Enter an item description and a valid offered price.');
      return;
    }
    setState(() => _busy = true);
    try {
      if (widget.localMode) {
        _LocalMarketplace.instance.customRequests.insert(0, {
          'id': 'DEMO-REQ-${DateTime.now().millisecondsSinceEpoch}',
          'item_description': description,
          'offered_price': amount,
          'status': 'BROADCASTING',
          'bids': <Map<String, dynamic>>[],
        });
      } else {
        final auth = context.read<AuthProvider>();
        await auth.api.post(
          '/custom-requests',
          accessToken: auth.accessToken,
          body: {'item_description': description, 'offered_price': amount},
        );
      }
      _description.clear();
      _amount.clear();
      setState(() => _requests = _load());
    } catch (error) {
      _showMessage(_message(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitBid(Map<String, dynamic> request) async {
    final id = _string(request, 'id');
    final input = TextEditingController();
    final amount = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Submit a bid'),
        content: TextField(
          controller: input,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Your bid (₹)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, double.tryParse(input.text)),
            child: const Text('Submit bid'),
          ),
        ],
      ),
    );
    input.dispose();
    if (amount == null) return;
    try {
      if (widget.localMode) {
        (request['bids'] as List).add({
          'partner_id': 'local-partner',
          'bid_amount': amount,
          'status': 'SUBMITTED',
        });
      } else {
        final auth = context.read<AuthProvider>();
        await auth.api.post(
          '/custom-requests/$id/bid',
          accessToken: auth.accessToken,
          body: {'bid_amount': amount},
        );
      }
      setState(() => _requests = _load());
      _showMessage('Bid submitted.');
    } catch (error) {
      _showMessage(_message(error));
    }
  }

  Future<void> _showBids(Map<String, dynamic> request) async {
    final requestId = _string(request, 'id');
    dynamic bids = request['bids'];
    if (!widget.localMode) {
      try {
        final auth = context.read<AuthProvider>();
        final response = await auth.api.get(
          '/custom-requests/$requestId/bids',
          accessToken: auth.accessToken,
        );
        bids = response is Map ? response['bids'] : response;
      } catch (error) {
        _showMessage(_message(error));
        return;
      }
    }
    final bidRows = _maps(bids);
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Partner bids', style: Theme.of(context).textTheme.titleLarge),
            if (bidRows.isEmpty)
              const ListTile(title: Text('No bids yet'), subtitle: Text('Partners can bid on this request.')),
            for (final bid in bidRows)
              Card(
                child: ListTile(
                  title: Text('₹${_string(bid, 'bid_amount')}'),
                  subtitle: Text('Partner ${_string(bid, 'partner_id')} · ${_string(bid, 'status')}'),
                  trailing: widget.role == UserRole.customer &&
                          bid['status'] == 'SUBMITTED'
                      ? TextButton(
                          onPressed: () async {
                            try {
                              final auth = context.read<AuthProvider>();
                              if (widget.localMode) {
                                request['status'] = 'BID_ACCEPTED';
                                request['assigned_partner_id'] = bid['partner_id'];
                              } else {
                                await auth.api.patch(
                                  '/custom-requests/$requestId/accept/${bid['partner_id']}',
                                  accessToken: auth.accessToken,
                                );
                              }
                              if (context.mounted) Navigator.pop(context);
                              setState(() => _requests = _load());
                            } catch (error) {
                              _showMessage(_message(error));
                            }
                          },
                          child: const Text('Accept'),
                        )
                      : null,
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final customer = widget.role == UserRole.customer;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _FeatureHeader(
          icon: Icons.gavel_outlined,
          title: customer ? 'Custom shopping bids' : 'Nearby customer requests',
          subtitle: customer
              ? 'Ask a partner to find a hard-to-find item and compare offers.'
              : 'Send a clear price offer for customer shopping requests.',
        ),
        if (customer) ...[
          const SizedBox(height: 14),
          TextField(controller: _description, decoration: const InputDecoration(labelText: 'What do you need?', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Your offered price (₹)', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: _busy ? null : _createRequest,
            child: _busy ? const CircularProgressIndicator() : const Text('Broadcast request'),
          ),
        ],
        const SizedBox(height: 18),
        FutureBuilder<dynamic>(
          future: _requests,
          builder: (context, snapshot) {
            if (snapshot.hasError) return _FeatureError(_message(snapshot.error!));
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            final requests = _maps(snapshot.data);
            if (requests.isEmpty) {
              return _FeatureEmpty(
                icon: Icons.forum_outlined,
                title: customer ? 'No requests yet' : 'No requests nearby',
                subtitle: customer ? 'Create a request to invite partner bids.' : 'New customer requests will appear here.',
              );
            }
            return Column(
              children: [
                for (final request in requests)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_string(request, 'item_description'), style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text('Offer ₹${_string(request, 'offered_price')} · ${_string(request, 'status')}'),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: [
                              if (customer)
                                OutlinedButton(
                                  onPressed: () => _showBids(request),
                                  child: Text('View bids (${_maps(request['bids']).length})'),
                                )
                              else
                                FilledButton.tonal(
                                  onPressed: () => _submitBid(request),
                                  child: const Text('Place bid'),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _ServiceBookingPage extends StatefulWidget {
  const _ServiceBookingPage({required this.localMode});

  final bool localMode;

  @override
  State<_ServiceBookingPage> createState() => _ServiceBookingPageState();
}

class _ServiceBookingPageState extends State<_ServiceBookingPage> {
  final _category = TextEditingController();
  final _description = TextEditingController();
  final _address = TextEditingController();
  late Future<dynamic> _bookings;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _bookings = _load();
  }

  @override
  void dispose() {
    _category.dispose();
    _description.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<dynamic> _load() {
    if (widget.localMode) {
      return Future<dynamic>.value(_LocalMarketplace.instance.serviceBookings);
    }
    final auth = context.read<AuthProvider>();
    return auth.api.get('/service-requests/customer', accessToken: auth.accessToken);
  }

  Future<void> _create() async {
    if (_category.text.trim().isEmpty ||
        _description.text.trim().isEmpty ||
        _address.text.trim().isEmpty) {
      _notice('Complete the service category, description, and address.');
      return;
    }
    setState(() => _busy = true);
    try {
      if (widget.localMode) {
        _LocalMarketplace.instance.serviceBookings.insert(0, {
          'id': 'DEMO-SERVICE-${DateTime.now().millisecondsSinceEpoch}',
          'service_category': _category.text.trim(),
          'description': _description.text.trim(),
          'service_address': _address.text.trim(),
          'status': 'REQUESTED',
        });
      } else {
        final auth = context.read<AuthProvider>();
        await auth.api.post(
          '/service-requests',
          accessToken: auth.accessToken,
          body: {
            'service_category': _category.text.trim(),
            'description': _description.text.trim(),
            'service_address': _address.text.trim(),
          },
        );
      }
      _category.clear();
      _description.clear();
      _address.clear();
      setState(() => _bookings = _load());
    } catch (error) {
      _notice(_message(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notice(String text) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _FeatureHeader(
            icon: Icons.home_repair_service_outlined,
            title: 'Home services',
            subtitle: 'Book a verified local professional for repairs and home services.',
          ),
          const SizedBox(height: 14),
          TextField(controller: _category, decoration: const InputDecoration(labelText: 'Service (e.g. electrician)', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: _description, decoration: const InputDecoration(labelText: 'Describe the job', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: _address, decoration: const InputDecoration(labelText: 'Service address', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: _busy ? null : _create,
            child: _busy ? const CircularProgressIndicator() : const Text('Request a service'),
          ),
          const SizedBox(height: 20),
          Text('Your bookings', style: Theme.of(context).textTheme.titleLarge),
          FutureBuilder<dynamic>(
            future: _bookings,
            builder: (context, snapshot) {
              if (snapshot.hasError) return _FeatureError(_message(snapshot.error!));
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              final bookings = _maps(snapshot.data);
              if (bookings.isEmpty) {
                return const _FeatureEmpty(
                  icon: Icons.event_note_outlined,
                  title: 'No service bookings',
                  subtitle: 'Your requested and accepted services will appear here.',
                );
              }
              return Column(
                children: [
                  for (final booking in bookings)
                    _DataCard(
                      title: _string(booking, 'service_category'),
                      subtitle: '${_string(booking, 'description')} · ${_string(booking, 'status')}',
                    ),
                ],
              );
            },
          ),
        ],
      );
}

class _OrdersPage extends StatelessWidget {
  const _OrdersPage({required this.localMode});

  final bool localMode;

  @override
  Widget build(BuildContext context) {
      final auth = context.read<AuthProvider>();
      return _RemoteListPage(
        title: 'Your orders',
        localMode: localMode,
        localItems: _LocalMarketplace.instance.orders,
        load: () => auth.api.get('/orders/customer', accessToken: auth.accessToken),
        emptyTitle: 'No orders yet',
        emptySubtitle: 'Place an order from the storefront and track it here.',
      );
  }
}

class _VendorShopPage extends StatefulWidget {
  const _VendorShopPage({required this.localMode});

  final bool localMode;

  @override
  State<_VendorShopPage> createState() => _VendorShopPageState();
}

class _VendorShopPageState extends State<_VendorShopPage> {
  final _name = TextEditingController();
  final _category = TextEditingController();
  final _address = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
      _name.dispose();
      _category.dispose();
      _address.dispose();
      super.dispose();
  }

  Future<void> _register() async {
      if (_name.text.trim().isEmpty ||
          _category.text.trim().isEmpty ||
          _address.text.trim().isEmpty) {
        _show('Enter the shop name, category, and address.');
        return;
      }
      if (widget.localMode) {
        _show('Demo shop saved for this preview.');
        return;
      }
      setState(() => _busy = true);
      try {
        final auth = context.read<AuthProvider>();
        final result = await auth.api.post(
          '/vendor/register-shop',
          accessToken: auth.accessToken,
          body: {
            'name': _name.text.trim(),
            'category': _category.text.trim(),
            'address': _address.text.trim(),
          },
        );
        if (result is! Map<String, dynamic> || result['id'] is! String) {
          throw const FormatException('The server did not return a shop ID.');
        }
        await auth.saveShopId(result['id'] as String);
        _show('Shop registered. Its category commission is applied automatically.');
      } catch (error) {
        _show(_message(error));
      } finally {
        if (mounted) setState(() => _busy = false);
      }
  }

  void _show(String message) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
      final auth = context.watch<AuthProvider>();
      if (auth.shopId != null) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const _FeatureHeader(
              icon: Icons.storefront_outlined,
              title: 'Your marketplace shop',
              subtitle: 'Catalog, order handling, and sponsored ads are available in the tabs below.',
            ),
            const SizedBox(height: 14),
            _DataCard(title: 'Shop ID', subtitle: auth.shopId!),
            const _DataCard(
              title: 'Growth tools',
              subtitle: 'Keep your catalog stocked and create Sponsored Ads to promote your listings.',
            ),
          ],
        );
      }
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _FeatureHeader(
            icon: Icons.storefront_outlined,
            title: 'Register your shop',
            subtitle: 'Create your vendor storefront to start managing the catalog.',
          ),
          const SizedBox(height: 16),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Shop name', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: _category, decoration: const InputDecoration(labelText: 'Category', hintText: 'Groceries, Restaurant, Pharmacy…', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: _address, maxLines: 2, decoration: const InputDecoration(labelText: 'Shop address', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _register,
            child: _busy ? const CircularProgressIndicator() : const Text('Register shop'),
          ),
        ],
      );
  }
}

class _VendorCatalogPage extends StatefulWidget {
  const _VendorCatalogPage({required this.localMode});

  final bool localMode;

  @override
  State<_VendorCatalogPage> createState() => _VendorCatalogPageState();
}

class _VendorCatalogPageState extends State<_VendorCatalogPage> {
  Future<dynamic>? _products;

  Future<dynamic> _load() {
      if (widget.localMode) return Future.value(_LocalMarketplace.instance.vendorProducts);
      final auth = context.read<AuthProvider>();
      final shopId = auth.shopId;
      if (shopId == null) throw StateError('Register your shop before adding products.');
      return auth.api.get(
        '/vendor/products?shop_id=$shopId',
        accessToken: auth.accessToken,
      );
  }

  void _reload() => setState(() => _products = _load());

  Future<void> _addProduct() async {
      if (!widget.localMode && context.read<AuthProvider>().shopId == null) {
        _notify('Register your shop first.');
        return;
      }
      final name = TextEditingController();
      final category = TextEditingController();
      final price = TextEditingController();
      final stock = TextEditingController();
      String? error;
      var busy = false;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('Add catalog item'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(controller: name, decoration: const InputDecoration(labelText: 'Product name')),
                  TextField(controller: category, decoration: const InputDecoration(labelText: 'Category')),
                  TextField(controller: price, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price (₹)')),
                  TextField(controller: stock, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stock')),
                  if (error != null) _FeatureError(error!),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: busy ? null : () => Navigator.pop(context), child: const Text('Cancel')),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        final priceValue = double.tryParse(price.text);
                        final stockValue = int.tryParse(stock.text);
                        if (name.text.trim().isEmpty ||
                            category.text.trim().isEmpty ||
                            priceValue == null ||
                            stockValue == null) {
                          setDialogState(() => error = 'Enter valid product details.');
                          return;
                        }
                        setDialogState(() => busy = true);
                        try {
                          if (widget.localMode) {
                            _LocalMarketplace.instance.vendorProducts.insert(0, {
                              'id': 'DEMO-PRODUCT-${DateTime.now().millisecondsSinceEpoch}',
                              'name': name.text.trim(),
                              'category': category.text.trim(),
                              'price': priceValue,
                              'stock': stockValue,
                            });
                          } else {
                            final auth = dialogContext.read<AuthProvider>();
                            await auth.api.post(
                              '/vendor/products',
                              accessToken: auth.accessToken,
                              body: {
                                'shop_id': auth.shopId,
                                'name': name.text.trim(),
                                'category': category.text.trim(),
                                'price': priceValue,
                                'stock': stockValue,
                              },
                            );
                          }
                          if (dialogContext.mounted) Navigator.pop(dialogContext);
                          _reload();
                        } catch (exception) {
                          setDialogState(() {
                            error = _message(exception);
                            busy = false;
                          });
                        }
                      },
                child: busy ? const CircularProgressIndicator() : const Text('Save product'),
              ),
            ],
          ),
        ),
      );
      name.dispose();
      category.dispose();
      price.dispose();
      stock.dispose();
  }

  void _notify(String text) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
      _products ??= _load();
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                Expanded(child: Text('Catalog & inventory', style: Theme.of(context).textTheme.titleLarge)),
                IconButton(onPressed: _addProduct, icon: const Icon(Icons.add_box_outlined), tooltip: 'Add product'),
                IconButton(onPressed: _reload, icon: const Icon(Icons.refresh)),
              ],
            ),
          ),
          Expanded(
            child: _Collection(
              future: _products!,
              emptyTitle: 'Catalog is empty',
              emptySubtitle: 'Add items to make your shop ready for customers.',
              render: (rows) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final item in rows)
                    _DataCard(
                      title: _string(item, 'name'),
                      subtitle: '${_string(item, 'category')} · ₹${_string(item, 'price')} · Stock ${_string(item, 'stock')} · ID ${_string(item, 'id')}',
                    ),
                ],
              ),
            ),
          ),
        ],
      );
  }
}

class _VendorOrdersPage extends StatefulWidget {
  const _VendorOrdersPage({required this.localMode});

  final bool localMode;

  @override
  State<_VendorOrdersPage> createState() => _VendorOrdersPageState();
}

class _VendorOrdersPageState extends State<_VendorOrdersPage> {
  Future<dynamic>? _orders;

  Future<dynamic> _load() {
      if (widget.localMode) return Future.value(_LocalMarketplace.instance.orders);
      final auth = context.read<AuthProvider>();
      if (auth.shopId == null) throw StateError('Register your shop before viewing shop orders.');
      return auth.api.get('/vendor/orders?shop_id=${auth.shopId}', accessToken: auth.accessToken);
  }

  void _reload() => setState(() => _orders = _load());

  Future<void> _changeStatus(Map<String, dynamic> order, String status) async {
      try {
        if (widget.localMode) {
          order['status'] = status;
        } else {
          final auth = context.read<AuthProvider>();
          await auth.api.patch(
            '/vendor/orders/${order['id']}/status',
            accessToken: auth.accessToken,
            body: {'status': status},
          );
        }
        _reload();
      } catch (error) {
        _notify(_message(error));
      }
  }

  void _notify(String message) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
      _orders ??= _load();
      return Column(
        children: [
          _PageTitle(title: 'Incoming shop orders', onRefresh: _reload),
          Expanded(
            child: _Collection(
              future: _orders!,
              emptyTitle: 'No incoming orders',
              emptySubtitle: 'New customer orders will appear here.',
              render: (rows) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final order in rows)
                    Card(
                      child: Column(
                        children: [
                          ListTile(
                            title: Text('Order ${_string(order, 'id')}'),
                            subtitle: Text('₹${_string(order, 'total_amount')} · ${_string(order, 'status')}'),
                          ),
                          if (['PLACED', 'PAID'].contains(order['status']))
                            ButtonBar(
                              children: [
                                TextButton(
                                  onPressed: () => _changeStatus(order, 'REJECTED'),
                                  child: const Text('Reject'),
                                ),
                                FilledButton(
                                  onPressed: () => _changeStatus(order, 'ACCEPTED'),
                                  child: const Text('Accept order'),
                                ),
                              ],
                            ),
                          if (order['status'] == 'ACCEPTED')
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: FilledButton.tonal(
                                onPressed: () => _changeStatus(order, 'PREPARING'),
                                child: const Text('Start preparing'),
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      );
  }
}

class _SponsoredAdsPage extends StatefulWidget {
  const _SponsoredAdsPage({required this.localMode});

  final bool localMode;

  @override
  State<_SponsoredAdsPage> createState() => _SponsoredAdsPageState();
}

class _SponsoredAdsPageState extends State<_SponsoredAdsPage> {
  Future<dynamic>? _campaigns;

  Future<dynamic> _load() {
      if (widget.localMode) return Future.value(_LocalMarketplace.instance.vendorProducts.where((p) => p['ad'] == true).toList());
      final auth = context.read<AuthProvider>();
      return auth.api.get('/ads/campaigns', accessToken: auth.accessToken);
  }

  void _reload() => setState(() => _campaigns = _load());

  Future<void> _showAnalytics(Map<String, dynamic> campaign) async {
    try {
      final metrics = widget.localMode
          ? <String, dynamic>{
              'impressions': 0,
              'clicks': 0,
              'conversions': 0,
              'click_through_rate_percent': 0,
              'conversion_rate_percent': 0,
              'spend': '0.00',
              'conversion_value': '0.00',
              'return_on_ad_spend': 0,
              'currency': 'INR',
            }
          : await context.read<AuthProvider>().api.get(
                '/ads/campaigns/${campaign['id']}/analytics',
                accessToken: context.read<AuthProvider>().accessToken,
              );
      if (!mounted || metrics is! Map) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('${_string(campaign, 'name')} · Analytics'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final entry in Map<String, dynamic>.from(metrics).entries)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Text('${_label(entry.key)}: ${entry.value}'),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (error) {
      _notify(_message(error));
    }
  }

  Future<void> _createCampaign() async {
      final auth = context.read<AuthProvider>();
      if (!widget.localMode && auth.shopId == null) {
        _notify('Register your shop first.');
        return;
      }
      final name = TextEditingController();
      final productId = TextEditingController();
      final category = TextEditingController();
      final bannerImage = TextEditingController();
      final bannerLink = TextEditingController();
      final bid = TextEditingController(text: '2');
      final budget = TextEditingController(text: '500');
      String placement = 'SPONSORED_LISTING';
      String billing = 'CPC';
      String? error;
      var busy = false;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('Create sponsored promotion'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(controller: name, decoration: const InputDecoration(labelText: 'Campaign name')),
                  DropdownButtonFormField<String>(
                    value: placement,
                    decoration: const InputDecoration(labelText: 'Placement'),
                    items: const [
                      DropdownMenuItem(value: 'SPONSORED_LISTING', child: Text('Sponsored listing')),
                      DropdownMenuItem(value: 'BANNER', child: Text('Banner')),
                    ],
                    onChanged: (value) {
                      if (value != null) setDialogState(() => placement = value);
                    },
                  ),
                  DropdownButtonFormField<String>(
                    value: billing,
                    decoration: const InputDecoration(labelText: 'Billing model'),
                    items: const [
                      DropdownMenuItem(value: 'CPC', child: Text('CPC (pay per click)')),
                      DropdownMenuItem(value: 'CPM', child: Text('CPM (pay per 1,000 views)')),
                    ],
                    onChanged: (value) {
                      if (value != null) setDialogState(() => billing = value);
                    },
                  ),
                  if (placement == 'SPONSORED_LISTING') ...[
                    TextField(controller: productId, decoration: const InputDecoration(labelText: 'Product UUID')),
                    TextField(controller: category, decoration: const InputDecoration(labelText: 'Target category (optional)')),
                  ] else ...[
                    TextField(controller: bannerImage, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'HTTPS banner image URL')),
                    TextField(controller: bannerLink, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'Banner destination URL (optional)')),
                  ],
                  TextField(controller: bid, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Bid amount')),
                  TextField(controller: budget, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Campaign budget')),
                  if (error != null) _FeatureError(error!),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: busy ? null : () => Navigator.pop(context), child: const Text('Cancel')),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        final bidValue = double.tryParse(bid.text);
                        final budgetValue = double.tryParse(budget.text);
                        if (name.text.trim().isEmpty ||
                            bidValue == null ||
                            budgetValue == null ||
                            (placement == 'SPONSORED_LISTING' && productId.text.trim().isEmpty) ||
                            (placement == 'BANNER' &&
                                !bannerImage.text.trim().startsWith('https://'))) {
                          setDialogState(() => error = 'Complete campaign details. Banner images must use HTTPS.');
                          return;
                        }
                        setDialogState(() => busy = true);
                        try {
                          if (widget.localMode) {
                            _LocalMarketplace.instance.vendorProducts.insert(0, {
                              'id': 'DEMO-AD-${DateTime.now().millisecondsSinceEpoch}',
                              'name': name.text.trim(),
                              'category': placement,
                              'price': bidValue,
                              'stock': budgetValue,
                              'ad': true,
                            });
                          } else {
                            await auth.api.post(
                              '/ads/campaigns',
                              accessToken: auth.accessToken,
                              body: {
                                'shop_id': auth.shopId,
                                'name': name.text.trim(),
                                'placement': placement,
                                'billing_model': billing,
                                if (placement == 'SPONSORED_LISTING') ...{
                                  'product_id': productId.text.trim(),
                                  if (category.text.trim().isNotEmpty)
                                    'target_category': category.text.trim(),
                                } else ...{
                                  'banner_image_url': bannerImage.text.trim(),
                                  if (bannerLink.text.trim().isNotEmpty)
                                    'banner_link_url': bannerLink.text.trim(),
                                },
                                'bid_amount': bidValue,
                                'budget_amount': budgetValue,
                              },
                            );
                          }
                          if (dialogContext.mounted) Navigator.pop(dialogContext);
                          _reload();
                        } catch (exception) {
                          setDialogState(() {
                            error = _message(exception);
                            busy = false;
                          });
                        }
                      },
                child: busy ? const CircularProgressIndicator() : const Text('Launch campaign'),
              ),
            ],
          ),
        ),
      );
      name.dispose();
      productId.dispose();
      category.dispose();
      bannerImage.dispose();
      bannerLink.dispose();
      bid.dispose();
      budget.dispose();
  }

  void _notify(String text) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
      _campaigns ??= _load();
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                Expanded(child: Text('Sponsored ads', style: Theme.of(context).textTheme.titleLarge)),
                FilledButton.icon(
                  onPressed: _createCampaign,
                  icon: const Icon(Icons.campaign_outlined),
                  label: const Text('Create'),
                ),
                IconButton(onPressed: _reload, icon: const Icon(Icons.refresh)),
              ],
            ),
          ),
          Expanded(
            child: _Collection(
              future: _campaigns!,
              emptyTitle: 'No campaigns yet',
              emptySubtitle: 'Promote a product with CPC or CPM billing and track campaign analytics.',
              render: (rows) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final campaign in rows)
                    Card(
                      child: Column(
                        children: [
                          ListTile(
                            title: Text(_string(campaign, 'name')),
                            subtitle: Text('${_string(campaign, 'placement')} · ${_string(campaign, 'billing_model')} · ${_string(campaign, 'status')} · spent ₹${_string(campaign, 'spent_amount', '0')}'),
                          ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton.icon(
                              onPressed: () => _showAnalytics(campaign),
                              icon: const Icon(Icons.analytics_outlined),
                              label: const Text('View analytics'),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      );
  }
}

class _ServiceProviderRequests extends StatefulWidget {
  const _ServiceProviderRequests({
    required this.localMode,
    required this.mine,
  });

  final bool localMode;
  final bool mine;

  @override
  State<_ServiceProviderRequests> createState() =>
      _ServiceProviderRequestsState();
}

class _ServiceProviderRequestsState extends State<_ServiceProviderRequests> {
  late Future<dynamic> _requests;

  @override
  void initState() {
    super.initState();
    _requests = _load();
  }

  Future<dynamic> _load() {
    if (widget.localMode) {
      final all = _LocalMarketplace.instance.serviceBookings;
      return Future.value(
        widget.mine
            ? all.where((item) => item['provider'] == true).toList()
            : all.where((item) => item['status'] == 'REQUESTED').toList(),
      );
    }
    final auth = context.read<AuthProvider>();
    return auth.api.get(
      widget.mine ? '/service-requests/provider' : '/service-requests/feed',
      accessToken: auth.accessToken,
    );
  }

  Future<void> _transition(Map<String, dynamic> request, String transition) async {
    try {
      if (widget.localMode) {
        request['provider'] = true;
        request['status'] = transition == 'accept' ? 'ACCEPTED' : 'IN_PROGRESS';
      } else {
        final auth = context.read<AuthProvider>();
        final id = _string(request, 'id');
        if (transition == 'accept') {
          await auth.api.post('/service-requests/$id/accept', accessToken: auth.accessToken);
        } else {
          await auth.api.patch('/service-requests/$id/start', accessToken: auth.accessToken);
        }
      }
      setState(() => _requests = _load());
    } catch (error) {
      _notify(_message(error));
    }
  }

  void _notify(String message) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          _PageTitle(
            title: widget.mine ? 'My service bookings' : 'Available service requests',
            onRefresh: () => setState(() => _requests = _load()),
          ),
          Expanded(
            child: _Collection(
              future: _requests,
              emptyTitle: widget.mine ? 'No accepted bookings yet' : 'No open service requests',
              emptySubtitle: 'Requests from KuchhV customers will appear here.',
              render: (rows) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final request in rows)
                    Card(
                      child: Column(
                        children: [
                          ListTile(
                            title: Text(_string(request, 'service_category')),
                            subtitle: Text('${_string(request, 'description')} · ${_string(request, 'service_address')} · ${_string(request, 'status')}'),
                          ),
                          if (!widget.mine)
                            FilledButton.tonal(
                              onPressed: () => _transition(request, 'accept'),
                              child: const Text('Accept booking'),
                            ),
                          if (widget.mine && request['status'] == 'ACCEPTED')
                            FilledButton.tonal(
                              onPressed: () => _transition(request, 'start'),
                              child: const Text('Start service'),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      );
}

class _PartnerProfilePage extends StatefulWidget {
  const _PartnerProfilePage({required this.localMode});

  final bool localMode;

  @override
  State<_PartnerProfilePage> createState() => _PartnerProfilePageState();
}

class _PartnerProfilePageState extends State<_PartnerProfilePage> {
  final _vehicleNumber = TextEditingController();
  final _latitude = TextEditingController();
  final _longitude = TextEditingController();
  String _vehicleType = 'BIKE';
  bool _busy = false;
  bool _online = false;

  @override
  void dispose() {
    _vehicleNumber.dispose();
    _latitude.dispose();
    _longitude.dispose();
    super.dispose();
  }

  Future<void> _onboard() async {
    if (_vehicleNumber.text.trim().isEmpty) {
      _notify('Enter your vehicle number.');
      return;
    }
    if (widget.localMode) {
      _notify('Demo vehicle details saved.');
      return;
    }
    await _run(() async {
      final auth = context.read<AuthProvider>();
      final result = await auth.api.post(
        '/partner/onboarding',
        accessToken: auth.accessToken,
        body: {
          'vehicle_type': _vehicleType,
          'vehicle_number': _vehicleNumber.text.trim().toUpperCase(),
        },
      );
      if (result is! Map<String, dynamic> ||
          result['id'] is! String ||
          result['kyc_status'] is! String) {
        throw const FormatException('The server returned an invalid partner profile.');
      }
      await auth.savePartnerId(result['id'] as String);
      await auth.savePartnerKycStatus(result['kyc_status'] as String);
    });
  }

  Future<void> _goOnline() async {
    final auth = context.read<AuthProvider>();
    final lat = double.tryParse(_latitude.text);
    final lng = double.tryParse(_longitude.text);
    if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      _notify('Enter valid GPS latitude and longitude before going online.');
      return;
    }
    await _run(() async {
      await auth.api.patch(
        '/partner/${auth.partnerId}/location',
        accessToken: auth.accessToken,
        body: {'latitude': lat, 'longitude': lng},
      );
      await auth.api.patch(
        '/partner/${auth.partnerId}/status',
        accessToken: auth.accessToken,
        body: {'is_online': true},
      );
      if (mounted) setState(() => _online = true);
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } catch (error) {
      _notify(_message(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notify(String text) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (widget.localMode) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _FeatureHeader(
            icon: Icons.delivery_dining_outlined,
            title: 'Delivery & ride partner',
            subtitle: 'Preview vehicle onboarding, dispatch tasks, rides, and partner earnings.',
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _vehicleType,
            decoration: const InputDecoration(labelText: 'Vehicle type', border: OutlineInputBorder()),
            items: const [
              DropdownMenuItem(value: 'BIKE', child: Text('Bike')),
              DropdownMenuItem(value: 'AUTO', child: Text('Auto')),
              DropdownMenuItem(value: 'CAB', child: Text('Cab')),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _vehicleType = value);
            },
          ),
          const SizedBox(height: 10),
          TextField(controller: _vehicleNumber, decoration: const InputDecoration(labelText: 'Vehicle registration number', border: OutlineInputBorder())),
          FilledButton(onPressed: _busy ? null : _onboard, child: const Text('Save demo vehicle')),
          SwitchListTile(
            title: Text(_online ? 'Online for demo tasks' : 'Offline'),
            value: _online,
            onChanged: (value) => setState(() => _online = value),
          ),
        ],
      );
    }
    if (auth.partnerId == null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _FeatureHeader(
            icon: Icons.delivery_dining_outlined,
            title: 'Partner onboarding',
            subtitle: 'Submit vehicle details. Your account must be KYC-verified before going online.',
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _vehicleType,
            decoration: const InputDecoration(labelText: 'Vehicle type', border: OutlineInputBorder()),
            items: const [
              DropdownMenuItem(value: 'BIKE', child: Text('Bike')),
              DropdownMenuItem(value: 'AUTO', child: Text('Auto')),
              DropdownMenuItem(value: 'CAB', child: Text('Cab')),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _vehicleType = value);
            },
          ),
          const SizedBox(height: 10),
          TextField(controller: _vehicleNumber, decoration: const InputDecoration(labelText: 'Vehicle registration number', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          FilledButton(onPressed: _busy ? null : _onboard, child: _busy ? const CircularProgressIndicator() : const Text('Submit vehicle details')),
        ],
      );
    }
    final kyc = auth.partnerKycStatus ?? 'PENDING';
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _FeatureHeader(
          icon: Icons.delivery_dining_outlined,
          title: 'Partner profile',
          subtitle: 'KYC status: $kyc · ${_online ? 'Online' : 'Offline'}',
        ),
        const SizedBox(height: 12),
        if (kyc == 'VERIFIED') ...[
          TextField(controller: _latitude, keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true), decoration: const InputDecoration(labelText: 'Current latitude', border: OutlineInputBorder())),
          const SizedBox(height: 8),
          TextField(controller: _longitude, keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true), decoration: const InputDecoration(labelText: 'Current longitude', border: OutlineInputBorder())),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _busy || _online ? null : _goOnline,
            child: _busy ? const CircularProgressIndicator() : Text(_online ? 'Online' : 'Save location & go online'),
          ),
          if (!_online)
            const _DataCard(
              title: 'Finish setup',
              subtitle: 'Set your current GPS location. Nearby orders and rides will then appear in Tasks and Rides.',
            ),
        ] else
          const _DataCard(
            title: 'Verification pending',
            subtitle: 'An administrator must verify your KYC before dispatch access is enabled.',
          ),
      ],
    );
  }
}

class _PartnerOrderTasks extends StatefulWidget {
  const _PartnerOrderTasks({required this.localMode});

  final bool localMode;

  @override
  State<_PartnerOrderTasks> createState() => _PartnerOrderTasksState();
}

class _PartnerOrderTasksState extends State<_PartnerOrderTasks> {
  late Future<dynamic> _current;
  final _challengeId = TextEditingController();
  final _otp = TextEditingController();

  @override
  void initState() {
    super.initState();
    _current = _load();
  }

  @override
  void dispose() {
    _challengeId.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<dynamic> _load() {
    if (widget.localMode) return Future.value(_LocalMarketplace.instance.partnerTasks);
    final auth = context.read<AuthProvider>();
    return auth.api.get('/partner/orders/current', accessToken: auth.accessToken);
  }

  Future<void> _verify(String orderId, String type) async {
    if (widget.localMode) {
      final task = _LocalMarketplace.instance.partnerTasks.firstWhere(
        (item) => item['id'] == orderId,
      );
      task['status'] = type == 'pickup-otp' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
      _notify('Demo task updated.');
      setState(() => _current = _load());
      return;
    }
    try {
      final auth = context.read<AuthProvider>();
      await auth.api.post(
        '/partner/orders/$orderId/$type/verify',
        accessToken: auth.accessToken,
        body: {'challenge_id': _challengeId.text.trim(), 'otp': _otp.text.trim()},
      );
      _challengeId.clear();
      _otp.clear();
      setState(() => _current = _load());
      _notify(type == 'pickup-otp' ? 'Pickup verified.' : 'Delivery handover verified.');
    } catch (error) {
      _notify(_message(error));
    }
  }

  void _notify(String text) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          _PageTitle(title: 'Delivery tasks', onRefresh: () => setState(() => _current = _load())),
          Expanded(
            child: _Collection(
              future: _current,
              emptyTitle: 'No assigned delivery tasks',
              emptySubtitle: 'Assigned pickups and deliveries will be listed here.',
              render: (orders) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final order in orders)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Order ${_string(order, 'id')}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text('${_string(order, 'status')} · ${_string(order, 'total_amount')}'),
                            const SizedBox(height: 8),
                            if (['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].contains(order['status'])) ...[
                              TextField(controller: _challengeId, decoration: const InputDecoration(labelText: 'OTP challenge ID')),
                              TextField(controller: _otp, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '4–6 digit OTP')),
                              const SizedBox(height: 8),
                              FilledButton.tonal(
                                onPressed: () => _verify(
                                  _string(order, 'id'),
                                  order['status'] == 'READY_FOR_PICKUP'
                                      ? 'pickup-otp'
                                      : 'handover-otp',
                                ),
                                child: Text(order['status'] == 'READY_FOR_PICKUP' ? 'Verify pickup OTP' : 'Verify handover OTP'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      );
}

class _RideTasksPage extends StatefulWidget {
  const _RideTasksPage({required this.localMode});

  final bool localMode;

  @override
  State<_RideTasksPage> createState() => _RideTasksPageState();
}

class _RideTasksPageState extends State<_RideTasksPage> {
  late Future<dynamic> _rides;
  final _challenge = TextEditingController();
  final _otp = TextEditingController();

  @override
  void initState() {
    super.initState();
    _rides = _load();
  }

  @override
  void dispose() {
    _challenge.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<dynamic> _load() {
    if (widget.localMode) return Future.value(_LocalMarketplace.instance.rides);
    final auth = context.read<AuthProvider>();
    return auth.api.get('/rides/dispatch/queue', accessToken: auth.accessToken);
  }

  Future<void> _accept(Map<String, dynamic> ride) async {
    try {
      if (widget.localMode) {
        ride['status'] = 'ACCEPTED';
        setState(() => _rides = _load());
        return;
      }
      final auth = context.read<AuthProvider>();
      await auth.api.post(
        '/rides/${ride['id']}/accept',
        accessToken: auth.accessToken,
      );
      setState(() => _rides = _load());
      _notify('Ride accepted. Ask the customer for the ride-start OTP.');
    } catch (error) {
      _notify(_message(error));
    }
  }

  Future<void> _start(Map<String, dynamic> ride) async {
    try {
      if (widget.localMode) {
        ride['status'] = 'IN_PROGRESS';
        setState(() => _rides = _load());
        return;
      }
      final auth = context.read<AuthProvider>();
      await auth.api.patch(
        '/rides/${ride['id']}/start',
        accessToken: auth.accessToken,
        body: {'challenge_id': _challenge.text.trim(), 'otp': _otp.text.trim()},
      );
      setState(() => _rides = _load());
      _notify('Ride started.');
    } catch (error) {
      _notify(_message(error));
    }
  }

  Future<void> _complete(Map<String, dynamic> ride) async {
    try {
      if (widget.localMode) {
        ride['status'] = 'COMPLETED';
        setState(() => _rides = _load());
        return;
      }
      final auth = context.read<AuthProvider>();
      await auth.api.patch(
        '/rides/${ride['id']}/complete',
        accessToken: auth.accessToken,
      );
      setState(() => _rides = _load());
      _notify('Ride completed.');
    } catch (error) {
      _notify(_message(error));
    }
  }

  void _notify(String text) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          _PageTitle(title: 'Nearby ride requests', onRefresh: () => setState(() => _rides = _load())),
          Expanded(
            child: _Collection(
              future: _rides,
              emptyTitle: 'No ride requests nearby',
              emptySubtitle: 'When you are online and verified, matching rides appear here.',
              render: (rides) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final ride in rides)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${_string(ride, 'vehicle_type')} · ₹${_string(ride, 'estimated_fare')}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text('${_string(ride, 'distance_km')} km · ${_string(ride, 'status')}'),
                            Text('Pickup: ${_string(ride, 'pickup_latitude')}, ${_string(ride, 'pickup_longitude')}'),
                            Text('Drop: ${_string(ride, 'drop_latitude')}, ${_string(ride, 'drop_longitude')}'),
                            const SizedBox(height: 8),
                            if (ride['status'] == 'REQUESTED')
                              FilledButton(onPressed: () => _accept(ride), child: const Text('Accept ride')),
                            if (ride['status'] == 'ACCEPTED') ...[
                              TextField(controller: _challenge, decoration: const InputDecoration(labelText: 'Ride-start OTP challenge ID')),
                              TextField(controller: _otp, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '4-digit ride-start OTP')),
                              FilledButton.tonal(onPressed: () => _start(ride), child: const Text('Start ride')),
                            ],
                            if (ride['status'] == 'IN_PROGRESS')
                              FilledButton.tonal(onPressed: () => _complete(ride), child: const Text('Complete ride')),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      );
}

class _WalletRewardsPage extends StatefulWidget {
  const _WalletRewardsPage({
    required this.localMode,
    required this.role,
  });

  final bool localMode;
  final UserRole role;

  @override
  State<_WalletRewardsPage> createState() => _WalletRewardsPageState();
}

class _WalletRewardsPageState extends State<_WalletRewardsPage> {
  late Future<dynamic> _wallet;
  late Future<dynamic> _transactions;
  late Future<dynamic> _loyalty;
  late Future<dynamic> _scratchCards;
  final _amount = TextEditingController(text: '500');
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  void _refresh() {
    if (widget.localMode) {
      _wallet = Future.value({
        'balance': _LocalMarketplace.instance.walletBalance,
        'currency': 'INR',
      });
      _transactions = Future.value([
        for (final order in _LocalMarketplace.instance.orders)
          {
            'type': 'ORDER_PAYMENT',
            'description': 'Order ${order['id']}',
            'amount': order['total_amount'],
            'direction': 'DEBIT',
          },
      ]);
      _loyalty = Future.value({
        'coins_balance': _LocalMarketplace.instance.coins,
        'vip_active': _LocalMarketplace.instance.vipActive,
      });
      _scratchCards = Future.value([]);
    } else {
      final auth = context.read<AuthProvider>();
      _wallet = auth.api.get('/wallet', accessToken: auth.accessToken);
      _transactions = auth.api.get('/wallet/transactions', accessToken: auth.accessToken);
      if (widget.role == UserRole.customer) {
        _loyalty = auth.api.get('/loyalty', accessToken: auth.accessToken);
        _scratchCards =
            auth.api.get('/loyalty/scratch-cards', accessToken: auth.accessToken);
      } else {
        _loyalty = Future.value({'coins': 0});
        _scratchCards = Future.value([]);
      }
    }
  }

  Future<void> _recharge() async {
    final amount = double.tryParse(_amount.text);
    if (amount == null || amount < 50 || amount > 50000) {
      _notify('Wallet recharge must be between ₹50 and ₹50,000.');
      return;
    }
    if (widget.localMode) {
      setState(() {
        _LocalMarketplace.instance.walletBalance += amount;
        _refresh();
      });
      _notify('Demo wallet recharged.');
      return;
    }
    await _run(() async {
      final auth = context.read<AuthProvider>();
      final result = await auth.api.post(
        '/payments/wallet/recharge',
        accessToken: auth.accessToken,
        body: {'amount': amount},
      );
      _notify('Recharge request created: ${result.toString()}');
      setState(_refresh);
    });
  }

  Future<void> _subscribeVip() async {
    if (widget.localMode) {
      setState(() {
        _LocalMarketplace.instance.vipActive = true;
        _LocalMarketplace.instance.walletBalance -= 99;
        _refresh();
      });
      _notify('VIP Pass activated in demo mode.');
      return;
    }
    await _run(() async {
      final auth = context.read<AuthProvider>();
      await auth.api.post('/loyalty/vip/subscribe', accessToken: auth.accessToken);
      setState(_refresh);
      _notify('VIP Pass activated.');
    });
  }

  Future<void> _scratch(Map<String, dynamic> card) async {
    if (widget.localMode) {
      card['status'] = 'SCRATCHED';
      card['reward_coins'] = 10;
      setState(() {
        _LocalMarketplace.instance.coins += 10;
        _scratchCards = Future.value([card]);
      });
      _notify('You won 10 KuchhV Coins!');
      return;
    }
    await _run(() async {
      final auth = context.read<AuthProvider>();
      await auth.api.post(
        '/loyalty/scratch-cards/${card['id']}/scratch',
        accessToken: auth.accessToken,
      );
      setState(_refresh);
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } catch (error) {
      _notify(_message(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notify(String text) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: () async => setState(_refresh),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const _FeatureHeader(
              icon: Icons.account_balance_wallet_outlined,
              title: 'KuchhV Pay & Rewards',
              subtitle: 'Wallet activity, VIP benefits, coins, and scratch cards.',
            ),
            const SizedBox(height: 10),
            _WalletSummary(wallet: _wallet, loyalty: _loyalty),
            if (widget.localMode && widget.role == UserRole.customer) ...[
              TextField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Demo recharge amount (₹)', border: OutlineInputBorder())),
              const SizedBox(height: 8),
              FilledButton.tonal(onPressed: _recharge, child: const Text('Recharge demo wallet')),
            ] else if (!widget.localMode && widget.role == UserRole.customer)
              const _DataCard(
                title: 'Wallet recharge',
                subtitle: 'Use the live payment flow to recharge your wallet. A payment order is created securely by the backend.',
              ),
            if (widget.role == UserRole.customer) ...[
            const SizedBox(height: 16),
            FutureBuilder<dynamic>(
              future: _loyalty,
              builder: (context, snapshot) {
                final loyalty = snapshot.data;
                final vip = loyalty is Map ? loyalty['vip'] : null;
                final active = loyalty is Map &&
                    (vip is Map && vip['active'] == true ||
                        loyalty['vip_active'] == true ||
                        loyalty['vip_status'] == 'ACTIVE');
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.workspace_premium_outlined),
                    title: Text(active ? 'KuchhV VIP active' : 'KuchhV VIP Pass · ₹99'),
                    subtitle: const Text('Qualifying free deliveries, priority dispatch, and exclusive deals.'),
                    trailing: FilledButton.tonal(
                      onPressed: _busy || active ? null : _subscribeVip,
                      child: Text(active ? 'Active' : 'Subscribe'),
                    ),

                  ),
                );
            },
            ),
            const SizedBox(height: 8),
            Text('Scratch cards', style: Theme.of(context).textTheme.titleMedium),
            FutureBuilder<dynamic>(
              future: _scratchCards,
              builder: (context, snapshot) {
                if (snapshot.hasError) return _FeatureError(_message(snapshot.error!));
                if (snapshot.connectionState != ConnectionState.done) {
                  return const LinearProgressIndicator();
                }
                final cards = _maps(snapshot.data);
                if (cards.isEmpty) {
                  return _DataCard(title: 'No scratch cards yet', subtitle: 'Eligible completed orders can unlock rewards.');
                }
                return Column(
                  children: [
                    for (final card in cards)
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.card_giftcard_outlined),
                          title: Text(card['status'] == 'SCRATCHED' ? 'Reward: ${_string(card, 'reward_coins')} coins' : 'Reward waiting'),
                          trailing: card['status'] == 'AVAILABLE'
                              ? TextButton(onPressed: () => _scratch(card), child: const Text('Scratch'))
                              : null,
                        ),
                      ),
                  ],
                );
            },
          ),
        ],
            const SizedBox(height: 14),
            Text('Wallet transactions', style: Theme.of(context).textTheme.titleMedium),
            _Collection(
              future: _transactions,
              emptyTitle: 'No transactions yet',
              emptySubtitle: 'Wallet activity will show here.',
              render: (rows) => Column(
                children: [
                  for (final transaction in rows)
                    _DataCard(
                      title: _string(transaction, 'description', _string(transaction, 'type')),
                      subtitle: '${_string(transaction, 'direction')} ₹${_string(transaction, 'amount')} · ${_string(transaction, 'created_at')}',
                    ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _WalletSummary extends StatelessWidget {
  const _WalletSummary({required this.wallet, required this.loyalty});

  final Future<dynamic> wallet;
  final Future<dynamic> loyalty;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(
            child: _SummaryCard(
              title: 'Wallet balance',
              icon: Icons.account_balance_wallet_outlined,
              future: wallet,
              valueKey: 'balance',
              prefix: '₹',
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _SummaryCard(
              title: 'KuchhV Coins',
              icon: Icons.monetization_on_outlined,
              future: loyalty,
              valueKey: 'coins_balance',
              fallbackValueKey: 'coins',
            ),
          ),
        ],
      );
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.icon,
    required this.future,
    required this.valueKey,
    this.prefix = '',
    this.fallbackValueKey,
  });

  final String title;
  final IconData icon;
  final Future<dynamic> future;
  final String valueKey;
  final String prefix;
  final String? fallbackValueKey;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: FutureBuilder<dynamic>(
            future: future,
            builder: (context, snapshot) {
              final value = snapshot.data;
              final raw = value is Map
                  ? value[valueKey] ?? value[fallbackValueKey]
                  : null;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(height: 8),
                  Text(title, style: Theme.of(context).textTheme.labelLarge),
                  Text(
                    raw == null ? '—' : '$prefix$raw',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ],
              );
            },
          ),
        ),
      );
}
