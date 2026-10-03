import 'package:flutter/material.dart';

class PartnerHomeScreen extends StatefulWidget {
  const PartnerHomeScreen({super.key});

  @override
  State<PartnerHomeScreen> createState() => _PartnerHomeScreenState();
}

class _PartnerHomeScreenState extends State<PartnerHomeScreen> {
  bool _isOnline = false;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Delivery partner')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Ready when you are.',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          const Text('Go online to receive nearby delivery requests.'),
          const SizedBox(height: 24),
          Card(
            child: SwitchListTile(
              title: Text(_isOnline ? 'You are online' : 'You are offline'),
              subtitle: Text(
                _isOnline
                    ? 'You can receive delivery requests.'
                    : 'Go online when you are ready to deliver.',
              ),
              value: _isOnline,
              activeTrackColor: colorScheme.primary,
              onChanged: (value) => setState(() => _isOnline = value),
            ),
          ),
          const SizedBox(height: 12),
          const Card(
            child: ListTile(
              leading: Icon(Icons.local_shipping_outlined),
              title: Text('Incoming orders'),
              subtitle: Text('New delivery requests will appear here.'),
            ),
          ),
          const Card(
            child: ListTile(
              leading: Icon(Icons.account_balance_wallet_outlined),
              title: Text('Earnings'),
              subtitle: Text('Your delivery earnings will appear here.'),
            ),
          ),
        ],
      ),
    );
  }
}
