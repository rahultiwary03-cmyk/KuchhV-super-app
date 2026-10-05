import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';

enum UserRole {
  customer('CUSTOMER', 'Customer', 'Shop local, order, and track deliveries'),
  vendor('VENDOR', 'Vendor', 'Manage your shop, products, and orders'),
  serviceProvider(
    'SERVICE_PROVIDER',
    'Service Provider',
    'Find and manage home-service requests',
  ),
  deliveryPartner(
    'DELIVERY_PARTNER',
    'Delivery / Ride Partner',
    'Manage deliveries and ride requests',
  );

  const UserRole(this.apiValue, this.label, this.description);

  final String apiValue;
  final String label;
  final String description;

  static UserRole? fromApiValue(String? value) {
    for (final role in values) {
      if (role.apiValue == value) return role;
    }
    return null;
  }
}

Future<void> savePartnerKycStatus(String status) async {
  final preferences = await SharedPreferences.getInstance();
  final userId = _userId;
  if (userId == null) return;
  await preferences.setString(_partnerKycKey(userId), status);
  _partnerKycStatus = status;
  notifyListeners();
}

class AuthProvider extends ChangeNotifier {
  AuthProvider({ApiService? apiService}) : api = apiService ?? ApiService();

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  final ApiService api;

  String? _accessToken;
  String? _refreshToken;
  String? _userId;
  String? _name;
  String? _phone;
  String? _shopId;
  String? _partnerId;
  String? _partnerKycStatus;
  UserRole? _role;
  bool _isReady = false;
  bool _isDemo = false;

  String? get accessToken => _accessToken;
  String? get userId => _userId;
  String? get name => _name;
  String? get phone => _phone;
  String? get shopId => _shopId;
  String? get partnerId => _partnerId;
  String? get partnerKycStatus => _partnerKycStatus;
  UserRole? get role => _role;
  bool get isReady => _isReady;
  bool get isDemo => _isDemo;
  bool get isAuthenticated => _role != null && (_isDemo || _accessToken != null);

  Future<void> restoreSession() async {
    final preferences = await SharedPreferences.getInstance();
    final token = preferences.getString(_accessTokenKey);
    _refreshToken = preferences.getString(_refreshTokenKey);

    _partnerKycStatus = preferences.getString(_partnerKycKey);

    if (token != null) {
      try {
        final claims = _readClaims(token);
        final expiry = claims['exp'];
        final role = UserRole.fromApiValue(claims['role'] as String?);
        final subject = claims['sub'] as String?;
        if (expiry is int &&
            expiry > DateTime.now().millisecondsSinceEpoch ~/ 1000 &&
            role != null &&
            subject != null &&
            subject.isNotEmpty) {
          _accessToken = token;
          _role = role;
          _userId = subject;
          _loadUserData(preferences, subject, claims);
        } else {
          await _clearStoredSession(preferences);
        }
      } on FormatException {
        await _clearStoredSession(preferences);
      } on TypeError {
        await _clearStoredSession(preferences);
      }
    }
    _isReady = true;
    notifyListeners();
  }

  Future<void> login({
    required UserRole expectedRole,
    required String phone,
    required String password,
  }) async {
    final response = await api.post(
      '/auth/login',
      body: {'phone': phone.trim(), 'password': password},
    );
    await _saveApiSession(response, expectedRole: expectedRole, phone: phone);
  }

  Future<void> register({
    required UserRole role,
    required String name,
    required String phone,
    required String password,
  }) async {
    await api.post(
      '/auth/register',
      body: {
        'name': name.trim(),
        'phone': phone.trim(),
        'password': password,
        'role': role.apiValue,
      },
    );
    await login(expectedRole: role, phone: phone, password: password);
  }

