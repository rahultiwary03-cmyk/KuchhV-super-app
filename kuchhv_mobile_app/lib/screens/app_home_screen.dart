import 'package:flutter/material.dart';

import 'customer/customer_home_screen.dart';
import 'partner/partner_home_screen.dart';
import 'vendor/vendor_home_screen.dart';

class AppHomeScreen extends StatelessWidget {
  const AppHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final roles = [
      (
        title: 'Customer',
        detail: 'Discover local shops and place an order',
        icon: Icons.shopping_bag_outlined,
        screen: const CustomerHomeScreen(),
      ),
      (
        title: 'Vendor',
        detail: 'Manage your shop, products, and orders',
        icon: Icons.storefront_outlined,
        screen: const VendorHomeScreen(),
      ),
      (
        title: 'Delivery partner',
        detail: 'Go online and manage deliveries',
        icon: Icons.delivery_dining_outlined,
        screen: const PartnerHomeScreen(),
      ),
    ];

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
          children: [
            const _BrandMark(),
            const SizedBox(height: 40),
            Text(
              'One app, your\nneighborhood.',
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    height: 1.08,
                    color: const Color(0xFF17352B),
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              'Choose how you want to use KuchhV.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.black54,
                  ),
            ),
            const SizedBox(height: 28),
            for (final role in roles) ...[
              _RoleCard(
                title: role.title,
                detail: role.detail,
                icon: role.icon,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => role.screen),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.bolt, color: Colors.white, size: 30),
        ),
        const SizedBox(width: 12),
        Text(
          'KuchhV',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: const Color(0xFF17352B),
              ),
        ),
      ],
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.title,
    required this.detail,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String detail;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: Colors.black.withOpacity(0.07)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        leading: CircleAvatar(
          backgroundColor:
              Theme.of(context).colorScheme.primary.withOpacity(0.1),
          foregroundColor: Theme.of(context).colorScheme.primary,
          child: Icon(icon),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(detail),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
