import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:crypto/crypto.dart';
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

class AuthProvider extends ChangeNotifier {
  AuthProvider({ApiService? apiService}) : api = apiService ?? ApiService();

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _localAccountsKey = 'local_fallback_accounts';
  static const _localSessionKey = 'local_fallback_session';

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
  bool _isLocalAccount = false;

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
  bool get isLocalAccount => _isLocalAccount;
  bool get isAuthenticated =>
      _role != null &&
      (_isDemo || _isLocalAccount || _accessToken != null);

  Future<void> restoreSession() async {
    final preferences = await SharedPreferences.getInstance();
    final token = preferences.getString(_accessTokenKey);
    _refreshToken = preferences.getString(_refreshTokenKey);

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

    if (_accessToken == null) {
      final localSession = preferences.getString(_localSessionKey);
      if (localSession != null) {
        final decoded = jsonDecode(localSession);
        if (decoded is Map<String, dynamic>) {
          final localAccount =
              _findLocalAccount(preferences, decoded['phone'] as String?);
          if (localAccount != null) _activateLocalAccount(localAccount);
        }
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
    try {
      final response = await api.post(
        '/auth/login',
        body: {'phone': phone.trim(), 'password': password},
      );
      await _saveApiSession(
        response,
        expectedRole: expectedRole,
        phone: phone,
      );
    } on ApiException catch (error) {
      if (error.statusCode < 500) rethrow;
      if (!await _tryLocalLogin(expectedRole, phone, password)) rethrow;
    } on SocketException {
      if (!await _tryLocalLogin(expectedRole, phone, password)) rethrow;
    } on HttpException {
      if (!await _tryLocalLogin(expectedRole, phone, password)) rethrow;
    } on FormatException {
      if (!await _tryLocalLogin(expectedRole, phone, password)) rethrow;
    } on Exception catch (error) {
      if (!_isNetworkError(error) ||
          !await _tryLocalLogin(expectedRole, phone, password)) {
        rethrow;
      }
    }
  }

  Future<void> register({
    required UserRole role,
    required String name,
    required String phone,
    required String password,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    if (_findLocalAccount(preferences, phone.trim()) != null) {
      throw StateError('An offline account already uses this phone number.');
    }

    try {
      await api.post(
        '/auth/register',
        body: {
          'name': name.trim(),
          'phone': phone.trim(),
          'password': password,
          'role': role.apiValue,
        },
      );
      await _storeLocalAccount(preferences, role, name, phone, password);
      try {
        await login(expectedRole: role, phone: phone, password: password);
      } on ApiException catch (error) {
        if (error.statusCode < 500 ||
            !await _tryLocalLogin(role, phone, password)) {
          rethrow;
        }
      } on SocketException {
        if (!await _tryLocalLogin(role, phone, password)) rethrow;
      } on HttpException {
        if (!await _tryLocalLogin(role, phone, password)) rethrow;
      } on FormatException {
        if (!await _tryLocalLogin(role, phone, password)) rethrow;
      }
    } on ApiException catch (error) {
      if (error.statusCode < 500) rethrow;
      final account = await _storeLocalAccount(
        preferences,
        role,
        name,
        phone,
        password,
      );
      await _activateAndPersistLocalAccount(preferences, account);
    } on SocketException {
      final account = await _storeLocalAccount(
        preferences,
        role,
        name,
        phone,
        password,
      );
      await _activateAndPersistLocalAccount(preferences, account);
    } on HttpException {
      final account = await _storeLocalAccount(
        preferences,
        role,
        name,
        phone,
        password,
      );
      await _activateAndPersistLocalAccount(preferences, account);
    } on FormatException {
      final account = await _storeLocalAccount(
        preferences,
        role,
        name,
        phone,
        password,
      );
      await _activateAndPersistLocalAccount(preferences, account);
    } on Exception catch (error) {
      if (!_isNetworkError(error)) rethrow;
      final account = await _storeLocalAccount(
        preferences,
        role,
        name,
        phone,
        password,
      );
      await _activateAndPersistLocalAccount(preferences, account);
    }
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
    await preferences.remove(_localSessionKey);
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
    _isLocalAccount = false;
    _loadUserData(preferences, userId, claims);
    notifyListeners();
  }

  Future<Map<String, dynamic>> _storeLocalAccount(
    SharedPreferences preferences,
    UserRole role,
    String name,
    String phone,
    String password,
  ) async {
    final accounts = _readLocalAccounts(preferences);
    final normalizedPhone = phone.trim();
    if (accounts.any((account) => account['phone'] == normalizedPhone)) {
      return accounts.firstWhere(
        (account) => account['phone'] == normalizedPhone,
      );
    }
    final salt = _secureSalt();
    final account = <String, dynamic>{
      'id': 'local-${DateTime.now().microsecondsSinceEpoch}',
      'name': name.trim(),
      'phone': normalizedPhone,
      'role': role.apiValue,
      'salt': salt,
      'password_hash': _passwordHash(salt, password),
    };
    accounts.add(account);
    await preferences.setString(_localAccountsKey, jsonEncode(accounts));
    return account;
  }

  Future<bool> _tryLocalLogin(
    UserRole expectedRole,
    String phone,
    String password,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    final account = _findLocalAccount(preferences, phone.trim());
    if (account == null) return false;
    final role = UserRole.fromApiValue(account['role'] as String?);
    if (role != expectedRole) {
      throw StateError(
        'This saved account is registered as ${role?.label ?? 'another role'}.',
      );
    }
    final salt = account['salt'];
    final hash = account['password_hash'];
    if (salt is! String ||
        hash is! String ||
        _passwordHash(salt, password) != hash) {
      throw StateError('Invalid phone number or password.');
    }
    await _activateAndPersistLocalAccount(preferences, account);
    return true;
  }

  Future<void> _activateAndPersistLocalAccount(
    SharedPreferences preferences,
    Map<String, dynamic> account,
  ) async {
    await preferences.remove(_accessTokenKey);
    await preferences.remove(_refreshTokenKey);
    await preferences.setString(
      _localSessionKey,
      jsonEncode({'phone': account['phone']}),
    );
    _activateLocalAccount(account);
    notifyListeners();
  }

  void _activateLocalAccount(Map<String, dynamic> account) {
    final role = UserRole.fromApiValue(account['role'] as String?);
    final userId = account['id'] as String?;
    if (role == null || userId == null) return;
    _accessToken = null;
    _refreshToken = null;
    _userId = userId;
    _name = account['name'] as String?;
    _phone = account['phone'] as String?;
    _shopId = null;
    _partnerId = null;
    _partnerKycStatus = null;
    _role = role;
    _isDemo = false;
    _isLocalAccount = true;
  }

  List<Map<String, dynamic>> _readLocalAccounts(
    SharedPreferences preferences,
  ) {
    final stored = preferences.getString(_localAccountsKey);
    if (stored == null) return [];
    final decoded = jsonDecode(stored);
    if (decoded is! List) {
      throw const FormatException('Saved offline accounts are invalid.');
    }
    return decoded
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Map<String, dynamic>? _findLocalAccount(
    SharedPreferences preferences,
    String? phone,
  ) {
    if (phone == null) return null;
    for (final account in _readLocalAccounts(preferences)) {
      if (account['phone'] == phone) return account;
    }
    return null;
  }

  String _secureSalt() {
    final random = Random.secure();
    final bytes = List<int>.generate(24, (_) => random.nextInt(256));
    return base64UrlEncode(bytes);
  }

  String _passwordHash(String salt, String password) =>
      sha256.convert(utf8.encode('$salt:$password')).toString();

  bool _isNetworkError(Exception error) =>
      error.toString().contains('TimeoutException') ||
      error.toString().contains('ClientException');

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
    _isLocalAccount = false;
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
    _partnerKycStatus = null;
    _role = null;
    _isDemo = false;
    _isLocalAccount = false;
    notifyListeners();
  }

  Future<void> saveName(String name) async {
    final preferences = await SharedPreferences.getInstance();
    final userId = _userId;
    if (userId == null || _isLocalAccount) return;
    await preferences.setString(_nameKey(userId), name.trim());
    _name = name.trim();
    notifyListeners();
  }

  Future<void> saveShopId(String shopId) async {
    final preferences = await SharedPreferences.getInstance();
    final userId = _userId;
    if (userId == null || _isLocalAccount) return;
    await preferences.setString(_shopIdKey(userId), shopId);
    _shopId = shopId;
    notifyListeners();
  }

  Future<void> savePartnerId(String partnerId) async {
    final preferences = await SharedPreferences.getInstance();
    final userId = _userId;
    if (userId == null || _isLocalAccount) return;
    await preferences.setString(_partnerIdKey(userId), partnerId);
    _partnerId = partnerId;
    notifyListeners();
  }

  Future<void> savePartnerKycStatus(String status) async {
    final preferences = await SharedPreferences.getInstance();
    final userId = _userId;
    if (userId == null || _isLocalAccount) return;
    await preferences.setString(_partnerKycKey(userId), status);
    _partnerKycStatus = status;
    notifyListeners();
  }

  Future<void> _clearStoredSession(SharedPreferences preferences) async {
    await preferences.remove(_accessTokenKey);
    await preferences.remove(_refreshTokenKey);
    await preferences.remove(_localSessionKey);
  }

  void _loadUserData(
    SharedPreferences preferences,
    String userId,
    Map<String, dynamic> claims,
  ) {
    _name = preferences.getString(_nameKey(userId));
    _phone =
        claims['phone'] as String? ?? preferences.getString(_phoneKey(userId));
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
