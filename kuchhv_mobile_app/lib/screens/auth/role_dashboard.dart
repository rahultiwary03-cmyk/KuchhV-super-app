import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import 'role_features.dart';

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
            _DashboardTab('Store', Icons.storefront_outlined),
            _DashboardTab('Requests', Icons.gavel_outlined),
            _DashboardTab('Services', Icons.home_repair_service_outlined),
            _DashboardTab('Orders', Icons.receipt_long_outlined),
            _DashboardTab('Wallet', Icons.account_balance_wallet_outlined),
          ],
        UserRole.vendor => const [
            _DashboardTab('Shop', Icons.storefront_outlined),
            _DashboardTab('Catalog', Icons.inventory_2_outlined),
            _DashboardTab('Orders', Icons.receipt_long_outlined),
            _DashboardTab('Ads', Icons.campaign_outlined),
          ],
        UserRole.serviceProvider => const [
            _DashboardTab('Requests', Icons.home_repair_service_outlined),
            _DashboardTab('My bookings', Icons.event_note_outlined),
          ],
        UserRole.deliveryPartner => const [
            _DashboardTab('Partner', Icons.delivery_dining_outlined),
            _DashboardTab('Tasks', Icons.local_shipping_outlined),
            _DashboardTab('Rides', Icons.directions_car_outlined),
            _DashboardTab('Bids', Icons.gavel_outlined),
            _DashboardTab('Earnings', Icons.account_balance_wallet_outlined),
          ],
      };

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final selected = _tabs[_selectedIndex];
    final offline = auth.isDemo || auth.isLocalAccount;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          selected.label,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
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
            if (offline) _OfflineNotice(isDemo: auth.isDemo),
            Expanded(
              child: RoleFeaturePage(
                key: ValueKey('${auth.userId}-${widget.role}-$_selectedIndex'),
                role: widget.role,
                tabIndex: _selectedIndex,
                localMode: offline,
              ),
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

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice({required this.isDemo});

  final bool isDemo;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        color: const Color(0xFFFFF3E0),
        child: Text(
          isDemo
              ? 'DEMO MODE · Sample content only'
              : 'LOCAL ACCOUNT · Changes are stored only on this device',
          textAlign: TextAlign.center,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      );
}
