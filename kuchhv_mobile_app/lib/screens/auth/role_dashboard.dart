import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class RoleDashboard extends StatefulWidget {
  const RoleDashboard({required this.role, super.key});

  final UserRole role;

  @override
  State<RoleDashboard> createState() => _RoleDashboardState();
}

class _RoleDashboardState extends State<RoleDashboard> {
  int _selectedIndex = 0;

  List<_DashboardTab> get _tabs => switch (widget.role) {
        UserRole.customer => const [
            _DashboardTab('Home', Icons.home_outlined),
            _DashboardTab('Orders', Icons.receipt_long_outlined),
            _DashboardTab('Wallet', Icons.account_balance_wallet_outlined),
          ],
        UserRole.vendor => const [
            _DashboardTab('Shop', Icons.storefront_outlined),
            _DashboardTab('Orders', Icons.receipt_long_outlined),
            _DashboardTab('Products', Icons.inventory_2_outlined),
          ],
        UserRole.serviceProvider => const [
            _DashboardTab('Requests', Icons.home_repair_service_outlined),
          ],
        UserRole.deliveryPartner => const [
            _DashboardTab('Partner', Icons.delivery_dining_outlined),
            _DashboardTab('Dispatch', Icons.local_shipping_outlined),
            _DashboardTab('Earnings', Icons.account_balance_wallet_outlined),
          ],
      };

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final selected = _tabs[_selectedIndex];
    return Scaffold(
      appBar: AppBar(
        title: Text(selected.label, style: const TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Log out',
            onPressed: () => _logout(context),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (auth.isDemo) const _DemoModeNotice(),
            Expanded(
              child: auth.isDemo
                  ? _DemoRoleContent(role: widget.role, tabIndex: _selectedIndex)
                  : _buildLiveTab(context, auth),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: [
          for (final tab in _tabs)
            NavigationDestination(
              icon: Icon(tab.icon),
              selectedIcon: Icon(tab.icon, fill: 1),
              label: tab.label,
            ),
        ],
      ),
    );
  }

  Widget _buildLiveTab(BuildContext context, AuthProvider auth) {
    switch (widget.role) {
      case UserRole.customer:
        return switch (_selectedIndex) {
          1 => _ApiDataPage(
              title: 'Your orders',
              load: () => auth.api.get('/orders/customer', accessToken: auth.accessToken),
            ),
          2 => _ApiDataPage(
              title: 'KuchhV wallet',
              load: () => auth.api.get('/wallet', accessToken: auth.accessToken),
              secondaryLoad: () => auth.api.get(
                '/wallet/transactions',
                accessToken: auth.accessToken,
              ),
              secondaryTitle: 'Recent transactions',
            ),
          _ => _WelcomePanel(role: widget.role, auth: auth),
        };
      case UserRole.vendor:
        if (auth.shopId == null && _selectedIndex != 0) {
          return const _ShopSetupPanel();
        }
        return switch (_selectedIndex) {
          1 when auth.shopId != null => _ApiDataPage(
              title: 'Shop orders',
              load: () => auth.api.get(
                '/vendor/orders?shop_id=${auth.shopId}',
                accessToken: auth.accessToken,
              ),
            ),
          2 when auth.shopId != null => _ApiDataPage(
              title: 'Products and inventory',
              load: () => auth.api.get(
                '/vendor/products?shop_id=${auth.shopId}',
                accessToken: auth.accessToken,
              ),
              action: _ProductCreateAction(shopId: auth.shopId!),
            ),
          _ => const _ShopSetupPanel(),
        };
      case UserRole.serviceProvider:
        return _ServiceRequestFeed(auth: auth);
      case UserRole.deliveryPartner:
        return switch (_selectedIndex) {
          1 => auth.partnerId == null
              ? const _PartnerSetupPanel()
              : _ApiDataPage(
                  title: 'Delivery dispatch queue',
                  load: () => auth.api.get(
                    '/partner/dispatch/queue',
                    accessToken: auth.accessToken,
                  ),
                ),
          2 => _ApiDataPage(
              title: 'Earnings and wallet activity',
              load: () => auth.api.get(
                '/wallet/transactions',
                accessToken: auth.accessToken,
              ),
            ),
          _ => const _PartnerSetupPanel(),
        };
    }
  }

  Future<void> _logout(BuildContext context) async {
    try {
      await context.read<AuthProvider>().logout();
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not log out: $error')),
        );
      }
    }
  }
}

