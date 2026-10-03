import 'package:flutter/material.dart';

class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _RoleHomeScreen(
      title: 'Customer',
      headline: 'What do you need today?',
      description:
          'Browse nearby shops, track your orders, or request something that is not in the catalog.',
      icon: Icons.shopping_bag_outlined,
      actions: ['Browse local shops', 'Create a custom request', 'My orders'],
    );
  }
}

class _RoleHomeScreen extends StatelessWidget {
  const _RoleHomeScreen({
    required this.title,
    required this.headline,
    required this.description,
    required this.icon,
    required this.actions,
  });

  final String title;
  final String headline;
  final String description;
  final IconData icon;
  final List<String> actions;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Icon(icon, size: 52, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 20),
          Text(headline, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(description),
          const SizedBox(height: 24),
          for (final action in actions)
            Card(
              child: ListTile(
                title: Text(action),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              ),
            ),
        ],
      ),
    );
  }
}
