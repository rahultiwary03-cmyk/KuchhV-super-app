import 'package:flutter/material.dart';

class VendorHomeScreen extends StatelessWidget {
  const VendorHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vendor')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: const [
          _VendorHeader(),
          SizedBox(height: 24),
          _VendorAction(title: 'Store status', subtitle: 'Set your shop online'),
          _VendorAction(
            title: 'Products & inventory',
            subtitle: 'Update catalog and stock',
          ),
          _VendorAction(
            title: 'Incoming orders',
            subtitle: 'Review and manage new orders',
          ),
        ],
      ),
    );
  }
}

class _VendorHeader extends StatelessWidget {
  const _VendorHeader();

  @override
  Widget build(BuildContext context) {
    return Text(
      'Your shop, at a glance.',
      style: Theme.of(context).textTheme.headlineSmall,
    );
  }
}

class _VendorAction extends StatelessWidget {
  const _VendorAction({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
      ),
    );
  }
}