class _DashboardTab {
  const _DashboardTab(this.label, this.icon);

  final String label;
  final IconData icon;
}

class _WelcomePanel extends StatelessWidget {
  const _WelcomePanel({required this.role, required this.auth});

  final UserRole role;
  final AuthProvider auth;

  @override
  Widget build(BuildContext context) {
    final title = auth.name?.isNotEmpty == true ? 'Hello, ${auth.name}' : 'Hello!';
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const _RoleHeader(
          icon: Icons.shopping_bag_outlined,
          title: 'Your neighborhood, at your fingertips.',
          subtitle: 'Your KuchhV customer account is connected.',
        ),
        const SizedBox(height: 18),
        _InfoCard(
          icon: Icons.person_outline,
          title: title,
          subtitle: auth.phone ?? 'Signed in as ${role.label}',
        ),
        const _InfoCard(
          icon: Icons.receipt_long_outlined,
          title: 'Orders',
          subtitle: 'View your orders and their latest status in the Orders tab.',
        ),
        const _InfoCard(
          icon: Icons.account_balance_wallet_outlined,
          title: 'Wallet and rewards',
          subtitle: 'Your live wallet balance and activity are in the Wallet tab.',
        ),
      ],
    );
  }
}

class _ShopSetupPanel extends StatefulWidget {
  const _ShopSetupPanel();

  @override
  State<_ShopSetupPanel> createState() => _ShopSetupPanelState();
}

class _ShopSetupPanelState extends State<_ShopSetupPanel> {
  final _name = TextEditingController();
  final _category = TextEditingController();
  final _address = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _category.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _registerShop() async {
    if (_name.text.trim().isEmpty ||
        _category.text.trim().isEmpty ||
        _address.text.trim().isEmpty) {
      setState(() => _error = 'Complete all shop details to continue.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
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
    } catch (error) {
      if (mounted) setState(() => _error = _readableError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.shopId != null) {
      return _WelcomePanel(role: UserRole.vendor, auth: auth);
    }
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const _RoleHeader(
          icon: Icons.storefront_outlined,
          title: 'Set up your shop',
          subtitle: 'Register your shop to manage products and incoming orders.',
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Shop name', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _category,
          decoration: const InputDecoration(labelText: 'Category', hintText: 'Groceries, Restaurant…', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _address,
          maxLines: 2,
          decoration: const InputDecoration(labelText: 'Shop address', border: OutlineInputBorder()),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _ErrorNotice(message: _error!),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _busy ? null : _registerShop,
          child: _busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Register shop'),
        ),
      ],
    );
  }
}

class _ProductCreateAction extends StatelessWidget {
  const _ProductCreateAction({required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: 'Add product',
        onPressed: () => _showCreateProduct(context, shopId),
        icon: const Icon(Icons.add_box_outlined),
      );
}

Future<void> _showCreateProduct(BuildContext context, String shopId) async {
  final name = TextEditingController();
  final category = TextEditingController();
  final price = TextEditingController();
  final stock = TextEditingController();
  String? error;
  var busy = false;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Add a product'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Product name')),
              TextField(controller: category, decoration: const InputDecoration(labelText: 'Category')),
              TextField(controller: price, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price')),
              TextField(controller: stock, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stock quantity')),
              if (error != null) _ErrorNotice(message: error!),
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
                      setState(() => error = 'Enter a name, category, valid price, and stock.');
                      return;
                    }
                    setState(() => busy = true);
                    try {
                      final auth = dialogContext.read<AuthProvider>();
                      await auth.api.post(
                        '/vendor/products',
                        accessToken: auth.accessToken,
                        body: {
                          'shop_id': shopId,
                          'name': name.text.trim(),
                          'category': category.text.trim(),
                          'price': priceValue,
                          'stock': stockValue,
                        },
                      );
                      if (dialogContext.mounted) Navigator.pop(dialogContext);
                    } catch (exception) {
                      setState(() {
                        error = _readableError(exception);
                        busy = false;
                      });
                    }
                  },
            child: busy ? const Text('Saving…') : const Text('Save product'),
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

class _PartnerSetupPanel extends StatefulWidget {
  const _PartnerSetupPanel();