  Future<void> _saveApiSession(
    dynamic response, {
    required UserRole expectedRole,
    required String phone,
  }) async {
    if (response is! Map<String, dynamic>) {
      throw const FormatException('The authentication response was invalid.');
    }
    final accessToken = response['access_token'];
    final refreshToken = response['refresh_token'];
    if (accessToken is! String || accessToken.isEmpty) {
      throw const FormatException('The server did not return an access token.');
    }

    final claims = _readClaims(accessToken);
    final role = UserRole.fromApiValue(claims['role'] as String?);
    final userId = claims['sub'] as String?;
    if (role == null || userId == null || userId.isEmpty) {
      throw const FormatException('The server returned an invalid user session.');
    }
    if (role != expectedRole) {
      throw StateError(
        'This account is registered as ${role.label}. Select that role to sign in.',
      );
    }

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_accessTokenKey, accessToken);
    if (refreshToken is String) {
      await preferences.setString(_refreshTokenKey, refreshToken);
    } else {
      await preferences.remove(_refreshTokenKey);
    }
    await preferences.setString(_phoneKey(userId), phone.trim());
    _accessToken = accessToken;
    _refreshToken = refreshToken is String ? refreshToken : null;
    _userId = userId;
    _phone = phone.trim();
    _role = role;
    _isDemo = false;
    _loadUserData(preferences, userId, claims);
    notifyListeners();
  }

  void startDemo(UserRole role) {
    _accessToken = null;
    _refreshToken = null;
    _userId = 'offline-demo';
    _name = 'KuchhV Demo';
    _phone = null;
    _shopId = null;
    _partnerId = null;
    _partnerKycStatus = null;
    _role = role;
    _isDemo = true;
    _isReady = true;
    notifyListeners();
  }

  Future<void> logout() async {
    final preferences = await SharedPreferences.getInstance();
    await _clearStoredSession(preferences);
    _accessToken = null;
    _refreshToken = null;
    _userId = null;
    _name = null;
    _phone = null;
    _shopId = null;
    _partnerId = null;
    _role = null;
    _isDemo = false;
    notifyListeners();
  }

  Future<void> saveName(String name) async {
    final preferences = await SharedPreferences.getInstance();
    final userId = _userId;
    if (userId == null) return;
    await preferences.setString(_nameKey(userId), name.trim());
    _name = name.trim();
    notifyListeners();
  }

  Future<void> saveShopId(String shopId) async {
    final preferences = await SharedPreferences.getInstance();
    final userId = _userId;
    if (userId == null) return;
    await preferences.setString(_shopIdKey(userId), shopId);
    _shopId = shopId;
    notifyListeners();
  }

  Future<void> savePartnerId(String partnerId) async {
    final preferences = await SharedPreferences.getInstance();
    final userId = _userId;
    if (userId == null) return;
    await preferences.setString(_partnerIdKey(userId), partnerId);
    _partnerId = partnerId;
    notifyListeners();
  }

  Future<void> _clearStoredSession(SharedPreferences preferences) async {
    await preferences.remove(_accessTokenKey);
    await preferences.remove(_refreshTokenKey);
  }

  void _loadUserData(
    SharedPreferences preferences,
    String userId,
    Map<String, dynamic> claims,
  ) {
    _name = preferences.getString(_nameKey(userId));
    _phone = claims['phone'] as String? ?? preferences.getString(_phoneKey(userId));
    _shopId = preferences.getString(_shopIdKey(userId));
    _partnerId = preferences.getString(_partnerIdKey(userId));
    _partnerKycStatus = preferences.getString(_partnerKycKey(userId));
  }

  String _nameKey(String userId) => 'user_name_$userId';
  String _phoneKey(String userId) => 'user_phone_$userId';
  String _shopIdKey(String userId) => 'vendor_shop_id_$userId';
  String _partnerIdKey(String userId) => 'delivery_partner_id_$userId';
  String _partnerKycKey(String userId) => 'delivery_partner_kyc_status_$userId';

  Map<String, dynamic> _readClaims(String token) {
    final pieces = token.split('.');
    if (pieces.length != 3) {
      throw const FormatException('The access token is malformed.');
    }
    final payload = utf8.decode(base64Url.decode(base64Url.normalize(pieces[1])));
    final decoded = jsonDecode(payload);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('The access token payload is invalid.');
    }
    return decoded;
  }
}
