import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:kuchhv_mobile_app/providers/auth_provider.dart';
import 'package:kuchhv_mobile_app/services/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('registers and signs in all supported roles from local storage offline',
      () async {
    final api = ApiService(
      client: MockClient((_) async {
        throw const SocketException('offline');
      }),
    );

    for (final role in UserRole.values) {
      final auth = AuthProvider(apiService: api);
      final phone = '+9198765432${UserRole.values.indexOf(role).toString().padLeft(2, '0')}';
      await auth.register(
        role: role,
        name: 'Test ${role.label}',
        phone: phone,
        password: 'strong-password',
      );
      expect(auth.isLocalAccount, isTrue);
      expect(auth.role, role);
      await auth.logout();
      await auth.login(
        expectedRole: role,
        phone: phone,
        password: 'strong-password',
      );
      expect(auth.isAuthenticated, isTrue);
      expect(auth.role, role);
      await auth.logout();
    }
  });

  test('restores local fallback session after app restart', () async {
    final api = ApiService(
      client: MockClient((_) async {
        throw const SocketException('offline');
      }),
    );
    final first = AuthProvider(apiService: api);
    await first.register(
      role: UserRole.serviceProvider,
      name: 'Local Provider',
      phone: '+919876543210',
      password: 'strong-password',
    );

    final restored = AuthProvider(apiService: api);
    await restored.restoreSession();

    expect(restored.isAuthenticated, isTrue);
    expect(restored.isLocalAccount, isTrue);
    expect(restored.role, UserRole.serviceProvider);
    expect(restored.name, 'Local Provider');
  });

  test('does not allow a saved password to authenticate under another role',
      () async {
    final api = ApiService(
      client: MockClient((_) async {
        throw const SocketException('offline');
      }),
    );
    final auth = AuthProvider(apiService: api);
    await auth.register(
      role: UserRole.customer,
      name: 'Local Customer',
      phone: '+919876543210',
      password: 'strong-password',
    );
    await auth.logout();

    await expectLater(
      auth.login(
        expectedRole: UserRole.vendor,
        phone: '+919876543210',
        password: 'strong-password',
      ),
      throwsA(isA<StateError>()),
    );
  });
}