  @override
  State<_PartnerSetupPanel> createState() => _PartnerSetupPanelState();
}

class _PartnerSetupPanelState extends State<_PartnerSetupPanel> {
  final _vehicleNumber = TextEditingController();
  String _vehicleType = 'BIKE';
  bool _busy = false;
  bool _online = false;
  String? _error;

  @override
  void dispose() {
    _vehicleNumber.dispose();
    super.dispose();
  }

  Future<void> _onboard() async {
    if (_vehicleNumber.text.trim().isEmpty) {
      setState(() => _error = 'Enter your vehicle number.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
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
    } catch (error) {
      if (mounted) setState(() => _error = _readableError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _goOnline() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await auth.api.patch(
        '/partner/${auth.partnerId}/status',
        accessToken: auth.accessToken,
        body: {'is_online': true},
      );
      if (mounted) setState(() => _online = true);
    } catch (error) {
      if (mounted) setState(() => _error = _readableError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.partnerId != null) {
      final status = auth.partnerKycStatus ?? 'PENDING';
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _RoleHeader(
            icon: Icons.delivery_dining_outlined,
            title: 'Partner profile',
            subtitle: 'KYC status: $status',
          ),
          const SizedBox(height: 18),
          _InfoCard(
            icon: status == 'VERIFIED' ? Icons.verified_outlined : Icons.hourglass_top,
            title: status == 'VERIFIED' ? 'Account verified' : 'Verification pending',
            subtitle: status == 'VERIFIED'
                ? _online
                    ? 'You are online. Open Dispatch to check eligible delivery requests.'
                    : 'Go online to receive eligible delivery requests.'
                : 'Online dispatch is available after an administrator verifies your KYC.',
          ),
          if (status == 'VERIFIED') ...[
            if (_error != null) ...[
              const SizedBox(height: 12),
              _ErrorNotice(message: _error!),
            ],
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _busy || _online ? null : _goOnline,
              icon: const Icon(Icons.wifi),
              label: Text(_online ? 'You are online' : 'Go online'),
            ),
          ],
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const _RoleHeader(
          icon: Icons.delivery_dining_outlined,
          title: 'Partner onboarding',
          subtitle: 'Add your vehicle details. Dispatch access requires verified KYC.',
        ),
        const SizedBox(height: 20),
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
        const SizedBox(height: 12),
        TextField(
          controller: _vehicleNumber,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Vehicle registration number', border: OutlineInputBorder()),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _ErrorNotice(message: _error!),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _busy ? null : _onboard,
          child: _busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Submit vehicle details'),
        ),
      ],
    );
  }
}

class _ServiceRequestFeed extends StatelessWidget {
  const _ServiceRequestFeed({required this.auth});

  final AuthProvider auth;

  @override
  Widget build(BuildContext context) => _ApiDataPage(
        title: 'Available home-service requests',
        load: () => auth.api.get(
          '/service-requests/feed',
          accessToken: auth.accessToken,
        ),
        itemAction: (item, reload) async {
          final id = item['id'];
          if (id is! String) throw const FormatException('Request ID is missing.');
          await auth.api.post('/service-requests/$id/accept', accessToken: auth.accessToken);
          reload();
        },
        itemActionLabel: 'Accept request',
      );
}

class _ApiDataPage extends StatefulWidget {
  const _ApiDataPage({
    required this.title,
    required this.load,
    this.secondaryLoad,
    this.secondaryTitle,
    this.action,
    this.itemAction,
    this.itemActionLabel,
  });

