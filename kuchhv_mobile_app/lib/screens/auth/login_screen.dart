import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  UserRole _role = UserRole.customer;
  bool _isRegistering = false;
  bool _isBusy = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isBusy = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      if (_isRegistering) {
        await auth.register(
          role: _role,
          name: _nameController.text,
          phone: _phoneController.text,
          password: _passwordController.text,
        );
        await auth.saveName(_nameController.text);
      } else {
        await auth.login(
          expectedRole: _role,
          phone: _phoneController.text,
          password: _passwordController.text,
        );
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = _readableError(error));
      }
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  String _readableError(Object error) {
    final message = error.toString();
    if (message.contains('SocketException') ||
        message.contains('TimeoutException') ||
        message.contains('ClientException')) {
      return 'Could not reach KuchhV right now. Check your connection and try again, or use demo mode.';
    }
    return message.replaceFirst('Bad state: ', '').replaceFirst('Exception: ', '');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
              children: [
                Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.bolt, color: Colors.white, size: 30),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'KuchhV',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF17352B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                Text(
                  _isRegistering ? 'Create your account' : 'Welcome to KuchhV',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF17352B),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isRegistering
                      ? 'Choose your role to get started.'
                      : 'Sign in to continue to your KuchhV dashboard.',
                  style: theme.textTheme.bodyLarge?.copyWith(color: Colors.black54),
                ),
                const SizedBox(height: 24),
                Text('Continue as', style: theme.textTheme.titleMedium),
                const SizedBox(height: 10),
                for (final role in UserRole.values)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _RoleOption(
                      role: role,
                      selected: role == _role,
                      onTap: () => setState(() {
                        _role = role;
                        _error = null;
                      }),
                    ),
                  ),
                const SizedBox(height: 10),
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      if (_isRegistering) ...[
                        TextFormField(
                          controller: _nameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Full name',
                            prefixIcon: Icon(Icons.person_outline),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) => value == null || value.trim().isEmpty
                              ? 'Enter your name'
                              : null,
                        ),
                        const SizedBox(height: 14),
                      ],
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Phone number',
                          hintText: '+919876543210',
                          prefixIcon: Icon(Icons.phone_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          final phone = value?.trim() ?? '';
                          return RegExp(r'^\+?[0-9]{10,15}$').hasMatch(phone)
                              ? null
                              : 'Enter a valid phone number (10–15 digits)';
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword,
                            ),
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                        validator: (value) {
                          final password = value ?? '';
                          if (password.isEmpty) return 'Enter your password';
                          if (_isRegistering && password.length < 8) {
                            return 'Use at least 8 characters';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(color: theme.colorScheme.onErrorContainer),
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: _isBusy ? null : _submit,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                  ),
                  child: _isBusy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(_isRegistering ? 'Create account' : 'Sign in'),
                ),
                TextButton(
                  onPressed: _isBusy
                      ? null
                      : () => setState(() {
                            _isRegistering = !_isRegistering;
                            _error = null;
                          }),
                  child: Text(
                    _isRegistering
                        ? 'Already have an account? Sign in'
                        : 'New to KuchhV? Create an account',
                  ),
                ),
                const Divider(height: 28),
                OutlinedButton.icon(
                  onPressed: _isBusy
                      ? null
                      : () => context.read<AuthProvider>().startDemo(_role),
                  icon: const Icon(Icons.wifi_off_outlined),
                  label: const Text('Try Demo Mode (offline)'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Demo mode uses sample information and does not connect to the live service.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleOption extends StatelessWidget {
  const _RoleOption({
    required this.role,
    required this.selected,
    required this.onTap,
  });

  final UserRole role;
  final bool selected;
  final VoidCallback onTap;

  IconData get _icon => switch (role) {
        UserRole.customer => Icons.shopping_bag_outlined,
        UserRole.vendor => Icons.storefront_outlined,
        UserRole.serviceProvider => Icons.home_repair_service_outlined,
        UserRole.deliveryPartner => Icons.delivery_dining_outlined,
      };

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return Material(
      color: selected ? color.withOpacity(0.08) : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? color : Colors.black.withOpacity(0.08),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(_icon, color: selected ? color : Colors.black54),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(role.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                      role.description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (selected) Icon(Icons.check_circle, color: color),
            ],
          ),
        ),
      ),
    );
  }
}