  final String title;
  final Future<dynamic> Function() load;
  final Future<dynamic> Function()? secondaryLoad;
  final String? secondaryTitle;
  final Widget? action;
  final Future<void> Function(Map<String, dynamic>, VoidCallback)? itemAction;
  final String? itemActionLabel;

  @override
  State<_ApiDataPage> createState() => _ApiDataPageState();
}

class _ApiDataPageState extends State<_ApiDataPage> {
  late Future<dynamic> _future;
  late Future<dynamic>? _secondaryFuture;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void didUpdateWidget(covariant _ApiDataPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.load != widget.load ||
        oldWidget.secondaryLoad != widget.secondaryLoad) {
      _refresh();
    }
  }

  void _refresh() {
    _future = widget.load();
    _secondaryFuture = widget.secondaryLoad?.call();
  }

  void _reload() => setState(_refresh);

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: () async => _reload(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(widget.title, style: Theme.of(context).textTheme.titleLarge),
                ),
                if (widget.action != null) widget.action!,
                IconButton(
                  tooltip: 'Refresh',
                  onPressed: _reload,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _DataFuture(
              future: _future,
              itemAction: widget.itemAction,
              itemActionLabel: widget.itemActionLabel,
              reload: _reload,
            ),
            if (_secondaryFuture != null) ...[
              const SizedBox(height: 20),
              Text(widget.secondaryTitle ?? 'More', style: Theme.of(context).textTheme.titleMedium),
              _DataFuture(future: _secondaryFuture!, reload: _reload),
            ],
          ],
        ),
      );
}

class _DataFuture extends StatelessWidget {
  const _DataFuture({
    required this.future,
    required this.reload,
    this.itemAction,
    this.itemActionLabel,
  });

  final Future<dynamic> future;
  final VoidCallback reload;
  final Future<void> Function(Map<String, dynamic>, VoidCallback)? itemAction;
  final String? itemActionLabel;

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Padding(
              padding: EdgeInsets.all(30),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          if (snapshot.hasError) {
            return Column(
              children: [
                _ErrorNotice(message: _readableError(snapshot.error!)),
                TextButton.icon(
                  onPressed: reload,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try again'),
                ),
              ],
            );
          }
          final value = snapshot.data;
          final items = value is List
              ? value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList()
              : <Map<String, dynamic>>[];
          if (value is List && items.isEmpty) {
            return const _InfoCard(
              icon: Icons.inbox_outlined,
              title: 'Nothing here yet',
              subtitle: 'New activity will appear here when it is available.',
            );
          }
          if (value is Map) {
            final fields = Map<String, dynamic>.from(value);
            if (fields.isEmpty) {
              return const _InfoCard(
                icon: Icons.info_outline,
                title: 'No information available',
                subtitle: 'The service returned an empty response.',
              );
            }
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final entry in fields.entries)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 5),
                        child: Text('${_prettyKey(entry.key)}: ${_display(entry.value)}'),
                      ),
                  ],
                ),
              ),
            );
          }
          if (items.isEmpty) {
            return _InfoCard(
              icon: Icons.info_outline,
              title: 'KuchhV service response',
              subtitle: _display(value),
            );
          }
          return Column(
            children: [
              for (final item in items) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final entry in item.entries.take(7))
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Text(
                              '${_prettyKey(entry.key)}: ${_display(entry.value)}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        if (itemAction != null) ...[
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: _RequestAction(
                              item: item,
                              action: itemAction!,
                              label: itemActionLabel ?? 'Continue',
                              reload: reload,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      );
}

class _RequestAction extends StatefulWidget {
  const _RequestAction({
    required this.item,
    required this.action,
    required this.label,
    required this.reload,
  });

  final Map<String, dynamic> item;
  final Future<void> Function(Map<String, dynamic>, VoidCallback) action;
  final String label;
  final VoidCallback reload;

  @override
  State<_RequestAction> createState() => _RequestActionState();
}

class _RequestActionState extends State<_RequestAction> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) => FilledButton.tonal(
        onPressed: _busy
            ? null
            : () async {
                setState(() => _busy = true);
                try {
                  await widget.action(widget.item, widget.reload);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Request accepted.')),
                    );
                  }
                } catch (error) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(_readableError(error))),
                    );
                  }
                } finally {
                  if (mounted) setState(() => _busy = false);
                }
              },
        child: _busy
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(widget.label),
      );
}

class _DemoRoleContent extends StatelessWidget {
  const _DemoRoleContent({required this.role, required this.tabIndex});

  final UserRole role;
  final int tabIndex;

  @override
  Widget build(BuildContext context) {
    final (icon, title, description) = switch (role) {
      UserRole.customer => switch (tabIndex) {
          1 => (Icons.receipt_long_outlined, 'Sample orders', 'Demo order history appears here. No live orders are loaded.'),
          2 => (Icons.account_balance_wallet_outlined, 'Demo wallet', 'Sample wallet balances are illustrative only.'),
          _ => (Icons.shopping_bag_outlined, 'Customer demo', 'Explore the customer experience. Live shopping requires signing in to the KuchhV service.'),
        },
      UserRole.vendor => switch (tabIndex) {
          1 => (Icons.receipt_long_outlined, 'Sample orders', 'Demo vendor orders appear here. No live orders are loaded.'),
          2 => (Icons.inventory_2_outlined, 'Sample products', 'Demo inventory is not connected to a live shop.'),
          _ => (Icons.storefront_outlined, 'Vendor demo', 'Preview the vendor dashboard without changing live shop data.'),
        },
      UserRole.serviceProvider => (
          Icons.home_repair_service_outlined,
          'Service provider demo',
          'Sample service requests are not live and cannot be accepted.',
        ),
      UserRole.deliveryPartner => switch (tabIndex) {
          1 => (Icons.local_shipping_outlined, 'Sample dispatch', 'Demo delivery requests are not live.'),
          2 => (Icons.account_balance_wallet_outlined, 'Demo earnings', 'Sample earnings are illustrative only.'),
          _ => (Icons.delivery_dining_outlined, 'Partner demo', 'Preview the delivery partner dashboard offline.'),
        },
    };
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        _RoleHeader(icon: icon, title: title, subtitle: description),
        const SizedBox(height: 16),
        const _InfoCard(
          icon: Icons.cloud_off_outlined,
          title: 'Offline preview',
          subtitle: 'Sign in or create an account to load your role-specific live data.',
        ),
      ],
    );
  }
}

class _DemoModeNotice extends StatelessWidget {
  const _DemoModeNotice();

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        color: const Color(0xFFFFF3E0),
        child: const Text(
          'OFFLINE DEMO · Sample content only',
          style: TextStyle(fontWeight: FontWeight.w700),
          textAlign: TextAlign.center,
        ),
      );
}

class _RoleHeader extends StatelessWidget {
  const _RoleHeader({
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
          Icon(icon, size: 46, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text(subtitle, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.black54)),
        ],
      );
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(subtitle),
          ),
        ),
      );
}

class _ErrorNotice extends StatelessWidget {
  const _ErrorNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message,
          style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
        ),
      );
}

String _display(dynamic value) {
  if (value == null) return '—';
  if (value is Map || value is List) return const JsonEncoder.withIndent('  ').convert(value);
  return value.toString();
}

String _prettyKey(String key) => key
    .replaceAll('_', ' ')
    .split(' ')
    .map((word) => word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}')
    .join(' ');

String _readableError(Object error) {
  final message = error.toString();
  if (message.contains('SocketException') ||
      message.contains('TimeoutException') ||
      message.contains('ClientException')) {
    return 'Could not reach KuchhV. Check your connection and try again.';
  }
  return message.replaceFirst('Bad state: ', '').replaceFirst('Exception: ', '');
}
